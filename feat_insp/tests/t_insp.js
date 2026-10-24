// r15.14 feat_itemmat (owner, Oct 22): material rows under each overview item, hide/show, material + item alerts, "Use the pipe length" box.
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/feat_insp/';
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
  if (fn === 'pb_mat_mute') { window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args)) }); const L = JSON.parse(localStorage.getItem('__mats') || '[]'); const m = L.find(x => x.id === args.p_material_id); if (m) m.muted = !!args.p_muted; localStorage.setItem('__mats', JSON.stringify(L)); return { data: { ok: true, material: m }, error: null }; }
  if (fn === 'pb_insp_job') { window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args)) }); if (localStorage.getItem('__inspFail') === '1') return { data: null, error: { message: 'TypeError: Failed to fetch' } }; return { data: { ok: true, company_id: 'c1', job_key: String(args.p_job_number).toLowerCase(), can_add: true, items: JSON.parse(localStorage.getItem('__insp') || '[]') }, error: null }; }
  if (fn === 'pb_prod_insp_required') { window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args)) }); const srv = JSON.parse(localStorage.getItem('__psrv')), p = srv.plans['c1|24-101']; const req = {}; for (const k in args.p_required) if (args.p_required[k] != null) req[k] = args.p_required[k]; p.plan = Object.assign({}, p.plan); delete p.plan.inspections; if (Object.keys(req).length) p.plan.inspections = req; p.version++; localStorage.setItem('__psrv', JSON.stringify(srv)); return { data: { ok: true, version: p.version, plan: p.plan }, error: null }; }
  if (fn === 'pb_mat_tickets') return { data: { lines: [] }, error: null };
  if (fn === 'pb_mat_job_settings') return { data: { settings: localStorage.getItem('__noTrench') ? null : { trench_width_ft: 3, bed_thick_ft: 0.5, shade_thick_ft: 1, pipe_od_in: 8.625, version: 1 } }, error: null };
  return o(fn, args); }; };
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  const PLAN = { categories: [{ key: 'pipe', name: 'Pipe Installed', unit: 'LF', planned: 400 }], inspections: { pressure: 4, mandrel: 2 } };
  const it = (id, kind, status) => ({ id, kind, kind_detail: null, status, last_result: status === 'done' ? 'pass' : null, foreman_uid: 'f1', foreman: 'Brandon', sta_from: 100, location_text: null, checks: [], history: [], version: 1 });
  const ITEMS = [it('i1', 'pressure', 'done'), it('i2', 'pressure', 'open'), it('i3', 'mandrel', 'done'), it('i4', 'compaction', 'done'), it('i5', 'compaction', 'open'), it('i6', 'cctv', 'canceled')];
  try {
    const { ctx, page } = await setup(browser, {}); await ctx.addInitScript(MATMOCK); await page.reload(); await page.waitForTimeout(1500);
    page.on('pageerror', e => errs.push(String(e)));
    await page.evaluate(([P, L]) => { const srv = JSON.parse(localStorage.getItem('__psrv')); srv.plans['c1|24-101'] = { plan: P, version: 3, job_number: '24-101' }; localStorage.setItem('__psrv', JSON.stringify(srv)); localStorage.setItem('__mats', '[]'); localStorage.setItem('__insp', JSON.stringify(L)); localStorage.removeItem('pbInspRows'); }, [PLAN, ITEMS]);
    await page.evaluate(() => window.pbCxOpenJob('24-101', 'overview')); await page.waitForTimeout(2500);
    const row = async () => txt(page, '#pjInspRow');
    // pressure: 1 done of max(4 required, 2 items) = 4; mandrel 1 / 2; compaction 1 / 2 (no required: the items); cctv canceled: nothing
    check('overview last line: Inspections 3 / 8 done (' + await row() + ')', /Inspections.*3 \/ 8 done/.test(await row() || ''));
    check('it comes after Spoils / the items', await page.evaluate(() => { const rows = [...document.querySelectorAll('#pjCxHero .pbx-legrow')]; return rows[rows.length - 1].id === 'pjInspRow'; }));
    check('collapsed by default', !(await page.$('#pjInspRows')));
    await page.click('#pjInspRow'); await page.waitForTimeout(300);
    const types = async () => page.evaluate(() => [...document.querySelectorAll('.pbx-insprow')].map(r => r.innerText.replace(/\s+/g, ' ').trim()));
    let T = await types();
    check('expanded: each type with done / expected (' + T.join(' | ') + ')', T.length === 3 && /^Pressure test 1 \/ 4 2 set up$/.test(T[0]) && /^Mandrel test 1 \/ 2 1 set up$/.test(T[1]) && /^Compaction test 1 \/ 2$/.test(T[2]));
    check('links: All inspections, Set required', !!(await page.$('#pjInspAllBtn')) && !!(await page.$('#pjInspEditBtn')));
    await page.screenshot({ path: SHOTS + 'insp_overview.png', fullPage: false });
    await page.evaluate(() => document.getElementById('pjInspRow').scrollIntoView({ block: 'center' })); await page.waitForTimeout(150);
    await page.screenshot({ path: SHOTS + 'insp_overview2.png', fullPage: false });
    await page.click('#pjInspEditBtn'); await page.waitForTimeout(300);
    check('Set required: a box per type, the current counts in them', (await page.$$('.pbx-insprow input')).length === 6 && (await val(page, '#pjInspReq_pressure')) === '4' && (await val(page, '#pjInspReq_compaction')) === '');
    check('focus on the first box', await page.evaluate(() => document.activeElement && document.activeElement.id === 'pjInspReq_inspection'));
    await page.fill('#pjInspReq_pressure', '1.5'); await page.click('#pjInspSave'); await page.waitForTimeout(300);
    check('1.5 refused (' + (await txt(page, '.pbx-insp-err')) + ')', /Pressure test: a whole number up to 999/.test(await txt(page, '.pbx-insp-err') || ''));
    await page.fill('#pjInspReq_pressure', '6'); await page.fill('#pjInspReq_mandrel', ''); await page.fill('#pjInspReq_compaction', '3');
    await page.screenshot({ path: SHOTS + 'insp_required.png', fullPage: false });
    await page.evaluate(() => window.__rpcLog.length = 0);
    await page.click('#pjInspSave'); await page.waitForTimeout(1200);
    const a = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_prod_insp_required').pop() || {}).args);
    check('saved: pressure 6, mandrel cleared, compaction 3 (' + JSON.stringify(a && a.p_required) + ')', a && a.p_job_number === '24-101' && a.p_required.pressure === 6 && a.p_required.mandrel === null && a.p_required.compaction === 3 && a.p_expect_uid === 'acctA');
    T = await types();
    check('after: Pressure 1 / 6, Mandrel 1 / 1 (its one item), Compaction 1 / 3 (' + T.join(' | ') + ')', /^Pressure test 1 \/ 6/.test(T[0]) && /^Mandrel test 1 \/ 1$/.test(T[1]) && /^Compaction test 1 \/ 3/.test(T[2]));
    check('the line: 3 / 10 done', /3 \/ 10 done/.test(await row() || ''));
    check('back out of editing, focus on Set required', !(await page.$('#pjInspSave')) && await page.evaluate(() => document.activeElement && document.activeElement.id === 'pjInspEditBtn'));
    await page.click('#pjInspAllBtn'); await page.waitForTimeout(1500);
    check('All inspections opens the job’s inspections screen', (await scr(page)) === 'screen-inspJob' && /24-101/.test((await txt(page, '#ijHead')) || ''));
    // the hidden state is kept; a failed load falls back to the phone's copy
    await page.evaluate(() => window.pbCxOpenJob('24-101', 'overview')); await page.waitForTimeout(2000);
    check('reopened: still expanded', !!(await page.$('#pjInspRows')));
    await page.click('#pjInspRow'); await page.waitForTimeout(200);
    check('tapping again collapses it', !(await page.$('#pjInspRows')) && await page.getAttribute('#pjInspRow', 'aria-expanded') === 'false');
    await page.evaluate(() => { localStorage.setItem('__inspFail', '1'); }); await page.reload(); await page.waitForTimeout(2500);
    await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(800);
    await page.evaluate(() => window.pbCxOpenJob('24-101', 'overview')); await page.waitForTimeout(2500);
    check('server down: the phone’s copy, said so (' + await row() + ')', /Copy on this phone/.test(await row() || '') && /3 \/ 10 done/.test(await row() || ''));
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
