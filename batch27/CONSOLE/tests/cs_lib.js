// Batch 27 CONSOLE: realistic company data for the screenshots (and the tests). Builds on batch 20 HOME's pd_lib setup
// (hunt6 mock5 Supabase, window.__rpc fake of pb_prod_*). On top of it an init script answers the company reads with canned
// data: 5 jobs at different progress, live runs and a permit, materials at alert, unread management reports, PMs.
//   localStorage '__csOff' = '1': every canned read fails as offline (the copies kept on this phone show instead).
const L = require('/home/claude/batch20/HOME/tests/pd_lib.js');
const { M } = L;
const CANNED = () => {
  const orig = window.__rpc;
  const day = (off) => { const d = new Date(); d.setDate(d.getDate() + (off || 0)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
  const cats6 = (pl) => ({ categories: [
    { key: 'demo', name: 'Demo', unit: 'LF', planned: pl[0] }, { key: 'excavation', name: 'Excavation', unit: 'LF', planned: pl[1] },
    { key: 'pipe', name: 'Pipe Installed', unit: 'LF', planned: pl[2] }, { key: 'backfill', name: 'Backfill', unit: 'LF', planned: pl[3] },
    { key: 'restoration', name: 'Restoration', unit: 'SY', planned: pl[4] }, { key: 'structures', name: 'Structures', unit: 'EA', planned: pl[5] }] });
  const S = (key, unit, done, today, week) => ({ key, unit, done, today: today || 0, week: week || 0, n: 3 });
  const JOBS = [
    { job_key: '24-101', job_number: '24-101', jobsite: 'Elm St water main', last_at: ago(12), reporters_today: 3, waiting: 2, edits_waiting: 1, last_work_date: day(0), plan_version: 3,
      plan: cats6([1200, 2400, 2400, 2400, 900, 8]), cats: [S('demo', 'LF', 1200, 0, 120), S('excavation', 'LF', 1970, 140, 610), S('pipe', 'LF', 1780, 120, 560), S('backfill', 'LF', 1460, 100, 480), S('restoration', 'SY', 180, 0, 60), S('structures', 'EA', 4, 1, 2), S('_manhours', 'h', 1310, 30, 190)] },
    { job_key: '25-014', job_number: '25-014', jobsite: 'Hwy 9 storm drain', last_at: ago(45), reporters_today: 1, waiting: 0, edits_waiting: 0, last_work_date: day(0), plan_version: 2,
      plan: cats6([400, 1600, 1600, 1600, 300, 6]), cats: [S('demo', 'LF', 400), S('excavation', 'LF', 1600, 60, 200), S('pipe', 'LF', 1540, 80, 260), S('backfill', 'LF', 1594, 80, 240), S('restoration', 'SY', 210, 20, 60), S('structures', 'EA', 5, 0, 1)] }, // 96% pipe, 99.6% backfill (shows 99%)
    { job_key: '24-202', job_number: '24-202', jobsite: 'Oak Ave sewer rehab', last_at: ago(60 * 5), reporters_today: 1, waiting: 1, edits_waiting: 0, last_work_date: day(0), plan_version: 1,
      plan: cats6([600, 1800, 1800, 1800, 700, 12]), cats: [S('demo', 'LF', 520, 40, 160), S('excavation', 'LF', 610, 80, 240), S('pipe', 'LF', 480, 60, 200), S('backfill', 'LF', 300, 0, 120), S('restoration', 'SY', 0), S('structures', 'EA', 2, 0, 1)] },
    { job_key: '25-030', job_number: '25-030', jobsite: 'Riverside lift station', last_at: ago(60 * 26), reporters_today: 0, waiting: 0, edits_waiting: 0, last_work_date: day(-1), plan_version: 1,
      plan: { categories: [{ key: 'excavation', name: 'Excavation', unit: 'CY', planned: 2200 }, { key: 'structures', name: 'Wet well & vault', unit: 'EA', planned: 2 }, { key: 'pipe', name: 'Force main', unit: 'LF', planned: 900 }] },
      cats: [S('excavation', 'CY', 260, 0, 120), S('structures', 'EA', 0), S('pipe', 'LF', 40, 0, 40)] },
    { job_key: '23-088', job_number: '23-088', jobsite: 'Maple Ct storm repair', last_at: ago(60 * 24 * 3), reporters_today: 0, waiting: 0, edits_waiting: 0, last_work_date: day(-3), plan_version: 2,
      plan: { categories: [{ key: 'excavation', name: 'Excavation', unit: 'LF', planned: 320 }, { key: 'pipe', name: 'Pipe Installed', unit: 'LF', planned: 300 }, { key: 'backfill', name: 'Backfill', unit: 'LF', planned: 300 }, { key: 'restoration', name: 'Restoration', unit: 'SY', planned: 140 }] },
      cats: [S('excavation', 'LF', 320), S('pipe', 'LF', 306), S('backfill', 'LF', 300), S('restoration', 'SY', 140)] },
    { job_key: '25-041', job_number: '25-041', jobsite: 'Cedar Ln service lines', last_at: ago(60 * 50), reporters_today: 0, waiting: 0, edits_waiting: 0, last_work_date: day(-2), plan_version: 0,
      plan: null, cats: [S('pipe', 'LF', 400, 0, 160), S('excavation', 'LF', 420, 0, 180)] }
  ];
  const MAT = (id, job, name, unit, used, waiting, ordered, expected, extra) => Object.assign({ id, job_key: job, job_number: job, name, unit, category: 'other', source: 'entered', expected, alert_pct: 80, archived: false,
    fig: { used, waiting, ordered, estimate: false, status: 'ok' }, orders: [], uses: [] }, extra || {});
  const MATS = {
    '24-101': [MAT('m1', '24-101', '3/4" crushed rock', 'tons', 410, 22, 520, 700, { category: 'bedding_rock', source: 'bedding_calc', fig: { used: 410, waiting: 22, ordered: 520, estimate: true, status: 'ok' } }),
      MAT('m2', '24-101', '8" C900 PVC', 'LF', 1780, 0, 2000, 2400, { category: 'pipe', source: 'pipe_footage' }), MAT('m3', '24-101', '8" gate valves', 'EA', 5, 0, 8, 8, { category: 'fittings' })],
    '25-014': [MAT('m4', '25-014', '24" RCP', 'LF', 1540, 0, 1600, 1500, { category: 'pipe', source: 'pipe_footage' }), MAT('m5', '25-014', 'Pea gravel', 'tons', 300, 0, 600, 640, { category: 'bedding_rock', source: 'bedding_calc', fig: { used: 300, waiting: 0, ordered: 600, estimate: true, status: 'ok' } })],
    '24-202': [MAT('m6', '24-202', 'Coarse sand', 'yd³', 120, 0, 400, 380, { category: 'bedding_sand', source: 'bedding_calc', fig: { used: 120, waiting: 0, ordered: 400, estimate: true, status: 'ok' } })]
  };
  const LINES = { '24-101': [{ ticket_id: 't1', line_no: 1, item: '3/4" crushed rock', qty: 24.6, unit: 'tons', supplier: 'Granite Rock Co', ticket_no: '88412', ticket_date: day(0), has_photo: true, link: { id: 'l1', material_id: 'm1' } },
    { ticket_id: 't2', line_no: 1, item: 'Concrete 3000 psi', qty: 6, unit: 'yd³', supplier: 'Central Ready Mix', ticket_no: 'C-2291', ticket_date: day(-1), has_photo: true, link: null },
    { ticket_id: 't3', line_no: 1, item: '8" C900 PVC', qty: 400, unit: 'LF', supplier: 'Ferguson Waterworks', ticket_no: '5530178', ticket_date: day(-3), has_photo: true, link: { id: 'l2', material_id: 'm2' } }] };
  const PEOPLE = [
    { name: 'Frank Ortiz', foreman: null, runs: [{ job_number: '24-101', ended: false, updated_at: ago(6), status: { label: 'MH-7 to MH-8', totalFt: 320, laidFt: 210, rowsLaid: 21, lastLaidAt: ago(8) } }] },
    { name: 'Wes Hall', foreman: 'Frank Ortiz', runs: [{ job_number: '24-101', ended: false, updated_at: ago(14), status: { label: 'Service tie-ins, Elm & 3rd', totalFt: 140, laidFt: 60, rowsLaid: 6, lastLaidAt: ago(20) } }] },
    { name: 'Fiona Reyes', foreman: null, runs: [{ job_number: '25-014', ended: false, updated_at: ago(3), status: { label: 'CB-12 to CB-13', totalFt: 260, laidFt: 240, rowsLaid: 24, lastLaidAt: ago(4) } }] },
    { name: 'Dale Kim', foreman: 'Fiona Reyes', runs: [{ job_number: '25-014', ended: true, updated_at: ago(200), status: {} }] }
  ];
  const PERMITS = [{ who: 'Luis Moreno', permit_ref: 'p1', closed: false, updated_at: ago(9), status: { space: 'MH-14 (existing sewer manhole)', jobsite: 'Oak Ave sewer rehab', jobNumber: '24-202', inside: 2, activeSince: ago(70), lastAirAt: ago(11), airOk: true, emergency: false } }];
  const INBOX = { company_name: 'DIG Civil Construction', reports: [
    { id: 'r-1', status: 'new', category: 'Safety concern', anonymous: true, created_at: ago(40), time_is_hour: true, body: 'Shoring on the Oak Ave trench looked short near MH-14.', messages: [] },
    { id: 'r-2', status: 'new', category: 'Equipment', anonymous: false, sender_name: 'Wes Hall', created_at: ago(180), body: 'Excavator 312 leaking hydraulic fluid.', messages: [] },
    { id: 'r-3', status: 'read', category: 'Site issue', anonymous: false, sender_name: 'Frank Ortiz', created_at: ago(60 * 30), body: 'Gas line marked wrong at Elm & 3rd.', messages: [{ from_management: true, body: 'Called 811, thanks.', at: ago(60 * 28) }] }] };
  const DETAIL = (j) => ({ job_number: j.job_number, jobsite: j.jobsite, plan: j.plan, plan_version: j.plan_version, cats: j.cats,
    days: [0, -1, -2, -3].flatMap(o => [{ date: day(o), key: 'pipe', qty: 120 - o * 10 }, { date: day(o), key: 'excavation', qty: 140 - o * 8 }]),
    reporters: [{ name: 'Frank Ortiz', today: true, entries: 18, last_at: ago(12) }, { name: 'Wes Hall', today: true, entries: 9, last_at: ago(40) }, { name: 'Ana Torres', today: false, entries: 4, last_at: ago(60 * 30) }],
    recent: [{ id: 'e1', kind: 'run', work_date: day(0), entered_by: 'Frank Ortiz', version: 1, items: [{ key: 'pipe', qty: 120, unit: 'LF' }, { key: 'excavation', qty: 140, unit: 'LF' }] },
      { id: 'e2', kind: 'run', work_date: day(-1), entered_by: 'Frank Ortiz', version: 2, items: [{ key: 'pipe', qty: 110, unit: 'LF' }] }],
    crew: j.waiting ? [{ id: 'c1', status: 'pending', work_date: day(0), entered_by: 'Wes Hall', items: [{ key: 'pipe', qty: 60, unit: 'LF' }], deadline: new Date(Date.now() + 20 * 3600000).toISOString(), counted: false },
      { id: 'c2', status: 'assigned', assigned_name: 'Frank Ortiz', work_date: day(-1), entered_by: 'Ana Torres', items: [{ key: 'excavation', qty: 80, unit: 'LF' }], deadline: new Date(Date.now() + 4 * 3600000).toISOString(), counted: false }].slice(0, j.waiting) : [],
    approvals: j.edits_waiting ? [{ id: 'a1', kind: 'edit', work_date: day(-1), by_name: 'Wes Hall', saved_at: ago(90), before: [{ key: 'pipe', qty: 100, unit: 'LF' }], after: [{ key: 'pipe', qty: 120, unit: 'LF' }] }] : [] });
  window.__rpc = async (fn, args) => {
    const off = localStorage.getItem('__csOff') === '1';
    const done = (data) => off ? { data: null, error: { message: 'TypeError: Failed to fetch' } } : { data, error: null };
    const jn = String((args && args.p_job_number) || '').toLowerCase();
    const job = JOBS.find(j => j.job_key === jn);
    switch (fn) {
      case 'pb_prod_company_dashboard': return done({ today: day(0), jobs: JSON.parse(JSON.stringify(JOBS)) });
      case 'pb_prod_company_links': return done({ links: [{ foreman: 'Frank Ortiz', pipelayer: 'Wes Hall', since: ago(60 * 24 * 20) }, { foreman: 'Fiona Reyes', pipelayer: 'Dale Kim', since: ago(60 * 24 * 6) }] });
      case 'pb_prod_company_live': return done({ server_at: new Date().toISOString(), people: PEOPLE });
      case 'pb_prod_company_live_permits': { const P = JSON.parse(JSON.stringify(PERMITS)); if (localStorage.getItem('__csEmerg') === '1') { P[0].status.emergency = true; P[0].status.emergencyAt = ago(3); } return done({ server_at: new Date().toISOString(), permits: P }); }
      case 'pb_prod_job_detail': return job ? done(DETAIL(job)) : orig(fn, args);
      case 'pb_ticket_company_totals': return done({ tickets: (LINES[jn] || []).length, concrete_yd3: 6, lines: [] });
      case 'pb_mat_company': return done({ server_at: new Date().toISOString(), jobs: Object.keys(MATS).map(k => ({ job_key: k, job_number: k, unassigned_tickets: (LINES[k] || []).filter(x => !x.link).length, stale_ticket_links: 0, materials: MATS[k] })) });
      case 'pb_mat_job': return done({ job_key: jn, job_number: jn, materials: MATS[jn] || [] });
      case 'pb_mat_tickets': return done({ lines: LINES[jn] || [], unassigned: (LINES[jn] || []).filter(x => !x.link).length });
      case 'pb_mat_job_settings': return done({ settings: { trench_width_ft: 3, bed_thick_ft: 0.5, pipe_od_in: 9.05 } });
      case 'pb_job_pms_get': return done({ ok: true, is_owner: true, assigned: jn === '24-101' ? [{ user_id: 'pm1', name: 'Rachel Nguyen', email: 'rachel@digcivil.test', since: ago(60 * 24 * 40), current: true }] : [], candidates: [{ user_id: 'pm1', name: 'Rachel Nguyen', email: 'rachel@digcivil.test' }, { user_id: 'pm2', name: 'Marcus Webb', email: 'marcus@digcivil.test' }] });
      case 'pb_report_inbox': return done(JSON.parse(JSON.stringify(INBOX)));
    }
    return orig(fn, args);
  };
  // the inbox goes through pbReportRpc (sbClient.rpc too)
};
async function setup(browser, { width = 390, height = 844, xl = false, extra = null, manager = true } = {}) {
  const c2 = await browser.newContext({ viewport: { width, height } });
  await c2.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await c2.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await c2.addInitScript(M.mockInit);
  await c2.addInitScript(L.RPC);
  await c2.addInitScript(CANNED);
  await c2.addInitScript(([mg, ex]) => {
    if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('__mockSess', JSON.stringify({ id: 'acctA', email: 'tommy@digcivil.test' }));
    localStorage.setItem('lastKnownUserId', 'acctA'); localStorage.setItem('legacyDataMigrated', 'true');
    localStorage.setItem('acctA:cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active', companyName: 'DIG Civil Construction', companyRole: 'Company account' }));
    if (mg) localStorage.setItem('__manager', '1');
    if (ex) for (const k in ex) localStorage.setItem(k, typeof ex[k] === 'string' ? ex[k] : JSON.stringify(ex[k]));
  }, [manager, extra]);
  const page = await M.open(c2); await M.dismiss(page);
  await page.waitForTimeout(1500);
  if (xl) { await page.evaluate(() => window.pbSetTextSize(140)); await page.waitForTimeout(300); }
  return { ctx: c2, page };
}
module.exports = Object.assign({}, L, { setup, CANNED, M });
