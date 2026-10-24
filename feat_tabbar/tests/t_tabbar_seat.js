// feat_tabbar (r15.31): the fixed tab bar is re-seated to the VISIBLE bottom when iOS restores a tab with a stale, short
// layout viewport (the bar sat mid-screen). Simulated by standing in for window.visualViewport.
const L = require('/home/claude/test/lib.js');
(async () => {
  const browser = await L.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { localStorage.setItem('lastKnownUserId', 'uTab'); localStorage.setItem('uTab:cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active' })); });
  const page = await L.newPage(browser, 'uTab', ctx);
  const fake = (h, top) => page.evaluate(([h, top]) => {
    const vv = { get height() { return h; }, get offsetTop() { return top; }, get scale() { return 1; }, addEventListener() {}, removeEventListener() {} };
    Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => vv });
    window.pbVvSeat();
    return { shift: document.documentElement.style.getPropertyValue('--pb-vv-shift'), clientH: document.documentElement.clientHeight };
  }, [h, top]);
  const osk = await page.evaluate(() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } });
  L.check('setup: the page counts as a touch phone (the re-seat only runs there)', osk);
  const base = await page.evaluate(() => document.documentElement.clientHeight);
  const r1 = await fake(base + 840, 0);
  L.check('a visual viewport 840 px TALLER than the layout viewport (the restored-tab case) moves the bar down by 840 px [' + r1.shift + ']', r1.shift === '840px');
  const r2 = await fake(base, 0);
  L.check('back to normal: no shift', r2.shift === '0px');
  const r3 = await fake(base - 600, 0);
  L.check('a shift that would push the bar far off the top (stale TALL layout, keyboard-like) is ignored', r3.shift === '0px');
  const r4 = await fake(base - 100, 60);
  L.check('a small stale offset (keyboard just closed: top 60, height −100) still re-seats as before [' + r4.shift + ']', r4.shift === '-40px');
  const r5 = await fake(base * 2 + 10, 0);
  L.check('an absurd shift (more than a whole layout height) is ignored', r5.shift === '0px');
  // the periodic check: a restore with no event fires still gets seated within 2 s
  await page.evaluate(() => { document.documentElement.style.setProperty('--pb-vv-shift', '0px'); });
  await page.evaluate(([h]) => { const vv = { get height() { return h; }, get offsetTop() { return 0; }, get scale() { return 1; }, addEventListener() {}, removeEventListener() {} }; Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => vv }); }, [base + 300]);
  await page.waitForTimeout(2200);
  L.check('with no event at all, the periodic check seats the bar within 2 s', (await page.evaluate(() => document.documentElement.style.getPropertyValue('--pb-vv-shift'))) === '300px');
  L.check('no JS errors', page._errors.length === 0, page._errors.join(' | '));
  await browser.close();
})();
