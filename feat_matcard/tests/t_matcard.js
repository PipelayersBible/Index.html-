// r15.18 feat_matcard (owner: tap the material to expand details; no Add Cost Code Line / Details buttons). Harness from r15.17 feat_wasteadj (owner: "I edited the waste allowance and it didn't change the total amount"). Harness from r15.16: road base Class 2/3/6, Type-then-kind form, asphalt/road base in the tons picker, spoils on the overview. Harness from r15.14 feat_itemmat (owner, Oct 22): material rows under each overview item, hide/show, material + item alerts, "Use the pipe length" box.
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/feat_matcard/';
const NEWJOB = () => {
  const orig = window.__rpc, jk = (n) => String(n || '').trim().toLowerCase().slice(0, 60);
  window.__rpc = async (fn, args) => {
    if (fn === 'pb_prod_job_create') {
      window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args || {})) });
      if (localStorage.getItem('__noJobCreate') === '1') return { data: null, error: { message: 'Could not find the function public.pb_prod_job_create(p_address, p_expect_uid, p_job_number, p_plan, p_project_name, p_start_date) in the schema cache' } };
      if ((localStorage.getItem('__rpcMode') || 'ok') === 'offline') return { data: null, error: { message: 'TypeError: Failed to fetch' } };
      const me = (JSON.parse(localStorage.getItem('__mockSess') || 'null') || {}).id;
      if (args.p_expect_uid !== me) return { data: null, error: { message: 'pb:wrong_account' } };
      if (localStorage.getItem('__manager') !== '1') return { data: null, error: { message: 'pb:not_company_account' } };
      const srv = JSON.parse(localStorage.getItem('__psrv') || '{"entries":{},"plans":{}}'), co = localStorage.getItem('__company') || 'c1', k = jk(args.p_job_number);
      if (!k) return { data: null, error: { message: 'pb:bad_job' } };
      const p = srv.plans[co + '|' + k], e = Object.values(srv.entries || {}).find(x => x.company === co && jk(x.record && x.record.jobNumber) === k);
      if (p || e) return { data: null, error: { message: 'pb:job_exists ' + ((p && p.job_number) || e.record.jobNumber) } };
      srv.plans[co + '|' + k] = { plan: args.p_plan, version: 1, job_number: String(args.p_job_number).trim() }; localStorage.setItem('__psrv', JSON.stringify(srv));
      const info = JSON.parse(localStorage.getItem('__jinfo') || '{}'); info[k] = { project_name: args.p_project_name || null, address: args.p_address || null, start_date: args.p_start_date || null }; localStorage.setItem('__jinfo', JSON.stringify(info));
      return { data: { ok: true, job_key: k, job_number: String(args.p_job_number).trim(), version: 1, plan: args.p_plan }, error: null };
    }
    const r = await orig(fn, args);
    if (fn === 'pb_prod_company_dashboard' && r && r.data && Array.isArray(r.data.jobs)) { const info = JSON.parse(localStorage.getItem('__jinfo') || '{}'); r.data.jobs.forEach(j => Object.assign(j, info[j.job_key] || { project_name: null, address: null, start_date: null })); }
    return r;
  };
};
async function setup(browser, opts) {
  const ctx = await browser.newContext({ viewport: { width: opts.width || 390, height: opts.height || 844 }, isMobile: true, hasTouch: true });
  await ctx.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await ctx.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await ctx.addInitScript(M.mockInit); await ctx.addInitScript(T.RPC); await ctx.addInitScript(NEWJOB);
  await ctx.addInitScript(([mg, ex]) => {
    if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('__mockSess', JSON.stringify({ id: 'acctA', email: 'a@x.com' })); localStorage.setItem('lastKnownUserId', 'acctA'); localStorage.setItem('legacyDataMigrated', 'true');
    localStorage.setItem('acctA:cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active' }));
    if (mg) localStorage.setItem('__manager', '1');
    for (const k in ex || {}) localStorage.setItem(k, typeof ex[k] === 'string' ? ex[k] : JSON.stringify(ex[k]));
  }, [opts.manager !== false, Object.assign({ __psrv: T.seedServer() }, opts.extra || {})]);
  const page = await M.open(ctx); await M.dismiss(page); await page.waitForTimeout(1200);
  await page.evaluate(() => pbGotoTab('home')); await T.waitFor(page, () => document.querySelectorAll('#homeCxJobs .pbx-job').length > 0 || !document.documentElement.classList.contains('pb-cx'), 10000);
  return { ctx, page };
}
const scr = (p) => p.evaluate(() => document.querySelector('.pb-screen.active').id);
const vis = (p, s) => p.evaluate((q) => { const e = document.querySelector(q); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, s);
const txt = (p, s) => p.evaluate((q) => { const e = document.querySelector(q); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, s);
const calls = (p, fn) => p.evaluate((f) => window.__rpcLog.filter(x => x.fn === f), fn);
const val = (p, s) => p.inputValue(s);
const MATMOCK = () => { const o = window.__rpc; window.__rpc = async (fn, args) => {
  if (fn === 'pb_mat_job') return { data: { job_key: String(args.p_job_number).toLowerCase(), job_number: args.p_job_number, materials: JSON.parse(localStorage.getItem('__mats') || '[]'), pipe_ft: { counted: 0, waiting: 0 }, server_at: new Date().toISOString() }, error: null };
  if (fn === 'pb_mat_save') { window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args)) }); { const L = JSON.parse(localStorage.getItem('__mats') || '[]'); L.push(Object.assign({ id: 'n' + L.length, version: 1, unit: 'LF', fig: { status: 'ok', used: 0, ordered: 0, waiting: 0 }, orders: [], uses: [] }, args.p_material)); localStorage.setItem('__mats', JSON.stringify(L)); } return { data: { ok: true, material: Object.assign({ id: 'm' + Date.now(), version: 1, unit: 'yd³' }, args.p_material) }, error: null }; }
  if (fn === 'pb_mat_tickets') return { data: { lines: [] }, error: null };
  if (fn === 'pb_mat_job_settings') return { data: { settings: localStorage.getItem('__noTrench') ? null : { trench_width_ft: 3, bed_thick_ft: 0.5, shade_thick_ft: 1, pipe_od_in: 8.625, version: 1 } }, error: null };
  return o(fn, args); }; };
const SPMOCK = () => { const o = window.__rpc; window.__rpc = async (fn, args) => { if (fn === 'pb_mat_spoils') { const v = localStorage.getItem('__spoils'); return { data: v ? JSON.parse(v) : null, error: null }; } return o(fn, args); }; };
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  const PLAN = { categories: [{ key: 'restoration', name: 'Restoration - Main', unit: 'LF', planned: 1000 }] };
  const MATS = [{ id: 'a1', name: 'Asphalt', category: 'other', kind: 'asphalt', source: 'entered', item_key: 'restoration', unit: 'ton', expected: 285.8, density_tpy: 1.96, extra_pct: 5, alert_pct: 80, version: 1, archived: false, fig: { status: 'ok', used: 0, ordered: 0, waiting: 0 }, orders: [], uses: [] },
    { id: 'b1', name: 'Bedding rock', category: 'bedding_rock', source: 'bedding_calc', basis: 'volume', unit: 'yd³', expected: 115, extra_pct: 15, trench_width_ft: 3, bed_thick_ft: 0.5, alert_pct: 80, version: 1, archived: false, fig: { status: 'ok', used: 0, ordered: 0, waiting: 0 }, orders: [], uses: [] }];
  try {
    const { ctx, page } = await setup(browser, {}); await ctx.addInitScript(MATMOCK); await ctx.addInitScript(SPMOCK); await page.reload(); await page.waitForTimeout(1500);
    page.on('pageerror', e => errs.push(String(e)));
    await page.evaluate(([P, L]) => { const srv = JSON.parse(localStorage.getItem('__psrv')); srv.plans['c1|24-101'] = { plan: P, version: 3, job_number: '24-101' }; localStorage.setItem('__psrv', JSON.stringify(srv)); localStorage.setItem('__mats', JSON.stringify(L)); }, [PLAN, MATS]);
    await page.evaluate(() => window.pbCxOpenJob('24-101', 'materials')); await page.waitForTimeout(2500);
    const btns = await page.evaluate(() => [...document.querySelectorAll('#pjMat_a1 .pbm-acts button')].map(b => b.textContent));
    check('card buttons: no Add Cost Code Line, no Details (' + btns.join(', ') + ')', !btns.some(t => /Cost Code Line|Details/.test(t)) && btns.includes('Edit') && btns.includes('Add Order'));
    check('closed: no details, cue says Details', !(await page.$('#pjMatD_a1')) && /Details/.test(await txt(page, '#pjMat_a1 .pbm-more')) && (await page.getAttribute('#pjMat_a1 .pbm-head', 'aria-expanded')) === 'false');
    await page.tap('#pjMat_a1 .pbm-name'); await page.waitForTimeout(400);
    check('tap the material name: details open, cue says Hide details', !!(await page.$('#pjMatD_a1')) && /Hide details/.test(await txt(page, '#pjMat_a1 .pbm-more')) && (await page.getAttribute('#pjMat_a1 .pbm-head', 'aria-expanded')) === 'true');
    await page.screenshot({ path: SHOTS + 'card_open.png', fullPage: false });
    await page.tap('#pjMat_a1 .pbm-line2'); await page.waitForTimeout(400);
    check('tap the numbers: details close', !(await page.$('#pjMatD_a1')));
    await page.focus('#pjMat_b1 .pbm-head'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    check('keyboard Enter opens too', !!(await page.$('#pjMatD_b1')));
    await page.tap('#pjMat_a1 .pbm-acts button >> text=Edit'); await page.waitForTimeout(400);
    check('Edit has Add Another Cost Code Line', !!(await page.$('#pmfAddLine')));
    await page.tap('#pmfAddLine'); await page.waitForTimeout(500);
    check('it opens "Another cost code line: Asphalt"', /Another cost code line: Asphalt/.test(await txt(page, '#pmfForm') || ''));
    await page.evaluate(() => window.pbMatFormCancel());
    await page.tap('#pjMatAdd'); await page.waitForTimeout(400);
    check('a new material has no Add Another Cost Code Line', !(await page.$('#pmfAddLine')));
    await page.evaluate(() => window.pbMatFormCancel());
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
