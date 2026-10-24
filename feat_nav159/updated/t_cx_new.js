// Batch 27 CONSOLE: New project (company account / manager / PM). The production mock (batch 20 pd_lib: plans and entries in
// localStorage '__psrv') plus a mock of sql/01_new_project.sql's pb_prod_job_create and the dashboard's new fields.
//   '__noJobCreate' = '1': the function isn't on the server yet (the app falls back to pb_prod_plan_set, version 0).
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = T;
const SHOTS = '/home/claude/batch27/CONSOLE/shots/';
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
(async () => {
  const browser = await M.chromium.launch();
  // ---- 1. create a job, set its plan, skip the extras, see it on Home, open it, edit the plan ----
  {
    const { ctx, page } = await setup(browser, {});
    check('Home: a New job button next to Jobs', await vis(page, '#homeCxNew') && /New job/.test((await txt(page, '#homeCxNew')) || ''));
    await page.click('#homeCxNew'); await page.waitForTimeout(400);
    check('New project opens step 1 of 3 (Details), job number focused', (await scr(page)) === 'screen-cxNew' && /1 Details/.test((await txt(page, '#cxNewSteps .pbx-step.cur')) || '') && await page.evaluate(() => document.activeElement.id === 'cxnJob'));
    await page.click('#cxnSave'); await page.waitForTimeout(200);
    check('no job number: says what to type, nothing sent', /Type the job number/.test((await txt(page, '#cxnErr')) || '') && (await calls(page, 'pb_prod_job_create')).length === 0);
    await page.fill('#cxnJob', ' 25-077 '); await page.fill('#cxnName', 'Birch Rd water main'); await page.fill('#cxnAddr', '100 Birch Rd, Springfield, IL'); await page.fill('#cxnStart', '2026-11-02');
    await page.screenshot({ path: SHOTS + 'new_project_step1_390.png' });
    await page.click('#cxnSave'); await page.waitForTimeout(2500);
    const c = await calls(page, 'pb_prod_job_create');
    check('Create sends one pb_prod_job_create with the details and the default categories', c.length === 1 && c[0].args.p_job_number === '25-077' && c[0].args.p_project_name === 'Birch Rd water main' && c[0].args.p_address === '100 Birch Rd, Springfield, IL' && c[0].args.p_start_date === '2026-11-02' && c[0].args.p_plan.categories.length === 6 && c[0].args.p_expect_uid === 'acctA');
    check('step 2: the new job\'s screen with its plan editor open', (await scr(page)) === 'screen-prodJob' && await vis(page, '#ppSaveBtn') && /2 Plan/.test((await txt(page, '#pjCxWiz .pbx-step.cur')) || '') && /Details/.test((await txt(page, '#pjCxWiz .pbx-step.done')) || ''));
    check('the job header shows the project name and address', /Birch Rd water main/.test((await txt(page, '#pjCxHero')) || '') && /100 Birch Rd/.test((await txt(page, '#pjCxHero')) || ''));
    await page.screenshot({ path: SHOTS + 'new_project_step2_390.png' });
    const names = await page.evaluate(() => [...document.querySelectorAll('#ppRows input[id^=ppName]')].map(i => i.value));
    await page.fill('#ppPlanned' + names.indexOf('Excavation'), '2400'); await page.fill('#ppPlanned' + names.indexOf('Pipe Installed'), '2400');
    await page.click('#ppSaveBtn'); await page.waitForTimeout(1800);
    const ps = await calls(page, 'pb_prod_plan_set');
    check('Save Plan: the plan editor saves version 1 -> 2', ps.length === 1 && ps[0].args.p_expect_version === 1 && ps[0].args.p_job_number === '25-077');
    check('step 3: optional extras (Materials list, Trench settings, Assigned PMs) and Skip for now', /3 Extras/.test((await txt(page, '#pjCxWiz .pbx-step.cur')) || '') && await vis(page, '#pjCxWizMat') && await vis(page, '#pjCxWizTrench') && await vis(page, '#pjCxWizPms') && await vis(page, '#pjCxWizSkip'));
    await page.screenshot({ path: SHOTS + 'new_project_step3_390.png' });
    await page.click('#pjCxWizSkip'); await page.waitForTimeout(1200);
    check('Skip for now: Home', (await scr(page)) === 'screen-home');
    const card = (await txt(page, '.pbx-job[data-job="25-077"]')) || '';
    check('Home: the new job card at 0%, its name, "No production yet" (' + card + ')', /Job 25-077/.test(card) && /Birch Rd water main/.test(card) && /0%/.test(card) && /No production yet/.test(card));
    await page.evaluate(() => { const b = document.querySelector('.pbx-job[data-job="25-077"]'); if (b) b.scrollIntoView({ block: 'center' }); });
    await page.screenshot({ path: SHOTS + 'new_project_home_390.png' });
    await page.click('.pbx-job[data-job="25-077"]'); await page.waitForTimeout(1500);
    check('open the job: no wizard any more; its header has the plan', !(await vis(page, '#pjCxWiz')) && /Excavation 0 \/ 2,400 LF 0%/.test((await txt(page, '#pjCxHero')) || ''));
    await page.click('#pjCxEdit'); await page.click('#pjCxEdit_plan'); await page.waitForTimeout(400);
    await page.fill('#ppPlanned' + names.indexOf('Excavation'), '2000'); await page.click('#ppSaveBtn'); await page.waitForTimeout(1500);
    check('edit the plan later from Edit project (version 2 -> 3)', (await calls(page, 'pb_prod_plan_set')).slice(-1)[0].args.p_expect_version === 2 && /Excavation 0 \/ 2,000 LF/.test((await txt(page, '#pjCxHero')) || ''));
    await page.click('#pjBack'); await page.waitForTimeout(800);
    check('Back from the job goes Home (not to the empty form)', (await scr(page)) === 'screen-home');
    // ---- 2. a number already in use ----
    await page.click('#homeCxNew'); await page.waitForTimeout(300);
    await page.fill('#cxnJob', '24-101'); await page.click('#cxnSave'); await page.waitForTimeout(400);
    let md = await T.modal(page);
    check('duplicate (known on this phone): says it exists, offers to open it, nothing sent', md && /Job 24-101 already exists/.test(md.msg) && md.buttons.includes('Open Job 24-101') && (await calls(page, 'pb_prod_job_create')).length === 1);
    await T.click(page, '^Open Job 24-101$'); await page.waitForTimeout(1500);
    check('…Open goes to that job', (await scr(page)) === 'screen-prodJob' && /Job 24-101/.test((await txt(page, '#pjTitle')) || ''));
    // a number only the server knows (created on another phone meanwhile)
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('__psrv')); s.plans['c1|25-500'] = { plan: { categories: [] }, version: 1, job_number: '25-500' }; localStorage.setItem('__psrv', JSON.stringify(s)); });
    await page.evaluate(() => pbCxNewOpen()); await page.waitForTimeout(300);
    await page.fill('#cxnJob', '25-500'); await page.click('#cxnSave'); await page.waitForTimeout(1800);
    md = await T.modal(page);
    check('duplicate (server says pb:job_exists): the same question', md && /Job 25-500 already exists/.test(md.msg));
    await T.click(page, '^Change Number$'); await page.waitForTimeout(200);
    check('…Change Number keeps the form', (await scr(page)) === 'screen-cxNew' && await page.evaluate(() => cxnJob.value === '25-500'));
    // ---- 3. no signal ----
    await page.fill('#cxnJob', '25-090'); await page.fill('#cxnName', 'Offline job');
    await ctx.setOffline(true); await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    const before = (await calls(page, 'pb_prod_job_create')).length;
    await page.click('#cxnSave'); await page.waitForTimeout(800);
    check('no signal: refused clearly, nothing sent, what was typed stays', /No signal/.test((await txt(page, '#cxnErr')) || '') && (await calls(page, 'pb_prod_job_create')).length === before && await page.evaluate(() => cxnJob.value === '25-090' && cxnName.value === 'Offline job'));
    await ctx.setOffline(false); await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.evaluate(() => pbGoto('home')); await page.waitForTimeout(300);
    md = await T.modal(page);
    check('leaving with typed details asks first', md && /Leave without creating the project/.test(md.msg));
    await page.click('#pbModalButtons button >> nth=-1'); await page.waitForTimeout(300);
    check('page errors: none', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
    await ctx.close();
  }
  // ---- 4. the server update isn't in yet: the job and its plan are still created (pb_prod_plan_set, version 0), and it says so ----
  {
    const { ctx, page } = await setup(browser, { extra: { __noJobCreate: '1' } });
    await page.click('#homeCxNew'); await page.fill('#cxnJob', '25-600'); await page.fill('#cxnName', 'Pine St'); await page.click('#cxnSave'); await page.waitForTimeout(2500);
    const ps = await calls(page, 'pb_prod_plan_set');
    check('fallback: pb_prod_plan_set with expect version 0 creates the job', ps.length === 1 && ps[0].args.p_expect_version === 0 && ps[0].args.p_job_number === '25-600' && (await scr(page)) === 'screen-prodJob');
    check('fallback: says the name, address and start date aren\'t kept yet', /aren’t kept yet/.test((await txt(page, '#pjCxWizPartial')) || ''));
    await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(600);
    check('fallback: the card is on Home', await vis(page, '.pbx-job[data-job="25-600"]'));
    await page.evaluate(() => pbCxNewOpen()); await page.fill('#cxnJob', '25-600'); await page.click('#cxnSave'); await page.waitForTimeout(300);
    check('fallback: the same number again is refused as in use', /already exists/.test(((await T.modal(page)) || {}).msg || ''));
    await ctx.close();
  }
  // ---- 5. desktop sidebar; field accounts don't get it ----
  {
    const { ctx, page } = await setup(browser, { width: 1280, height: 800 });
    check('desktop: New project in the sidebar and next to Jobs', await vis(page, '#pbxSideNew') && await vis(page, '#homeCxNew'));
    await page.click('#pbxSideNew'); await page.waitForTimeout(400);
    check('desktop: the sidebar button opens New project; Home stays current', (await scr(page)) === 'screen-cxNew' && await page.evaluate(() => document.getElementById('pbTabHome').getAttribute('aria-current') === 'page'));
    check('desktop: the form stays phone width', await page.evaluate(() => document.querySelector('#cxNewForm').getBoundingClientRect().width <= 560));
    await ctx.close();
  }
  {
    const { ctx, page } = await setup(browser, { manager: false });
    check('field account: no New project anywhere', !(await vis(page, '#homeCxNew')) && !(await page.evaluate(() => !!document.getElementById('pbxSideNew'))));
    await page.evaluate(() => pbCxNewOpen()); await page.waitForTimeout(300);
    check('field account: pbCxNewOpen does nothing', (await scr(page)) === 'screen-home');
    await ctx.close();
  }
  await browser.close();
})();
