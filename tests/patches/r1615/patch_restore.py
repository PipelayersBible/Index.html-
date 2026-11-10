import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src).read()
def rep(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:80]); s = s.replace(old, new)

# 1. the Records box
rep('    <div id="archivePermitBk" class="pb-arch-bkbox" hidden></div>',
    '    <div id="archivePermitBk" class="pb-arch-bkbox" hidden></div>\n    <div id="archiveRunRestore" class="pb-arch-bkbox" hidden></div>')
rep("  function pbPermitBkRenderBox() {\n",
    "  function pbPermitBkRenderBox() {\n    try { if (typeof window.pbRunRestoreBox === 'function') window.pbRunRestoreBox(); } catch (x) {} // r16.15\n")

# 2. the office copy keeps the laid footage a restored run came back with (its laid marks stay on the old phone)
rep("    let laidFt = null; try { const L = window.pbLaidSummaryOf ? window.pbLaidSummaryOf(e.id) : null; if (L && Number.isFinite(Number(L.laidFt))) laidFt = Number(L.laidFt); } catch (x) {}\n",
    "    let laidFt = null; try { const L = window.pbLaidSummaryOf ? window.pbLaidSummaryOf(e.id) : null; if (L && Number.isFinite(Number(L.laidFt))) laidFt = Number(L.laidFt); } catch (x) {}\n"
    "    if (laidFt === null && e.restoredFromCloud && typeof e.restoredLaidFt === 'number') laidFt = e.restoredLaidFt; // r16.15\n")

# 3. restore
anchor = "  window.__pbRrDebug = { copy: (id) =>"
code = r'''  // r16.15 (Tommy, Nov 9): a reinstalled phone gets its runs back. The company account keeps every run a crew member
  // locks (pb_prod.run_records); runs this phone doesn't have are added to Records, and each run locked with a pipe
  // type is counted in Stats again under its latest session, as Track This Run counts it.
  async function pbRrMarkSent(uid, list) {
    const acc = pbProdAccMem.get(uid); if (!acc || !acc.companyId) return;
    const sent = await pbRrLoadSent(uid); if (pbRr.uid !== uid) return;
    list.forEach(e => { try { sent[String(e.id)] = pbHashText(JSON.stringify([pbRrOfficeCopy(e), acc.companyId])); } catch (x) {} });
    await pbSetFor(uid, 'rrSent', JSON.stringify(sent));
  }
  async function pbRunRestoreStats(uid, list) {
    if (statsLoadFailed || statsLogOwnerUid !== uid || pbArchiveOwnerUid !== uid) return 0;
    let n = 0;
    for (const e of list) {
      if (!runArchive.includes(e) || !e.statsType || e.resumedIntoId) continue;
      if (runArchive.some(x => x && x.kind === 'run' && x !== e && x.resumedFromId === e.id)) continue; // counted under its latest session
      if (pbRunCountedInStats(e, new Set(statsLog.map(s => s.entryId)))) continue;
      const done = (e.completedDistance !== undefined && e.completedDistance !== null) ? e.completedDistance : e.distance;
      if (typeof done !== 'number' || !isFinite(done)) continue;
      const cfv = { hasCutFillData: e.netCutFill !== null && e.netCutFill !== undefined, netCutFill: e.netCutFill, volumeYd3: e.volumeYd3 !== undefined ? e.volumeYd3 : null, volumeIncomplete: !!e.volumeIncomplete };
      const attribution = { enabled: true, type: e.statsType, jobsite: e.jobsite || '', jobNumber: e.jobNumber || '', costCode: e.costCode || '', pipelayer: e.pipelayer || '', crew: e.crew || '', notes: '' };
      const dur = (typeof e.durationMin === 'number') ? pbRunChainDurationMin(e) : null;
      let ok = false; try { ok = await recordStatsEntry(pbStatsCalcFromEntry(e, done), new Date(e.id), cfv, !!e.depthFlagged, attribution, null, dur, !!e.incomplete, true); } catch (x) { console.error('Restored run Stats failed:', x); }
      if (!ok) break;
      n++;
    }
    return n;
  }
  window.pbRunRestoreBox = function() {
    const box = document.getElementById('archiveRunRestore'); if (!box) return;
    const show = !!(sbUser && pbRrMember(pbArchiveOwnerUid));
    if (box.hidden === show) box.hidden = !show;
    if (show && !document.getElementById('archiveRunRestoreBtn')) box.innerHTML = '<button type="button" class="pb-btn ghost small" id="archiveRunRestoreBtn" onclick="pbRunRestore()">Restore Runs From Your Account</button>';
    if (!show) box.innerHTML = '';
  };
  let pbRunRestoreBusy = false;
  window.pbRunRestore = async function(opts) {
    const auto = !!(opts && opts.auto), say = (m, t) => { if (!auto) pbAlert(m, t); };
    if (!sbClient || !sbUser) { say('Log in with signal to restore your runs.', 'Not Signed In'); return 'no'; }
    const uid = sbUser.id;
    if (pbArchiveOwnerUid !== uid || archiveLoadFailed) { say('Records isn’t loaded for your account yet. Try again in a moment.', 'Not Ready'); return 'no'; }
    if (pbRunRestoreBusy) return 'no';
    pbRunRestoreBusy = true;
    const label = (t, d) => { const b = document.getElementById('archiveRunRestoreBtn'); if (b) { b.disabled = !!d; b.textContent = t; } };
    const rows = []; let before = null, beforeId = null, err = null;
    try {
      if (!auto) label('Checking your account…', true);
      for (let pages = 0; pages < 200; pages++) {
        if (!sbUser || sbUser.id !== uid || !(await pbLiveSessionIs(uid))) { err = 'account'; break; }
        const r = await pbPermitRpc('pb_run_mine_page', { p_before_locked: before, p_before_id: beforeId, p_limit: 50 }, 60000);
        if (!sbUser || sbUser.id !== uid) { err = 'account'; break; }
        if (!r || r.error || !Array.isArray(r.data)) { err = 'net'; break; }
        rows.push(...r.data);
        if (r.data.length < 50) break;
        const last = r.data[r.data.length - 1]; before = last.locked_at; beforeId = last.row_id;
      }
    } finally { pbRunRestoreBusy = false; label('Restore Runs From Your Account', false); }
    if (!sbUser || sbUser.id !== uid || pbArchiveOwnerUid !== uid) return 'no';
    if (err === 'account') { say('The signed-in account changed, so nothing was restored.', 'Not Restored'); return 'no'; }
    if (err) { say('Couldn’t reach your account (no signal?). Nothing was restored.', 'Restore Failed'); return 'no'; }
    const ids = new Set(runArchive.filter(Boolean).map(e => String(e.id)));
    const add = [];
    rows.forEach(row => {
      const rec = row && row.record;
      if (!rec || typeof rec !== 'object' || rec.kind !== 'run' || rec.id === undefined || rec.id === null || ids.has(String(rec.id))) return;
      const lt = new Date(rec.lockTime); if (isNaN(lt.getTime())) return;
      const o = JSON.parse(JSON.stringify(rec)), po = (o.pbOffice && typeof o.pbOffice === 'object') ? o.pbOffice : {};
      delete o.pbOffice;
      if (typeof po.laidFt === 'number') o.restoredLaidFt = po.laidFt;
      if (!o.rfWho && (po.who || po.whoRole || po.foreman)) { o.rfWho = {}; ['who', 'whoRole', 'foreman'].forEach(k => { if (po[k]) o.rfWho[k] = po[k]; }); }
      let e = null; try { e = normalizeArchiveEntry(Object.assign(o, { lockTime: lt, photos: [], restoredFromCloud: true })); } catch (x) { e = null; }
      if (!e || e.kind !== 'run') return;
      add.push(e); ids.add(String(e.id));
    });
    if (!add.length) { say(rows.length ? 'Every run in your account is already on this phone.' : 'There are no runs in your account yet.', 'Nothing to Restore'); return 'none'; }
    const N = add.length, s = N > 1 ? 's' : '';
    pbConfirm('Restore ' + N + ' run' + s + ' from your account to this phone?\n\nThey go back in Records and Stats. Photos stay on the phone that took them.', async () => {
      if (!sbUser || sbUser.id !== uid || pbArchiveOwnerUid !== uid) return;
      const fresh = add.filter(e => !runArchive.some(o => o && String(o.id) === String(e.id)));
      if (!fresh.length) return;
      fresh.forEach(e => { const at = runArchive.findIndex(o => o && o.lockTime instanceof Date && o.lockTime < e.lockTime); runArchive.splice(at === -1 ? runArchive.length : at, 0, e); });
      const ok = await saveRunArchive();
      if (!ok) {
        fresh.forEach(e => { const i = runArchive.indexOf(e); if (i !== -1) runArchive.splice(i, 1); });
        if (pbCurrentScreen === 'archive') renderArchiveList();
        pbAlert('The runs couldn’t be saved on this phone (storage may be full). Nothing was restored; your account copies are safe.', 'Not Restored');
        return;
      }
      try { await pbRrMarkSent(uid, fresh); } catch (x) {} // the company already has them
      const n = await pbRunRestoreStats(uid, fresh);
      try { if (pbCurrentScreen === 'archive') renderArchiveList(); } catch (x) {}
      try { pbRefreshStatsViews(); } catch (x) {}
      try { window.pbRenderHome(); } catch (x) {}
      pbAlert('Restored ' + fresh.length + ' run' + (fresh.length > 1 ? 's' : '') + (n ? ' · ' + n + ' counted in Stats' : '') + '.', 'Restored');
    }, 'Restore Runs', { no: 'Not Now', yes: 'Restore' });
    return 'asked';
  };
  // Asked once per account on this phone, a few seconds after sign-in, when the account has runs this phone doesn't.
  window.pbAccountLoadHooks.push((uid) => {
    const tryAt = (k) => setTimeout(async () => {
      try {
        if (!uid || uid === 'shared' || !sbUser || sbUser.id !== uid || pbArchiveOwnerUid !== uid) return;
        if (await pbGetFor(uid, 'runRestoreAsked')) return;
        if (navigator.onLine === false || !pbRrMember(uid)) { if (k < 3) tryAt(k + 1); return; } // company access may still be loading
        const r = await window.pbRunRestore({ auto: true });
        if (r === 'asked' || r === 'none') await pbSetFor(uid, 'runRestoreAsked', String(Date.now()));
        else if (k < 3) tryAt(k + 1);
      } catch (x) { console.error('Run restore check failed:', x); }
    }, [9000, 30000, 90000, 300000][k]);
    tryAt(0);
  });
'''
rep(anchor, code + anchor)
open(out, 'w').write(s)
print('ok')
