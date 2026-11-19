#!/usr/bin/env python3
# office3 #36: the office's first bulk exports, as spreadsheets (CSV, opens in Excel / Numbers / Sheets).
# On a job's page (company account, PMs, supers, managers), a "Spreadsheets" panel:
#   1) Production by day (for billing): one row per day, item and unit, from pb_prod_export_days (sql/36). Same numbers
#      as the job page and Home (voided entries and crew runs still in their 24-hour hold are left out, and it says so).
#      No signal: the last 14 days this phone already has for the job (the job page's own copy), and the alert says that
#      is all it holds.
#   2) Crew hours for payroll: one row per person on each signed daily report's crew list (the foreman's hours, as
#      signed; an amended report counts once, as amended), from pb_prod_export_hours. Needs signal.
# Files go through the app's existing CSV writer (downloadCSV: UTF-8 with BOM, formula-safe cells).
# Shared code touched: one line after the job page's Job book row (pbCxOverviewHtml), downloadCSV exposed on window.
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

rep("""  function downloadCSV(filename, rows) {
    const csv = rows.map(row => row.map(csvEscape).join(',')).join('\\n');""",
"""  window.pbDownloadCSV = (filename, rows) => downloadCSV(filename, rows); // office3 #36: the office exports use the same writer
  function downloadCSV(filename, rows) {
    const csv = rows.map(row => row.map(csvEscape).join(',')).join('\\n');""")

rep("""    try { h += window.pbJbPanel ? window.pbJbPanel(job) : ''; } catch (e) { console.error(e); } // feat_jobbook: the Job book row""",
"""    try { h += window.pbJbPanel ? window.pbJbPanel(job) : ''; } catch (e) { console.error(e); } // feat_jobbook: the Job book row
    try { h += pbCxExportPanel(); } catch (e) { console.error(e); } // office3 #36: spreadsheets""")

rep("""  function pbCxOverviewHtml(C) {""",
"""  // ---- office3 #36: spreadsheets for the office (production by day; crew hours for payroll) ----
  function pbCxExportPanel() {
    const job = pbPj.job; if (!job || !job.job_number) return '';
    const row = (id, kind, name, sub) => '<button type="button" class="pbx-row" id="' + id + '" onclick="pbCxExportOpen(\\'' + kind + '\\')"><span class="pbx-doc-ic">' + pbCxIc('reports') + '</span><span class="pbx-row-tx"><span class="pbx-row-h">' + pbCxE(name) + '</span><span class="pbx-row-s">' + pbCxE(sub) + '</span></span><span class="pbx-chev" aria-hidden="true">' + pbCxIc('chevron-right') + '</span></button>';
    return '<section class="pbx-panel" id="pjCxExport" aria-labelledby="pjCxExportH"><h3 class="pbx-h3" id="pjCxExportH">Spreadsheets</h3><div class="pbx-rows flat">'
      + row('pjExpDays', 'days', 'Production by day', 'For billing: each day’s quantities, counted the way this page counts them')
      + row('pjExpHours', 'hours', 'Crew hours for payroll', 'Each person’s hours from the signed daily reports')
      + '</div></section>';
  }
  const pbCxDay = (t) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const pbCxDayAdd = (day, n) => { const t = Date.parse(String(day) + 'T12:00:00'); return isFinite(t) ? pbCxDay(t + n * 86400000) : ''; };
  window.pbCxExportOpen = function(kind, from, to, err) {
    const job = pbPj.job; if (!job || !job.job_number) return;
    const today = pbTkToday(); from = from || pbCxDayAdd(today, -29); to = to || today;
    const title = kind === 'hours' ? 'Crew Hours for Payroll' : 'Production by Day';
    const what = kind === 'hours' ? 'One row per person on each signed daily report of ' + pbProdJobLabel(job.job_number) + ', with the hours the foreman signed.'
      : 'One row per day and item for ' + pbProdJobLabel(job.job_number) + ', with the quantity and how many entries it came from.';
    const cur = { from, to };
    pbShowModal((err ? err + ' ' : '') + what, [{ label: 'Cancel' }, { label: 'Make Spreadsheet', primary: true, onClick: () => { setTimeout(() => window.pbCxExportRun(kind, cur.from, cur.to), 0); } }], title);
    const wrap = document.createElement('div'); wrap.className = 'pb-modal-extra'; wrap.id = 'cxExpWrap'; wrap.style.margin = '0 0 14px 0';
    wrap.innerHTML = '<div class="pb-field"><label for="cxExpFrom">From</label><input type="date" id="cxExpFrom"></div><div class="pb-field"><label for="cxExpTo">To</label><input type="date" id="cxExpTo"></div>';
    [['cxExpFrom', 'from'], ['cxExpTo', 'to']].forEach(([id, k]) => { const el = wrap.querySelector('#' + id); el.value = cur[k]; const up = () => { cur[k] = el.value; }; el.addEventListener('input', up); el.addEventListener('change', up); });
    document.getElementById('pbModalMessage').insertAdjacentElement('afterend', wrap);
  };
  const pbCxNum = (v) => { const n = Number(v); return isFinite(n) ? String(+n.toFixed(2)) : ''; };
  function pbCxExportSave(name, rows) {
    if (typeof window.__debugCsvSink === 'function') { window.__debugCsvSink(name, rows); return; } // TEST-ONLY hook (absent in use)
    window.pbDownloadCSV(name, rows);
  }
  window.pbCxExportRun = async function(kind, from, to) {
    const job = pbPj.job, uid = pbArchiveOwnerUid; if (!job || !job.job_number || !uid) return;
    const again = (t) => window.pbCxExportOpen(kind, from, to, t);
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(from || '')) || !/^\\d{4}-\\d{2}-\\d{2}$/.test(String(to || ''))) return again('Pick both dates.');
    if (to < from) return again('The To date is before the From date.');
    if ((Date.parse(to) - Date.parse(from)) / 86400000 > 400) return again('Pick at most 400 days.');
    const D = pbPj.data, plan = (D && D.plan) || null, safe = String(job.job_number).replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 40) || 'job';
    const online = navigator.onLine !== false && sbClient && typeof sbClient.rpc === 'function' && sbUser && sbUser.id === uid;
    const fn = kind === 'hours' ? 'pb_prod_export_hours' : 'pb_prod_export_days';
    const r = online ? await pbPermitRpc(fn, { p_job_number: job.job_number, p_from: from, p_to: to }, 45000) : null;
    if (!pbPj.job || pbPj.job.job_key !== job.job_key || pbArchiveOwnerUid !== uid) return;
    const m = String((r && r.error && r.error.message) || ''), ok = r && !r.error && r.data && r.data.ok === true && Array.isArray(r.data.rows);
    const noSignal = !online || /failed to fetch|networkerror|load failed|no client|timeout/i.test(m);
    if (kind === 'hours') {
      if (!ok) { pbAlert(noSignal ? 'Crew hours come from the signed daily reports on the company server. Try again with signal.' : /Could not find the function|does not exist/i.test(m) ? 'This spreadsheet isn’t ready on the company server yet.' : pbProdErrText(r), 'Not Made'); return; }
      const rows = [['Date', 'Job number', 'Jobsite', 'Foreman (signed)', 'Person', 'Hours', 'Report version', 'Signed at']];
      r.data.rows.forEach(x => { if (x && typeof x === 'object') rows.push([String(x.date || ''), String(x.job_number || ''), String(x.jobsite || ''), String(x.foreman || ''), String(x.name || ''), x.hours === null || x.hours === undefined ? '' : pbCxNum(x.hours), String(x.version || ''), x.signed_at ? (typeof pbRptDt === 'function' ? pbRptDt(x.signed_at) : String(x.signed_at)) : '']); });
      pbCxExportSave('crew-hours-' + safe + '-' + from + '-to-' + to + '.csv', rows);
      const n = rows.length - 1, rep = Number(r.data.reports) || 0;
      pbAlert(n ? n + (n === 1 ? ' row' : ' rows') + ' from ' + rep + ' signed daily ' + (rep === 1 ? 'report' : 'reports') + '. The hours are the foreman’s, as signed. An amended report counts once, as amended.' : 'No signed daily reports with a crew list in those days. The spreadsheet has only the headings.', 'Crew Hours for Payroll');
      return;
    }
    let src = null, note = '';
    if (ok) src = r.data.rows;
    else if (noSignal && D && Array.isArray(D.days)) { // what this phone has: the job page's last 14 days
      src = D.days.filter(x => x && String(x.date || '') >= from && String(x.date || '') <= to).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.key).localeCompare(String(b.key)));
      const have = D.days.map(x => String((x && x.date) || '')).filter(Boolean).sort();
      note = ' No signal: this has only what this phone holds for the job (the last 14 days' + (have.length ? ', ' + have[0] + ' to ' + have[have.length - 1] : '') + '). Make it again with signal for the whole range.';
    }
    if (!src) { pbAlert(noSignal ? 'No signal, and this phone has no production days for this job yet. Try again with signal.' : /Could not find the function|does not exist/i.test(m) ? 'This spreadsheet isn’t ready on the company server yet.' : pbProdErrText(r), 'Not Made'); return; }
    const P = (ok && r.data.plan && typeof r.data.plan === 'object') ? r.data.plan : plan, name = ((typeof pbCxKnownJob === 'function' && pbCxKnownJob(job.job_number) || {}).project_name || job.project_name || (r && r.data && r.data.job && r.data.job.project_name) || '');
    const rows = [['Job number', 'Job name', 'Date', 'Item', 'Unit', 'Quantity', 'Entries']];
    src.forEach(x => { if (x && typeof x === 'object') rows.push([String(job.job_number), String(name || ''), String(x.date || ''), pbProdCatName(x.key, P), String(x.unit || ''), pbCxNum(x.qty), x.entries === undefined ? '' : String(x.entries)]); });
    pbCxExportSave('production-' + safe + '-' + from + '-to-' + to + (ok ? '' : '-phone-copy') + '.csv', rows);
    const n = rows.length - 1;
    pbAlert((n ? n + (n === 1 ? ' row' : ' rows') + ', ' + from + ' to ' + to + '.' : 'Nothing counted in those days. The spreadsheet has only the headings.') + ' Counted the way the job page counts: crew runs still in their 24-hour hold are not in it yet.' + note, 'Production by Day');
  };
  function pbCxOverviewHtml(C) {""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
