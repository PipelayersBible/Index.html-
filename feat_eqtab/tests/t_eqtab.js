// r15.20 feat_eqtab: the job page's Equipment tab (used / idle / down per piece). Harness from r15.14 feat_itemmat (owner, Oct 22): material rows under each overview item, hide/show, material + item alerts, "Use the pipe length" box.
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/feat_eqtab/';
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
  const PLAN = { categories: [{ key: 'pipe', name: 'Pipe Installed', unit: 'LF', planned: 400 }], equipment: [{ key: 'eq_cat320', name: 'CAT 320', unit_no: '12', cost_code: '02-300' }, { key: 'eq_loader', name: 'Loader' }, { key: 'eq_roller', name: 'Roller' }] };
  try {
    const { ctx, page } = await setup(browser, {}); await ctx.addInitScript(MATMOCK); await page.reload(); await page.waitForTimeout(1500);
    page.on('pageerror', e => errs.push(String(e)));
    await page.evaluate((P) => { const srv = JSON.parse(localStorage.getItem('__psrv')); srv.plans['c1|24-101'] = { plan: P, version: 3, job_number: '24-101' };
      const k = Object.keys(srv.entries).find(x => srv.entries[x].record && srv.entries[x].record.jobNumber === '24-101'); const e = srv.entries[k];
      const items = (it) => it; // the mock keeps items per version
      const add = (id, list) => { const c = JSON.parse(JSON.stringify(e)); c.id = id; srv.entries['u1|' + id] = c; c.items = list; if (Array.isArray(c.versions)) c.vitems = list; };
      e.items = (e.items || []).concat([{ key: '_eq_cat320', qty: 6, unit: 'h' }, { key: '_ei_cat320', qty: 2, unit: 'h' }, { key: '_ed_cat320', qty: 1, unit: 'h' }, { key: '_eq_loader', qty: 4, unit: 'h' }, { key: '_eq_other', qty: 1.5, unit: 'h' }, { key: '_equiphours', qty: 11.5, unit: 'h' }]);
      localStorage.setItem('__psrv', JSON.stringify(srv)); localStorage.setItem('__mats', '[]'); }, PLAN);
    await page.evaluate(() => window.pbCxOpenJob('24-101', 'overview')); await page.waitForTimeout(2500);
    const tabs = await page.evaluate(() => [...document.querySelectorAll('#pjCxTabs .pbx-tab')].map(b => b.textContent));
    check('tabs: Overview, Waiting, Materials, Equipment, Production (' + tabs.join(', ') + ')', tabs.join('|').replace(/\d+/g, '') === 'Overview|Waiting|Materials|Equipment|Production');
    check('Equipment panel hidden on Overview', !(await vis(page, '#pjCxEquipSec')));
    await page.tap('#pjCxTab_equipment'); await page.waitForTimeout(600);
    check('Equipment tab shows its panel only', await vis(page, '#pjCxEquipSec') && !(await vis(page, '#pjCxOverview')) && !(await vis(page, '#pjMatSec')));
    const rows = await page.evaluate(() => [...document.querySelectorAll('.pbx-eq-row')].map(r => r.innerText.replace(/\s+/g, ' ')));
    check('every piece on the plan, plus Other (' + rows.join(' / ').slice(0, 300) + ')', rows.length === 4 && /^CAT 320 #12 · 02-300/.test(rows[0]) && /^Loader/.test(rows[1]) && /^Roller/.test(rows[2]) && /^Other equipment/.test(rows[3]));
    check('CAT 320: 6 h used, idle 2 h, down 1 h, 67% of its hours used (' + rows[0] + ')', /6 h used/.test(rows[0]) && /Idle 2 h · Down 1 h · 67% of its hours used/.test(rows[0]));
    check('Roller: nothing reported yet', /nothing reported yet/.test(rows[2]));
    check('totals: 11.5 h used, 2 h idle, 1 h down (' + await txt(page, '#pjEqTotal') + ')', /11\.5 h used/.test(await txt(page, '#pjEqTotal')) && /2 h idle/.test(await txt(page, '#pjEqTotal')) && /1 h down/.test(await txt(page, '#pjEqTotal')));
    await page.screenshot({ path: SHOTS + 'equip_tab.png', fullPage: false });
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
