// Batch 27 CONSOLE: the company / PM experience. Company Home, job screen and tabs, Edit project routing, filtered lists,
// the desktop sidebar, offline copies with their age, the tab's name, the round-down rule, and field accounts unchanged.
const L = require('/home/claude/batch27/CONSOLE/tests/cs_lib.js'); const { M, check } = L;
const OWNER = { __ownerCo: '1', __tier: 'none' };
const SCR = "(document.querySelector('.pb-screen.active') || {}).id";
const vis = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel);
const txt = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
const hscroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
(async () => {
  const browser = await M.chromium.launch();
  // ---- 1. company Home (the owner) at 390 ----
  {
    const { ctx, page } = await L.setup(browser, { width: 390, height: 844, extra: OWNER });
    await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(3000);
    check('company: html.pb-cx on', await page.evaluate(() => document.documentElement.classList.contains('pb-cx')));
    check('company: Company Home shown', await vis(page, '#homeCompany') && await page.evaluate(() => document.getElementById('screen-home').classList.contains('pb-coh-on')));
    check('company: company name', (await txt(page, '#homeCoName')) === 'DIG Civil Construction');
    check('company: 6 job cards', await page.evaluate(() => document.querySelectorAll('#homeCxJobs .pbx-job').length) === 6);
    check('company: right now 3 runs / 1 permit', (await txt(page, '#homeCxRuns')) === '3' && (await txt(page, '#homeCxPermits')) === '1');
    check('company: inbox 2 unread', /^2 Unread reports/.test((await txt(page, '#homeCxInbox')) || ''));
    check('company: material alerts 3', /^3 Material alerts/.test((await txt(page, '#homeCxMat')) || ''));
    check('company: waiting 4 (3 runs, 1 edit)', /^4 Waiting on foremen 3 runs · 1 edit/.test((await txt(page, '#homeCxWait')) || ''));
    check('company: status says updated', /6 jobs · Updated /.test((await txt(page, '#homeCxStatus')) || ''));
    // round-down: Hwy 9 Backfill 1594 / 1600 = 99.6% shows 99%, never Done; 100% categories say Done; the complete job says so
    const hwy = await page.evaluate(() => { const b = [...document.querySelectorAll('#homeCxJobs .pbx-job')].find(x => x.dataset.job === '25-014'); return b ? [...b.querySelectorAll('.pbx-leg')].map(l => l.innerText.replace(/\s+/g, ' ').trim()) : null; });
    check('round-down: Backfill 99%, not Done', hwy && hwy.includes('Backfill 99%'));
    check('round-down: Pipe Installed 96%', hwy && hwy.includes('Pipe Installed 96%'));
    check('round-down: 100% categories say Done', hwy && hwy.filter(x => / Done$/.test(x)).length === 2);
    check('round-down: 99% segment not drawn as done', await page.evaluate(() => { const b = document.querySelector('.pbx-job[data-job="25-014"] .pbx-bar'); const s = b ? [...b.querySelectorAll('.pbx-seg')] : []; return s.length === 6 && s.filter(x => x.classList.contains('done')).length === 2 && parseFloat(s[3].querySelector('.pbx-fill').style.width) < 100; }));
    check('round-down: overall 91% (not rounded up)', (await txt(page, '.pbx-job[data-job="25-014"] .pbx-pct-n')) === '91%');
    check('complete job: says Complete', /Complete/.test((await txt(page, '.pbx-job[data-job="23-088"] .pbx-pct')) || '') && await page.evaluate(() => document.querySelector('.pbx-job[data-job="23-088"]').classList.contains('complete')));
    check('bar variant B, segments with done checks', await page.evaluate(() => !!document.querySelector('.pbx-bar.vB .pbx-seg.done .pbx-segchk')));
    check('no plan job: amounts, no bar', await page.evaluate(() => { const b = document.querySelector('.pbx-job[data-job="25-041"]'); return !!b && !b.querySelector('.pbx-bar') && /420 LF/.test(b.textContent); }));
    check('company: tab says Records', (await txt(page, '#pbTabReports .lb')) === 'Records' && (await page.evaluate(() => document.getElementById('pbTabReports').getAttribute('aria-label'))) === 'Records');
    await page.evaluate(() => pbGotoTab('reports')); await page.waitForTimeout(600);
    check('company: Records screen title', (await txt(page, '#screen-archive .pb-title')) === 'Records' && (await txt(page, '#archiveMyReportsHeading')) === 'My runs & permits');
    await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(500);
    check('company: no sideways scroll', !(await hscroll(page)));
    check('company: tab bar at the bottom on a phone', await page.evaluate(() => { const r = document.getElementById('pbTabBar').getBoundingClientRect(); return Math.abs(r.bottom - innerHeight) < 2 && r.height < 120; }));
    // ---- filtered lists ----
    await page.click('#homeCxLive'); await page.waitForTimeout(800);
    check('live list: 1 permit, 3 runs', await page.evaluate(() => document.querySelector('.pb-screen.active').id === 'screen-cxList' && document.querySelectorAll('[id^=cxPermit]').length === 1 && document.querySelectorAll('[id^=cxRun]').length === 3));
    await page.click('#cxRun0'); await page.waitForTimeout(1500);
    check('live run opens its job', await page.evaluate(() => document.querySelector('.pb-screen.active').id === 'screen-prodJob' && __pbCxDebug().jobKey === '24-101'));
    await page.click('#pjBack'); await page.waitForTimeout(500);
    check('job Back returns to the list', await page.evaluate(() => document.querySelector('.pb-screen.active').id === 'screen-cxList'));
    await page.click('#cxListBack'); await page.waitForTimeout(500);
    check('list Back returns Home', await page.evaluate(() => document.querySelector('.pb-screen.active').id === 'screen-home'));
    await page.click('#homeCxMat'); await page.waitForTimeout(800);
    check('material alerts list: 3', await page.evaluate(() => document.querySelectorAll('[id^=cxMat]').length === 3));
    await page.click('#cxMat0'); await page.waitForTimeout(1500);
    check('material alert opens the job on Materials', await page.evaluate(() => document.querySelector('.pb-screen.active').id === 'screen-prodJob' && __pbCxDebug().tab === 'materials' && document.getElementById('pjCxTab_materials').getAttribute('aria-selected') === 'true'));
    await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(400);
    await page.click('#homeCxWait'); await page.waitForTimeout(800);
    check('waiting list: 2 jobs', await page.evaluate(() => document.querySelectorAll('[id^=cxWait]').length === 2));
    await page.click('#cxWait0'); await page.waitForTimeout(1500);
    check('waiting opens the job on Waiting', await page.evaluate(() => __pbCxDebug().tab === 'waiting'));
    await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(400);
    await page.click('#homeCxInbox'); await page.waitForTimeout(1200);
    check('inbox button opens the management inbox', await page.evaluate(() => document.querySelector('.pb-screen.active').id === 'screen-reportsInbox'));
    await page.click('#inboxBack'); await page.waitForTimeout(500);
    check('inbox Back returns Home', await page.evaluate(() => document.querySelector('.pb-screen.active').id === 'screen-home'));
    // ---- the job screen ----
    await page.click('.pbx-job[data-job="24-101"]'); await page.waitForTimeout(2500);
    check('job: screen and title', await page.evaluate(() => document.querySelector('.pb-screen.active').id === 'screen-prodJob') && (await txt(page, '#pjTitle')) === 'Job 24-101');
    check('job: hero with site, % and bar', /Elm St water main/.test((await txt(page, '#pjCxHero')) || '') && await vis(page, '#pjCxHero .pbx-bar.big'));
    check('job: 5 tabs, Overview selected', await page.evaluate(() => [...document.querySelectorAll('#pjCxTabs [role=tab]')].map(b => b.id + ':' + b.getAttribute('aria-selected')).join() === 'pjCxTab_overview:true,pjCxTab_waiting:false,pjCxTab_materials:false,pjCxTab_equipment:false,pjCxTab_production:false'));
    check('job: overview shows live, crew, documents, PMs', await vis(page, '#pjCxLive') && await vis(page, '#pjCxCrew') && await vis(page, '#pjCxDocs') && await vis(page, '#pjPmSec'));
    check('job: overview hides other sections', !(await vis(page, '#pjMatSec')) && !(await vis(page, '#pjTableSec')) && !(await vis(page, '#pjCrewSec')));
    check('job: live runs for this job only (2)', await page.evaluate(() => document.querySelectorAll('#pjCxLive [id^=cxRun]').length === 2));
    check('job: waiting badge 3, materials badge 2', /Waiting\s*3/.test((await txt(page, '#pjCxTab_waiting')) || '') && /Materials\s*2/.test((await txt(page, '#pjCxTab_materials')) || ''));
    await page.click('#pjCxTab_waiting'); await page.waitForTimeout(300);
    check('tab Waiting: claims and approvals', await vis(page, '#pjCrewSec') && await vis(page, '#pjApprovalsSec') && !(await vis(page, '#pjCxLive')));
    await page.click('#pjCxTab_materials'); await page.waitForTimeout(300);
    check('tab Materials: material list', await vis(page, '#pjMatSec') && !(await vis(page, '#pjCrewSec')));
    await page.click('#pjCxTab_production'); await page.waitForTimeout(300);
    check('tab Production: tables', await vis(page, '#pjTableSec') && await vis(page, '#pjRecentSec') && !(await vis(page, '#pjMatSec')));
    check('tab Production: old segmented bar hidden (the hero has it)', !(await vis(page, '#pjProgress .pbp-barwrap')));
    await page.focus('#pjCxTab_production'); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(200);
    check('tabs: arrow keys move the selection and focus', await page.evaluate(() => __pbCxDebug().tab === 'equipment' && document.activeElement.id === 'pjCxTab_equipment'));
    // ---- Edit project ----
    await page.click('#pjCxEdit'); await page.waitForTimeout(200);
    check('edit: menu with 5 items (r15.34: Project details), expanded', await page.evaluate(() => document.querySelectorAll('#pjCxMenu .pbx-menu-btn').length === 5 && document.getElementById('pjCxEdit').getAttribute('aria-expanded') === 'true'));
    await page.click('#pjCxEdit_trench'); await page.waitForTimeout(400);
    check('edit: Trench settings opens the job settings form on Materials', await page.evaluate(() => __pbCxDebug().tab === 'materials' && !!document.getElementById('pmfForm')));
    await page.evaluate(() => pbMatFormCancel()); await page.waitForTimeout(200);
    await page.click('#pjCxEdit'); await page.click('#pjCxEdit_mat'); await page.waitForTimeout(300);
    check('edit: Materials goes to the material list', await page.evaluate(() => __pbCxDebug().tab === 'materials') && await vis(page, '#pjMatAdd'));
    await page.click('#pjCxEdit'); await page.click('#pjCxEdit_pms'); await page.waitForTimeout(400);
    check('edit: Assigned PMs opens the PM picker', await page.evaluate(() => __pbCxDebug().tab === 'overview') && await vis(page, '#pjPmC0'));
    await page.evaluate(() => pbPmJobCancel()); await page.waitForTimeout(200);
    await page.click('#pjCxEdit'); await page.click('#pjCxEdit_plan'); await page.waitForTimeout(400);
    check('edit: Job plan opens the plan editor (tabs hidden while editing)', await vis(page, '#ppName0') && !(await vis(page, '#pjCxTabs')));
    check('job: no sideways scroll', !(await hscroll(page)));
    check('page errors: none', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
    // ---- offline: the kept copies, with their age ----
    await page.evaluate(() => { localStorage.setItem('__csOff', '1'); localStorage.setItem('__rpcMode', 'offline'); });
    await page.reload(); await page.waitForFunction(() => getComputedStyle(document.getElementById('pbBootCover')).display === 'none'); await M.dismiss(page);
    await ctx.setOffline(true); await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(3000);
    check('offline: still the Company Home', await vis(page, '#homeCompany'));
    check('offline: 6 jobs from the kept copy', await page.evaluate(() => document.querySelectorAll('#homeCxJobs .pbx-job').length) === 6);
    const st = await txt(page, '#homeCxStatus');
    check('offline: status says copy and its time (' + st + ')', /Copy from .*\d/.test(st || '') || /No signal.*copy from/i.test(st || ''));
    check('offline: right now from the kept copy, with its age', /copy from/.test((await txt(page, '#homeCxLive')) || ''));
    check('offline: unread count kept (2)', /^2 Unread/.test((await txt(page, '#homeCxInbox')) || ''));
    await page.click('.pbx-job[data-job="24-101"]'); await page.waitForTimeout(1500);
    check('offline: the job opens from the copy', await page.evaluate(() => document.querySelector('.pb-screen.active').id === 'screen-prodJob') && /Elm St water main/.test((await txt(page, '#pjCxHero')) || ''));
    check('offline page errors: none', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
    await ctx.close();
  }
  // ---- 2. an EMERGENCY reported on a permit ----
  {
    const { ctx, page } = await L.setup(browser, { width: 390, height: 844, extra: Object.assign({ __csEmerg: '1' }, OWNER) });
    await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(3000);
    const t = (await txt(page, '#homeCxLive')) || '';
    check('emergency: Right now says EMERGENCY in words', /EMERGENCY reported on 1 permit/.test(t) && await page.evaluate(() => document.getElementById('homeCxLive').classList.contains('emerg')));
    check('emergency: the job card says it too', /EMERGENCY/.test((await txt(page, '.pbx-job[data-job="24-202"] .pbx-flags')) || ''));
    await ctx.close();
  }
  // ---- 3. a listed manager (member + manager), 320 px at big text ----
  {
    const { ctx, page } = await L.setup(browser, { width: 320, height: 640, xl: true });
    await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(3000);
    check('manager 320 XL: Company Home', await vis(page, '#homeCompany') && await page.evaluate(() => document.querySelectorAll('#homeCxJobs .pbx-job').length) === 6);
    check('manager 320 XL: no sideways scroll', !(await hscroll(page)));
    check('manager 320 XL: the four buttons are one column', await page.evaluate(() => { const a = document.getElementById('homeCxInbox').getBoundingClientRect(), b = document.getElementById('homeCxMat').getBoundingClientRect(); return b.top >= a.bottom - 1; }));
    await page.click('.pbx-job[data-job="24-101"]'); await page.waitForTimeout(2000);
    check('manager 320 XL: job, no sideways scroll', await page.evaluate(() => document.querySelector('.pb-screen.active').id === 'screen-prodJob') && !(await hscroll(page)));
    await ctx.close();
  }
  // ---- 4. desktop 1280, the company account ----
  {
    const { ctx, page } = await L.setup(browser, { width: 1280, height: 800, extra: OWNER });
    await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(3000);
    const g = await page.evaluate(() => { const t = document.getElementById('pbTabBar').getBoundingClientRect(), a = document.getElementById('pbApp').getBoundingClientRect(); return { tl: t.left, tw: t.width, th: t.height, al: a.left, aw: a.width }; });
    check('desktop: sidebar on the left, full height (' + JSON.stringify(g) + ')', g.tl === 0 && g.tw > 200 && g.tw < 260 && g.th >= 790);
    check('desktop: app right of the sidebar, up to 1200 wide', g.al >= g.tw && g.aw <= 1200 && g.aw > 900);
    check('desktop: sidebar has Field tools and the account', await vis(page, '#pbxSideTools') && /tommy@digcivil.test/.test((await txt(page, '#pbxSideAcct')) || ''));
    check('desktop: sidebar names the company', (await txt(page, '#pbxSideCo')) === 'DIG Civil Construction');
    check('desktop: Home is current in the sidebar', await page.evaluate(() => document.getElementById('pbTabHome').getAttribute('aria-current') === 'page'));
    check('desktop: jobs in a grid (3 across)', await page.evaluate(() => { const c = [...document.querySelectorAll('#homeCxJobs .pbx-job')].slice(0, 3).map(b => Math.round(b.getBoundingClientRect().top)); return c[0] === c[1] && c[1] === c[2]; }));
    check('desktop: no sideways scroll', !(await hscroll(page)));
    await page.click('#pbxSideTools'); await page.waitForTimeout(500);
    check('desktop: Field tools shows the start list', await vis(page, '#homeTileNewRun'));
    await page.click('.pbx-job[data-job="24-101"]'); await page.waitForTimeout(2500);
    const j = await page.evaluate(() => { const h = document.getElementById('pjCxHero').getBoundingClientRect(), t = document.getElementById('pjCxTabs').getBoundingClientRect(); return { hl: h.left, hr: h.right, tl: t.left, ht: h.top, tt: t.top }; });
    check('desktop job: two columns, hero left, tabs right', j.hr < j.tl && Math.abs(j.ht - j.tt) < 40);
    check('desktop job: Home stays current in the sidebar', await page.evaluate(() => document.getElementById('pbTabHome').getAttribute('aria-current') === 'page'));
    await page.evaluate(() => window.scrollTo(0, 600)); await page.waitForTimeout(300);
    check('desktop job: the hero stays in view', await page.evaluate(() => { const r = document.getElementById('pjCxHero').getBoundingClientRect(); return r.top >= 0 && r.top < 40; }));
    await page.click('#pbTabCalculators'); await page.waitForTimeout(500);
    check('desktop: calculators reachable, phone width', await page.evaluate(() => document.querySelector('.pb-screen.active').id === 'screen-calcHub' && document.getElementById('pbApp').getBoundingClientRect().width <= 560));
    check('desktop: active bar is not pushed off screen', await page.evaluate(() => { const ab = document.getElementById('pbActiveBar'); return ab.hidden || ab.getBoundingClientRect().bottom <= innerHeight + 1; }));
    await page.setViewportSize({ width: 900, height: 800 }); await page.waitForTimeout(500);
    check('900 px: the tab bar is back at the bottom', await page.evaluate(() => { const r = document.getElementById('pbTabBar').getBoundingClientRect(); return Math.abs(r.bottom - innerHeight) < 2 && r.height < 120; }));
    check('desktop page errors: none', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
    await ctx.close();
  }
  // ---- 5. field accounts unchanged (a foreman) at 390 and 1280 ----
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const { ctx, page } = await L.setup(browser, { width: w, height: h, manager: false });
    await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(2500);
    check('field ' + w + ': no pb-cx', !(await page.evaluate(() => document.documentElement.classList.contains('pb-cx'))));
    check('field ' + w + ': Company Home hidden, start list shown', !(await vis(page, '#homeCompany')) && await vis(page, '#homeTileNewRun'));
    check('field ' + w + ': tab says Records', (await txt(page, '#pbTabReports .lb')) === 'Records');
    check('field ' + w + ': no sidebar parts', await page.evaluate(() => !document.getElementById('pbxSideHead')));
    check('field ' + w + ': tab bar at the bottom, phone width', await page.evaluate(() => { const r = document.getElementById('pbTabBar').getBoundingClientRect(); return Math.abs(r.bottom - innerHeight) < 2 && r.width <= 560 && r.height < 120; }));
    check('field ' + w + ': app column at most 560', await page.evaluate(() => document.getElementById('pbApp').getBoundingClientRect().width <= 560));
    await page.evaluate(() => pbGotoTab('reports')); await page.waitForTimeout(500);
    check('field ' + w + ': Records screen title', (await txt(page, '#screen-archive .pb-title')) === 'Records' && (await txt(page, '#archiveMyReportsHeading')) === 'My runs & permits');
    check('field ' + w + ': page errors none', page._errors.length === 0);
    await ctx.close();
  }
  await browser.close();
})();
