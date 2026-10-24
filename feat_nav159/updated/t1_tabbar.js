// batch 14 R2: the typed run is saved as a draft, so the leave button says 'Leave, Save Draft'.
// UX batch 2 (A1): the bottom tab bar. Fails on base (no tab bar), passes on A1.
// UX batch 3: tabs are Home | Calculators | Tools | Reports (no Jobs tab); Calculators is calcHub, Tools is screen-tools.
// batch 10 A (F16): the tab bar now hides for the keyboard only where an on-screen keyboard is likely (touch / coarse
// pointer), never on a desktop. This test checks the phone behaviour, so every browser context it opens emulates touch.
{ const __pw = (() => { try { return require('playwright'); } catch (e) { return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })(); const __launch = __pw.chromium.launch.bind(__pw.chromium);
  __pw.chromium.launch = async (...a) => { const b = await __launch(...a); const nc = b.newContext.bind(b); b.newContext = (o = {}) => nc(Object.assign({ hasTouch: true }, o)); return b; }; }
const L = require('/home/claude/test/lib.js');
const M = require('/home/claude/test/hunt6/confined/mock5.js');
const { check } = L;
const st = (p) => p.evaluate(() => {
  const vis = (el) => !!el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
  const tb = document.getElementById('pbTabBar');
  return {
    screen: (document.querySelector('.pb-screen.active') || {}).id,
    bar: vis(tb),
    tabs: tb ? [...tb.querySelectorAll('.pb-tab')].map(t => ({ id: t.id, label: t.textContent.trim(), shown: vis(t), current: t.getAttribute('aria-current') === 'page', locked: t.classList.contains('pb-tab-locked') })) : [],
    modal: getComputedStyle(document.getElementById('pbModalOverlay')).display === 'none' ? null : document.getElementById('pbModalTitle').textContent,
  };
});
const cur = (s) => (s.tabs.find(t => t.current) || {}).label || null;
const tab = (s, label) => s.tabs.find(t => t.label === label) || {};
const modalClick = (p, label) => p.evaluate((l) => { const b = [...document.querySelectorAll('#pbModalButtons button')].find(x => x.textContent.trim() === l); if (b) b.click(); return !!b; }, label);
(async () => {
  const browser = await L.chromium.launch();
  try {
    // ---- individual plan ----
    const p = await L.newPage(browser, 'u1'); await p.waitForTimeout(600);
    let s = await st(p);
    check('tab bar shown on Home', s.bar);
    check('tabs in order Home | Calculators | Tools | Reports | Ask', s.tabs.map(t => t.label).join('|') === 'Home|Calculators|Tools|Records|Ask'); // batch 5: Ask tab // UX batch 3: Jobs tab replaced by Calculators
    check('D7: individual plan, Reports tab hidden', !tab(s, 'Records').shown && tab(s, 'Home').shown && tab(s, 'Calculators').shown && tab(s, 'Tools').shown);
    check('Home tab highlighted on Home', cur(s) === 'Home');
    check('control: Calculators and Tools not locked on the individual plan', !tab(s, 'Calculators').locked && !tab(s, 'Tools').locked);
    // Tools: a fresh trail (history cleared only after the move)
    await p.evaluate(() => pbOpenStats()); await p.waitForTimeout(300);
    // UX batch 3: the calculators are the Calculators tab (calcHub)
    await p.click('#pbTabCalculators'); await p.waitForTimeout(400);
    s = await st(p);
    check('Calculators tab opens Calculators (calcHub)', s.screen === 'screen-calcHub' && cur(s) === 'Calculators');
    await p.evaluate(() => pbGoBack()); await p.waitForTimeout(300);
    check('after a tab, Back has no older trail (history cleared)', (await st(p)).screen === 'screen-calcHub');
    await p.evaluate(() => pbGoto('volumeCalc')); await p.waitForTimeout(300);
    check('a calculator highlights Calculators', cur(await st(p)) === 'Calculators');
    await p.evaluate(() => pbGoBack()); await p.waitForTimeout(300);
    check('control: ordinary Back still works inside a tab', (await st(p)).screen === 'screen-calcHub');
    // UX batch 3: Tools is its own screen; Stats lives there (Jobs is inside Reports, contractor only)
    await p.click('#pbTabTools'); await p.waitForTimeout(400);
    s = await st(p);
    check('Tools tab opens Tools (screen-tools)', s.screen === 'screen-tools' && cur(s) === 'Tools');
    await p.evaluate(() => pbOpenStats()); await p.waitForTimeout(300);
    check('Stats highlights Tools', (await st(p)).screen === 'screen-stats' && cur(await st(p)) === 'Tools');
    check('there is no Jobs tab', !s.tabs.some(t => t.label === 'Jobs') && await p.evaluate(() => !document.getElementById('pbTabJobs')));
    await p.click('#pbTabHome'); await p.waitForTimeout(400);
    check('Home tab goes Home', (await st(p)).screen === 'screen-home');
    // Forms: tabs visible (D1), no tab highlighted, hidden while typing
    await p.evaluate(() => pbOpenNewRun()); await p.waitForTimeout(400);
    s = await st(p);
    check('D1: tab bar visible on the run form', s.screen === 'screen-input' && s.bar && cur(s) === null);
    await p.focus('#totalDist'); await p.waitForTimeout(250);
    check('D1: tab bar hidden while a text field has focus (keyboard up)', !(await st(p)).bar);
    await p.fill('#totalDist', '100');
    await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(400);
    check('tab bar back once the field loses focus', (await st(p)).bar);
    await p.focus('#rodToggle button'); await p.waitForTimeout(250);
    check('control: a focused button does not hide the tab bar', (await st(p)).bar);
    // Leave-without-saving runs for a tab; Cancel leaves everything as it was
    await p.click('#pbTabTools'); await p.waitForTimeout(400);
    s = await st(p);
    check('tab from a form with unsaved data asks first (Unsaved Run Data)', s.modal === 'Unsaved Run Data' && s.screen === 'screen-input');
    await modalClick(p, 'Keep Editing'); await p.waitForTimeout(700); // batch 10 A (F33): was Cancel
    check('Cancel: still on the run form', (await st(p)).screen === 'screen-input');
    await p.evaluate(() => pbGoto('calcHub')); await p.waitForTimeout(300); await modalClick(p, 'Leave, Save Draft'); // batch 10 A (F33): was Continue
    await p.waitForTimeout(400);
    await p.evaluate(() => pbGoBack()); await p.waitForTimeout(400);
    check('after a cancelled tab, a later ordinary move keeps its Back trail', (await st(p)).screen === 'screen-input');
    await p.click('#pbTabHome'); await p.waitForTimeout(400);
    check('asked again for Home', (await st(p)).modal === 'Unsaved Run Data');
    await modalClick(p, 'Leave, Save Draft'); await p.waitForTimeout(500); // batch 10 A (F33): was Continue
    s = await st(p);
    check('Leave, Save Draft (batch 14 R2; was Leave Without Saving / Continue): moved Home', s.screen === 'screen-home');
    await p.evaluate(() => pbGoBack()); await p.waitForTimeout(300);
    check('history cleared after the confirmed tab move', (await st(p)).screen === 'screen-home');
    check('control: the run form kept what was typed', await p.evaluate(() => document.getElementById('totalDist').value === '100'));
    // Sign-in screen
    await p.evaluate(() => pbGoto('login')); await p.waitForTimeout(300);
    check('tab bar hidden on the Log In screen', !(await st(p)).bar);
    await p.evaluate(() => pbGoto('home')); await p.waitForTimeout(300);
    check('no page errors (individual)', p._errors.length === 0); if (p._errors.length) console.log(p._errors);
    await p._ctx.close();

    // ---- no plan (signed out) ----
    const ctx2 = await browser.newContext({ viewport: { width: 400, height: 900 } });
    const q = await ctx2.newPage(); q.on('dialog', d => d.accept()); q._errors = []; q.on('pageerror', e => q._errors.push(e.message));
    await q.goto(L.ORIGIN); await q.waitForTimeout(1500);
    s = await st(q);
    check('no plan: Tools tab shows locked', tab(s, 'Tools').locked && tab(s, 'Calculators').locked); // UX batch 3: Calculators in place of Jobs
    check('no plan: Reports shown (locked), not hidden', tab(s, 'Records').shown && tab(s, 'Records').locked);
    check('control: Home tab never locked', !tab(s, 'Home').locked);
    await q.click('#pbTabTools'); await q.waitForTimeout(400);
    s = await st(q);
    check('no plan: tapping Tools explains (Subscription Required) and stays Home', s.modal === 'Subscription Required' && s.screen === 'screen-home');
    await L.dismiss(q);
    await ctx2.close();

    // ---- contractor plan ----
    const ctx3 = await M.newCtx(browser);
    await ctx3.addInitScript(() => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1'); localStorage.setItem('__mockSess', JSON.stringify({ id: 'acctA', email: 'a@x.com' })); localStorage.setItem('lastKnownUserId', 'acctA'); localStorage.setItem('legacyDataMigrated', 'true'); });
    const r = await M.open(ctx3); await M.dismiss(r);
    await r.waitForFunction(() => !document.getElementById('pbTabReports').classList.contains('pb-tab-locked'), null, { timeout: 10000 }).catch(() => {}); // the plan arrives after start-up
    s = await st(r);
    check('contractor: Reports tab shown and open', tab(s, 'Records').shown && !tab(s, 'Records').locked);
    await r.click('#pbTabReports'); await r.waitForTimeout(500);
    s = await st(r);
    check('Reports tab opens the Archive and is highlighted', s.screen === 'screen-archive' && cur(s) === 'Records');
    check('no page errors (contractor)', r._errors.length === 0); if (r._errors.length) console.log(r._errors);
    await ctx3.close();
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 2; });
