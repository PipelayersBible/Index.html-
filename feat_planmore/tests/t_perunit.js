// owner, Oct 21: plan categories: Budget hours per unit; the whole category's hours = planned x per unit; whole job adds them up.
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/feat_perunit/';
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
  const ctx = await browser.newContext({ viewport: { width: opts.width || 390, height: opts.height || 844 } });
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
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  try {
    const { ctx, page } = await setup(browser, {}); // feat_planmore: More settings open under test
    await ctx.addInitScript(() => { const o = () => document.querySelectorAll('details.pbp-rowmore:not([open])').forEach(d => { d.open = true; }); document.addEventListener('DOMContentLoaded', () => { o(); new MutationObserver(o).observe(document.body, { childList: true, subtree: true }); }); }); await page.reload(); await page.waitForTimeout(1500);
    page.on('pageerror', e => errs.push(String(e)));
    await page.click('#homeCxNew'); await page.waitForTimeout(400);
    await page.fill('#cxnJob', '25-091'); await page.click('#cxnSave');
    await T.waitFor(page, () => !!document.getElementById('ppPerUnit0'), 15000);
    const lab = await page.evaluate(() => [...document.querySelectorAll('#ppRow0 label')].map(l => l.textContent).join('|'));
    check('a category has Planned, Unit, Budget hours per unit, Budget hours (whole category), Weight (' + lab + ')', /Budget hours per unit/.test(lab) && /Budget hours \(whole category\)/.test(lab));
    await page.fill('#ppPlanned0', '12'); await page.fill('#ppPerUnit0', '2');
    check('12 planned × 2 h per unit: the category fills in 24 h, the job total 24', (await val(page, '#ppHours0')) === '24' && (await val(page, '#ppBudget')) === '24');
    await page.fill('#ppPlanned1', '1000'); await page.fill('#ppPerUnit1', '0.15');
    check('1,000 × 0.15 = 150; job total 174', (await val(page, '#ppHours1')) === '150' && (await val(page, '#ppBudget')) === '174');
    await page.fill('#ppPlanned0', '10');
    check('changing planned to 10 keeps 2 h per unit: 20; total 170', (await val(page, '#ppHours0')) === '20' && (await val(page, '#ppBudget')) === '170');
    await page.fill('#ppHours0', '25');
    check('typing the category\'s hours (25) works out the per unit (2.5); total 175', (await val(page, '#ppPerUnit0')) === '2.5' && (await val(page, '#ppBudget')) === '175');
    await page.screenshot({ path: SHOTS + 'perunit.png' });
    await page.click('#ppSaveBtn'); await page.waitForTimeout(1500);
    const ps = await page.evaluate(() => window.__rpcLog.filter(x => x.fn === 'pb_prod_plan_set' || x.fn === 'pb_prod_job_create').map(x => x.args.p_plan).pop());
    check('saved: category hours 25 and 150, job 175 (' + JSON.stringify(ps) + ')', ps && ps.categories[0].hours === 25 && ps.categories[1].hours === 150 && ps.budget_hours === 175);
    await page.evaluate(() => window.pbProdPlanEdit()); await page.waitForTimeout(300);
    check('reopened: per unit shows 2.5 and 0.15', (await val(page, '#ppPerUnit0')) === '2.5' && (await val(page, '#ppPerUnit1')) === '0.15');
    check('reopening is not a change (Cancel closes without asking)', await page.evaluate(() => { window.pbProdPlanCancel(); return !document.getElementById('ppEditor') && document.getElementById('pbModalOverlay').style.display !== 'flex'; }));
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
