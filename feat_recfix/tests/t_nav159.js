// r15.9 navigation cleanup (owner-approved plan): Records everywhere, My runs & permits, Office first for the PM,
// Settings > Company (logo + crew members), Back to where you came from, foreman crew cards, Jobs Not Sent.
const L = require('/home/claude/batch14/F/tests/lf_lib.js'); const { M, check } = L;
const sleep = (p, ms) => p.waitForTimeout(ms);
const txt = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ') : ''; }, sel);
const vis = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel);
const scr = (p) => p.evaluate(() => document.querySelector('.pb-screen.active').id);
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  try {
    { // pipelayer
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctP', role: 'pipelayer' });
      page.on('pageerror', e => errs.push(String(e)));
      check('tab bar: Records', /Records/.test(await txt(page, '#pbTabReports')));
      await L.M.lockRun(page, { dist: 120 }); await M.dismiss(page);
      await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = '26014'; return window.__debugSaveRunArchive(); });
      await page.evaluate(() => pbGotoTab('reports')); await sleep(page, 900);
      check('Records: title Records, list heading My runs & permits', (await txt(page, '#screen-archive .pb-title')) === 'Records' && (await txt(page, '#archiveMyReportsHeading')) === 'My runs & permits');
      check('crew: no Office section', !(await vis(page, '#archiveOfficeHead')));
      check('crew: Unfinished permits sits in its own group, not under Office (r15.26)', await vis(page, '#archiveMineGroup #archiveOpenPermitsBtn'));
      check('Records: Jobs Not Sent, no Job Summary row', /Jobs Not Sent/.test(await txt(page, '#archiveJobsBtn')) && !(await page.$('#archiveJobSummaryBtn')));
      check('no "Archive" word left on the Records screen', !/\bArchive\b/.test(await txt(page, '#screen-archive')));
      await page.click('#archiveJobsBtn'); await sleep(page, 700);
      const jl = await txt(page, '#jobsListView');
      check('Jobs Not Sent lists 26014 with "1 not sent" (' + jl.slice(0, 160) + ')', /Not sent yet/.test(jl) && /26014/.test(jl) && /1 not sent/.test(jl) && /Show All Jobs/.test(jl));
      await page.screenshot({ path: '/home/claude/feat_nav159/jobs_not_sent.png' });
      await ctx.close(); }
    { // PM
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctM', role: 'pm', manager: true });
      page.on('pageerror', e => errs.push(String(e)));
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 2000);
      check('PM tab bar: Records (not Archive)', /Records/.test(await txt(page, '#pbTabReports')) && !/Archive/.test(await txt(page, '#pbTabReports')));
      check('PM Home: no Crew members link; Company production link', !(await page.$('#homeCxCrew')) && /Company production/.test(await txt(page, '#homeCxDash')));
      await page.evaluate(() => pbGotoTab('reports')); await sleep(page, 1200);
      check('PM Records: Office heading first, with the office lists', await vis(page, '#archiveOfficeHead') && await page.evaluate(() => { const o = document.getElementById('archiveOfficeWrap'), n = document.getElementById('archiveNewReportBtn'); return !!o && (o.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) > 0; }) && /Management inbox/.test(await txt(page, '#archiveOfficeGroup')));
      check('PM Records: Company inspections & tests name; no Crew members row', /Company inspections & tests/.test(await txt(page, '#archiveOfficeGroup')) && !(await vis(page, '#archiveCrewBtn')));
      check('PM Records heading: My runs & permits', (await txt(page, '#archiveMyReportsHeading')) === 'My runs & permits');
      await page.screenshot({ path: '/home/claude/feat_nav159/pm_records.png' });
      await page.evaluate(() => pbOpenSettings()); await sleep(page, 700);
      check('Settings > Company: Crew members and Company logo', /Crew members/.test(await txt(page, '#settingsCompanySection')) && /Company logo/.test(await txt(page, '#settingsCompanySection')));
      await page.click('#settingsCrewBtn'); await sleep(page, 900);
      check('opens Crew members', await scr(page) === 'screen-crewMembers');
      await page.click('#crBack'); await sleep(page, 600);
      check('Back returns to Settings', await scr(page) === 'screen-settings');
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 800);
      await page.click('#homeCxDash'); await sleep(page, 1200);
      check('Company production from Home', await scr(page) === 'screen-prodDashboard');
      await page.click('#pdBack'); await sleep(page, 600);
      check('Back returns Home', await scr(page) === 'screen-home');
      await page.evaluate(() => pbGotoTab('reports')); await sleep(page, 600); await page.click('#archiveProdDashBtn'); await sleep(page, 1000);
      await page.click('#pdBack'); await sleep(page, 600);
      check('...and from Records back to Records', await scr(page) === 'screen-archive');
      await ctx.close(); }
    { // foreman
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctF', role: 'foreman' });
      page.on('pageerror', e => errs.push(String(e)));
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 2500);
      check('foreman Home: My crew card', await vis(page, '#homeWork_crewMine') && /My crew/.test(await txt(page, '#homeWork_crewMine')) && /add or remove/.test(await txt(page, '#homeWork_crewMine')));
      await page.screenshot({ path: '/home/claude/feat_nav159/foreman_home.png' });
      await page.click('#homeWork_crewMine'); await sleep(page, 1500);
      check('My crew opens My production at My crew', await scr(page) === 'screen-prodMine' && await vis(page, '#pmMyCrew'));
      await ctx.close(); }
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
