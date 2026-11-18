import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# feat crewview (owner, Nov 17, critique): "Give the run a second home during the day." A dead or dropped phone took the grade
# sheet and the laid marks with it. (1) The run record already goes to the company from Lock on (pb_prod_run_record_put,
# r15.1, whenever it changes, queued while offline as "hash differs from the last one sent"); it is now sent a few seconds
# after Lock and after each laid mark / undo / end / check shot (when a new live status is queued), not up to a minute
# later. (2) Home > "Crew runs today": a crew member linked to the run's foreman (and that foreman, the office) opens the
# day's locked runs of his crew read-only on his own phone (sql/01_crew_view.sql: pb_prod_crew_view_list / _get, the
# grade rows and laid marks only). The last copy fetched stays on this phone per account and is shown with its time when
# there's no signal. No editing, no laid marks from this view.

# (1) the send, nudged when the run's live status changes (Lock, laid marks, End, check shots)
rep("""      if (known === h) return;""",
    """      if (known === h) return;
      try { if (typeof window.pbRrSendSoon === 'function') window.pbRrSendSoon(); } catch (e) {} /* feat crewview: the company copy follows in seconds */""")

# (2) the Home tile (in the "Yours" group with My production)
rep("""id="homeInspMine" style="display:none;" onclick="pbOpenInspMine()"><div><div class="name">My inspections &amp; tests</div><div class="sub" id="homeInspMineSub"></div></div><div>&rsaquo;</div></div>""",
    """id="homeInspMine" style="display:none;" onclick="pbOpenInspMine()"><div><div class="name">My inspections &amp; tests</div><div class="sub" id="homeInspMineSub"></div></div><div>&rsaquo;</div></div>
      <div class="pb-home-tile" role="button" tabindex="0" data-pb-a11y-btn="1" id="homeCrewView" style="display:none;" onclick="pbCvOpen()"><div><div class="name">Crew runs today</div><div class="sub" id="homeCrewViewSub">Read-only grade sheets from your crew&rsquo;s phones</div></div><div>&rsaquo;</div></div><!-- feat crewview -->""")
rep("""    const g = pbRecEl('homeMine'); if (g && g.hidden === any) g.hidden = !any;""",
    """    try { if (typeof window.pbCvHomeSync === 'function' && window.pbCvHomeSync(uid)) any = true; } catch (e) { console.error(e); } /* feat crewview */
    const g = pbRecEl('homeMine'); if (g && g.hidden === any) g.hidden = !any;""")

# (2) the screen
rep("""  <div class="pb-screen" id="screen-inspMine">""",
"""  <style>/* feat crewview */
  #pbApp #screen-crewView .cv-runs { display: flex; flex-direction: column; gap: 10px; margin: 6px 0 12px; }
  #pbApp #screen-crewView .cv-run { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 64px; padding: 12px 14px; text-align: left; border: 1px solid var(--pb-divider); border-radius: 12px; background: var(--pb-raised); color: var(--pb-text); font: inherit; cursor: pointer; }
  #pbApp #screen-crewView .cv-run .tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  #pbApp #screen-crewView .cv-run .h { font-weight: 700; font-size: 17px; overflow-wrap: anywhere; }
  #pbApp #screen-crewView .cv-run .s { font-size: 14px; color: var(--pb-text-2); overflow-wrap: anywhere; }
  #pbApp #screen-crewView .cv-run .chev { font-size: 24px; color: var(--pb-text-2); }
  #pbApp #screen-crewView .cv-ro { margin: 4px 0 10px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--pb-brand-line); background: var(--pb-brand-soft); color: var(--pb-text); font-size: 15px; line-height: 1.35; }
  #pbApp #screen-crewView .cv-ro strong { display: block; font-size: 16px; }
  #pbApp #screen-crewView .cv-stale { margin: 0 0 10px; padding: 10px 12px; border-radius: 10px; background: var(--pb-warn-soft); color: var(--pb-warn-text, var(--pb-text)); font-size: 15px; font-weight: 600; }
  #pbApp #screen-crewView .cv-meta { margin: 0 0 8px; font-size: 15px; color: var(--pb-text-2); overflow-wrap: anywhere; }
  #pbApp #screen-crewView .cv-wrap { overflow-x: auto; margin: 0 -4px 12px; -webkit-overflow-scrolling: touch; }
  #pbApp #screen-crewView table.cv-gs { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  #pbApp #screen-crewView table.cv-gs th { position: sticky; top: 0; z-index: 1; background: var(--pb-surface); color: var(--pb-text-2); font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; padding: 8px 6px; text-align: center; border-bottom: 2px solid var(--pb-divider); }
  #pbApp #screen-crewView table.cv-gs td { padding: 10px 6px; text-align: center; border-top: 1px solid var(--pb-divider); color: var(--pb-text); }
  #pbApp #screen-crewView table.cv-gs td.v { font-size: 26px; font-weight: 700; line-height: 1.1; white-space: nowrap; }
  #pbApp #screen-crewView table.cv-gs td.d { font-size: 22px; font-weight: 700; white-space: nowrap; }
  #pbApp #screen-crewView table.cv-gs td.d .sta, #pbApp #screen-crewView table.cv-gs td.d .tag { display: block; font-size: 13px; font-weight: 600; color: var(--pb-text-2); margin-top: 3px; white-space: nowrap; }
  #pbApp #screen-crewView table.cv-gs tr.cv-strip td { text-align: left; font-size: 14px; font-weight: 700; padding: 8px 8px 2px; border-top: 2px solid var(--pb-text); color: var(--pb-text); white-space: normal; overflow-wrap: anywhere; }
  #pbApp #screen-crewView table.cv-gs tr.cv-laid td { background-color: var(--pb-laid-bg); background-image: repeating-linear-gradient(135deg, var(--pb-laid-stripe) 0 6px, transparent 6px 14px); }
  #pbApp #screen-crewView table.cv-gs tr.cv-next td { background: var(--pb-brand-soft); border-bottom: 2px solid var(--pb-brand-line); }
  #pbApp #screen-crewView table.cv-gs tr.cv-next td.d .tag { display: inline-block; padding: 0 8px; border-radius: 999px; border: 1px solid var(--pb-brand-line); color: var(--pb-brand); }
  #pbApp #screen-crewView .cv-btns { display: flex; flex-wrap: wrap; gap: 10px; margin: 8px 0 16px; }
  #pbApp #screen-crewView .cv-btns .pb-btn { min-height: 52px; flex: 1 1 140px; }
  </style>
  <div class="pb-screen" id="screen-crewView"><!-- feat crewview -->
    <div class="pb-header">
      <p class="pb-eyebrow"><span>CREW RUNS</span><button type="button" class="pb-back" id="cvBack" title="Back" aria-label="Back" onclick="pbCvBack()"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-back"/></svg></button></p>
      <h1 class="pb-title" id="cvTitle">Crew runs today</h1>
    </div>
    <div class="pbd-wrap">
      <p id="cvStatus" class="pb-rpt-status" role="status"></p>
      <div id="cvBody"></div>
      <div class="cv-btns"><button type="button" class="pb-btn secondary" id="cvRefresh" onclick="pbCvRefresh()"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-refresh"/></svg>Refresh</button></div>
    </div>
  </div>
  <div class="pb-screen" id="screen-inspMine">""")

# (1) + (2) the code, next to the run record send
rep("""  window.addEventListener('online', () => { pbRr.pauseUntil = 0; pbRrSoon(7000); });""",
"""  window.addEventListener('online', () => { pbRr.pauseUntil = 0; pbRrSoon(7000); });
  // ================= feat crewview: Crew runs today (a read-only copy of the crew's locked runs) =================
  window.pbRrSendSoon = function() { try { if (sbUser && pbArchiveOwnerUid === sbUser.id) pbRrSoon(4000); } catch (e) {} };
  const PB_CV_KEY = 'crewView', PB_CV_KEEP = 12;
  let pbCv = { uid: null, st: null, open: null, busy: false, msg: '', fresh: false, gen: 0, timer: null };
  function pbCvFor(uid) { if (pbCv.uid !== uid) { clearInterval(pbCv.timer); pbCv = { uid, st: null, open: null, busy: false, msg: '', fresh: false, gen: 0, timer: null }; } return pbCv; }
  // who sees it: a crew member of a company (pipelayer or foreman), not the office (it has Crew runs)
  function pbCvAllowed(uid) { const a = uid && uid !== 'shared' ? pbProdAccMem.get(uid) : null; return !!(a && a.member && a.companyId && !a.manager && (a.role === 'pipelayer' || a.role === 'foreman')); }
  async function pbCvLoadSt(uid) {
    const C = pbCvFor(uid); if (C.st) return C.st;
    let st = null; try { st = JSON.parse((await pbGetFor(uid, PB_CV_KEY)) || 'null'); } catch (e) { st = null; }
    if (!st || typeof st !== 'object' || !st.sheets || typeof st.sheets !== 'object') st = { list: null, listAt: 0, sheets: {} };
    if (pbCv.uid === uid && !pbCv.st) pbCv.st = st;
    return pbCv.uid === uid ? pbCv.st : st;
  }
  async function pbCvSaveSt(uid) {
    const C = pbCvFor(uid), st = C.st; if (!st) return;
    const keep = new Set((st.list || []).map(x => String(x.id)));
    Object.keys(st.sheets).sort((a, b) => (st.sheets[b].at || 0) - (st.sheets[a].at || 0)).forEach((id, i) => { if (!keep.has(id) && i >= PB_CV_KEEP) delete st.sheets[id]; });
    try { await pbSetFor(uid, PB_CV_KEY, JSON.stringify(st)); } catch (e) {}
  }
  window.pbCvHomeSync = function(uid) {
    const el = document.getElementById('homeCrewView'); if (!el) return false;
    const on = !!uid && pbCvAllowed(uid);
    if ((el.style.display === 'none') === on) el.style.display = on ? '' : 'none';
    const a = uid ? pbProdAccMem.get(uid) : null;
    if (!on && a && a.at && pbCv.uid === uid && pbCv.st && (pbCv.st.list || Object.keys(pbCv.st.sheets).length)) { pbCv.st = { list: null, listAt: 0, sheets: {} }; pbCvSaveSt(uid).catch(() => {}); } /* left the crew / the company: its copies go */
    return on;
  };
  const pbCvE = (t) => escapeHtml(String(t === null || t === undefined ? '' : t));
  function pbCvTime(v) { const t = typeof v === 'number' ? v : Date.parse(v); if (!Number.isFinite(t)) return ''; const d = new Date(t), today = new Date();
    const tm = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return d.toDateString() === today.toDateString() ? tm : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + tm; }
  function pbCvFt(v) { const n = Number(v); return Number.isFinite(n) ? (Math.round(n * 10) / 10).toLocaleString() : ''; }
  const pbCvKey = (r) => r && r.pointId ? 'p:' + r.pointId : 'sta:' + (Number(r && r.stationFt) || 0).toFixed(2); /* = pbLaidKey */
  const pbCvOnline = () => navigator.onLine !== false && !!sbClient && typeof sbClient.rpc === 'function';
  function pbCvErr(r) { const m = String((r && r.error && r.error.message) || ''); return { code: (m.match(/pb:\\w+/) || [''])[0], net: navigator.onLine === false || /failed to fetch|networkerror|load failed|timeout|no client/i.test(m), missing: /could not find the function|schema cache/i.test(m) }; }
  async function pbCvFetchList(uid) {
    const C = pbCvFor(uid), st = await pbCvLoadSt(uid); if (pbCv !== C) return;
    if (!pbCvOnline() || !sbUser || sbUser.id !== uid) { C.fresh = false; C.msg = st.listAt ? 'No signal. This is the list as of ' + pbCvTime(st.listAt) + '.' : 'No signal. Crew runs show here once this phone has had signal.'; return; }
    C.busy = true; pbCvRender();
    const r = await pbPermitRpc('pb_prod_crew_view_list', {}, 20000);
    if (pbCv !== C) return; C.busy = false;
    if (r && !r.error && r.data && Array.isArray(r.data.runs)) {
      st.list = r.data.runs.filter(x => x && x.id).slice(0, 20); st.listAt = Date.now(); C.fresh = true; C.msg = '';
      const ids = new Set(st.list.map(x => String(x.id))); Object.keys(st.sheets).forEach(id => { if (!ids.has(id)) delete st.sheets[id]; }); /* not his crew's any more (or a day old): its copy goes */
      await pbCvSaveSt(uid);
    } else { const E = pbCvErr(r); C.fresh = false; C.msg = E.missing ? 'The company server isn’t ready for this yet.' : (E.net ? 'No signal.' : 'Couldn’t load crew runs.') + (st.listAt ? ' This is the list as of ' + pbCvTime(st.listAt) + '.' : ''); }
  }
  async function pbCvFetchSheet(uid, id) {
    const C = pbCvFor(uid), st = await pbCvLoadSt(uid); if (pbCv !== C) return;
    if (!pbCvOnline() || !sbUser || sbUser.id !== uid) { C.fresh = false; return; }
    C.busy = true; pbCvRender();
    const r = await pbPermitRpc('pb_prod_crew_view_get', { p_id: id }, 30000);
    if (pbCv !== C) return; C.busy = false;
    if (r && !r.error && r.data && r.data.sheet && typeof r.data.sheet === 'object' && Array.isArray(r.data.sheet.intervalRows)) {
      st.sheets[id] = { d: r.data, at: Date.now() }; C.fresh = true; C.msg = ''; await pbCvSaveSt(uid);
    } else {
      const E = pbCvErr(r); C.fresh = false;
      if (E.code === 'pb:not_your_crew' || E.code === 'pb:not_found' || E.code === 'pb:removed') { delete st.sheets[id]; if (st.list) st.list = st.list.filter(x => String(x.id) !== id); await pbCvSaveSt(uid);
        C.msg = E.code === 'pb:removed' ? 'This run was deleted from the company’s records.' : 'Only the run’s crew, its foreman and the office can open it.'; }
      else C.msg = E.missing ? 'The company server isn’t ready for this yet.' : E.net ? 'No signal.' : 'Couldn’t load this run.';
    }
  }
  function pbCvListHtml(st) {
    const L = st && Array.isArray(st.list) ? st.list : null;
    if (!L) return '';
    if (!L.length) return '<p class="pbd-dim" id="cvEmpty">No crew runs today. A run shows here once your foreman or a crew member locks it and their phone has signal.</p>';
    return '<div class="cv-runs" role="list">' + L.map((x, i) => {
      const laid = Number(x.laid_ft), dist = Number(x.distance_ft);
      const prog = Number.isFinite(laid) && laid > 0 ? 'Laid ' + pbCvFt(laid) + (Number.isFinite(dist) && dist > 0 ? ' of ' + pbCvFt(dist) : '') + ' ft' : Number.isFinite(dist) && dist > 0 ? pbCvFt(dist) + ' ft' : '';
      const line2 = [x.label, prog].filter(Boolean).join(' · '), line3 = (x.ended ? 'Ended' : 'Open') + ' · updated ' + pbCvTime(x.updated_at);
      return '<div role="listitem"><button type="button" class="cv-run" id="cvRun' + i + '" onclick="pbCvOpenRun(' + i + ')"><span class="tx"><span class="h">' + pbCvE([x.who || 'Crew member', x.job_number ? 'Job ' + x.job_number : ''].filter(Boolean).join(' · ')) + '</span>'
        + (line2 ? '<span class="s">' + pbCvE(line2) + '</span>' : '') + '<span class="s">' + pbCvE(line3) + '</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button></div>';
    }).join('') + '</div>';
  }
  function pbCvCols(sh) {
    const hasSg = sh.intervalRows.some(r => r && r.sgDisp !== undefined && r.sgDisp !== null && r.sgDisp !== '\\u2014' && r.sgDisp !== ''), hasElev = sh.rodUnit !== 'lenker';
    let cols = null; try { if (typeof pbRsColsShown === 'function') cols = pbRsColsShown(hasSg, hasElev); } catch (e) { cols = null; } /* his own column pick, as on his own Results */
    const L = { bop: 'BOP', inv: 'INV', top: 'TOP', sg: 'Subgrade', elev: 'Elevation' };
    cols = (Array.isArray(cols) && cols.length ? cols : ['bop', 'inv']).filter(k => L[k]);
    return cols.map(k => ({ k, label: L[k] }));
  }
  function pbCvCell(r, k) { const v = k === 'sg' ? r.sgDisp : k === 'elev' ? r.elevation : r[k]; return v === null || v === undefined ? '' : String(v); }
  function pbCvSheetHtml(d, at, fresh) {
    const sh = d.sheet, rows = sh.intervalRows.filter(r => r && typeof r === 'object'), marks = sh.laid && sh.laid.marks && typeof sh.laid.marks === 'object' ? sh.laid.marks : {};
    const cols = pbCvCols(sh);
    let staOf = () => ''; try { if (typeof pbStRowStaFn === 'function') staOf = pbStRowStaFn(sh); } catch (e) {}
    const nameOf = (r) => { try { if (typeof pbRowStripName === 'function') return pbRowStripName(sh, r); } catch (e) {} return String(r.label || ''); };
    const nextIdx = rows.findIndex(r => !Number.isFinite(Number(marks[pbCvKey(r)])));
    const nLaid = rows.filter(r => Number.isFinite(Number(marks[pbCvKey(r)]))).length;
    const who = d.who ? d.who + '\\u2019s' : 'the crew member\\u2019s';
    let h = '<div class="cv-ro" id="cvRo" role="note"><strong>Read-only copy from ' + pbCvE(who) + ' phone, updated ' + pbCvE(pbCvTime(d.updated_at)) + '</strong>'
      + 'You can\\u2019t change it or mark laid here. It updates when their phone has signal.</div>';
    if (!fresh) h += '<p class="cv-stale" id="cvStale" role="status">' + pbCvE((navigator.onLine === false ? 'No signal. ' : 'Not updated. ') + 'Showing the last copy fetched, ' + pbCvTime(at) + '.') + '</p>';
    h += '<p class="cv-meta" id="cvMeta">' + pbCvE([sh.jobNumber ? 'Job ' + sh.jobNumber : '', sh.jobsite, (sh.startLabel || 'Start') + ' \\u2192 ' + (sh.endLabel || 'End')].filter(Boolean).join(' · ')) + '<br>'
      + pbCvE((d.ended || sh.completed || sh.incomplete ? 'Run ended' : 'Run open') + ' · ' + nLaid + ' of ' + rows.length + ' rows laid') + '</p>';
    h += '<div class="cv-wrap"><table class="cv-gs" id="cvTable"><thead><tr><th scope="col">Dist.</th>' + cols.map(c => '<th scope="col">' + pbCvE(c.label) + '</th>').join('') + '</tr></thead><tbody>';
    rows.forEach((r, i) => {
      const t = Number(marks[pbCvKey(r)]), laid = Number.isFinite(t), nm = r.label ? nameOf(r) : '';
      if (nm) h += '<tr class="cv-strip' + (laid ? ' cv-laid' : '') + '"><td colspan="' + (1 + cols.length) + '">' + pbCvE(nm) + '</td></tr>';
      const sta = staOf(r), tag = laid ? 'Laid ' + pbCvTime(t) : i === nextIdx ? 'Next' : '';
      h += '<tr class="cv-row' + (laid ? ' cv-laid' : i === nextIdx ? ' cv-next' : '') + '" data-cv-key="' + pbCvE(pbCvKey(r)) + '"' + (laid ? ' data-cv-laid="1"' : '') + '>'
        + '<td class="d">' + pbCvE(r.station) + (sta ? '<span class="sta">Sta ' + pbCvE(sta) + '</span>' : '') + (tag ? '<span class="tag">' + pbCvE(tag) + '</span>' : '') + '</td>'
        + cols.map(c => '<td class="v">' + pbCvE(pbCvCell(r, c.k)) + '</td>').join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  function pbCvRender() {
    if (pbCurrentScreen !== 'crewView') return;
    const uid = pbArchiveOwnerUid, C = pbCvFor(uid), st = C.st, body = document.getElementById('cvBody'), stEl = document.getElementById('cvStatus'), t = document.getElementById('cvTitle'); if (!body) return;
    let h = '', s = C.busy ? 'Checking…' : C.msg;
    if (C.open) {
      const x = st && st.sheets[C.open.id];
      if (t) t.textContent = C.open.who ? C.open.who + '\\u2019s run' : 'Crew run';
      h = x && x.d ? pbCvSheetHtml(x.d, x.at, C.fresh) : (C.busy ? '' : '<p class="pbd-dim" id="cvNoCopy">' + pbCvE(navigator.onLine === false ? 'No copy of this run on this phone yet. Open it once with signal.' : 'Couldn’t load this run.') + '</p>');
      if (x && x.d && !C.busy && !C.msg) s = '';
    } else {
      if (t) t.textContent = 'Crew runs today';
      h = pbCvListHtml(st);
      if (!C.busy && !C.msg && st && st.listAt) s = 'Checked ' + pbCvTime(st.listAt) + '.';
    }
    if (stEl && stEl.textContent !== s) stEl.textContent = s;
    if (typeof pbSetHtml === 'function') pbSetHtml(body, h); else if (body.innerHTML !== h) body.innerHTML = h;
  }
  window.pbCvOpen = async function() {
    const uid = pbArchiveOwnerUid; if (!uid || !pbCvAllowed(uid)) return;
    const C = pbCvFor(uid); C.open = null; C.msg = ''; await pbCvLoadSt(uid);
    if (pbCurrentScreen !== 'crewView') pbGoto('crewView');
    pbCvRender(); await pbCvFetchList(uid); pbCvRender();
    clearInterval(C.timer); C.timer = setInterval(() => { if (pbCurrentScreen !== 'crewView' || pbCv !== C) { clearInterval(C.timer); return; } if (pbCvOnline() && !C.busy) window.pbCvRefresh(true); }, 60000); /* follows the laid marks while open */
  };
  window.pbCvOpenRun = async function(i) {
    const uid = pbArchiveOwnerUid, C = pbCvFor(uid), x = C.st && C.st.list && C.st.list[i]; if (!x) return;
    C.open = { id: String(x.id), who: x.who || '' }; C.msg = ''; C.fresh = false; pbCvRender();
    try { const b = document.querySelector('#screen-crewView .pbd-wrap'); if (b && b.scrollIntoView) window.scrollTo(0, 0); } catch (e) {}
    await pbCvFetchSheet(uid, C.open.id); pbCvRender();
  };
  window.pbCvRefresh = async function(quiet) {
    const uid = pbArchiveOwnerUid, C = pbCvFor(uid); if (C.busy) return;
    if (!pbCvOnline()) { C.fresh = false; if (!quiet) { C.msg = C.open ? '' : (C.st && C.st.listAt ? 'No signal. This is the list as of ' + pbCvTime(C.st.listAt) + '.' : 'No signal.'); } pbCvRender(); return; }
    if (C.open) await pbCvFetchSheet(uid, C.open.id); else await pbCvFetchList(uid);
    pbCvRender();
  };
  window.pbCvBack = function() { const C = pbCvFor(pbArchiveOwnerUid); if (C.open) { C.open = null; C.msg = ''; pbCvRender(); pbCvRefresh(true); return; } clearInterval(C.timer); pbGoto('home'); };
  try { PB_SCREEN_TABS.crewView = 'home'; } catch (e) {}
  window.pbAccountLoadHooks.push((uid) => { if (pbCv.uid !== uid) pbCvFor(uid); });
  window.addEventListener('online', () => { if (pbCurrentScreen === 'crewView') setTimeout(() => window.pbCvRefresh(true), 1500); });
  window.addEventListener('offline', () => { if (pbCurrentScreen === 'crewView') { pbCv.fresh = false; pbCvRender(); } });
  window.__pbCvDebug = { st: () => pbCv.st, drop: () => { clearInterval(pbCv.timer); pbCv = { uid: null, st: null, open: null, busy: false, msg: '', fresh: false, gen: 0, timer: null }; }, helpers: () => ({ cols: typeof pbRsColsShown, sta: typeof pbStRowStaFn, name: typeof pbRowStripName }) }; /* tests */""")

open(out, 'w', encoding='utf-8').write(s)
