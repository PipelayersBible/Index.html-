const { L, fill, correctDist, entryState } = require('/home/claude/test/hunt/corrections/common.js');
async function lockStaked(page) {
  await page.evaluate(() => pbOpenNewRun()); await page.waitForTimeout(300);
  await page.click('#rodToggle button[data-val="lenker"]'); await page.waitForTimeout(100);
  await page.evaluate(() => { for (const p of ['start', 'end']) document.querySelector('#' + p + 'ModeToggle button[data-val="stake"]').click(); }); await page.waitForTimeout(100);
  await fill(page, 'startStakeElev', '104.00'); await page.selectOption('#startCutFill', 'cut'); await fill(page, 'startCutFillVal', '4.00');
  await fill(page, 'endStakeElev', '103.50'); await page.selectOption('#endCutFill', 'cut'); await fill(page, 'endCutFillVal', '4.50');
  await page.fill('#totalDist', '100'); await page.fill('#interval', '10'); await page.fill('#runWT', '0.05'); await page.selectOption('#runIdSel', '10'); await page.fill('#runTrenchWidth', '3');
  await page.check('#saEnableToggle'); await page.fill('#saJobNumber', 'J-INC'); await page.selectOption('#statsType', 'PVC Sch 40');
  await page.waitForTimeout(200);
  await page.click('text=Review & Calculate'); await page.waitForTimeout(500);
  await page.click('button[onclick="pbLock()"]'); await page.waitForSelector('#screen-results.active'); await page.waitForTimeout(500); await L.dismiss(page);
  return page.evaluate(() => window.__debugGetCurrentArchiveEntry().id);
}
(async () => {
  const browser = await L.chromium.launch();
  for (const newDist of [120, 50]) {
    const uid = 'uCorr4_' + newDist;
    const page = await L.newPage(browser, uid);
    await L.dismiss(page);
    const id = await lockStaked(page);
    await page.clock.install({ time: Date.now() });
    await page.clock.fastForward(30 * 60000);
    await page.evaluate(() => { document.getElementById('endIncompletePanel').style.display = 'none'; pbToggleEndIncomplete(); }); await page.waitForTimeout(100);
    await page.evaluate(() => { const s = document.getElementById('endIncompleteStation'); s.selectedIndex = Array.from(s.options).findIndex(o => o.textContent.trim() === '60.0'); });
    await page.evaluate(() => pbEndRunIncomplete()); await page.waitForTimeout(1200); await L.dismiss(page);
    let s = await entryState(page, id);
    const st0 = await page.evaluate((u) => JSON.parse(localStorage.getItem(u + ':statsLog') || '[]'), uid);
    console.log('ended:', s.completed, s.stop, s.vol, JSON.stringify(st0.map(x => [x.footage, x.volumeYd3, x.durationMin, x.incomplete])));
    L.check(`[${newDist}] control: ended incomplete at 60 with a part-run volume`, s.incomplete && s.completed === 60 && typeof s.vol === 'number');
    await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(400);
    const err = await correctDist(page, 1, newDist, { wait: 1500 });
    s = await entryState(page, id);
    const e = await page.evaluate((i) => { const e = window.__debugGetArchive().find(x => x.id === i); return { rt: e.reportText, dur: e.durationMin, volTo: e.volumeToStationFt }; }, id);
    const st = await page.evaluate((u) => JSON.parse(localStorage.getItem(u + ':statsLog') || '[]'), uid);
    console.log('after:', err, JSON.stringify({ d: s.dist, c: s.completed, stop: s.stop, vol: s.vol, volTo: e.volTo, dur: e.dur, st: st.map(x => [x.footage, x.volumeYd3, x.durationMin, x.incomplete, JSON.stringify(x.sizeSegments)]) }), (e.rt.match(/.*stopped.*/) || [''])[0]);
    if (newDist >= 60) {
      L.check(`[${newDist}] correction keeps run incomplete, completedDistance 60`, !err && s.incomplete === true && s.completed === 60 && s.dist === newDist);
      L.check(`[${newDist}] stop point still 60.0, within the corrected run`, s.stop === '60.0');
      L.check(`[${newDist}] Stats: one record, footage 60, incomplete, part-run volume = archive volume, duration ~30 min`, st.length === 1 && st[0].footage === 60 && st[0].incomplete === true && st[0].volumeYd3 === s.vol && Math.abs(st[0].durationMin - e.dur) < 1e-9 && e.dur >= 29.9);
    } else {
      // stopped at 60.0 on a run now said to be 50 ft long: the stop point would be past the end of the run
      L.check(`[${newDist}] correcting the length to end before the recorded stop point (60.0) is refused with the reason`, /ended early at 60\.0 ft, which is past the end of a 50\.0 ft run/.test(err));
      L.check(`[${newDist}] the record is unchanged (100 ft, stopped at 60.0, completed 60, no correction logged)`, s.dist === 100 && s.completed === 60 && s.stop === '60.0' && s.corr === 0 && parseFloat(s.stop) <= s.dist);
      L.check(`[${newDist}] the form keeps 100 ft`, (await page.evaluate(() => document.getElementById('totalDist').value)) === '100');
      L.check(`[${newDist}] Stats unchanged: 60 ft, incomplete`, st.length === 1 && st[0].footage === 60 && st[0].incomplete === true);
    }
    L.check(`[${newDist}] no JS errors`, page._errors.length === 0);
    await page._ctx.close();
  }
  await browser.close();
})();
