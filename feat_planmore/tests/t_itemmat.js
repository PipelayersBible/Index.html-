// r15.14 feat_itemmat (owner, Oct 22): material rows under each overview item, hide/show, material + item alerts, "Use the pipe length" box.
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/feat_planmore/';
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
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  const PLAN = { categories: [{ key: 'demo', name: 'Demo', unit: 'LF', planned: 50 }, { key: 'excavation', name: 'Excavation', unit: 'LF', planned: 3000, planned_auto: false }, { key: 'pipe', name: 'Pipe Installed', unit: 'LF', planned: 400, planned_auto: true }, { key: 'backfill', name: 'Backfill', unit: 'LF' }, { key: 'restoration', name: 'Restoration', unit: 'LF', planned: 1000 }, { key: 'structures', name: 'Structures', unit: 'EA', planned: 5 }] };
  const MATS = [
    { id: 'p1', name: 'C900 8in', category: 'pipe', source: 'pipe_footage', unit: 'LF', expected: 400, alert_pct: 80, version: 1, archived: false, fig: { status: 'ok', used: 360, ordered: 400, waiting: 0 }, orders: [], uses: [] },
    { id: 'b1', name: 'Bedding rock', category: 'bedding_rock', source: 'bedding_calc', basis: 'volume', unit: 'yd³', expected: 50, alert_pct: 80, version: 1, archived: false, fig: { status: 'ok', used: 10, ordered: 60, waiting: 0 }, orders: [], uses: [] },
    { id: 'c1', name: 'Concrete', category: 'other', kind: 'concrete', source: 'entered', item_key: 'restoration', unit: 'yd³', expected: 13, alert_pct: 80, version: 1, archived: false, fig: { status: 'ok', used: 9, ordered: 10, waiting: 0 }, orders: [], uses: [] },
    { id: 'f1', name: 'Fittings', category: 'fittings', source: 'entered', unit: 'EA', expected: 20, alert_pct: 80, version: 1, archived: false, fig: { status: 'ok', used: 0, ordered: 0, waiting: 0 }, orders: [], uses: [] }];
  try {
    const { ctx, page } = await setup(browser, {}); await ctx.addInitScript(MATMOCK); await page.reload(); await page.waitForTimeout(1500);
    await ctx.addInitScript(() => { const o = () => document.querySelectorAll('details.pbp-rowmore:not([open])').forEach(d => { d.open = true; }); document.addEventListener('DOMContentLoaded', () => { o(); new MutationObserver(o).observe(document.body, { childList: true, subtree: true }); }); }); await page.reload(); await page.waitForTimeout(1500);
    page.on('pageerror', e => errs.push(String(e)));
    await page.evaluate(([P, L]) => { const srv = JSON.parse(localStorage.getItem('__psrv')); srv.plans['c1|24-101'] = { plan: P, version: 3, job_number: '24-101' }; localStorage.setItem('__psrv', JSON.stringify(srv)); localStorage.setItem('__mats', JSON.stringify(L)); localStorage.removeItem('pbItemMatRows'); }, [PLAN, MATS]);
    const open = async () => { await page.evaluate(() => window.pbCxOpenJob('24-101', 'overview')); await page.waitForTimeout(2500); };
    await open();
    const rowsTxt = async () => page.evaluate(() => [...document.querySelectorAll('#pjCxHero .pbx-legrow')].map(r => r.innerText.replace(/\s+/g, ' ').trim()));
    let R = await rowsTxt();
    check('every plan item is listed, Backfill (no plan) too (' + R.length + ')', ['Demo', 'Excavation', 'Pipe Installed', 'Backfill', 'Restoration', 'Structures'].every(n => R.some(x => x.startsWith(n))));
    check('Demo 40/50 = 80%: "Reached 80% of planned" (' + R.find(x => x.startsWith('Demo')) + ')', /Reached 80% of planned/.test(R.find(x => x.startsWith('Demo')) || ''));
    check('Pipe 360/400: at alert too; Structures 2/5 not', /Reached 80% of planned/.test(R.find(x => x.startsWith('Pipe')) || '') && !/Reached 80%/.test(R.find(x => x.startsWith('Structures')) || ''));
    check('hero: "2 items at alert"', /2 items at alert/.test(await txt(page, '#pjCxHero .pbx-flags') || ''));
    const under = async (name) => page.evaluate((n) => { const r = [...document.querySelectorAll('#pjCxHero .pbx-legrow')].find(x => x.innerText.trim().startsWith(n)); const nx = r && r.nextElementSibling; return nx && nx.classList.contains('pbx-matrows') ? [...nx.querySelectorAll('.pbx-matrow')].map(m => m.innerText.replace(/\s+/g, ' ').trim()) : []; }, name);
    let U = await under('Pipe Installed');
    check('under Pipe Installed: C900 8in and Bedding rock (' + U.join(' | ') + ')', U.length === 2 && /^C900 8in/.test(U[0]) && /360 \/ 400 \/ 400 LF/.test(U[0]) && /^Bedding rock/.test(U[1]));
    U = await under('Restoration');
    check('under Restoration: Concrete with "80% of ordered used" (' + U.join(' | ') + ')', U.length === 1 && /Concrete/.test(U[0]) && /80% of ordered used/.test(U[0]));
    U = await under('Not under an item');
    check('Fittings under "Not under an item" (' + U.join(' | ') + ')', U.length === 1 && /Fittings/.test(U[0]));
    check('key line: Materials: used / ordered / expected', /Materials: used \/ ordered \/ expected/.test(await txt(page, '.pbx-itemhead') || ''));
    await page.screenshot({ path: SHOTS + 'overview_mats.png', fullPage: false });
    await page.evaluate(() => document.querySelector('.pbx-itemhead').scrollIntoView({ block: 'start' })); await page.waitForTimeout(200);
    await page.screenshot({ path: SHOTS + 'overview_mats2.png', fullPage: false });
    // hide
    await page.tap('#pjItemMatTog'); await page.waitForTimeout(500);
    R = await rowsTxt();
    check('Hide Materials: no material rows; Restoration shows "1 material alert" (' + R.find(x => x.startsWith('Restoration')) + ')', !(await page.$('#pjCxHero .pbx-matrows')) && /1 material alert/.test(R.find(x => x.startsWith('Restoration')) || ''));
    check('button now says Show Materials', /Show Materials/.test(await txt(page, '#pjItemMatTog')));
    await page.screenshot({ path: SHOTS + 'overview_hidden.png', fullPage: false });
    await page.reload(); await page.waitForTimeout(2000); await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(1200); await open();
    check('stays hidden after the app reopens', !(await page.$('#pjCxHero .pbx-matrows')) && /Show Materials/.test(await txt(page, '#pjItemMatTog') || ''));
    await page.tap('#pjItemMatTog'); await page.waitForTimeout(500);
    check('Show Materials brings them back', !!(await page.$('#pjCxHero .pbx-matrows')));
    // the plan editor
    await page.evaluate(() => window.pbProdPlanEdit()); await page.waitForTimeout(1500);
    const idx = async (n) => page.evaluate((re) => [...document.querySelectorAll('#ppRows input[id^=ppName]')].findIndex(i => new RegExp(re).test(i.value)), n);
    const pi = await idx('^Pipe'), ei = await idx('^Excavation'), di = await idx('^Demo'), si = await idx('^Structures');
    check('Pipe Installed: box checked, Planned 400 read-only (' + await page.inputValue('#ppPlanned' + pi) + ')', await page.isChecked('#ppAuto' + pi) && (await page.inputValue('#ppPlanned' + pi)) === '400' && await page.evaluate((i) => document.getElementById('ppPlanned' + i).readOnly, pi));
    check('Excavation: box unchecked, Planned 3000 editable', !(await page.isChecked('#ppAuto' + ei)) && (await page.inputValue('#ppPlanned' + ei)) === '3000' && !(await page.evaluate((i) => document.getElementById('ppPlanned' + i).readOnly, ei)));
    check('Structures (EA): no box', !(await page.$('#ppAuto' + si)));
    check('Alert at starts at 80', (await page.inputValue('#ppAlert' + di)) === '80');
    await page.check('#ppAuto' + ei); await page.waitForTimeout(400);
    check('check it: Excavation Planned = the pipe length 400, read-only (' + await txt(page, '#ppRow' + ei) + ')', (await page.inputValue('#ppPlanned' + ei)) === '400' && await page.evaluate((i) => document.getElementById('ppPlanned' + i).readOnly, ei) && /Use the pipe length \(400 LF from Pipe Installed\)/.test(await txt(page, '#ppRow' + ei)));
    await page.uncheck('#ppAuto' + ei); await page.waitForTimeout(400);
    await page.fill('#ppPlanned' + ei, '3000');
    check('uncheck: type your own (3000)', (await page.inputValue('#ppPlanned' + ei)) === '3000' && /Planned is your own number/.test(await txt(page, '#ppRow' + ei)));
    await page.screenshot({ path: SHOTS + 'plan_box.png', fullPage: false });
    await page.fill('#ppAlert' + di, '5'); await page.click('#ppSaveBtn'); await page.waitForTimeout(800);
    check('Alert at 5 is refused (' + await txt(page, '#ppEditor') .then(t => (t.match(/Alert at is[^.]*\./) || [''])[0]) + ')', !!(await page.$('#ppSaveBtn')) && /Alert at is a whole number from 10 to 100/.test(await txt(page, '#ppEditor')));
    await page.fill('#ppAlert' + di, '90');
    await page.evaluate(() => window.__rpcLog.length = 0);
    await page.click('#ppSaveBtn'); await page.waitForTimeout(1500);
    const a = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_prod_plan_set').pop() || {}).args);
    const cat = (k) => a && a.p_plan.categories.find(c => c.key === k);
    check('saved: pipe box on (' + JSON.stringify(cat('pipe')) + ')', cat('pipe') && cat('pipe').planned_auto === true && cat('pipe').planned === 400);
    check('saved: excavation box off, 3000 (' + JSON.stringify(cat('excavation')) + ')', cat('excavation') && cat('excavation').planned_auto === false && cat('excavation').planned === 3000);
    check('saved: demo alert 90, structures alert 80, no box on EA', cat('demo').alert_pct === 90 && cat('structures').alert_pct === 80 && !('planned_auto' in cat('structures')));
    R = await rowsTxt();
    check('after save: Demo at 80% is no longer at its 90% alert', !/Reached \d+% of planned/.test(R.find(x => x.startsWith('Demo')) || ''));
    // material form: Overview item for a hand-counted material
    await page.tap('#pjCxTab_materials'); await page.waitForTimeout(800);
    await page.tap('#pjMatAdd'); await page.waitForTimeout(400);
    await page.selectOption('#pmf_category', 'asphalt'); await page.waitForTimeout(300);
    const opts = await page.evaluate(() => [...document.querySelectorAll('#pmf_item_key option')].map(o => o.textContent));
    check('asphalt form has Overview item: None + the plan items (' + opts.join(', ') + ')', opts[0] === 'None' && opts.includes('Restoration') && opts.includes('Pipe Installed'));
    await page.selectOption('#pmf_item_key', 'restoration'); await page.fill('#pmf_expected', '90');
    await page.tap('#pmfSave'); await page.waitForTimeout(1500);
    const m = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_mat_save').pop() || {}).args);
    check('saved with item_key restoration (' + (m && m.p_material.item_key) + ')', m && m.p_material.item_key === 'restoration');
    await page.tap('#pjMatAdd'); await page.waitForTimeout(400);
    await page.selectOption('#pmf_category', 'pipe'); await page.waitForTimeout(300);
    check('a pipe has Footage from, not Overview item', !(await page.$('#pmf_item_key')) && !!(await page.$('#pmf_footage_cat')));
    await page.evaluate(() => window.pbMatFormCancel());
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
