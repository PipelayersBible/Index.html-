// r15.1 PM RUNS updated copy of /home/claude/batch27/CONSOLE/updated/t_b20_company_home.js: Home now also has the Crew runs tile (homeCxRuns2).
// Batch 27 CONSOLE copy (Company Home redesigned: Right now / Inbox / Material alerts / Waiting buttons, job cards, links;
//   the batch 20 rows homeCoProd / homeCoLive / homeCoWait / homeCoMat / homeCoCrew / homeCoLogo are gone).
// Batch 20 HOME: the Company Home (company account, listed managers, PMs) and who does NOT get it.
//   1. manager: Company section, rows, summaries from cached copies, Field tools fold, routes, Current Work kept, tab bar unchanged
//   2. first start with no signal and no access known: the normal Home, no flash; then signal: switches once
//   3. offline with cached access: Company Home
//   4. access revoked: back to the normal Home
//   5. account switch on one phone: company account -> pipelayer -> company account
//   6. PM (role 'pm' + manager, batch 19): Company Home
const L = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = L;
const errs = [];
const state = (p) => p.evaluate(() => {
  const vis = (id) => { const e = document.getElementById(id); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  return { on: document.getElementById('screen-home').classList.contains('pb-coh-on'), sec: vis('homeCompany'), start: vis('homeTileNewRun'), startHead: vis('homeStartHead'),
    rows: [...document.querySelectorAll('#homeCxPulse > button, #homeCompany .pbx-links > button')].map(b => b.id), subs: Object.fromEntries([...document.querySelectorAll('#homeCxPulse > button')].map(b => [b.id, b.innerText.replace(/\s+/g, ' ').trim()])),
    jobs: [...document.querySelectorAll('#homeCxJobs .pbx-job')].map(b => b.dataset.job),
    name: (document.getElementById('homeCoName') || {}).textContent || '' };
});
// counts how often the Company Home class flips while the page runs
const flipWatch = () => { window.__cohFlips = []; let was = false; new MutationObserver((ms) => { ms.forEach(m => { if (m.target.id === 'pbBootCover' && !window.__coverOffAt && m.target.style.display === 'none') window.__coverOffAt = performance.now(); if (m.target.id !== 'screen-home') return; const now = m.target.classList.contains('pb-coh-on'); if (now !== was) { window.__cohFlips.push(now); const c = document.getElementById('pbBootCover'); (window.__cohCover = window.__cohCover || []).push(!!c && getComputedStyle(c).display !== 'none' ? 'under cover' : Math.round(performance.now() - (window.__coverOffAt || 0)) + ' ms after the cover'); was = now; } }); }).observe(document, { attributes: true, attributeFilter: ['class', 'style'], subtree: true }); };
(async () => {
  const browser = await M.chromium.launch();
  const optional = { live: 'pbBdRefresh', mat: 'pbMatToggle', logo: 'pbOpenCompanyLogo' };
  // ---------- 1. the company account (a manager) ----------
  { const srv = L.seedServer();
    srv.entries['acctP|w1'] = { id: 'w1', user: 'acctP', email: 'p@crew.test', company: 'c1', versions: [1], updated_at: new Date().toISOString(), record: { jobNumber: '24-101', jobsite: 'Elm St water main', workDate: new Date().toISOString().slice(0, 10), enteredBy: 'Pat Layer' }, items: [{ key: 'pipe', qty: 40, unit: 'LF' }], crew: { state: 'pending', created: Date.now(), assigned: null } };
    const { ctx, page } = await L.setup(browser, { manager: true, extra: { __psrv: srv } });
    try {
      await L.waitFor(page, () => document.getElementById('screen-home').classList.contains('pb-coh-on'), 8000);
      let s = await state(page);
      const has = await page.evaluate((o) => Object.fromEntries(Object.entries(o).map(([k, f]) => [k, typeof window[f] === 'function'])), optional);
      check('manager: the Company section is shown and the start list folded away', s.on && s.sec && !s.start && !s.startHead);
      check('manager: Right now, Inbox, Material alerts, Waiting on foremen; Crew members, Production details (no Company logo: Settings) (' + JSON.stringify(s.rows) + ')',
        JSON.stringify(s.rows) === JSON.stringify(['homeCxLive', 'homeCxInbox', 'homeCxMat', 'homeCxWait', 'homeCxRuns2', 'homeCxDash']));
      check('manager: pbIsCompanyHome() says so', await page.evaluate(() => window.pbIsCompanyHome() === true && window.pbIsCompanyHome('shared') === false && window.pbIsCompanyHome('someoneElse') === false));
      await L.waitFor(page, () => document.querySelectorAll('#homeCxJobs .pbx-job').length > 0, 8000); s = await state(page);
      check('Home loads the jobs itself (' + JSON.stringify(s.jobs) + ')', s.jobs.includes('24-101') && s.jobs.includes('24-202'));
      // open Production details (batch 11's dashboard) from Home
      await page.click('#homeCxDash'); await L.waitFor(page, () => !!document.getElementById('pdJob0'), 8000);
      check('Company production opens from Home', (await L.screen(page)) === 'screen-prodDashboard');
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(400);
      await page.evaluate(() => { window.__pbCohDebug(); }); await page.waitForTimeout(200);
      s = await state(page);
      check('jobs status: "N jobs · Updated"', /\d+ jobs? · (Updated|Copy from)/.test(await page.evaluate(() => document.getElementById('homeCxStatus').textContent)));
      check('waiting button: "1 Waiting on foremen 1 run" (' + s.subs.homeCxWait + ')', /^1 Waiting on foremen 1 run/.test(s.subs.homeCxWait || ''));
      // the waiting button opens the waiting list, one row per job
      await page.click('#homeCxWait'); await page.waitForTimeout(900);
      check('Waiting on foremen opens the waiting list with the job on it', (await L.screen(page)) === 'screen-cxList' && await page.evaluate(() => !!document.getElementById('cxWait0')));
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(300);
      await page.click('#homeCxLive'); await page.waitForTimeout(900); check('Right now opens the Live now list', (await L.screen(page)) === 'screen-cxList' && /Live now/.test(await page.evaluate(() => document.getElementById('cxListTitle').textContent))); await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(300);
      await page.evaluate(() => pbOpenSettings()); await page.waitForTimeout(500); await page.click('#settingsCrewBtn'); await page.waitForTimeout(700);
      check('Crew members opens from Settings > Company (r15.9)', (await L.screen(page)) === 'screen-crewMembers');
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(300);
      // Field tools: the normal start list and shortcuts, nothing unreachable
      const tb = await page.evaluate(() => document.getElementById('homeCoTools').getAttribute('aria-expanded'));
      await page.click('#homeCoTools'); await page.waitForTimeout(200);
      s = await state(page);
      check('Field tools: aria-expanded false -> true and the start list (New Run, Quick Run, Confined Space Permit) shows', tb === 'false' && s.start && s.startHead && await page.evaluate(() => document.getElementById('homeCoTools').getAttribute('aria-expanded') === 'true' && ['homeTileQuickRun', 'homeTileNewPermit'].every(id => document.getElementById(id).getBoundingClientRect().height > 0)));
      await page.click('#homeTileQuickRun'); await page.waitForTimeout(400);
      check('a field tool still opens from the Company Home (Quick Run)', (await L.screen(page)) === 'screen-quickrun');
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(300);
      await page.click('#homeCoTools'); await page.waitForTimeout(200);
      check('Field tools folds again', !(await state(page)).start);
      // accessibility names and the tab bar
      const a11y = await page.evaluate(() => [...document.querySelectorAll('#homeCompany button')].every(b => b.tagName === 'BUTTON' && b.type === 'button' && b.textContent.trim().length > 5)
        && document.getElementById('homeCompany').getAttribute('aria-labelledby') === 'homeCoHead' && document.getElementById('homeCoHead').textContent === 'Jobs');
      check('every Company Home control is a real button named by its text; the section is named "Jobs"', a11y);
      check('accessible name: "Company production" button', (await page.getByRole('button', { name: /^Company production/ }).count()) === 1);
      check('Home tab unchanged: label "Home", home icon, current', await page.evaluate(() => { const t = document.getElementById('pbTabHome'); return t.querySelector('.lb').textContent === 'Home' && t.querySelector('use').getAttribute('href') === '#pb-i-home' && document.querySelectorAll('#pbTabBar .pb-tab').length >= 4; }));
      // safety: Current Work stays on the Company Home
      await M.lockRun(page); await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(600);
      check('a run in progress still shows its Continue Run card on the Company Home', await page.evaluate(() => { const t = document.getElementById('resumeTile'), u = document.getElementById('resumeLastRunTile'); return [t, u].some(x => x && x.getBoundingClientRect().height > 0); }) && (await state(page)).on);
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 2. first start, no signal, nothing known: normal Home with no flash; signal: switches once ----------
  { const { ctx, page } = await L.setup(browser, { manager: true, extra: { __rpcMode: 'offline' } });
    try {
      await page.waitForTimeout(1500);
      let s = await state(page);
      check('access unknown (no signal, first start): the normal Home', !s.on && !s.sec && s.start);
      await page.evaluate(() => { localStorage.setItem('__rpcMode', 'ok'); });
      await ctx.addInitScript(flipWatch);
      await page.reload(); await page.waitForFunction(() => getComputedStyle(document.getElementById('pbBootCover')).display === 'none'); await M.dismiss(page);
      await L.waitFor(page, () => document.getElementById('screen-home').classList.contains('pb-coh-on'), 8000); await page.waitForTimeout(3500);
      const flips = await page.evaluate(() => window.__cohFlips);
      check('with signal: switches to the Company Home exactly once (flips ' + JSON.stringify(flips) + ')', JSON.stringify(flips) === '[true]');
      console.log('note: when it switched (first answer from the server): ' + JSON.stringify(await page.evaluate(() => window.__cohCover)));
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 3. offline with cached access; 4. revoked ----------
  { const { ctx, page } = await L.setup(browser, { manager: true });
    try {
      await L.waitFor(page, () => document.getElementById('screen-home').classList.contains('pb-coh-on'), 8000);
      await page.evaluate(() => localStorage.setItem('__rpcMode', 'offline'));
      await ctx.addInitScript(flipWatch);
      await page.reload(); await page.waitForFunction(() => getComputedStyle(document.getElementById('pbBootCover')).display === 'none'); await M.dismiss(page);
      await L.waitFor(page, () => document.getElementById('screen-home').classList.contains('pb-coh-on'), 8000); await page.waitForTimeout(3500);
      console.log('note: when it switched (access cached, no signal): ' + JSON.stringify(await page.evaluate(() => window.__cohCover)));
      check('no signal, access cached on this phone: Company Home, switched once', (await state(page)).on && JSON.stringify(await page.evaluate(() => window.__cohFlips)) === '[true]');
      // revoked: the server now says not a manager
      await page.evaluate(() => { localStorage.setItem('__rpcMode', 'ok'); localStorage.removeItem('__manager'); });
      await page.reload(); await page.waitForFunction(() => getComputedStyle(document.getElementById('pbBootCover')).display === 'none'); await M.dismiss(page);
      await L.waitFor(page, () => !document.getElementById('screen-home').classList.contains('pb-coh-on') && window.__cohFlips && window.__cohFlips.length >= 2, 8000); await page.waitForTimeout(1500);
      const s = await state(page);
      check('access revoked: back to the normal Home (start list shown, Company section hidden)', !s.on && !s.sec && s.start);
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 5. account switch on the same phone ----------
  { const { ctx, page } = await L.setup(browser, { manager: true, extra: { __role: 'foreman' } });
    try {
      await L.waitFor(page, () => document.getElementById('screen-home').classList.contains('pb-coh-on'), 8000);
      await page.evaluate(() => { localStorage.removeItem('__manager'); localStorage.setItem('__role', 'pipelayer'); });
      await M.loginAs(page, 'b@x.com'); await M.dismiss(page); await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(2500);
      let s = await state(page);
      check('switched to a pipelayer (acctB): the normal Home, nothing of the company account shown', !s.on && !s.sec && s.start && await page.evaluate(() => !/Company production/.test(document.getElementById('screen-home').innerText)));
      await page.evaluate(() => { localStorage.setItem('__manager', '1'); localStorage.setItem('__role', 'foreman'); });
      await M.loginAs(page, 'a@x.com'); await M.dismiss(page); await page.evaluate(() => pbGotoTab('home'));
      await L.waitFor(page, () => document.getElementById('screen-home').classList.contains('pb-coh-on'), 8000);
      s = await state(page);
      check('back to the company account (acctA): Company Home again, Field tools folded', s.on && s.sec && !s.start);
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 6. a PM (batch 19: role pm, listed as a manager) ----------
  { const { ctx, page } = await L.setup(browser, { manager: true, extra: { __role: 'pm' } });
    try {
      check('PM: Company Home', await L.waitFor(page, () => document.getElementById('screen-home').classList.contains('pb-coh-on'), 8000));
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  check('JS errors: ' + (errs.length ? errs.join(' | ') : 'none'), !errs.length);
  console.log('JS errors: ' + (errs.length ? errs.join(' | ') : 'none'));
  await browser.close();
})();
