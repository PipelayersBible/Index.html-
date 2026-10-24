const { L, fill, correctHub, entryState } = require('/home/claude/test/hunt/corrections/common.js');
// A fully staked run whose deep stake hub was corrected to an elevation: End Run's stop-point volume
// and a Resume must still use that hub's stake ground (depth flag, cut/fill, volume).
(async () => {
  const browser = await L.chromium.launch();
  const page = await L.newPage(browser, 'uCorr10');
  await L.dismiss(page);
  await page.evaluate(() => pbOpenNewRun()); await page.waitForTimeout(300);
  await page.click('#rodToggle button[data-val="lenker"]'); await page.waitForTimeout(100);
  await page.evaluate(() => { for (const p of ['start', 'end']) document.querySelector('#' + p + 'ModeToggle button[data-val="stake"]').click(); }); await page.waitForTimeout(100);
  await fill(page, 'startStakeElev', '104.00'); await page.selectOption('#startCutFill', 'cut'); await fill(page, 'startCutFillVal', '4.00');
  await fill(page, 'endStakeElev', '103.50'); await page.selectOption('#endCutFill', 'cut'); await fill(page, 'endCutFillVal', '4.50');
  const hub = await page.evaluate(() => { pbAddHub(); const ids = Array.from(document.querySelectorAll('#hubsContainer [data-hub-id]')).map(c => c.dataset.hubId); return ids[ids.length-1]; });
  await fill(page, hub + 'Station', '50'); await fill(page, hub + 'Label', 'H1');
  await page.evaluate((h) => document.querySelector('#' + h + 'ModeToggle button[data-val="stake"]').click(), hub); await page.waitForTimeout(100);
  await fill(page, hub + 'StakeElev', '105.00'); await page.selectOption('#' + hub + 'CutFill', 'cut'); await fill(page, hub + 'CutFillVal', '5.50');
  await page.fill('#totalDist', '100'); await page.fill('#interval', '10'); await page.fill('#runWT', '0.05'); await page.selectOption('#runIdSel', '10'); await page.fill('#runTrenchWidth', '3');
  await page.check('#saEnableToggle'); await page.fill('#saJobNumber', 'J-SG'); await page.selectOption('#statsType', 'PVC Sch 40');
  await page.waitForTimeout(200);
  await page.click('text=Review & Calculate'); await page.waitForTimeout(500);
  await page.click('button[onclick="pbLock()"]'); await page.waitForSelector('#screen-results.active'); await page.waitForTimeout(500); await L.dismiss(page);
  const id = await page.evaluate(() => window.__debugGetCurrentArchiveEntry().id);
  let s = await entryState(page, id);
  L.check('control: locked, depth-flagged (hub 5.50 cut + 0.05 wall), whole-run volume known', s.flagged === true && typeof s.vol === 'number' && s.vol > 0);
  const err = await correctHub(page, hub, 50, 99.40);
  s = await entryState(page, id);
  // Pass 25: the hub's cut follows its corrected invert: ground 105.00 - 99.40 = 5.60, so net cut/fill is
  // 4.00 (Start 104.00 - 100.00) + 5.60 + 4.50 (End 103.50 - 99.00) = 14.10 (was 14.0 with the stake's old 5.50 cut).
  L.check('control: hub corrected to 99.40, still flagged, volume known, net cut/fill 14.1 (4.0 + 5.6 + 4.5)', !err && s.corr === 1 && s.flagged === true && typeof s.vol === 'number' && Math.abs(s.ncf - 14.1) < 1e-9);
  await page.evaluate(() => { document.getElementById('endIncompletePanel').style.display = 'none'; pbToggleEndIncomplete(); }); await page.waitForTimeout(100);
  await page.evaluate(() => { const s = document.getElementById('endIncompleteStation'); s.selectedIndex = Array.from(s.options).findIndex(o => o.textContent.trim() === '60.0'); });
  await page.evaluate(() => pbEndRunIncomplete()); await page.waitForTimeout(1200); await L.dismiss(page);
  const ended = await page.evaluate((i) => { const e = window.__debugGetArchive().find(x => x.id === i); return { inc: e.incomplete, vol: e.volumeYd3, unk: e.volumeStopUnknown, to: e.volumeToStationFt }; }, id);
  console.log('ended:', JSON.stringify(ended));
  L.check('End Run Incomplete at 60 after the hub correction: the part-run volume is computed to 60 ft, not withheld as "stop unknown"', ended.inc && ended.unk === false && ended.to === 60 && typeof ended.vol === 'number' && ended.vol > 0 && ended.vol < s.vol);
  // Resume
  await page.evaluate((i) => { const k = window.__debugGetArchive().findIndex(e => e.id === i); pbResumeIncompleteRun(k); }, id); await page.waitForTimeout(600); await L.dismiss(page);
  const hub2 = await page.evaluate(() => Array.from(document.querySelectorAll('#hubsContainer [data-hub-id]')).map(c => c.dataset.hubId)[0]);
  const form = await page.evaluate((h) => ({ mode: document.querySelector('#' + h + 'ModeToggle button.active').dataset.val, elev: document.getElementById(h + 'Elev').value }), hub2);
  L.check('control: resumed hub stays at its corrected elevation 99.40 in Invert Elevation mode', form.mode === 'elev' && parseFloat(form.elev) === 99.4);
  await page.click('text=Review & Calculate'); await page.waitForTimeout(800);
  const review = await page.evaluate(() => ({ on: !!document.querySelector('#screen-review.active'), deep: Array.from(document.querySelectorAll('#screen-review .pb-warn')).some(x => /Deep Trench/.test(x.textContent)), err: document.getElementById('inputError').innerText }));
  if (!review.on) console.log('review err', review.err);
  L.check('CRITICAL: the resumed run\'s Review shows the Deep Trench warning (the corrected hub\'s ground is still 105.00)', review.on && review.deep);
  await page.click('button[onclick="pbLock()"]'); await page.waitForSelector('#screen-results.active'); await page.waitForTimeout(700); await L.dismiss(page);
  const b = await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); return { from: e.resumedFromId, flagged: e.depthFlagged, ncf: e.netCutFill, vol: e.volumeYd3 }; });
  console.log('resumed lock:', JSON.stringify(b));
  L.check('CRITICAL: the finished (resumed) run is depth-flagged', b.from === id && b.flagged === true);
  // Pass 25: the resumed hub keeps ground 105.00 at its corrected invert 99.40: still 4.0 + 5.6 + 4.5 = 14.1.
  L.check('the finished run keeps the hub\'s cut in net cut/fill (14.1) and a backfill volume', b.ncf !== null && Math.abs(b.ncf - 14.1) < 1e-9 && typeof b.vol === 'number' && b.vol > 0);
  L.check('no JS errors', page._errors.length === 0);
  await browser.close();
})();
