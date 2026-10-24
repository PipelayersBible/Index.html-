const { L, fill, correctDist, entryState } = require('/home/claude/test/hunt/corrections/common.js');
(async () => {
  const browser = await L.chromium.launch();
  const uid = 'uCorr6';
  const page = await L.newPage(browser, uid);
  await L.dismiss(page);
  await page.evaluate(() => pbOpenNewRun()); await page.waitForTimeout(300);
  await page.click('#rodToggle button[data-val="lenker"]'); await page.waitForTimeout(100);
  await page.evaluate(() => { for (const p of ['start', 'end']) document.querySelector('#' + p + 'ModeToggle button[data-val="stake"]').click(); }); await page.waitForTimeout(100);
  await fill(page, 'startStakeElev', '104.00'); await page.selectOption('#startCutFill', 'cut'); await fill(page, 'startCutFillVal', '4.00');
  await fill(page, 'endStakeElev', '103.50'); await page.selectOption('#endCutFill', 'cut'); await fill(page, 'endCutFillVal', '4.50');
  await page.fill('#totalDist', '100'); await page.fill('#interval', '10'); await page.fill('#runWT', '0.05'); await page.selectOption('#runIdSel', '10'); await page.fill('#runTrenchWidth', '3');
  await page.check('#saEnableToggle'); await page.fill('#saJobNumber', 'J-PS'); await page.selectOption('#statsType', 'PVC Sch 40');
  await page.waitForTimeout(200);
  await page.click('text=Review & Calculate'); await page.waitForTimeout(500);
  // Stats save fails during Lock (storage hiccup); archive save works
  await page.evaluate(() => { window._o2 = localStorage.setItem.bind(localStorage); localStorage.setItem = (k, v) => { if (k.includes('statsLog')) throw new Error('sim'); return window._o2(k, v); }; });
  await page.click('button[onclick="pbLock()"]'); await page.waitForSelector('#screen-results.active'); await page.waitForTimeout(1200);
  for (let i = 0; i < 3; i++) { await L.dismiss(page); await page.waitForTimeout(150); }
  await page.evaluate(() => { localStorage.setItem = window._o2; });
  const id = await page.evaluate(() => window.__debugGetCurrentArchiveEntry().id);
  const st0 = await page.evaluate((u) => JSON.parse(localStorage.getItem(u + ':statsLog') || '[]'), uid);
  const pend = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith('pendingLockRetries')) || 'null') || '[]').map(p => p.statsStatus));
  console.log('after lock: stats', st0.length, 'pending', JSON.stringify(pend));
  L.check('setup: Lock\'s Stats write failed and is pending a retry', st0.length === 0 && pend.includes('pending'));
  const vol0 = (await entryState(page, id)).vol; console.log('pre-correction volume', vol0);
  const err = await correctDist(page, 1, 150, { wait: 2500 });
  await L.dismiss(page); await page.waitForTimeout(500);
  const s = await entryState(page, id);
  const st = await page.evaluate((u) => JSON.parse(localStorage.getItem(u + ':statsLog') || '[]'), uid);
  console.log('after correction:', err, JSON.stringify({ dist: s.dist, vol: s.vol, stats: st.map(x => [x.footage, x.volumeYd3]) }));
  L.check('control: archive corrected to 150 ft with a new volume', !err && s.dist === 150);
  L.check('Stats: exactly one record, 150 ft', st.length === 1 && st[0].footage === 150);
  L.check('Stats volume matches the corrected run\'s volume (not the pre-correction 100 ft volume)', st.length === 1 && Math.abs(st[0].volumeYd3 - s.vol) < 1e-9);
  L.check('Stats volume is not the stale pre-correction (100 ft) volume', st.length === 1 && Math.abs(st[0].volumeYd3 - vol0) > 1e-6);
  L.check('no JS errors', page._errors.length === 0);
  await browser.close();
})();
