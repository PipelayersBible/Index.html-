// Batch 27 CONSOLE updated copy of /home/claude/test/hunt31/t_tabs3.js (with its R2 and BRAND edits): r15 screens cxList (Home) and batch 23 DAILY inspections / daily report (Reports).
// batch 14 R2: a typed run is saved as a draft, so the leave button says 'Leave, Save Draft'.
// UX batch 3 (T1): bottom tabs Home · Calculators · Tools · Reports (no Jobs tab).
// batch 10 A (F33): loss-of-work dialogs now name their actions (Keep Editing / Leave Without Saving, Stay / Leave and Clear Import, Keep X / Remove X ...); this copy clicks the new labels.
// Fails on base (Jobs tab, no Calculators tab, no screen-tools); passes with T1's patch.
// Usage: PB_TEST_DIR=<site> PB_TEST_PORT=8941 ./run.sh /home/claude/batch3/T1/t_tabs3.js 300
//        SHOTS=1 also saves screenshots to /home/claude/batch3/T1/shots/.
const L = require('/home/claude/test/lib.js');
const fs = require('fs');
const { check } = L;
const SHOTS = process.env.SHOTS ? '/home/claude/batch3/T1/shots/' : null;
const sleep = (p, ms) => p.waitForTimeout(ms);

async function open(browser, uid, tier, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.width || 390, height: opts.height || 844 } });
  await ctx.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await ctx.addInitScript(({ u, t, ts }) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('lastKnownUserId', u); localStorage.setItem('legacyDataMigrated', 'true');
    if (t) localStorage.setItem(u + ':cachedSubscription', JSON.stringify({ tier: t, status: 'active' }));
    if (ts) localStorage.setItem(u + ':textSize', ts);
  }, { u: uid, t: tier, ts: opts.textSize || null });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  page._errors = []; page.on('pageerror', e => page._errors.push(e.message));
  await page.goto(L.ORIGIN);
  await page.waitForFunction(() => getComputedStyle(document.getElementById('pbBootCover')).display === 'none', null, { timeout: 20000 });
  await sleep(page, 700); await L.dismiss(page); await sleep(page, 200);
  page._ctx = ctx;
  return page;
}
const st = (p) => p.evaluate(() => {
  const vis = (el) => !!el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
  const tb = document.getElementById('pbTabBar');
  return {
    screen: (document.querySelector('.pb-screen.active') || {}).id,
    tabs: [...tb.querySelectorAll('.pb-tab')].map(t => ({ id: t.id, label: t.querySelector('.lb').textContent.trim(), shown: vis(t), current: t.getAttribute('aria-current') === 'page', locked: t.classList.contains('pb-tab-locked') })),
    modal: getComputedStyle(document.getElementById('pbModalOverlay')).display === 'none' ? null : document.getElementById('pbModalTitle').textContent,
  };
});
const cur = (s) => (s.tabs.find(t => t.current) || {}).label || null;
const tab = (s, label) => s.tabs.find(t => t.label === label) || {};
const shown = (s) => s.tabs.filter(t => t.shown).map(t => t.label).join('|');
const modalClick = (p, label) => p.evaluate((l) => { const b = [...document.querySelectorAll('#pbModalButtons button')].find(x => x.textContent.trim() === l); if (b) b.click(); return !!b; }, label);
const closeModal = async (p) => { await L.dismiss(p); await sleep(p, 250); };
const destIds = (p, sel) => p.evaluate((s) => [...document.querySelectorAll(s + ' [data-dest]')].map(b => b.dataset.dest), sel);
const CALCS = ['rodElev', 'slopeConv', 'frac', 'lift', 'bedding', 'trench', 'vent', 'pipeWeight', 'manning', 'flow', 'volume', 'bend', 'manhole'];

// expected tab per screen (null = no tab highlighted)
function expectedTab(id) {
  const n = id.replace('screen-', '');
  if (['home', 'settings', 'shortcutsEdit', 'notifications'].includes(n)) return 'Home'; // batch 13 P: Settings > Notifications sits under Home, like Settings
  if (n === 'calcHub' || /^calcCat/.test(n) || /Calc$/.test(n)) return 'Calculators';
  // Batch 4 (R1): the new Ask screen (aiAsk) sits under the Tools tab.
  if (n === 'cxList' || n === 'cxNew') return 'Home'; // batch 27 CONSOLE: the company lists (Live now, Material alerts, Waiting) open from Company Home
  if (n === 'aiAsk') return 'Ask'; // batch 5: the Ask tab
  if (['tools', 'quickrun', 'formulasHub', 'confinedHub', 'stats', 'eduLesson'].includes(n) || /^ref[A-Z]/.test(n)) return 'Tools'; // batch 13 E1: the interactive lesson screen is Education, under Tools
  // Batch 4 (R3): Reports I've sent and the Management inbox are Reports screens too
  // batch 7 (T1): Company permit records (batch 6b) and the field-ticket screens (list, form, company dashboard) are Reports screens too
  if (['archive', 'reportIssue', 'reportReceipt', 'myReports', 'reportsInbox', 'jobs', 'jobSummary', 'companyPermits', 'tickets', 'ticketForm', 'ticketsDashboard', 'prodDashboard', 'prodJob', 'prodMine', 'crewMembers', 'companyLogo', 'inspMine', 'inspCheck', 'inspCompany', 'inspJob', 'dailyReport'].includes(n)) return 'Reports'; // r15: batch 23 DAILY's inspection and daily-report screens are Reports (Archive for company accounts) screens // batch 11 D: the production screens sit under Reports // batch 13 C: Crew members is a Reports screen too
  return null; // login, setPassword, input, cutsheetImport, review, results, confinedPermit, confinedActive
}

async function layoutChecks(p, tag) {
  // no sideways scroll; tab labels not cut; tap targets at least 44 px (on-screen px)
  const r = await p.evaluate(() => {
    const de = document.documentElement;
    const scr = document.querySelector('.pb-screen.active');
    const small = [];
    const sel = '#pbTabBar .pb-tab, .pb-screen.active .pb-header .pb-back, .pb-screen.active .pb-header .pb-profile-btn, .pb-screen.active .pb-tools-group > .pb-edu-row, .pb-screen.active .pb-tools-try .pb-edu-link, .pb-screen.active .pb-sc-catrow .pb-edu-link';
    document.querySelectorAll(sel).forEach(el => {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height || getComputedStyle(el).display === 'none') return;
      if (b.height < 43.5 || b.width < 43.5) small.push((el.id || el.className) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
    });
    const cut = [...document.querySelectorAll('#pbTabBar .pb-tab:not([hidden]) .lb')].filter(lb => lb.scrollWidth > lb.clientWidth + 1).map(lb => lb.textContent);
    const tb = document.getElementById('pbTabBar').getBoundingClientRect();
    return { side: de.scrollWidth > de.clientWidth + 1, scrollW: de.scrollWidth, clientW: de.clientWidth, small, cut, screen: scr && scr.id, tbBottom: tb.bottom, vh: innerHeight };
  });
  check(tag + ': no sideways scroll (' + r.scrollW + '/' + r.clientW + ')', !r.side);
  check(tag + ': tab labels not cut off' + (r.cut.length ? ' ' + r.cut.join(',') : ''), r.cut.length === 0);
  check(tag + ': every tab, header button and list row is at least 44 px' + (r.small.length ? ' ' + r.small.join('; ') : ''), r.small.length === 0);
  // the last row of the screen can scroll clear of the tab bar
  const clear = await p.evaluate(async () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }); await new Promise(r => setTimeout(r, 300));
    const scr = document.querySelector('.pb-screen.active');
    const inClosed = (e) => { const d = e.closest('details:not([open])'); return !!d && !e.closest('summary'); }; // closed <details> content still has a box in Chromium
    const items = [...scr.querySelectorAll('button, .pb-edu-row, a')].filter(e => e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== 'none' && !inClosed(e));
    const last = items[items.length - 1];
    const tb = document.getElementById('pbTabBar'), ab = document.getElementById('pbActiveBar');
    const top = Math.min(tb.hidden ? innerHeight : tb.getBoundingClientRect().top, ab.hidden ? innerHeight : ab.getBoundingClientRect().top);
    const ok = !last || last.getBoundingClientRect().bottom <= top + 1;
    window.scrollTo({ top: 0, behavior: 'instant' });
    return ok || ((last.id || last.className) + ' ' + Math.round(last.getBoundingClientRect().bottom) + '>' + Math.round(top));
  });
  check(tag + ': the last control scrolls clear of the bars' + (clear === true ? '' : ' ' + clear), clear === true);
}
async function shot(p, name) {
  if (!SHOTS) return;
  await p.evaluate(() => window.scrollTo(0, 0)); await sleep(p, 250);
  await p.screenshot({ path: SHOTS + name + '.png' });
}

(async () => {
  const browser = await L.chromium.launch();
  try {
    // ================= contractor =================
    {
      const p = await open(browser, 't1c', 'contractor');
      await p.waitForFunction(() => !document.querySelector('#pbTabBar .pb-tab-locked'), null, { timeout: 5000 }).catch(() => {}); // the plan is read just after start-up
      let s = await st(p);
      check('contractor: tabs in order Home | Calculators | Tools | Reports | Ask, all shown', shown(s) === 'Home|Calculators|Tools|Reports|Ask' && s.tabs.length === 5); // batch 5
      check('no Jobs tab any more (pbTabJobs gone)', await p.evaluate(() => !document.getElementById('pbTabJobs')));
      check('tab icons: home, calc, tools, reports from the B1 sprite', await p.evaluate(() => ['pbTabHome', 'pbTabCalculators', 'pbTabTools', 'pbTabReports'].map(id => document.querySelector('#' + id + ' .ic use').getAttribute('href')).join() === '#pb-i-home,#pb-i-calc,#pb-i-tools,#pb-i-reports'));
      check('Calculators tab named in full for screen readers', await p.evaluate(() => document.getElementById('pbTabCalculators').getAttribute('aria-label') === 'Calculators'));
      check('no tab locked on the contractor plan', s.tabs.every(t => !t.locked));
      // each tab lands
      await p.click('#pbTabCalculators'); await sleep(p, 400); s = await st(p);
      check('Calculators tab opens calcHub, titled Calculators, highlighted', s.screen === 'screen-calcHub' && cur(s) === 'Calculators' && await p.textContent('#screen-calcHub .pb-title') === 'Calculators');
      const calcList = await destIds(p, '#toolsList');
      check('Calculators lists exactly the 13 calculators', calcList.length === 13 && CALCS.every(c => calcList.includes(c)));
      check('Calculators groups: Grade & Elevation, Safety, Pipe & Flow, Structures', await p.evaluate(() => [...document.querySelectorAll('#toolsList .pb-edu-h')].map(h => h.textContent).join('|')) === 'Grade & Elevation|Safety|Pipe & Flow|Structures');
      check('control: category buttons still on Calculators', await p.evaluate(() => document.querySelectorAll('#toolsBrowseCats .pb-edu-link').length === 4));
      await shot(p, 'c390_calculators');
      await layoutChecks(p, 'contractor 390 Calculators');
      await p.fill('#toolsSearchBox', 'concrete'); await sleep(p, 150);
      check('Calculators search finds Material Volume', (await destIds(p, '#toolsSearchResults')).includes('volume'));
      await p.fill('#toolsSearchBox', 'quick run'); await sleep(p, 150);
      check('Calculators search holds calculators only (no Quick Run)', !(await destIds(p, '#toolsSearchResults')).includes('quickRun') && /No calculator matches/.test(await p.textContent('#toolsSearchResults')));
      await p.fill('#toolsSearchBox', ''); await p.dispatchEvent('#toolsSearchBox', 'input');
      await p.click('#screen-calcHub [onclick="pbGoto(\'calcCatPipe\')"]'); await sleep(p, 300);
      check('a category highlights Calculators', cur(await st(p)) === 'Calculators');
      await p.click('#screen-calcCatPipe .pb-home-tile >> nth=0'); await sleep(p, 300);
      check('a calculator highlights Calculators', (await st(p)).screen === 'screen-pipeWeightCalc' && cur(await st(p)) === 'Calculators');
      await p.click('#screen-pipeWeightCalc .pb-back'); await sleep(p, 300);
      await p.click('#screen-calcCatPipe .pb-back'); await sleep(p, 300);
      check('Back: calculator -> category -> Calculators', (await st(p)).screen === 'screen-calcHub');

      // Tools
      await p.click('#pbTabTools'); await sleep(p, 400); s = await st(p);
      check('Tools tab opens screen-tools, titled Tools, highlighted', s.screen === 'screen-tools' && cur(s) === 'Tools' && await p.textContent('#screen-tools .pb-title') === 'Tools');
      const toolList = await destIds(p, '#toolsAllList');
      console.log('   Tools list:', toolList.join(','), '| groups:', await p.evaluate(() => [...document.querySelectorAll('#toolsAllList .pb-edu-h')].map(h => h.textContent).join(' | ')));
      check('Tools lists Quick Run, Confined Space Permits, Education, Confined Space Reference and Stats', ['quickRun', 'confinedHub', 'edu', 'confinedRef', 'stats'].every(i => toolList.includes(i)));
      check('Tools does not list the calculators or Reports actions', !toolList.some(i => CALCS.includes(i)) && !toolList.includes('reportIssue') && !toolList.includes('jobSummary'));
      check('Tools has the Home shortcut editor row', await p.evaluate(() => !!document.getElementById('toolsEditShortcuts')));
      check('Tools header has the profile button', await p.evaluate(() => !!document.querySelector('#screen-tools .pb-header .pb-profile-btn')));
      await shot(p, 'c390_tools');
      await layoutChecks(p, 'contractor 390 Tools');
      await p.fill('#toolsAllSearchBox', 'concrete'); await sleep(p, 150);
      const tc = await destIds(p, '#toolsAllResults');
      check('Tools search finds calculators too (concrete -> Material Volume)', tc.includes('volume'));
      await p.fill('#toolsAllSearchBox', 'stats'); await sleep(p, 150);
      check('Tools search finds Stats', (await destIds(p, '#toolsAllResults')).includes('stats'));
      await p.fill('#toolsAllSearchBox', 'xyzzy'); await sleep(p, 150);
      check('Tools search, no match: says so, offers an Education search', /No tool matches/.test(await p.textContent('#toolsAllResults')));
      await shot(p, 'c390_tools_nomatch');
      await p.click('#toolsAllResults button:has-text("Search Education")'); await sleep(p, 400);
      check('...which opens Education with the same words', (await st(p)).screen === 'screen-formulasHub' && await p.inputValue('#eduSearchBox') === 'xyzzy' && cur(await st(p)) === 'Tools');
      await p.click('#pbTabTools'); await sleep(p, 400);
      await p.fill('#toolsAllSearchBox', 'manhole depth'); await sleep(p, 150);
      await p.click('#toolsAllResults [data-dest="manhole"]'); await sleep(p, 300);
      check('a calculator from the Tools search opens (Calculators highlighted)', (await st(p)).screen === 'screen-manholeDepthCalc' && cur(await st(p)) === 'Calculators');
      await p.click('#screen-manholeDepthCalc .pb-back'); await sleep(p, 300);
      check('...and its Back returns to Tools with the search kept', (await st(p)).screen === 'screen-tools' && await p.inputValue('#toolsAllSearchBox') === 'manhole depth');
      await p.fill('#toolsAllSearchBox', ''); await p.dispatchEvent('#toolsAllSearchBox', 'input'); await sleep(p, 100);
      // Stats from Tools
      await p.click('#toolsAllList [data-dest="stats"]'); await sleep(p, 400); s = await st(p);
      check('contractor: Stats opens from Tools, Tools highlighted', s.screen === 'screen-stats' && cur(s) === 'Tools');
      check('Stats has a Back arrow', await p.evaluate(() => { const b = document.getElementById('statsHeaderBack'); return !!b && b.getBoundingClientRect().width >= 44; }));
      await shot(p, 'c390_stats');
      await layoutChecks(p, 'contractor 390 Stats');
      await p.click('#statsHeaderBack'); await sleep(p, 300);
      check('Stats Back returns to Tools', (await st(p)).screen === 'screen-tools');
      await p.evaluate(() => { pbOpenStats(); }); await sleep(p, 300);
      await p.evaluate(() => { for (let i = 0; i < 20; i++) pbGoto('stats', true); }); await sleep(p, 200);
      await p.click('#statsHeaderBack'); await sleep(p, 400);
      check('Stats Back with no history goes to the Tools tab', (await st(p)).screen === 'screen-tools');
      // Quick Run and confined space from Tools
      await p.click('#toolsAllList [data-dest="quickRun"]'); await sleep(p, 400);
      check('Quick Run opens from Tools, Tools highlighted', (await st(p)).screen === 'screen-quickrun' && cur(await st(p)) === 'Tools');
      await p.click('#pbTabTools'); await sleep(p, 400); await closeModal(p);
      if ((await st(p)).screen !== 'screen-tools') { await modalClick(p, 'Leave, Save Draft') || await modalClick(p, 'Leave Without Saving') || await modalClick(p, 'Continue'); await sleep(p, 400); }
      await p.click('#toolsAllList [data-dest="confinedHub"]'); await sleep(p, 400);
      check('Confined Space Permits opens from Tools on contractor', (await st(p)).screen === 'screen-confinedHub' && cur(await st(p)) === 'Tools');
      // shortcuts editor from Tools
      await p.click('#pbTabTools'); await sleep(p, 400);
      await p.click('#toolsEditShortcuts'); await sleep(p, 400);
      check('Edit Home shortcuts opens the editor', (await st(p)).screen === 'screen-shortcutsEdit');
      await p.click('#scEditCancel'); await sleep(p, 300);
      check('...and Cancel returns to Tools', (await st(p)).screen === 'screen-tools');

      // Reports: jobs and Job Summary
      await L.lockRun(p, { stats: true }); await sleep(p, 300); await closeModal(p);
      await p.click('#pbTabReports'); await sleep(p, 500); s = await st(p);
      check('Reports tab opens the Archive, highlighted', s.screen === 'screen-archive' && cur(s) === 'Reports');
      check('Reports has Jobs and Job Summary rows above My Reports', await p.evaluate(() => { const g = document.getElementById('archiveJobsGroup'), h = document.getElementById('archiveMyReportsHeading'); return !!g && !!document.getElementById('archiveJobsBtn') && !!document.getElementById('archiveJobSummaryBtn') && (g.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0; }));
      check('the old duplicate Job Summary button is gone from the tools box', await p.evaluate(() => !document.querySelector('#screen-archive .pb-arch-tools [onclick="pbOpenJobSummary()"]')));
      await shot(p, 'c390_reports');
      await layoutChecks(p, 'contractor 390 Reports');
      await p.click('#archiveJobsBtn'); await sleep(p, 400); s = await st(p);
      check('Jobs opens from Reports, Reports highlighted', s.screen === 'screen-jobs' && cur(s) === 'Reports');
      check('Jobs lists the run\'s job', /JOB-AUD/.test(await p.textContent('#jobsList')));
      await shot(p, 'c390_jobs');
      await layoutChecks(p, 'contractor 390 Jobs');
      await p.click('#jobsList >> text=JOB-AUD'); await sleep(p, 300);
      check('a job view opens', await p.evaluate(() => document.getElementById('jobsDetailView').style.display !== 'none'));
      await shot(p, 'c390_jobview');
      await p.click('#jobsSummaryBtn'); await sleep(p, 400); s = await st(p);
      check('Job Summary from a job view, Reports highlighted', s.screen === 'screen-jobSummary' && cur(s) === 'Reports');
      await p.click('#screen-jobSummary .pb-back'); await sleep(p, 300);
      check('Job Summary Back returns to the job view', (await st(p)).screen === 'screen-jobs' && await p.evaluate(() => document.getElementById('jobsDetailView').style.display !== 'none'));
      await p.click('#jobsHeaderBack'); await sleep(p, 300);
      check('Jobs header Back: job view -> job list', (await st(p)).screen === 'screen-jobs' && await p.evaluate(() => document.getElementById('jobsDetailView').style.display === 'none'));
      await p.click('#jobsHeaderBack'); await sleep(p, 300);
      check('Jobs header Back: list -> Reports', (await st(p)).screen === 'screen-archive');
      await p.click('#archiveJobSummaryBtn'); await sleep(p, 400); s = await st(p);
      check('Job Summary opens from Reports', s.screen === 'screen-jobSummary' && cur(s) === 'Reports');
      await shot(p, 'c390_jobsummary');
      await p.click('#screen-jobSummary .pb-back'); await sleep(p, 300);
      check('...and goes back to Reports', (await st(p)).screen === 'screen-archive');
      await p.evaluate(() => { pbOpenJobs(); for (let i = 0; i < 20; i++) pbGoto('jobs', true); }); await sleep(p, 300);
      await p.click('#jobsHeaderBack'); await sleep(p, 400);
      check('Jobs Back with no history goes to the Reports tab', (await st(p)).screen === 'screen-archive');
      check('pbGotoTab(\'jobs\') is no longer a tab (returns false, no move)', await p.evaluate(() => pbGotoTab('jobs')) === false && (await st(p)).screen === 'screen-archive');

      // highlighting for every screen
      const ids = await p.evaluate(() => [...document.querySelectorAll('.pb-screen')].map(s => s.id));
      const wrong = [];
      for (const id of ids) {
        const n = id.replace('screen-', '');
        const got = await p.evaluate((name) => { pbGoto(name, false, true); window.pbRenderShell(); const t = document.querySelector('#pbTabBar .pb-tab[aria-current="page"]'); return { screen: document.querySelector('.pb-screen.active').id, tab: t ? t.querySelector('.lb').textContent : null, fn: window.pbScreenTab(name) }; }, n);
        await closeModal(p);
        if (got.screen !== id) continue; // a screen this route doesn't open directly
        if (got.tab !== expectedTab(id)) wrong.push(id + ' -> ' + got.tab + ' (want ' + expectedTab(id) + ')');
      }
      console.log('   screens checked:', ids.length);
      check('every screen highlights the right tab (or none for forms and sign-in)' + (wrong.length ? ': ' + wrong.join('; ') : ''), wrong.length === 0);
      check('pbScreenTab: a later calculator -> calculators, a later reference page -> tools', await p.evaluate(() => pbScreenTab('fooCalc') === 'calculators' && pbScreenTab('refFoo') === 'tools'));

      // leave-without-saving still asks on tab taps
      await p.evaluate(() => pbGoto('home', false, true)); await sleep(p, 300);
      await p.evaluate(() => pbOpenNewRun()); await sleep(p, 400); await closeModal(p);
      await p.fill('#totalDist', '150'); await p.evaluate(() => document.activeElement.blur()); await sleep(p, 500);
      await p.click('#pbTabCalculators'); await sleep(p, 400); s = await st(p);
      check('Calculators tab from a run form with typed data asks first', s.modal === 'Unsaved Run Data' && s.screen === 'screen-input');
      await modalClick(p, 'Keep Editing'); await sleep(p, 600);
      check('Cancel: still on the run form', (await st(p)).screen === 'screen-input');
      await p.click('#pbTabTools'); await sleep(p, 400);
      check('Tools tab asks too', (await st(p)).modal === 'Unsaved Run Data');
      await modalClick(p, 'Leave, Save Draft') || await modalClick(p, 'Leave Without Saving'); await sleep(p, 500); // batch 14 R2
      check('Continue: Tools opens', (await st(p)).screen === 'screen-tools');
      await p.click('#pbTabReports'); await sleep(p, 300);
      check('control: the run form kept what was typed', await p.evaluate(() => document.getElementById('totalDist').value === '150'));
      check('no page errors (contractor)', p._errors.length === 0); if (p._errors.length) console.log(p._errors.slice(0, 5));
      await p._ctx.close();
    }

    // ================= individual =================
    {
      const p = await open(browser, 't1i', 'individual');
      await p.waitForFunction(() => document.getElementById('pbTabReports').hidden, null, { timeout: 5000 }).catch(() => {}); // the plan is read just after start-up; the bar redraws within a second
      let s = await st(p);
      check('individual: tabs Home | Calculators | Tools | Ask (Reports hidden)', shown(s) === 'Home|Calculators|Tools|Ask'); // batch 5
      check('individual: Calculators and Tools not locked', !tab(s, 'Calculators').locked && !tab(s, 'Tools').locked);
      await p.click('#pbTabTools'); await sleep(p, 400);
      const tl = await destIds(p, '#toolsAllList');
      check('individual: Stats is listed in Tools and not locked', tl.includes('stats') && await p.evaluate(() => !document.querySelector('#toolsAllList [data-dest="stats"]').classList.contains('pb-dest-locked')));
      check('individual: Confined Space Permits shows locked with the reason', await p.evaluate(() => /Contractor/.test(document.querySelector('#toolsAllList [data-dest="confinedHub"]').textContent)));
      await shot(p, 'i390_tools');
      await p.click('#toolsAllList [data-dest="stats"]'); await sleep(p, 400); s = await st(p);
      check('individual: Stats opens from Tools, Tools highlighted', s.screen === 'screen-stats' && cur(s) === 'Tools');
      await p.click('#statsHeaderBack'); await sleep(p, 300);
      await p.click('#toolsAllList [data-dest="confinedHub"]'); await sleep(p, 300); s = await st(p);
      check('individual: a locked Confined Space row explains and stays', s.modal === 'Subscription Required' && s.screen === 'screen-tools');
      await closeModal(p);
      check('individual: pbGotoTab(reports) refused with the reason', await p.evaluate(() => pbGotoTab('reports')) === false && (await st(p)).modal === 'Subscription Required' && (await st(p)).screen === 'screen-tools');
      await closeModal(p);
      await p.evaluate(() => pbReportsOpenJobs()); await sleep(p, 300); s = await st(p);
      check('individual: the Reports Jobs route is refused (Reports plan)', s.modal === 'Subscription Required' && s.screen === 'screen-tools');
      await closeModal(p);
      await p.evaluate(() => pbOpenDest('jobSummary')); await sleep(p, 300); s = await st(p);
      check('individual: Job Summary still refused', s.modal === 'Subscription Required' && s.screen !== 'screen-jobSummary');
      await closeModal(p);
      check('individual: the Archive Job Summary row also goes through the gate', await p.evaluate(() => document.getElementById('archiveJobSummaryBtn').getAttribute('onclick') === "pbOpenDest('jobSummary')"));
      await p.click('#pbTabCalculators'); await sleep(p, 400);
      check('individual: Calculators opens', (await st(p)).screen === 'screen-calcHub');
      // Add to Home from a calculator still works
      await p.click('#toolsList [data-dest="slopeConv"]'); await sleep(p, 300);
      await p.click('#screen-slopeConvCalc .pb-addhome'); await sleep(p, 400);
      check('Add to Home still saves the shortcut', await p.evaluate(() => JSON.parse(localStorage.getItem('t1i:homeShortcuts') || '{}').ids.includes('slopeConv')));
      await p.click('#screen-slopeConvCalc .pb-addhome'); await sleep(p, 300);
      check('...and the remove question names Calculators', /stays in Calculators/.test(await p.evaluate(() => document.getElementById('pbModalOverlay').textContent)));
      await modalClick(p, 'Keep It'); await sleep(p, 200);
      await p.click('#pbTabHome'); await sleep(p, 300);
      await p.click('#homeShortcutsList [data-dest="slopeConv"]'); await sleep(p, 300);
      check('a Home shortcut opens its calculator (Calculators highlighted)', (await st(p)).screen === 'screen-slopeConvCalc' && cur(await st(p)) === 'Calculators');
      check('no page errors (individual)', p._errors.length === 0); if (p._errors.length) console.log(p._errors.slice(0, 5));
      await p._ctx.close();
    }

    // ================= no plan =================
    {
      const p = await open(browser, 't1n', null);
      let s = await st(p);
      console.log('   no plan tabs:', s.tabs.map(t => t.label + (t.shown ? '' : '(hidden)') + (t.locked ? '(locked)' : '')).join(' '));
      check('no plan: Calculators, Tools and Reports show locked', tab(s, 'Calculators').locked && tab(s, 'Tools').locked && tab(s, 'Reports').locked && !tab(s, 'Home').locked);
      await p.click('#pbTabTools'); await sleep(p, 300); s = await st(p);
      check('no plan: Tools tab refused with the reason', s.modal === 'Subscription Required' && s.screen === 'screen-home');
      await closeModal(p);
      await p.click('#pbTabCalculators'); await sleep(p, 300); s = await st(p);
      check('no plan: Calculators tab refused', s.modal === 'Subscription Required' && s.screen === 'screen-home');
      await closeModal(p);
      await p.evaluate(() => pbGoto('tools')); await sleep(p, 300); s = await st(p);
      check('no plan: pbGoto(tools) refused too (the screen is gated)', s.screen === 'screen-home');
      await closeModal(p);
      await p.evaluate(() => pbStatsBack && pbGoto('stats', true)); await sleep(p, 300); await closeModal(p);
      check('no plan: Back onto a locked screen lands Home', (await st(p)).screen === 'screen-home');
      check('no page errors (no plan)', p._errors.length === 0); if (p._errors.length) console.log(p._errors.slice(0, 5));
      await p._ctx.close();
    }

    // ================= layout: 390 Normal and 320 Extra Large =================
    for (const [w, ts, tag] of [[390, null, '390'], [320, '140', '320xl']]) {
      const p = await open(browser, 't1l' + tag, 'contractor', { width: w, height: w === 320 ? 640 : 844, textSize: ts });
      await L.lockRun(p, { stats: true }); await sleep(p, 300); await closeModal(p);
      if (ts) {
        const lb = await p.evaluate(() => { const l = document.querySelector('#pbTabCalculators .lb'); return { fs: getComputedStyle(l).fontSize, after: getComputedStyle(l, '::after').content, text: l.textContent }; });
        console.log('   320 XL Calculators label:', JSON.stringify(lb));
        check('320 XL: the Calculators tab shows "Calcs" (text stays Calculators)', lb.text === 'Calculators' && /Calcs/.test(lb.after));
      } else {
        check('390 Normal: the Calculators tab shows the full word', await p.evaluate(() => getComputedStyle(document.querySelector('#pbTabCalculators .lb'), '::after').content === 'none'));
      }
      const routes = [
        ['home', () => pbGotoTab('home')], ['calculators', () => pbGotoTab('calculators')], ['tools', () => pbGotoTab('tools')], ['reports', () => pbGotoTab('reports')],
        ['stats', () => pbOpenDest('stats')], ['jobs', () => pbReportsOpenJobs()], ['jobsummary', () => pbOpenDest('jobSummary')],
        ['calccat', () => pbGoto('calcCatGrade')]
      ];
      for (const [name, fn] of routes) {
        await p.evaluate(fn); await sleep(p, 500); await closeModal(p);
        if (name === 'jobsummary') { await p.evaluate(() => { const s = document.getElementById('jobSummaryPicker'); if (s.options.length > 1) { s.selectedIndex = 1; renderJobSummary(); } }); await sleep(p, 200); }
        await shot(p, 'L' + tag + '_' + name);
        if (SHOTS && ['tools', 'calculators'].includes(name)) await p.screenshot({ path: SHOTS + 'L' + tag + '_' + name + '_full.png', fullPage: true });
        await layoutChecks(p, tag + ' ' + name);
      }
      // the tab bar itself
      if (SHOTS) { const tb = await p.$('#pbTabBar'); await tb.screenshot({ path: SHOTS + 'L' + tag + '_tabbar.png' }); }
      check('no page errors (layout ' + tag + ')', p._errors.length === 0); if (p._errors.length) console.log(p._errors.slice(0, 5));
      await p._ctx.close();
    }
  } catch (e) { console.log('*** FAIL *** - exception', e); process.exitCode = 1; }
  finally { await browser.close(); }
})();
