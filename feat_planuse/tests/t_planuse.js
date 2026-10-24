// r15.12 feat_planuse (owner, Oct 22: "The pipe installed main says 3000 ft but the overview says no plan"). Harness from feat_navfix.
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/feat_planuse/';
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
  try {
    const { ctx, page } = await setup(browser, {}); await ctx.addInitScript(MATMOCK); await page.reload(); await page.waitForTimeout(1500);
    page.on('pageerror', e => errs.push(String(e)));
    await page.evaluate(() => localStorage.setItem('__mats', '[]'));
    await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(800);
    await page.click('#homeCxNew'); await page.waitForTimeout(400);
    await page.fill('#cxnJob', '26014'); await page.click('#cxnSave');
    await T.waitFor(page, () => !!document.getElementById('ppSaveBtn'), 15000);
    await page.waitForTimeout(1200);
    // a plan with planned amounts on the other LF items, none on Pipe Installed
    const pi = await page.evaluate(() => [...document.querySelectorAll('#ppRows input[id^=ppName]')].findIndex(i => /Pipe Installed/.test(i.value)));
    const n = await page.evaluate(() => document.querySelectorAll('#ppRows input[id^=ppName]').length);
    for (let i = 0; i < n; i++) if (i !== pi) await page.fill('#ppPlanned' + i, '3000');
    await page.click('#ppSaveBtn'); await page.waitForTimeout(1500);
    check('plan saved without a Planned on Pipe Installed', (await page.evaluate(() => !document.getElementById('ppSaveBtn'))));
    check('no note while there is no pipe material', !(await page.$('#pjPlanMat')));
    // the PM adds a pipe material expecting 3000 LF; back on the overview
    await page.evaluate(() => { localStorage.setItem('__mats', JSON.stringify([{ id: 'm1', name: '8in SDR 35', category: 'pipe', source: 'pipe_footage', footage_cat: 'pipe', unit: 'LF', expected: 3000, version: 1, archived: false, fig: { status: 'ok', used: 0, ordered: 0, waiting: 0 }, orders: [], uses: [] }])); window.pbCxOpenJob('26014', 'overview'); });
    await page.waitForTimeout(2500);
    let note = await txt(page, '#pjPlanMat');
    check('overview note: Pipe Installed has no Planned; materials expect 3,000 LF (' + note + ')', /Pipe Installed.* has no Planned amount/.test(note || '') && /expect 3,000 LF/.test(note || ''));
    check('button: Use 3,000 LF as Planned', /Use 3,000 LF as Planned/.test(await txt(page, '#pjPlanMatUse') || ''));
    await page.screenshot({ path: SHOTS + 'plannote.png', fullPage: false });
    await page.evaluate(() => window.__rpcLog.length = 0);
    await page.tap('#pjPlanMatUse'); await page.waitForTimeout(2000);
    const saves = await page.evaluate(() => window.__rpcLog.filter(x => /plan/.test(x.fn)).map(x => ({ fn: x.fn, cats: x.args && (x.args.p_plan || {}).categories })));
    const pc = saves.length && saves[saves.length - 1].cats ? saves[saves.length - 1].cats.find(c => c.key === 'pipe') : null;
    check('one tap saves the plan with Pipe Installed planned 3000 (' + JSON.stringify(saves.map(s => s.fn)) + ' ' + JSON.stringify(pc) + ')', pc && Number(pc.planned) === 3000);
    check('editor closed after saving', !(await page.$('#ppSaveBtn')));
    check('note gone; Pipe Installed shows a % (' + await page.evaluate(() => { const r = [...document.querySelectorAll('#pjBody *')].find(e => e.children.length === 0 && /^Pipe Installed/.test(e.textContent.trim())); return r ? r.parentElement.innerText.replace(/\s+/g, ' ') : null; }) + ')',
      !(await page.$('#pjPlanMat')) && !/no plan/.test(await page.evaluate(() => { const r = [...document.querySelectorAll('#pjBody *')].find(e => e.children.length === 0 && /^Pipe Installed/.test(e.textContent.trim())); return r ? r.parentElement.innerText : 'missing'; })));
    // editor's note says to save
    await page.evaluate(() => { const L = JSON.parse(localStorage.getItem('__mats')); localStorage.setItem('__mats', JSON.stringify(L)); });
    await page.evaluate(() => window.pbProdPlanEdit()); await page.waitForTimeout(1500);
    check('editor open with no auto note when Planned is already saved', !/Tap Save Plan to keep it/.test(await txt(page, '#ppRows') || ''));
    await page.evaluate(() => window.pbProdPlanCancel());
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
