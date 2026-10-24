const { L, fill, correctHub, entryState } = require('/home/claude/test/hunt/corrections/common.js');
// Engineer rod. A stake hub is corrected to an elevation; the run is ended early and resumed.
// The resume alert says: shoot ONE fresh rod reading at any point to re-establish HI.
// Shooting it at the corrected hub (Invert Elevation mode, elevation pre-filled) must give an HI.
(async () => {
  const browser = await L.chromium.launch();
  const page = await L.newPage(browser, 'uRv5');
  await L.dismiss(page);
  await page.evaluate(() => pbOpenNewRun()); await page.waitForTimeout(300);
  await page.click('#rodToggle button[data-val="engineer"]'); await page.waitForTimeout(150);
  await page.evaluate(() => { for (const p of ['start', 'end']) document.querySelector('#' + p + 'ModeToggle button[data-val="stake"]').click(); }); await page.waitForTimeout(100);
  await fill(page, 'startStakeElev', '104.00'); await page.selectOption('#startCutFill', 'cut'); await fill(page, 'startCutFillVal', '4.00'); await fill(page, 'startStakeReading', '6.00');
  await fill(page, 'endStakeElev', '103.50'); await page.selectOption('#endCutFill', 'cut'); await fill(page, 'endCutFillVal', '4.50'); await fill(page, 'endStakeReading', '6.50');
  const hub = await page.evaluate(() => { pbAddHub(); const ids = Array.from(document.querySelectorAll('#hubsContainer [data-hub-id]')).map(c => c.dataset.hubId); return ids[ids.length-1]; });
  await fill(page, hub + 'Station', '50'); await fill(page, hub + 'Label', 'H1');
  await page.evaluate((h) => document.querySelector('#' + h + 'ModeToggle button[data-val="stake"]').click(), hub); await page.waitForTimeout(100);
  await fill(page, hub + 'StakeElev', '105.00'); await page.selectOption('#' + hub + 'CutFill', 'cut'); await fill(page, hub + 'CutFillVal', '5.50'); await fill(page, hub + 'StakeReading', '5.00');
  await page.fill('#totalDist', '100'); await page.fill('#interval', '10'); await page.fill('#runWT', '0.05'); await page.selectOption('#runIdSel', '10');
  await page.waitForTimeout(300);
  await page.click('text=Review & Calculate'); await page.waitForTimeout(600);
  const rv = await page.evaluate(() => ({ on: !!document.querySelector('#screen-review.active'), err: document.getElementById('inputError').innerText }));
  if (!rv.on) console.log('review err', rv.err);
  await page.click('button[onclick="pbLock()"]'); await page.waitForSelector('#screen-results.active'); await page.waitForTimeout(500); await L.dismiss(page);
  const id = await page.evaluate(() => window.__debugGetCurrentArchiveEntry().id);
  const err = await correctHub(page, hub, 50, 99.40);
  console.log('correct err:', err);
  await page.evaluate(() => { document.getElementById('endIncompletePanel').style.display = 'none'; pbToggleEndIncomplete(); }); await page.waitForTimeout(100);
  await page.evaluate(() => { const s = document.getElementById('endIncompleteStation'); s.selectedIndex = Array.from(s.options).findIndex(o => o.textContent.trim() === '60.0'); });
  await page.evaluate(() => pbEndRunIncomplete()); await page.waitForTimeout(1200); await L.dismiss(page);
  await page.evaluate((i) => { const k = window.__debugGetArchive().findIndex(e => e.id === i); pbResumeIncompleteRun(k); }, id); await page.waitForTimeout(700); await L.dismiss(page);
  const hub2 = await page.evaluate(() => Array.from(document.querySelectorAll('#hubsContainer [data-hub-id]')).map(c => c.dataset.hubId)[0]);
  const form = await page.evaluate((h) => ({ rod: document.querySelector('#rodToggle button.active').dataset.val, mode: document.querySelector('#' + h + 'ModeToggle button.active').dataset.val, elev: document.getElementById(h + 'Elev').value, hasReading: !!document.getElementById(h + 'ElevReading') }), hub2);
  console.log('resumed form:', JSON.stringify(form));
  // the one fresh shot, taken on the corrected hub (new instrument setup: HI 104.40)
  await fill(page, hub2 + 'ElevReading', '5.00'); await page.waitForTimeout(600);
  const hiTxt = await page.evaluate(() => (document.getElementById('hiStakesDerived') || {}).textContent || '');
  console.log('HI derived text:', hiTxt.slice(0, 160));
  L.check('a fresh reading on the resumed corrected hub (elev 99.40 + 5.00) establishes HI 104.400', /104\.400/.test(hiTxt));
  L.check('no JS errors', page._errors.length === 0);
  await browser.close();
})();
