// owner, Oct 21: a job page lists its run reports (approved runs show on the job even before production).
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/feat_jobruns/';
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
const RUNS = () => { const o = window.__rpc; window.__rpc = async (fn, args) => {
  const run = { id: 'rr-1', entry_id: '111', job_number: '26014', job_key: '26014', label: 'MH 1 to MH 2', locked_at: '2026-10-21T02:10:00Z', ended: true, distance_ft: 210, laid_ft: 120, who: 'Mike Smith', role: 'pipelayer', sent_at: '2026-10-21T03:00:00Z', sent_how: 'pipelayer', reviewed_at: '2026-10-21T19:40:00Z', reviewed_by_name: 'Brandon Jones', status: 'waiting', can_send_back: true };
  const other = Object.assign({}, run, { id: 'rr-2', job_number: '26001', job_key: '26001', who: 'Joe Other' });
  if (fn === 'pb_prod_company_runs') { window.__rpcLog.push({ fn }); return { data: { runs: [run, other], server_at: new Date().toISOString() }, error: null }; }
  if (fn === 'pb_prod_company_run_get') return { data: Object.assign({}, run, { record: { id: 111, kind: 'run', jobNumber: '26014', reportText: 'Pipe Run Record\nJob 26014\n' + 'x'.repeat(80), startLabel: 'MH 1', endLabel: 'MH 2' } }), error: null };
  return o(fn, args); }; };
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  try {
    const { ctx, page } = await setup(browser, {}); await ctx.addInitScript(RUNS); await page.reload(); await page.waitForTimeout(1500); await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(1500);
    page.on('pageerror', e => errs.push(String(e)));
    await page.click('#homeCxNew'); await page.waitForTimeout(400);
    await page.fill('#cxnJob', '26014'); await page.click('#cxnSave');
    await T.waitFor(page, () => !!document.getElementById('ppSaveBtn'), 15000);
    await page.click('#ppSaveBtn'); await page.waitForTimeout(1500);
    await T.waitFor(page, () => !!document.getElementById('pjCxRun0'), 15000);
    const r = await txt(page, '#pjCxRuns');
    check('job Overview: Run reports lists this job\'s run, not the other job\'s (' + r + ')', /Mike Smith/.test(r) && /210 ft run/.test(r) && /Approved by Brandon Jones/.test(r) && /No production entered/.test(r) && !/Joe Other/.test(r));
    await page.screenshot({ path: SHOTS + 'job_runs.png' });
    await page.click('#pjCxRun0'); await page.waitForTimeout(1500);
    check('tapping it opens the run report', (await scr(page)) === 'screen-cxList' && /Job 26014/.test((await txt(page, '#cxListBody')) || '') && !!(await page.$('#cxSendBackBtn')));
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
