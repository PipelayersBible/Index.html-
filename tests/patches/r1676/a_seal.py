import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:80])
    s = s.replace(old, new)

SEAL = r'''window.pbRrPhotosIn = pbRrPhotosIn;
  // r16.76 (Tommy, Nov 16): a sealed original of each finished run. Made on the crew member's phone from the run as it is
  // there (photos and all), once the company has the run; uploaded to run-seals/<uid>/runs/<run>/<time>-<sha>.pdf, where
  // nobody can change or delete it, and its SHA-256 fingerprint is recorded on the server (pb_run_seal_add). A run edited
  // after that is sealed again as the next version; every version is kept. The office opens them from the run (Sealed Originals).
  const PB_SEAL_VOL = /^(report|emailed|email|sent|r57)/i;
  function pbRrSealKey(rec) { const c = JSON.parse(JSON.stringify(rec)); Object.keys(c).forEach(k => { if (PB_SEAL_VOL.test(k)) delete c[k]; }); if (c.pbOffice) delete c.pbOffice.send; return pbHashText(JSON.stringify(c)); }
  async function pbSha256Hex(buf) { const h = await crypto.subtle.digest('SHA-256', buf); return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join(''); }
  let pbSealBusy = false;
  async function pbRrSealOne(uid, e, key) {
    const made = new Date();
    let doc; try { const unreadable = await pbPreflightPdfImages([e], () => {}); doc = pbRptMakeSafe(e, { unreadable }); } catch (x) { console.error('Sealed copy:', x); return 'fail'; }
    try { doc.setProperties({ title: pbPdfSafe(pbRptKindName(e) + ': ' + pbRptEntryLabel(e) + ' (sealed original)'), subject: pbPdfSafe('Sealed original, made on the crew member’s phone ' + made.toISOString()), creator: pbRptBuild() }); } catch (x) {}
    const buf = doc.output('arraybuffer'), sha = await pbSha256Hex(buf);
    const ts = made.toISOString().replace(/[-:]/g, '').replace(/\..*$/, '');
    const path = pbRrPhotoPath(uid, e.id, 'x').replace(/x\.jpg$/, ts + '-' + sha.slice(0, 16) + '.pdf');
    if (!sbUser || sbUser.id !== uid || navigator.onLine === false) return 'stop';
    let msg = '';
    try { const { error } = await sbClient.storage.from('run-seals').upload(path, new Blob([buf], { type: 'application/pdf' }), { contentType: 'application/pdf', upsert: false }); msg = error ? String(error.message || error.error || error) : ''; } catch (x) { msg = String(x && x.message || x); }
    if (msg && !/exists|duplicate/i.test(msg)) return /fetch|network|load failed|timeout/i.test(msg) ? 'stop' : 'fail';
    const r = await pbPermitRpc('pb_run_seal_add', { p_entry_id: String(e.id), p_path: path, p_sha256: sha, p_bytes: buf.byteLength, p_key: key, p_made_at: made.toISOString(), p_build: String(window.PB_APP_BUILD || '') }, 30000);
    if (!r.error && r.data && r.data.ok) return 'ok';
    const m = String((r.error && r.error.message) || '');
    return /failed to fetch|networkerror|load failed|timeout/i.test(m) ? 'stop' : 'fail';
  }
  async function pbRrSealPass(uid) {
    if (pbSealBusy || !uid || uid === 'shared' || pbArchiveOwnerUid !== uid || archiveLoadFailed || !sbClient || !sbClient.storage || !sbUser || sbUser.id !== uid || navigator.onLine === false) return;
    if (pbCurrentScreen === 'results' || pbCurrentScreen === 'input') return; // not while he's running pipe
    if (typeof pdfLibReady === 'function' && !pdfLibReady()) return;
    if (!(window.crypto && crypto.subtle)) return;
    const acc = pbProdAccMem.get(uid); if (!acc || !acc.member || !acc.companyId) return;
    const sent = pbRr.uid === uid ? pbRr.sent : null; if (!sent) return;
    pbSealBusy = true; let more = false;
    try {
      let seals = {}; try { seals = JSON.parse((await pbGetFor(uid, 'rrSeals')) || '{}') || {}; } catch (x) { seals = {}; }
      const since = Date.now() - PB_RR_DAYS * 86400000; let did = false, changed = false;
      for (const e of runArchive) {
        if (!e || e.kind !== 'run' || !(e.completed || e.incomplete) || !sent[String(e.id)]) continue;
        if (typeof window.pbRfEndHeld === 'function' && window.pbRfEndHeld(e)) continue;
        const t = (e.lockTime instanceof Date ? e.lockTime : new Date(e.lockTime)).getTime(); if (!(isFinite(t) && t > since)) continue;
        let rec; try { rec = pbRrOfficeCopy(e); } catch (x) { continue; }
        if (sent[String(e.id)] !== pbHashText(JSON.stringify([rec, acc.companyId]))) continue; // the company has an older copy: sealed after it gets this one
        const id = String(e.id), key = pbRrSealKey(rec), s = seals[id] || {};
        if (s.k === key || (s.n || 0) >= 30 || (s.fail && Date.now() - s.fail < 30 * 60000)) continue;
        if (did) { more = true; break; }
        did = true;
        const r = await pbRrSealOne(uid, e, key);
        if (r === 'ok') { seals[id] = { k: key, n: (s.n || 0) + 1, at: Date.now() }; changed = true; }
        else if (r === 'fail') { seals[id] = Object.assign({}, s, { fail: Date.now() }); changed = true; }
        else break;
      }
      if (changed) { const ks = Object.keys(seals); if (ks.length > 300) ks.sort((a, b) => (seals[a].at || 0) - (seals[b].at || 0)).slice(0, ks.length - 300).forEach(k => delete seals[k]); await pbSetFor(uid, 'rrSeals', JSON.stringify(seals)); }
    } finally { pbSealBusy = false; }
    if (more) setTimeout(() => { pbRrSealPass(uid).catch(x => console.error('Sealed copy:', x)); }, 20000);
  }
  window.pbRrSealPass = pbRrSealPass;
  // the office: a run's sealed originals, each checked against its fingerprint when opened
  window.pbRrSeals = async function() {
    const O = pbRoFor(pbArchiveOwnerUid), x = O.open; if (!x || !x.id) return;
    if (!sbClient || navigator.onLine === false) { pbAlert('Sealed originals open with signal.', 'No Signal'); return; }
    const r = await pbPermitRpc('pb_run_seals_list', { p_run_id: x.id }, 20000);
    if (r.error || !r.data || !Array.isArray(r.data.seals)) { pbAlert('Couldn’t load the sealed originals. Try again.', 'Sealed Originals'); return; }
    const L = r.data.seals;
    if (!L.length) { pbAlert('No sealed copy yet. The crew member’s phone makes one after the run ends and reaches the company.', 'Sealed Originals'); return; }
    const when = (v) => { const d = new Date(v); return isFinite(d.getTime()) ? d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; };
    const btns = L.slice(0, 6).map(sl => ({ label: 'Version ' + sl.version + ' · ' + when(sl.made_at || sl.sealed_at), primary: sl === L[0], onClick: () => { window.pbRrSealGet(sl, x); } }));
    btns.push({ label: 'Close' });
    pbShowModal('Made on the crew member’s phone when the run was finished' + (L.length > 1 ? ', and again after each edit' : '') + '. They can’t be changed or deleted.' + (L.length > 6 ? '\n\nShowing the newest 6 of ' + L.length + '.' : ''), btns, 'Sealed Originals');
  };
  window.pbRrSealGet = async function(sl, x) {
    let blob = null;
    try { pbRptBusy('Getting the sealed original…'); const { data } = await sbClient.storage.from('run-seals').download(sl.path); blob = data || null; } catch (e) { blob = null; } finally { pbRptBusy(null); }
    if (!blob) { pbAlert('Couldn’t get that file. Try again with signal.', 'Sealed Original'); return; }
    let ok = false; try { ok = (await pbSha256Hex(await blob.arrayBuffer())) === sl.sha256; } catch (e) { ok = false; }
    const name = 'sealed-run-' + String(x.job_number || 'job').replace(/[^A-Za-z0-9_-]+/g, '-') + '-v' + sl.version + '.pdf';
    const save = () => { const f = new Blob([blob], { type: 'application/pdf' }); if (typeof pbFxIosApp === 'function' && pbFxIosApp() && typeof pbHandFileToPhone === 'function') { pbHandFileToPhone(f, name).catch(() => {}); return; } const u = URL.createObjectURL(f), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); };
    if (ok) { save(); pbAlert('Matches its fingerprint: this is the original, unchanged.\n\nFingerprint ' + sl.sha256.slice(0, 16) + '…', 'Sealed Original'); }
    else pbShowModal('This file doesn’t match the fingerprint recorded when it was sealed. Don’t rely on it, and report it from Settings.', [{ label: 'Save Anyway', onClick: save }, { label: 'Close', primary: true }], 'Doesn’t Match');
  };'''
rep("window.pbRrPhotosIn = pbRrPhotosIn;", SEAL)
rep("const sent = await pbRrLoadSent(uid); if (pbRr.uid !== uid) return;\n    { const recent",
    "const sent = await pbRrLoadSent(uid); if (pbRr.uid !== uid) return;\n    setTimeout(() => { pbRrSealPass(uid).catch(x => console.error('Sealed copy:', x)); }, 15000); /* r16.76 */\n    { const recent")
rep('''id="cxRunView" onclick="pbRrView()">View Run Report</button></div>\'''',
    '''id="cxRunView" onclick="pbRrView()">View Run Report</button><button type="button" class="pb-btn ghost small" id="cxRunSeals" onclick="pbRrSeals()">Sealed Originals</button></div>\'''')
rep("state: () => ({ uid: pbRr.uid,", "open: (o) => { pbRoFor(pbArchiveOwnerUid).open = o; }, run: () => runArchive.find(x => x && x.kind === 'run') /* r16.76 test */, state: () => ({ uid: pbRr.uid,")
open(out, 'w', encoding='utf-8').write(s)
print('ok')
