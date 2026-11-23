  // ================= foremen_job_nov23: "Foremen on this job" on the job page, next to PMs & supers =================
  // Same pattern as the PM/super assignment above: the list comes from pb_job_foremen_get and is changed by
  // pb_job_foremen_set (the server checks each person is a foreman of this company now, and who may take others off:
  // the company account, PMs and supers; another manager only themselves). Not kept on the phone (it holds email
  // addresses), so like PMs & supers it loads with signal and changing it needs signal. Messages (when it ships) puts the
  // listed foremen in the job's chat.
  const PB_FM_MAX = 20;
  const pbFmName = (x) => (x && (x.name || x.email)) || 'A foreman';
  const pbFmWait = () => pbPj.fmMsg || (navigator.onLine === false ? 'Loads with signal.' : 'Loading…'); // a job opened with no signal never starts the load
  const pbFmCountTxt = (n) => n + (n === 1 ? ' foreman' : ' foremen');
  window.pbFmJobLoad = async function() {
    const uid = pbArchiveOwnerUid, job = pbPj.job;
    if (!job || pbPj.uid !== uid || !job.job_number) return;
    if (!(sbClient && typeof sbClient.rpc === 'function' && sbUser && sbUser.id === uid) || navigator.onLine === false) { pbPj.fmMsg = 'Loads with signal.'; pbFmJobPaint(); return; }
    const gen = (pbPj.fmGen = (pbPj.fmGen || 0) + 1);
    const r = await pbPermitRpc('pb_job_foremen_get', { p_job_number: job.job_number }, 30000);
    if (pbPj.job !== job || pbPj.fmGen !== gen || pbPj.uid !== uid || !sbUser || sbUser.id !== uid) return;
    const m = String((r && r.error && r.error.message) || '');
    if (!r || r.error || !r.data || r.data.ok !== true || !Array.isArray(r.data.assigned)) {
      pbPj.fmMsg = /Could not find the function|does not exist/i.test(m) ? 'Assigning foremen isn’t ready on the company server yet.' : pbProdErrText(r); pbFmJobPaint(); return;
    }
    pbPj.fms = r.data; pbPj.fmMsg = ''; pbFmJobPaint();
  };
  function pbFmJobHtml() { // one folded row like PMs & supers: the names, opened by a tap or by editing
    const h = pbFmJobHtml0(), head = '<section class="pbp-block" id="pjFmSec"><h3 class="pb-h2 pbp-h3">Foremen on this job</h3>';
    if (h.indexOf(head) !== 0 || h.slice(-10) !== '</section>') return h;
    const F = pbPj.fms, a = F && Array.isArray(F.assigned) ? F.assigned.filter(x => x && x.user_id) : null;
    const sum = !pbPj.job || !pbPj.job.job_number ? 'Assigned by job number' : !a ? pbFmWait() : a.length ? a.map(pbFmName).join(', ') : 'None assigned';
    const open = !!pbPj.fmEdit || !!(window.__pbCxFold && window.__pbCxFold.fm);
    return '<section class="pbp-block" id="pjFmSec"><details class="pbx-fold" id="pjFmFold"' + (open ? ' open' : '') + ' ontoggle="pbCxFoldSet(\'fm\', this.open)"><summary><h3 class="pb-h2 pbp-h3">Foremen on this job</h3><span class="pbp-dim pbx-fold-s" id="pjFmSum">' + escapeHtml(sum) + '</span></summary>' + h.slice(head.length, -10) + '</details></section>';
  }
  function pbFmJobHtml0() {
    const job = pbPj.job, F = pbPj.fms;
    const h = '<section class="pbp-block" id="pjFmSec"><h3 class="pb-h2 pbp-h3">Foremen on this job</h3>';
    if (!job || !job.job_number) return h + '<p class="pbp-dim pbp-none">Foremen are assigned by job number.</p></section>';
    if (!F) return h + '<p class="pbp-dim pbp-none" id="pjFmNone">' + escapeHtml(pbFmWait()) + '</p></section>';
    const assigned = F.assigned.filter(x => x && x.user_id), cands = Array.isArray(F.candidates) ? F.candidates.filter(x => x && x.user_id) : [];
    if (pbPj.fmEdit) {
      const me = sbUser && sbUser.id, mayAll = F.may_remove !== false, locked = (c) => !mayAll && c.user_id !== me && assigned.some(a => a.user_id === c.user_id);
      let e = h;
      if (!cands.length) e += '<p class="pbp-dim pbp-none" id="pjFmNoCands">No foremen in the company yet. Add them in Crew members.</p>';
      if (cands.length && !mayAll && assigned.some(a => a.user_id !== me)) e += '<p class="pbp-dim" id="pjFmOwnerNote">Only the owner, a PM or a superintendent can take another foreman off this job. You can add foremen, or take yourself off.</p>';
      if (cands.length) e += '<div class="pbp-pmpick" role="group" aria-label="Foremen for this job">' + cands.map((c, i) => '<label class="pb-checkrow pbp-pmrow"><input type="checkbox" id="pjFmC' + i + '" data-uid="' + escapeHtml(c.user_id) + '"' + (pbPj.fmEdit.has(c.user_id) ? ' checked' : '') + (locked(c) ? ' disabled' : '') + ' onchange="pbFmJobTick(' + i + ', this.checked)">'
        + '<span><span class="pbp-whoname">' + escapeHtml(pbFmName(c)) + '</span>' + (c.name && c.email ? '<span class="pbp-dim"> ' + escapeHtml(c.email) + '</span>' : '') + '</span></label>').join('') + '</div>';
      return e + (pbPj.fmMsg ? '<p class="pbp-dim pbp-err" id="pjFmMsg" role="alert">' + escapeHtml(pbPj.fmMsg) + '</p>' : '')
        + '<div class="pb-btn-wrap pbp-btns pbp-eact2"><button type="button" class="pb-btn small" id="pjFmSave" onclick="pbFmJobSave()"' + (pbPj.fmBusy ? ' disabled' : '') + '>' + (pbPj.fmBusy ? 'Saving…' : 'Save') + '</button>'
        + '<button type="button" class="pb-btn ghost small" id="pjFmCancel" onclick="pbFmJobCancel()">Cancel</button></div></section>';
    }
    let v = h + (assigned.length ? '<ul class="pbp-who" id="pjFmList">' + assigned.map(x => '<li><span class="pbp-whoname">' + escapeHtml(pbFmName(x)) + (x.current === false ? ' <span class="pb-chip notsent">No longer a foreman</span>' : '') + '</span>'
        + '<span class="pbp-dim">' + escapeHtml([x.name ? x.email : '', x.since ? 'since ' + pbProdDayText(String(x.since).slice(0, 10)) : ''].filter(Boolean).join(' · ')) + '</span></li>').join('') + '</ul>'
      : '<p class="pbp-dim pbp-none" id="pjFmNone">None assigned.</p>');
    if (pbPj.fmMsg) v += '<p class="pbp-dim" id="pjFmMsg" role="status">' + escapeHtml(pbPj.fmMsg) + '</p>';
    return v + '<div class="pb-btn-wrap pbp-btns"><button type="button" class="pb-btn secondary" id="pjFmEdit" onclick="pbFmJobEdit()"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-pencil"/></svg>' + (assigned.length ? 'Change Foremen' : 'Assign Foremen') + '</button></div></section>';
  }
  function pbFmJobPaint() { const el = pbProdEl('pjFmSec'); if (el) el.outerHTML = pbFmJobHtml(); }
  window.pbFmJobEdit = function() {
    if (!pbPj.fms) return;
    if (navigator.onLine === false) { pbAlert('No signal. Assigning foremen needs signal.', 'Foremen'); return; }
    pbPj.fmEdit = new Set(pbPj.fms.assigned.filter(x => x && x.user_id && x.current !== false).map(x => x.user_id)); pbPj.fmBase = new Set(pbPj.fmEdit); pbPj.fmMsg = ''; pbFmJobPaint();
  };
  window.pbFmJobTick = function(i, on) {
    const c = pbPj.fms && Array.isArray(pbPj.fms.candidates) ? pbPj.fms.candidates.filter(x => x && x.user_id)[i] : null;
    if (!c || !pbPj.fmEdit) return;
    if (on) pbPj.fmEdit.add(c.user_id); else pbPj.fmEdit.delete(c.user_id);
  };
  window.pbFmJobCancel = function() { pbPj.fmEdit = null; pbPj.fmMsg = ''; pbFmJobPaint(); };
  window.pbFmJobSave = async function() {
    const uid = pbArchiveOwnerUid, job = pbPj.job, ids = pbPj.fmEdit ? Array.from(pbPj.fmEdit) : null;
    if (!ids || !job || pbPj.fmBusy) return;
    if (ids.length > PB_FM_MAX) { pbPj.fmMsg = 'Up to 20 foremen per job.'; pbFmJobPaint(); return; }
    if (!(sbClient && sbUser && sbUser.id === uid && (await pbLiveSessionIs(uid))) || navigator.onLine === false) { pbPj.fmMsg = 'No signal. Nothing was changed; try again when you have signal.'; pbFmJobPaint(); return; }
    pbPj.fmBusy = true; pbFmJobPaint();
    let kept = []; // another manager may have changed the list since this page loaded it: apply only this person's own ticks
    const base = pbPj.fmBase instanceof Set ? pbPj.fmBase : null, mineIds = ids.slice();
    const apply = (state) => {
      const now = state.assigned.filter(x => x && x.user_id && x.current !== false), mine = new Set(mineIds);
      const added = mineIds.filter(id => !base.has(id)), removed = [...base].filter(id => !mine.has(id));
      const fin = new Set(now.map(x => x.user_id).filter(id => !removed.includes(id))); added.forEach(id => fin.add(id));
      kept = now.filter(x => !base.has(x.user_id) && !removed.includes(x.user_id)).map(pbFmName);
      ids.length = 0; fin.forEach(id => ids.push(id));
      return ids.length <= PB_FM_MAX;
    };
    const tooMany = (state) => { pbPj.fms = Object.assign({}, pbPj.fms, state); pbPj.fmMsg = 'Up to 20 foremen per job (someone else added some meanwhile). Nothing was changed.'; pbFmJobPaint(); };
    let r, ver = null; try {
      const g = await pbPermitRpc('pb_job_foremen_get', { p_job_number: job.job_number }, 30000);
      if (pbPj.job === job && g && !g.error && g.data && g.data.ok === true && Array.isArray(g.data.assigned)) {
        if (typeof g.data.ver === 'number') ver = g.data.ver;
        if (base && !apply(g.data)) { pbPj.fmBusy = false; tooMany(g.data); return; }
      }
      if (pbPj.job !== job) return;
      const setArgs = () => ({ p_job_number: job.job_number, p_user_ids: ids, p_expect_uid: uid, p_expect_ver: ver === null ? 0 : ver });
      r = await pbPermitRpc('pb_job_foremen_set', setArgs(), 30000);
      if (pbPj.job === job && r && !r.error && r.data && r.data.ok === false && r.data.code === 'pb:changed' && Array.isArray(r.data.assigned) && typeof r.data.ver === 'number') {
        if (base && !apply(r.data)) { pbPj.fmBusy = false; tooMany(r.data); return; } // someone saved between the read and this save
        ver = r.data.ver;
        r = await pbPermitRpc('pb_job_foremen_set', setArgs(), 30000);
      } } finally { if (pbPj.job === job) pbPj.fmBusy = false; }
    if (pbPj.job !== job) return;
    const d = r && r.data, m = String((r && r.error && r.error.message) || '');
    if (d && d.ok === true && Array.isArray(d.assigned)) {
      pbPj.fms = Object.assign({}, pbPj.fms, d); pbPj.fmEdit = null; pbPj.fmBase = null;
      pbPj.fmMsg = (d.assigned.length ? 'Saved. ' + pbFmCountTxt(d.assigned.length) + ' on this job.' : 'Saved. No foremen on this job.')
        + (kept.length ? ' ' + kept.join(', ') + (kept.length === 1 ? ' was' : ' were') + ' added by someone else meanwhile and ' + (kept.length === 1 ? 'is' : 'are') + ' kept.' : '');
      pbFmJobPaint(); return;
    }
    if (d && d.code === 'pb:changed' && Array.isArray(d.assigned)) { pbPj.fms = Object.assign({}, pbPj.fms, d); pbPj.fmEdit = new Set(pbPj.fms.assigned.filter(x => x && x.user_id && x.current !== false).map(x => x.user_id)); pbPj.fmBase = new Set(pbPj.fmEdit); pbPj.fmMsg = 'Someone else is changing the foremen on this job right now. Nothing was changed. This is the list as it is now: tick your change again, then Save.'; pbFmJobPaint(); return; }
    pbPj.fmMsg = (d && d.code === 'pb:owner_only') ? 'Only the owner, a PM or a superintendent can take another foreman off this job. Nothing was changed.'
      : (d && d.code === 'pb:not_foreman') ? 'Someone you picked isn’t a foreman of the company any more. Nothing was changed. Refresh and try again.'
      : /pb:too_many_foremen/.test(m) ? 'Up to 20 foremen per job.' : /Could not find the function|does not exist/i.test(m) ? 'Assigning foremen isn’t ready on the company server yet. Nothing was changed.' : pbProdErrText(r) + ' Nothing was changed; try again.';
    pbFmJobPaint();
  };
  // ================= end foremen_job_nov23 =================
