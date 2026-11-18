import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# Beta Results (staged Nov 18; applies to r17.01 and to the r17.02 candidate; needs sql/01_beta_summary.sql on the server):
# a one-page summary of the company's own records over its beta (or the last 30 days for a paid company) that the
# superintendent who ran the pilot hands to the company owner. Numbers come from pb_company_beta_summary; the app adds
# nothing of its own. Hours saved are never computed: the PDF has a notes box he fills in himself, printed as his words.
# Shown to the company account and its PMs / superintendents only:
#   (1) Home: a "Beta Results" button on the beta line when the beta has 7 days or less left, or has ended.
#   (2) Settings > Company: a "Beta Results" row (always).
#   (3) Settings > Beta Accounts (app owner): a "Beta Results" button on each company card.
# The sheet shows the numbers, an optional notes box (kept on this phone as a draft), and Make PDF (the app's report
# PDF path, one page, opened in the PDF viewer). Server not set up yet: says so and changes nothing.

# ---- CSS (theme tokens only: light and dark) ----
rep("""#pbApp .pb-beta-line.ended { padding: 12px 14px;""",
    """.pb-bres-card { max-height: 94vh; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.pb-bres-sub { margin: -6px 0 0; font-size: 14px; color: var(--pb-text-2, #555); }
.pb-bres-sec { border-top: 1px solid var(--pb-divider, #ccc); padding-top: 10px; display: flex; flex-direction: column; gap: 4px; }
.pb-bres-sec h3 { margin: 0 0 2px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--pb-text-2, #555); }
.pb-bres-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-size: 15px; line-height: 1.35; }
.pb-bres-row .k { color: var(--pb-text, #14171C); min-width: 0; overflow-wrap: anywhere; }
.pb-bres-row .v { font-weight: 700; color: var(--pb-text, #14171C); text-align: right; flex: none; max-width: 48%; overflow-wrap: anywhere; }
.pb-bres-none { font-size: 14px; color: var(--pb-text-2, #555); margin: 0; }
.pb-bres-big { font-size: 26px; font-weight: 800; color: var(--pb-text, #14171C); line-height: 1.1; }
.pb-bres-notes label { display: flex; flex-direction: column; gap: 4px; font-size: 14px; font-weight: 600; }
.pb-bres-notes .pb-bres-hint { font-weight: 400; font-size: 13px; color: var(--pb-text-2, #555); }
.pb-bres-notes textarea { min-height: 96px; }
.pb-bres-count { font-size: 12px; color: var(--pb-text-2, #555); text-align: right; margin: 2px 0 0; }
#pbApp .pb-beta-line.ended { padding: 12px 14px;""")

# ---- Settings > Company: the row (the section is shown to the company account and managers only) ----
rep("""<span class="name">Company logo</span><span class="sub">The logo at the top of every report</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>""",
    """<span class="name">Company logo</span><span class="sub">The logo at the top of every report</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>
        <button type="button" class="pb-edu-row pb-tool-row" id="settingsBetaResultsBtn" data-ic="flag" onclick="pbBetaResultsOpen()"><span class="pb-tool-ic" aria-hidden="true"></span><span class="tx"><span class="name">Beta Results</span><span class="sub">Your crew&rsquo;s numbers on one page, for the owner</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>""")

# ---- Home: the button on the beta line (7 days or less left, or ended), company account and managers only ----
rep("""      let pill = document.getElementById('pbFbPill');
      const fbOn = !!sbUser; /* r16.92: every signed-in account */""",
    """      if (line && beta && !removed && (ended || daysLeft <= 7) && typeof window.pbBresCanSee === 'function' && window.pbBresCanSee() && !line.querySelector('[data-bres]')) { /* Beta Results */
        const w = document.createElement('span'); w.className = 'pb-beta-acts';
        w.innerHTML = '<button type="button" class="pb-btn small' + (ended ? ' ghost' : '') + '" data-bres="1">Beta Results</button>';
        w.firstChild.onclick = () => window.pbBetaResultsOpen(); line.appendChild(w);
      }
      let pill = document.getElementById('pbFbPill');
      const fbOn = !!sbUser; /* r16.92: every signed-in account */""")

# ---- Beta Accounts (app owner): a Beta Results button on every company card ----
rep("""            + pbBillActs(bc, beta, !!B)
            + '</div>';""",
    """            + pbBillActs(bc, beta, !!B)
            + '<div class="acts"><button type="button" class="pb-btn ghost small" data-act="bres">Beta Results</button></div>' /* Beta Results */
            + '</div>';""")
rep("""          if (act === 'handover') { pbHandOverForm(c, bc, load); return; }""",
    """          if (act === 'handover') { pbHandOverForm(c, bc, load); return; }
          if (act === 'bres') { window.pbBetaResultsOpen(id, c.name || ''); return; } /* Beta Results */""")

# ---- the sheet and the PDF ----
rep("""  })();
  async function pbSupRender() {""",
    r"""  })();
  /* Beta Results: one page from the company's own records (pb_company_beta_summary), for the owner. */
  window.pbBresCanSee = function() {
    try { const s = sbCachedSubscription; if (s && (s.companyRole === 'Company account' || s.companyRole === 'Project manager')) return true; } catch (e) {}
    try { const a = pbProdAccMem.get(pbArchiveOwnerUid); if (a && a.manager) return true; } catch (e) {}
    return false;
  };
  const PB_BRES_MSG = {
    missing: 'Beta Results isn’t set up on the server yet. Nothing was changed.',
    'pb:not_allowed': 'Beta Results is for the company account and its PMs and superintendents.',
    'pb:no_company': 'That company wasn’t found.',
    'pb:not_signed_in': 'Log in first.',
    signal: 'Needs signal. Try again when you have it.',
    other: 'Couldn’t load it. Check signal and try again.'
  };
  async function pbBresLoad(company) {
    if (!sbClient || typeof sbClient.rpc !== 'function' || navigator.onLine === false) return { ok: false, message: PB_BRES_MSG.signal };
    let r; try { r = await sbClient.rpc('pb_company_beta_summary', company ? { p_company: company } : {}); } catch (e) { r = { error: e }; }
    if (r && !r.error && r.data && r.data.ok) return r.data;
    const e = (r && r.error) || {}, m = String(e.message || '') + ' ' + String(e.code || ''), code = (/pb:[a-z_]+/.exec(m) || [''])[0];
    if (/PGRST202|could not find the function|does not exist|schema cache/i.test(m) || (r && !r.error && (r.data === null || r.data === undefined))) return { ok: false, message: PB_BRES_MSG.missing };
    return { ok: false, message: PB_BRES_MSG[code] || PB_BRES_MSG.other };
  }
  const pbBresN = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const pbBresInt = (v) => Math.round(pbBresN(v)).toLocaleString('en-US');
  const pbBresH = (v) => { const n = pbBresN(v); return (Math.round(n * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 }) + (n === 1 ? ' hour' : ' hours'); };
  const pbBresFt = (v, u) => (Math.round(pbBresN(v) * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' ' + (u || 'ft');
  const pbBresDay = (d) => { const t = new Date(String(d || '') + 'T12:00:00'); return isNaN(t) ? '' : t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
  const pbBresPl = (n, one, many) => pbBresInt(n) + ' ' + (pbBresN(n) === 1 ? one : (many || one + 's'));
  // The rows, the same words on screen and in the PDF. Rows that are zero are left out of the two lists (said once if a list is empty).
  function pbBresRows(D) {
    const f = D.footage || {}, c = D.caught || {}, p = D.paperwork || {}, u = D.use || {}, k = D.crew || {};
    const crewParts = [pbBresPl(k.foremen, 'foreman', 'foremen'), pbBresPl(k.pipelayers, 'pipelayer'), pbBresPl(k.managers, 'PM or super', 'PMs or supers')].filter((t) => !/^0 /.test(t));
    const work = [
      ['Pipe laid (run reports)', pbBresFt(f.laid_ft)],
      pbBresN(f.pipe_logged_lf) > 0 ? ['Pipe installed (foreman production)', pbBresFt(f.pipe_logged_lf, 'LF')] : null,
      ['Runs locked', pbBresInt(f.runs_locked)],
      ['Days with work logged', pbBresInt(f.days_worked)],
      ['Crew on the app', pbBresInt(k.active) + ' of ' + pbBresInt(k.members) + ' active' + (crewParts.length ? ' (' + crewParts.join(', ') + ')' : '')]
    ].filter(Boolean);
    const z = (n) => pbBresN(n) > 0;
    const caught = [
      z(c.check_shots) ? ['Check shots taken on laid pipe', pbBresInt(c.check_shots) + (z(c.check_shots_off) ? ', ' + pbBresInt(c.check_shots_off) + ' off grade by more than 0.02 ft' : ', all on grade')] : null,
      z(c.warn_hi) ? ['HI discrepancies flagged', pbBresInt(c.warn_hi)] : null,
      z(c.warn_backflow) ? ['Backflow flagged (invert falls the wrong way)', pbBresInt(c.warn_backflow)] : null,
      z(c.warn_low_slope) ? ['Low slope flagged', pbBresInt(c.warn_low_slope)] : null,
      z(c.warn_other) ? ['Other grade sheet checks flagged', pbBresInt(c.warn_other)] : null,
      z(c.utility_conflicts) ? ['Utility conflicts logged', pbBresInt(c.utility_conflicts) + (z(c.utility_damaged) ? ', ' + pbBresInt(c.utility_damaged) + ' damaged' : '')] : null,
      z(c.rework) ? ['Rework logged', pbBresInt(c.rework) + ', ' + pbBresH(c.rework_hours)] : null,
      z(c.delays) ? ['Delays logged on runs', pbBresInt(c.delays) + ', ' + pbBresH(c.delay_hours)] : null,
      z(c.breakdowns) ? ['Equipment breakdowns logged', pbBresInt(c.breakdowns) + ', ' + pbBresH(c.breakdown_hours) + ' down'] : null,
      z(c.daily_delays) ? ['Delays and standby on daily reports', pbBresInt(c.daily_delays) + ', ' + pbBresH(c.daily_delay_hours)] : null,
      z(c.inspections) ? ['Inspections recorded', pbBresInt(c.inspections) + (z(c.inspections_failed) || z(c.inspections_partial) ? ' (' + [z(c.inspections_failed) ? pbBresInt(c.inspections_failed) + ' failed' : '', z(c.inspections_partial) ? pbBresInt(c.inspections_partial) + ' partial' : ''].filter(Boolean).join(', ') + ')' : '')] : null,
      z(c.permit_readings) ? ['Permit air readings outside the permit limits', pbBresInt(c.permit_readings_out) + ' of ' + pbBresPl(c.permit_readings, 'reading')] : null
    ].filter(Boolean);
    const paper = [
      z(p.runs_sent) ? ['Run reports sent to the office', pbBresInt(p.runs_sent)] : null,
      z(p.runs_reviewed) ? ['Run reports reviewed', pbBresInt(p.runs_reviewed)] : null,
      z(p.daily_signed) ? ['Daily reports signed', pbBresInt(p.daily_signed)] : null,
      z(p.permits_closed) ? ['Confined-space permits closed', pbBresInt(p.permits_closed)] : null,
      z(c.extra_work) ? ['Extra work logged on daily reports', pbBresInt(c.extra_work) + ', ' + pbBresH(c.extra_work_hours)] : null,
      z(p.photos_runs) || z(p.photos_daily) ? ['Photos attached', [z(p.photos_runs) ? pbBresInt(p.photos_runs) + ' on run reports' : '', z(p.photos_daily) ? pbBresInt(p.photos_daily) + ' on inspections and daily entries' : ''].filter(Boolean).join(', ')] : null,
      z(p.sealed_copies) ? ['Sealed run report copies stored', pbBresInt(p.sealed_copies)] : null,
      z(u.stake_reads) ? ['Stake photos read by AI', pbBresInt(u.stake_reads)] : null,
      z(u.days_used) ? ['Days the crew used the app', pbBresInt(u.days_used)] : null
    ].filter(Boolean);
    return { work, caught, paper };
  }
  function pbBresWhen(D) {
    const w = D.window || {}, co = D.company || {};
    const range = pbBresDay(w.from) + ' to ' + pbBresDay(w.to) + ' (' + pbBresPl(w.days, 'day') + ')';
    if (w.kind !== 'beta') return { range, chip: 'Last 30 days' };
    if (co.beta_ended) return { range, chip: 'Beta ended' };
    const left = co.trial_ends_at ? Math.max(1, Math.ceil((new Date(co.trial_ends_at).getTime() - Date.now()) / 864e5)) : 0;
    return { range, chip: 'Beta' + (left ? ' · ' + (left === 1 ? '1 day left' : left + ' days left') : '') };
  }
  function pbBresNotesTitle() {
    let r = ''; try { r = pbRoleShown(sbCachedSubscription); } catch (e) { r = ''; }
    return r === 'Superintendent' ? 'Superintendent’s notes' : r === 'Project manager' ? 'Project manager’s notes' : 'Notes';
  }
  function pbBresFooter(D) {
    const w = D.window || {}, co = D.company || {};
    return 'Made ' + pbRptDt(Date.now(), { date: true }) + ' from ' + (co.name || 'the company') + '’s own records in The Pipelayer’s Bible, ' + pbBresDay(w.from) + ' to ' + pbBresDay(w.to)
      + (w.tz && w.tz !== 'UTC' ? ' (' + w.tz + ')' : ' (UTC dates)') + '. Counts are what the crew logged and what the app recorded. The app does not estimate time or money saved.';
  }
  function pbBresText(D, notes) {
    const R = pbBresRows(D), w = pbBresWhen(D), lines = ['BETA RESULTS', (D.company && D.company.name) || '', w.chip + ' · ' + w.range, ''];
    const sec = (t, rows) => { lines.push(t.toUpperCase()); if (!rows.length) lines.push('Nothing logged in this period.'); rows.forEach((x) => lines.push(x[0] + ': ' + x[1])); lines.push(''); };
    sec('The work', R.work); sec('Caught and logged in the field', R.caught); sec('Paperwork', R.paper);
    lines.push(pbBresNotesTitle().toUpperCase() + ' (in their own words)'); lines.push(notes ? notes : '(none)'); lines.push(''); lines.push(pbBresFooter(D));
    return lines.join('\n');
  }
  function pbBresPdf(D, notes) {
    const fp = pbSha256Text(pbJsonbText(JSON.parse(JSON.stringify(Object.assign({}, D, { generated_at: undefined, notes: notes || '' })))));
    const co = D.company || {}, w = D.window || {}, when = pbBresWhen(D), rows = pbBresRows(D), F0 = D.footage || {};
    const short = (d) => { const t = new Date(String(d || '') + 'T12:00:00'); return isNaN(t) ? '' : t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
    // One page: laid out normally, and again tighter (smaller type, slimmer rows) if it would run onto a second page.
    // Notes keep at most 6 lines (anything past the 5th line break runs on in the 6th), so 600 characters always fit.
    const nl = String(notes || '').split(/\n+/).map((t) => t.trim()).filter(Boolean), noteText = (nl.length > 6 ? nl.slice(0, 5).concat([nl.slice(5).join(' ')]) : nl).join('\n');
    const make = (tight) => pbRptMake((R) => {
      const G = PB_RPT, fs = tight ? 8.5 : 9.5;
      R.beginRecord({ company: co.name || pbRptCompany(), type: 'Beta Results', outline: 'Beta Results', title: co.name || '', job: when.chip + ' · ' + pbBresDay(w.from) + ' to ' + pbBresDay(w.to),
        recordId: 'Beta Results', version: 'from the company’s records, ' + short(w.from) + ' to ' + pbBresDay(w.to), fp, fpShort: pbRptShort(fp), generated: pbRptDt(Date.now()), account: pbRptAccount(), build: pbRptBuild() });
      pbRptTitle(R, 'Beta Results', tight ? '' : (co.name || '') + ' · ' + when.chip + ' · ' + when.range);
      R.banner(pbBresFt(F0.laid_ft).toUpperCase() + ' OF PIPE LAID · ' + pbBresPl(F0.runs_locked, 'RUN').replace(/RUNs$/, 'RUNS') + ' LOCKED', 'ok', tight ? (co.name || '') + ' · ' + when.chip + ' · ' + when.range : '');
      const block = (title, list) => {
        R.sub(title, { keep: 10 });
        if (!list.length) { R.para('Nothing logged in this period.', { size: fs, color: G.MUTED }); return; }
        R.table({ body: list.map((x) => [{ content: x[0], _bold: true, _fill: G.OKFILL }, x[1]]), columns: [{ cellWidth: 92 }, { cellWidth: G.CW - 92 }], fontSize: fs, keep: 6, after: tight ? 1.5 : 2.5,
          didParseCell: tight ? (d) => { d.cell.styles.cellPadding = { top: 0.55, bottom: 0.55, left: 1.5, right: 1.5 }; } : undefined });
      };
      block('The work', rows.work);
      block('Caught and logged in the field', rows.caught);
      block('Paperwork', rows.paper);
      R.sub(pbBresNotesTitle(), { keep: 24 });
      R.para('Written by the person who made this PDF, in their own words. Any estimate here is theirs, not counted by the app.', { size: 8, color: G.MUTED, after: 1.2 });
      if (noteText) { // his words in a plain frame (the heading above already names them)
        const pad = 2.4, lh = pbRptLh(fs); R.font(fs, 'normal'); const L = R.split(noteText, G.CW - 2 * pad), h = L.length * lh + 2 * pad;
        R.ensure(h + 2); const top = R.y; R.doc.setDrawColor(110, 110, 110); R.doc.setLineWidth(0.35); R.doc.rect(G.ML, top, G.CW, h);
        R.font(fs, 'normal'); L.forEach((l, i) => R.doc.text(l, G.ML + pad, top + pad + lh * (i + 0.75))); R.y = top + h + 2.5;
      }
      else { const top = R.y; R.doc.setDrawColor(150, 150, 150); R.doc.setLineWidth(0.25); for (let i = 1; i <= 3; i++) R.doc.line(G.ML, top + i * 7, G.ML + G.CW, top + i * 7); R.y = top + 3 * 7 + 3; }
      R.para(pbBresFooter(D), { size: 8, color: G.MUTED, after: 0 });
    }, { meta: { title: 'Beta Results', creator: pbRptBuild() } });
    let doc = make(false);
    if (doc.getNumberOfPages() > 1) doc = make(true);
    return doc;
  }
  window.pbBetaResultsOpen = async function(company, companyName) {
    const old = document.getElementById('pbBresSheet'); if (old) old.remove();
    const ov = document.createElement('div'); ov.className = 'pb-fb'; ov.id = 'pbBresSheet';
    ov.innerHTML = '<div class="pb-fb-card pb-bres-card" role="dialog" aria-modal="true" aria-labelledby="pbBresTitle">'
      + '<div class="pb-fb-top"><span id="pbBresTitle">Beta Results</span><button type="button" class="pb-fb-x" aria-label="Close" id="pbBresX">&times;</button></div>'
      + '<p class="pb-bres-sub" id="pbBresSub">' + escapeHtml(companyName || '') + '</p><div id="pbBresBody"><p class="pb-fb-st">Loading…</p></div></div>';
    document.body.appendChild(ov); document.documentElement.classList.add('pb-fb-open');
    const keepOpen = () => !!document.getElementById('pbOwnerSheet');
    const close = () => { ov.remove(); if (!keepOpen()) document.documentElement.classList.remove('pb-fb-open'); };
    ov.querySelector('#pbBresX').onclick = close;
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    const body = ov.querySelector('#pbBresBody'), sub = ov.querySelector('#pbBresSub');
    const D = await pbBresLoad(company || null);
    if (!document.body.contains(ov)) return;
    if (!D.ok) { body.innerHTML = '<p class="pb-fb-st" id="pbBresSt" role="status">' + escapeHtml(D.message) + '</p>'; return; }
    try { window.pbTrack('beta_results:open'); } catch (e) {}
    const W = pbBresWhen(D), rows = pbBresRows(D), co = D.company || {};
    sub.textContent = (co.name || '') + ' · ' + W.chip + ' · ' + W.range;
    const sec = (id, title, list) => '<div class="pb-bres-sec" id="' + id + '"><h3>' + escapeHtml(title) + '</h3>'
      + (list.length ? list.map((x) => '<div class="pb-bres-row"><span class="k">' + escapeHtml(x[0]) + '</span><span class="v">' + escapeHtml(x[1]) + '</span></div>').join('') : '<p class="pb-bres-none">Nothing logged in this period.</p>') + '</div>';
    const dk = 'pbBresNotes:' + (sbUser ? sbUser.id : '') + ':' + (co.id || '');
    let draft = ''; try { draft = localStorage.getItem(dk) || ''; } catch (e) { draft = ''; }
    body.innerHTML = '<div class="pb-bres-big" id="pbBresBig">' + escapeHtml(pbBresFt((D.footage || {}).laid_ft)) + ' laid</div>'
      + sec('pbBresWork', 'The work', rows.work) + sec('pbBresCaught', 'Caught and logged in the field', rows.caught) + sec('pbBresPaper', 'Paperwork', rows.paper)
      + '<div class="pb-bres-sec pb-bres-notes"><label for="pbBresNotes">' + escapeHtml(pbBresNotesTitle()) + ' (optional)<span class="pb-bres-hint">Printed on the PDF as your own words. Put your own estimate of time saved here if you want one.</span></label>'
      + '<textarea id="pbBresNotes" maxlength="600" placeholder="What the crew thought, time you think it saved, anything the owner should know."></textarea><p class="pb-bres-count" id="pbBresCount"></p></div>'
      + '<button type="button" class="pb-btn" id="pbBresPdf">Make PDF</button>'
      + '<p class="pb-fb-st" id="pbBresSt" role="status"></p>';
    const ta = body.querySelector('#pbBresNotes'), cnt = body.querySelector('#pbBresCount');
    ta.value = draft.slice(0, 600);
    const upd = () => { cnt.textContent = ta.value.length + ' / 600'; try { if (ta.value.trim()) localStorage.setItem(dk, ta.value); else localStorage.removeItem(dk); } catch (e) {} };
    ta.addEventListener('input', upd); upd();
    body.querySelector('#pbBresPdf').onclick = () => {
      const notes = ta.value.trim().slice(0, 600);
      const st = body.querySelector('#pbBresSt');
      if (typeof window.pbPdfViewOpen !== 'function') { st.textContent = 'The PDF tool isn’t available on this phone.'; return; }
      try { window.pbTrack('beta_results:pdf'); } catch (e) {}
      ov.remove(); const own = document.getElementById('pbOwnerSheet'); if (own) own.remove(); document.documentElement.classList.remove('pb-fb-open');
      const nm = String(co.name || 'company').replace(/[^a-z0-9-]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'company';
      window.pbPdfViewOpen({ key: 'bres|' + (co.id || '') + '|' + ((D.window || {}).to || '') + '|' + pbSha256Text(notes).slice(0, 12), eyebrow: 'BETA RESULTS', title: 'Beta Results', sub: (co.name || '') + ' · ' + W.range,
        entry: { kind: 'beta-results', reportText: pbBresText(D, notes) }, make: () => pbBresPdf(D, notes), name: 'beta-results-' + nm + '-' + ((D.window || {}).to || 'today') + '.pdf' });
    };
  };
  async function pbSupRender() {""")

open(out, 'w', encoding='utf-8').write(s)
print('ok', out)
