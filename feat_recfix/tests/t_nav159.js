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
      // r15.76: Records holds the paperwork behind type chips (All / Runs / Permits / Tickets / Mgmt reports) with a "not sent" banner on top; the "My runs & permits" heading went
      check('Records: title Records, the run in the feed as Not sent, type chips (no office chips for the crew)', (await txt(page, '#screen-archive .pb-title')) === 'Records' && /Start → End/.test(await txt(page, '#rpfRow0')) && /Not sent/.test(await txt(page, '#rpfRow0')) && /26014/.test(await txt(page, '#rpfRow0')) && await vis(page, '#recChip_run') && await vis(page, '#recChip_permit'));
      check('crew: no Office section (no Dailies / Inbox chips, no People filter)', !(await vis(page, '#archiveOfficeHead')) && !(await vis(page, '#recChip_daily')) && !(await vis(page, '#recChip_inbox')) && !(await vis(page, '#rpfChip_people')));
      check('crew: Unfinished permits is a banner of its own on top (not under Office), hidden while none is open (r15.76)', await page.evaluate(() => { const b = document.getElementById('archiveOpenPermitsBtn'); return !!b && b.parentElement.id === 'archiveTopActions' && !b.closest('#archiveOfficeGroup') && b.hidden; }));
      check('Records: the "1 not sent yet" banner, no Job Summary row', await vis(page, '#archiveJobsBtn') && /1 not sent yet/.test(await txt(page, '#archiveJobsBtn')) && !(await page.$('#archiveJobSummaryBtn')));
      check('no "Archive" word left on the Records screen', !/\bArchive\b/.test(await txt(page, '#screen-archive')));
      await page.click('#archiveJobsBtn'); await sleep(page, 700);
      const jl = await txt(page, '#jobsListView');
      // r16.13: "Not sent" worded one way; r16.09 (vis F44): no "Show All Jobs" when every job is already shown (the one job here)
      check('Jobs Not Sent lists 26014 with "1 not sent" (' + jl.slice(0, 160) + ')', /^Not sent/.test(jl) && /26014/.test(jl) && /1 not sent · 1 run/.test(jl) && !/Show All Jobs/.test(jl));
      await page.screenshot({ path: '/home/claude/feat_nav159/jobs_not_sent.png' });
      await ctx.close(); }
    { // PM
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctM', role: 'pm', manager: true });
      page.on('pageerror', e => errs.push(String(e)));
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 2000);
      check('PM tab bar: Records (not Archive)', /Records/.test(await txt(page, '#pbTabReports')) && !/Archive/.test(await txt(page, '#pbTabReports')));
      check('PM Home: no Crew members link; Company production link', !(await page.$('#homeCxCrew')) && /Company production/.test(await txt(page, '#homeCxDash')));
      // r15.76: the office dashboards live on the company Home (Management inbox tile, Company inspections & tests door); Records holds the paperwork, with the office's extra chips
      check('PM Home: Management inbox tile and Company inspections & tests door', /Management inbox/.test(await txt(page, '#homeCxInbox')) && await page.evaluate(() => { const b = document.getElementById('archiveInspCoBtn'); return !!b && b.closest('#screen-home') !== null && b.style.display !== 'none' && /Company inspections & tests/.test(b.textContent); })); // the door sits in the folded company tools group on Home
      await page.evaluate(() => pbGotoTab('reports')); await sleep(page, 1200);
      check('PM Records: the office chips (Dailies, Inbox, People filter); no Office heading left', await vis(page, '#recChip_daily') && await vis(page, '#recChip_inbox') && await vis(page, '#rpfChip_people') && !(await vis(page, '#archiveOfficeHead')));
      check('PM Records: no Crew members row, no Company production row (they live in Settings / on Home)', !(await vis(page, '#archiveCrewBtn')) && !(await vis(page, '#archiveProdDashBtn')));
      check('PM Records: title Records, "On this phone" is a filter chip (r15.95)', (await txt(page, '#screen-archive .pb-title')) === 'Records' && await vis(page, '#recChip_phone') && /On this phone/.test(await txt(page, '#recChip_phone')));
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
      // r15.76: Company production left Records (asserted above); Settings > Company > Crew members > Back already proves Back returns where you came from
      await ctx.close(); }
    { // foreman
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctF', role: 'foreman' });
      page.on('pageerror', e => errs.push(String(e)));
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 2500);
      // feat_foreman 7 (r15.5x, before r15.65): the foreman's Home tiles say it ("On my crew", add or remove crew); the My crew row stays only on the company Home
      check('foreman Home: On my crew tile (' + (await txt(page, '#homeFmCrew')) + ')', await vis(page, '#homeFmCrew') && /On my crew/.test(await txt(page, '#homeFmCrew')) && /No one linked yet|Add or remove crew/.test(await txt(page, '#homeFmCrew')) && !(await vis(page, '#homeWork_crewMine')));
      await page.screenshot({ path: '/home/claude/feat_nav159/foreman_home.png' });
      await page.click('#homeFmCrew'); await sleep(page, 1500);
      check('My crew opens My production at My crew', await scr(page) === 'screen-prodMine' && await vis(page, '#pmMyCrew'));
      await ctx.close(); }
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
