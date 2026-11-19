#!/usr/bin/env python3
# daily3 #48, owner's note (Nov 18): the company and supers must be able to search near misses, incidents and stop-work
# on their own. A company-side screen "Safety events" (screen-safetySearch), opened from a Home tile on the office Home
# (company account, managers, PMs / superintendents): filters Job, Type (the five Job Book safety kinds, any number),
# From / To date and Who (logged by, or named under People involved); newest first, 50 a page (Show More). Each row opens
# that job's Job Book on the Safety tab (Back comes back here). Server: pb_jb_safety_search (sql/01_safety_search.sql),
# managers only. With no signal the screen shows the last search kept on this phone, with its time.
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

# 1) the screen
rep("""  <!-- batch 11 D: MY PRODUCTION (every member): own entries and their sync state, the jobs worked on -->""",
"""  <!-- daily3 #48: SAFETY EVENTS, the company's search of the Job Books' safety events across jobs -->
  <div class="pb-screen" id="screen-safetySearch">
    <div class="pb-header">
      <p class="pb-eyebrow"><span>SAFETY EVENTS</span><button type="button" class="pb-back" id="ssBack" title="Back" aria-label="Back" onclick="pbSsBack()"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-back"/></svg></button></p>
      <h1 class="pb-title">Safety events</h1>
    </div>
    <div class="pbd-wrap">
      <p class="pbd-dim" id="ssIntro">Near misses, incidents and stop-work from every job's Job Book.</p>
      <div class="pbd-card" id="ssFilters">
        <div class="pb-field"><label for="ssJob">Job</label><select id="ssJob"><option value="">All jobs</option></select></div>
        <p class="dp-lbl" id="ssKindsH">Type</p><div class="ss-kinds" id="ssKinds" role="group" aria-labelledby="ssKindsH"></div>
        <div class="pbd-two"><div class="pb-field"><label for="ssFrom">From</label><input type="date" id="ssFrom"></div><div class="pb-field"><label for="ssTo">To</label><input type="date" id="ssTo"></div></div>
        <div class="pb-field"><label for="ssWho">Who</label><input type="text" id="ssWho" maxlength="80" autocomplete="off" enterkeyhint="search" placeholder="Logged by, or one of the people involved" onkeydown="if(event.key==='Enter'){event.preventDefault();pbSsSearch(0)}"></div>
        <div class="pbd-acts"><button type="button" class="pb-btn" id="ssGo" onclick="pbSsSearch(0)"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-search"/></svg>Search</button><button type="button" class="pb-btn ghost" id="ssClear" onclick="pbSsClear()">Clear</button></div>
      </div>
      <p id="ssStatus" class="pb-rpt-status" role="status"></p>
      <div id="ssList"></div>
    </div>
  </div>
  <style>
  /* daily3 #48 */
  #pbApp .ss-kinds { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px; }
  #pbApp .ss-kinds .dp-segb { flex: 0 0 auto; padding: 0 14px; }
  #pbApp .ss-item { margin-top: 10px; }
  #pbApp .ss-item p { margin: 4px 0 0; overflow-wrap: anywhere; }
  #pbApp .ss-item .ss-h { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin: 0; font-weight: 650; }
  #pbApp .ss-tag { display: inline-flex; align-items: center; min-height: 26px; padding: 0 10px; border-radius: 13px; border: 1px solid var(--pb-divider); font-size: 13px; font-weight: 650; }
  #pbApp .ss-tag.hot { color: var(--pb-warn-text); background: var(--pb-warn-soft); border-color: transparent; }
  #pbApp .ss-item .pb-btn { margin-top: 8px; }
  </style>
  <!-- batch 11 D: MY PRODUCTION (every member): own entries and their sync state, the jobs worked on -->""")

# 2) the module (after the Job Book's)
rep("""  // ================= end feat_jobbook =================""",
"""  // ================= end feat_jobbook =================

  // ================= daily3 #48: SAFETY EVENTS, the company's own search across jobs =================
  const PB_SS_KINDS = ['Near miss', 'First aid', 'Incident', 'Property damage', 'Stop work'], PB_SS_HOT = ['Incident', 'Stop work'], PB_SS_KEY = 'safetySearchLast', PB_SS_PAGE = 50;
  let pbSs = { uid: null, f: null, items: [], total: 0, jobs: [], busy: false, msg: '', at: 0, cached: false, tile: null, tileAt: 0, tileBusy: false };
  PB_CONTRACTOR_SCREENS.push('safetySearch'); PB_SCREEN_TABS.safetySearch = 'home';
  const pbSsEl = (id) => document.getElementById(id);
  const pbSsDayMinus = (d, n) => { const m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(d || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] - n)).toISOString().slice(0, 10) : ''; };
  const pbSsDefault = () => ({ job: '', kinds: [], from: pbSsDayMinus(pbFmToday(), 90), to: '', who: '' });
  function pbSsReset(uid) { if (pbSs.uid !== uid) pbSs = { uid, f: null, items: [], total: 0, jobs: [], busy: false, msg: '', at: 0, cached: false, tile: null, tileAt: 0, tileBusy: false }; }
  window.pbAccountLoadHooks.push(() => { pbSs = { uid: null, f: null, items: [], total: 0, jobs: [], busy: false, msg: '', at: 0, cached: false, tile: null, tileAt: 0, tileBusy: false }; });
  async function pbSsReadLast(uid) { try { const o = JSON.parse((await pbGetFor(uid, PB_SS_KEY)) || 'null'); return o && typeof o === 'object' && Array.isArray(o.items) ? o : null; } catch (e) { return null; } }
  window.pbSsOpen = async function(back) {
    const uid = pbArchiveOwnerUid; if (!uid || uid === 'shared') return;
    const a = await pbDlyAccFresh(uid);
    if (!a.manager) { pbAlert('The company account, managers and PMs search safety events. Foremen log them in the Job Book.', 'Safety Events'); return; }
    pbSsReset(uid);
    pbGoto('safetySearch');
    if (back && pbSs.f) { pbSsRender(); return; }
    if (!pbSs.f) { const L = await pbSsReadLast(uid); if (L && pbSs.uid === uid) { pbSs.f = Object.assign(pbSsDefault(), L.f || {}); pbSs.items = L.items; pbSs.total = Number(L.total) || L.items.length; pbSs.jobs = Array.isArray(L.jobs) ? L.jobs : []; pbSs.at = Number(L.at) || 0; pbSs.cached = true; } else pbSs.f = pbSsDefault(); }
    pbSsRender(); pbSsSearch(0, true);
  };
  window.pbSsBack = function() { pbBackOr(() => window.pbGotoTab('home')); };
  window.pbSsKind = function(k) { const f = pbSs.f || (pbSs.f = pbSsDefault()); const i = f.kinds.indexOf(k); if (i >= 0) f.kinds.splice(i, 1); else f.kinds.push(k); const b = pbSsEl('ssKind_' + PB_SS_KINDS.indexOf(k)); if (b) b.setAttribute('aria-pressed', f.kinds.includes(k) ? 'true' : 'false'); };
  window.pbSsClear = function() { pbSs.f = pbSsDefault(); pbSsRender(); pbSsSearch(0); };
  function pbSsRead() { const f = pbSs.f || (pbSs.f = pbSsDefault()); const v = (id) => { const e = pbSsEl(id); return e ? String(e.value || '').trim() : ''; }; f.job = v('ssJob'); f.from = v('ssFrom'); f.to = v('ssTo'); f.who = v('ssWho').slice(0, 80); return f; }
  window.pbSsSearch = async function(offset, quiet) {
    const uid = pbArchiveOwnerUid; if (pbSs.uid !== uid || pbSs.busy) return;
    const f = pbSsRead();
    if (f.from && f.to && f.to < f.from) { pbSs.msg = 'The To date is before the From date.'; pbSsRender(); return; }
    if (!(await pbDlyCanAsk(uid))) { pbSs.msg = (navigator.onLine === false ? 'No signal. ' : 'Sign in with signal to search. ') + (pbSs.items.length && pbSs.at ? 'Showing your last search, from ' + pbProdTimeText(pbSs.at) + '.' : 'Search needs signal.'); pbSsRender(); return; }
    pbSs.busy = true; pbSs.msg = 'Searching\\u2026'; pbSsRender();
    let r = null; try { r = await pbPermitRpc('pb_jb_safety_search', { p_job_number: f.job || null, p_kinds: f.kinds.length ? f.kinds.slice() : null, p_from: f.from || null, p_to: f.to || null, p_who: f.who || null, p_limit: PB_SS_PAGE, p_offset: offset || 0, p_expect_uid: uid }, 30000); } catch (e) { r = { error: e }; }
    pbSs.busy = false; if (pbSs.uid !== uid) return;
    if (!r || r.error || !r.data || !r.data.ok || !Array.isArray(r.data.items)) {
      pbSs.msg = pbDlyMissing(r) ? 'The company server isn\\u2019t ready for this search yet.' : pbDlyAnswer(r).k === 'retry' ? 'Couldn\\u2019t reach the company server. ' + (pbSs.items.length ? 'Showing the last search.' : 'Try again.') : pbDlyWhy(r && r.data && r.data.code, r);
      pbSsRender(); return;
    }
    pbSs.items = offset ? pbSs.items.concat(r.data.items) : r.data.items; pbSs.total = Number(r.data.total) || 0; pbSs.jobs = Array.isArray(r.data.jobs) ? r.data.jobs : pbSs.jobs; pbSs.at = Date.now(); pbSs.cached = false; pbSs.msg = '';
    try { await pbSetFor(uid, PB_SS_KEY, JSON.stringify({ f, items: pbSs.items.slice(0, 200), total: pbSs.total, jobs: pbSs.jobs, at: pbSs.at })); } catch (e) {}
    pbSsRender();
    if (!quiet && !offset) { const l = pbSsEl('ssStatus'); if (l && l.scrollIntoView) try { l.scrollIntoView({ block: 'start' }); } catch (e) {} }
  };
  function pbSsRowHtml(x, i) {
    const hot = PB_SS_HOT.includes(x.kind), dt = (x.date ? pbDlyDayText(String(x.date).slice(0, 10)) : '') + (x.time ? ' · ' + x.time : '');
    return '<div class="pbd-card ss-item" id="ssItem_' + i + '"><p class="ss-h"><span class="ss-tag' + (hot ? ' hot' : '') + '">' + escapeHtml(x.kind || 'Safety event') + '</span><span>' + escapeHtml(dt) + '</span><span class="pbd-dim">' + escapeHtml('Job ' + (x.job_number || '')) + '</span></p>'
      + '<p>' + escapeHtml(x.what || '') + '</p>' + (x.done ? '<p class="pbd-dim">' + escapeHtml('Done: ' + x.done) + '</p>' : '')
      + '<p class="pbd-dim">' + escapeHtml([x.people ? 'People: ' + x.people : '', x.by ? 'Logged by ' + x.by : '', x.status === 'closed' ? 'Closed' : 'Open', x.photo_count ? x.photo_count + (Number(x.photo_count) === 1 ? ' photo' : ' photos') : ''].filter(Boolean).join(' · ')) + '</p>'
      + '<button type="button" class="pb-btn ghost small" id="ssOpen_' + i + '" onclick="pbSsOpenJob(' + i + ')">Open Job Book</button></div>';
  }
  window.pbSsOpenJob = function(i) { const x = pbSs.items[i]; if (!x || !x.job_number) return; window.pbJbOpen(x.job_number, { key: x.job_key || pbJbKey(x.job_number), kind: 'safety', from: 'safety' }); };
  window.pbSsRender = function() {
    const f = pbSs.f || (pbSs.f = pbSsDefault());
    const js = pbSsEl('ssJob'); if (js) { const opts = '<option value="">All jobs</option>' + pbSs.jobs.map(j => '<option value="' + escapeHtml(j.job_number || '') + '"' + (f.job && pbJbKey(f.job) === pbJbKey(j.job_number || '') ? ' selected' : '') + '>' + escapeHtml('Job ' + (j.job_number || '') + (j.n ? ' (' + j.n + ')' : '')) + '</option>').join('') + (f.job && !pbSs.jobs.some(j => pbJbKey(j.job_number || '') === pbJbKey(f.job)) ? '<option value="' + escapeHtml(f.job) + '" selected>' + escapeHtml('Job ' + f.job) + '</option>' : ''); if (js.innerHTML !== opts) js.innerHTML = opts; }
    const ks = pbSsEl('ssKinds'); if (ks) ks.innerHTML = PB_SS_KINDS.map((k, i) => '<button type="button" class="dp-segb" id="ssKind_' + i + '" aria-pressed="' + (f.kinds.includes(k) ? 'true' : 'false') + '" onclick="pbSsKind(' + escapeHtml(JSON.stringify(k)) + ')">' + escapeHtml(k) + '</button>').join('');
    const set = (id, v) => { const e = pbSsEl(id); if (e && document.activeElement !== e && e.value !== v) e.value = v; };
    set('ssFrom', f.from || ''); set('ssTo', f.to || ''); set('ssWho', f.who || ''); { const e = pbSsEl('ssTo'); if (e) e.max = pbFmToday(); const e2 = pbSsEl('ssFrom'); if (e2) e2.max = pbFmToday(); }
    const go = pbSsEl('ssGo'); if (go) go.disabled = !!pbSs.busy;
    const st = pbSsEl('ssStatus'); if (st) st.textContent = pbSs.msg || (pbSs.at ? (pbSs.total === 1 ? '1 event' : pbSs.total + ' events') + (pbSs.cached ? ' · last search, from ' + pbProdTimeText(pbSs.at) : '') : '');
    const L = pbSsEl('ssList'); if (!L) return;
    const h = pbSs.items.length ? pbSs.items.map(pbSsRowHtml).join('') + (pbSs.items.length < pbSs.total && !pbSs.cached ? '<div class="pb-btn-wrap pbd-bw"><button type="button" class="pb-btn secondary" id="ssMore" onclick="pbSsSearch(' + pbSs.items.length + ')">Show More (' + (pbSs.total - pbSs.items.length) + ')</button></div>' : '')
      : (pbSs.at ? '<p class="pbd-dim" id="ssNone">No safety events match.</p>' : '');
    pbSetHtml(L, h);
  };
  // the office Home: one tile (events in the last 30 days), hidden until the company server answers
  window.pbSsTile = function(uid) {
    try {
      pbSsReset(uid);
      if (!pbSs.tileBusy && Date.now() - pbSs.tileAt > 600000) { pbSs.tileBusy = true; pbSs.tileAt = Date.now();
        (async () => { try { if (!(await pbDlyCanAsk(uid))) return; const r = await pbPermitRpc('pb_jb_safety_search', { p_from: pbSsDayMinus(pbFmToday(), 30), p_limit: 20, p_offset: 0, p_expect_uid: uid }, 20000);
          if (pbSs.uid === uid && r && !r.error && r.data && r.data.ok) { pbSs.tile = { n: Number(r.data.total) || 0, hot: (r.data.items || []).filter(x => PB_SS_HOT.includes(x.kind) && String(x.date || '') >= pbSsDayMinus(pbFmToday(), 7)).length }; if (typeof window.pbCxRender === 'function' && pbCurrentScreen === 'home') window.pbCxRender(); } } catch (e) {} finally { pbSs.tileBusy = false; } })(); }
      const T = pbSs.tile; if (!T) return '';
      return '<button type="button" class="pbx-act' + (T.hot ? ' hot' : '') + '" id="homeCxSafety" onclick="pbSsOpen()"><span class="pbx-act-ic">' + pbCxIc('helmet') + '</span><span class="pbx-num" id="homeCxSafetyN">' + T.n + '</span><span class="pbx-lbl">Safety events</span><span class="pbx-sub">' + pbCxE(T.hot ? T.hot + ' incident or stop-work this week' : 'Last 30 days, all jobs') + '</span></button>';
    } catch (e) { return ''; }
  };
  window.__pbSs = () => pbSs; // tests
  // ================= end daily3 #48 =================""")

# 3) the tile on the office Home
rep("""    return now + inbox + mat + wait + (pair ?""",
"""    const safety = typeof window.pbSsTile === 'function' ? window.pbSsTile(uid) : ''; /* daily3 #48 */
    return now + inbox + mat + wait + safety + (pair ?""")

# 4) the Job Book's Back comes back to the search
rep("""      else if (pbJb.from === 'inspJob' || pbJb.from === 'inspMine') { pbGoto(pbJb.from); try { if (pbJb.from === 'inspJob') window.pbInsJobRender(); else window.pbInsMineRender(); } catch (e) {} }""",
"""      else if (pbJb.from === 'inspJob' || pbJb.from === 'inspMine') { pbGoto(pbJb.from); try { if (pbJb.from === 'inspJob') window.pbInsJobRender(); else window.pbInsMineRender(); } catch (e) {} }
      else if (pbJb.from === 'safety' && typeof window.pbSsOpen === 'function') window.pbSsOpen(true); /* daily3 #48 */""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
