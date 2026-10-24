const { L, fill, lockStakeHubRun, entryState } = require('/home/claude/test/hunt/corrections/common.js');
(async () => {
  const browser = await L.chromium.launch();
  const page = await L.newPage(browser, 'uCorr3');
  await L.dismiss(page);
  const { id, hubId } = await lockStakeHubRun(page);
  // manual interval at 75
  await page.evaluate(() => { document.getElementById('addIntervalPanel').style.display = 'none'; pbToggleAddInterval(); });
  await page.fill('#newIntervalStation', '75'); await page.fill('#newIntervalLabel', 'MARK');
  await page.evaluate(() => pbAddInterval()); await page.waitForTimeout(600); await L.dismiss(page);
  let s = await entryState(page, id);
  L.check('control: manual interval at 75 saved', s.rows.some(r => r.st === 75 && r.added));
  // 1) hub correction held, will FAIL
  await page.evaluate(() => { document.getElementById('correctDistancePanel').style.display = 'none'; pbToggleCorrectDistance(); });
  await page.selectOption('#correctDistanceRunSel', 'hub:' + hubId); await page.evaluate(() => pbUpdateCorrectDistanceField());
  await page.fill('#correctHubStation', '80'); await page.fill('#correctHubElev', '99.40');
  await L.hold(page, 'rel1');
  await page.evaluate(() => { window._c1 = pbApplyCorrectDistance(); }); await page.waitForTimeout(300);
  // 2) distance correction queued behind it
  await page.selectOption('#correctDistanceRunSel', 'run:1'); await page.evaluate(() => pbUpdateCorrectDistanceField());
  const shown = await page.evaluate(() => document.getElementById('correctDistanceVal').value);
  await page.fill('#correctDistanceVal', '120');
  await page.evaluate(() => { window._c2 = pbApplyCorrectDistance(); });
  // 3) crew add queued too
  await page.evaluate(() => { document.getElementById('crewLogName').value = 'Bob'; }); await page.evaluate(() => { window._c3 = pbAddCrewLogEntry(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => window.rel1(false));
  await page.waitForTimeout(2500); await L.dismiss(page); await page.waitForTimeout(300); await L.dismiss(page);
  s = await entryState(page, id);
  const form = await page.evaluate((h) => ({ mode: document.querySelector('#' + h + 'ModeToggle button.active').dataset.val, st: document.getElementById(h + 'Station').value, se: document.getElementById(h + 'StakeElev').value, cf: document.getElementById(h + 'CutFillVal').value, td: document.getElementById('totalDist').value }), hubId);
  const e = await page.evaluate((i) => { const e = window.__debugGetArchive().find(x => x.id === i); return { crew: (e.crewLog || []).map(p => p.name), hist: (e.correctionHistory || []).map(c => c.type + ':' + (c.newDist || c.newStation)), pin: e.pointInputs }; }, id);
  const disk = (await L.archive(page, 'uCorr3')).find(x => x.id === id);
  console.log(JSON.stringify({ shown, form, dist: s.dist, flagged: s.flagged, hist: e.hist, crew: e.crew, hubRow: s.rows.find(r => r.pid === hubId), pin: e.pin[hubId] }));
  L.check('hub form back in stake mode at station 50 with stake 105.00 / cut 5.50 after the failed hub correction', form.mode === 'stake' && form.st === '50' && parseFloat(form.se) === 105 && parseFloat(form.cf) === 5.5);
  L.check('queued distance correction applied: 120 ft, history has only the distance correction', s.dist === 120 && e.hist.length === 1 && e.hist[0] === 'distance:120');
  L.check('hub still at 50 with stake-derived invert 99.50 in the archive', (s.rows.find(r => r.pid === hubId) || {}).st === 50 && Math.abs(s.rows.find(r => r.pid === hubId).pi - 99.5) < 1e-9);
  L.check('still depth-flagged', s.flagged === true);
  L.check('manual interval at 75 still present', s.rows.some(r => r.st === 75 && r.added));
  L.check('crew add applied', e.crew.includes('Bob'));
  L.check('disk matches memory (120 ft, crew Bob, 1 correction)', disk.distance === 120 && disk.crewLog.some(p => p.name === 'Bob') && disk.correctionHistory.length === 1);
  L.check('no JS errors', page._errors.length === 0);
  await browser.close();
})();
