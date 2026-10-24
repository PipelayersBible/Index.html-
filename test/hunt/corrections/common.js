const L = require('/home/claude/test/lib.js');
const fill = (page, id, v) => page.evaluate(([id, v]) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
// Lenker run, Start 100 / End 99 elev mode, optional stake hub, stats on.
async function lockStakeHubRun(page, { dist = 100, hubStation = 50, stakeElev = '105.00', cut = '5.50', stats = true, trench = null } = {}) {
  await page.evaluate(() => pbOpenNewRun()); await page.waitForTimeout(300);
  await page.click('#rodToggle button[data-val="lenker"]');
  await page.fill('#startElev', '100.00'); await page.fill('#endElev', '99.00'); await page.fill('#totalDist', String(dist)); await page.fill('#interval', '10');
  await page.fill('#runWT', '0.3'); await page.selectOption('#runIdSel', '10');
  if (trench) await page.fill('#runTrenchWidth', trench);
  let hubId = null;
  if (hubStation !== null) {
    hubId = await page.evaluate(() => { pbAddHub(); const ids = Array.from(document.querySelectorAll('#hubsContainer [data-hub-id]')).map(c => c.dataset.hubId); return ids[ids.length - 1]; });
    await page.waitForTimeout(100);
    await fill(page, hubId + 'Station', String(hubStation));
    await page.evaluate((h) => document.querySelector('#' + h + 'ModeToggle button[data-val="stake"]').click(), hubId); await page.waitForTimeout(100);
    await fill(page, hubId + 'StakeElev', stakeElev); await page.selectOption('#' + hubId + 'CutFill', 'cut'); await fill(page, hubId + 'CutFillVal', cut);
  }
  if (stats) { await page.check('#saEnableToggle'); await page.fill('#saJobNumber', 'JOB-C'); await page.selectOption('#statsType', 'PVC Sch 40'); }
  await page.waitForTimeout(200);
  await page.click('text=Review & Calculate'); await page.waitForTimeout(500);
  await page.click('button[onclick="pbLock()"]');
  await page.waitForSelector('#screen-results.active'); await page.waitForTimeout(500);
  await L.dismiss(page);
  const id = await page.evaluate(() => window.__debugGetCurrentArchiveEntry().id);
  return { id, hubId };
}
async function correctDist(page, runNum, val, { wait = 900 } = {}) {
  await page.evaluate(() => { document.getElementById('correctDistancePanel').style.display = 'none'; pbToggleCorrectDistance(); }); await page.waitForTimeout(100);
  await page.selectOption('#correctDistanceRunSel', 'run:' + runNum); await page.evaluate(() => pbUpdateCorrectDistanceField());
  await page.fill('#correctDistanceVal', String(val));
  await page.evaluate(() => { window._c = pbApplyCorrectDistance(); }); await page.waitForTimeout(wait);
  const err = await page.evaluate(() => { const e = document.getElementById('correctDistanceError'); return e.style.display === 'none' ? '' : e.innerText; });
  await L.dismiss(page);
  return err;
}
async function correctHub(page, hubId, station, elev, { wait = 900 } = {}) {
  await page.evaluate(() => { document.getElementById('correctDistancePanel').style.display = 'none'; pbToggleCorrectDistance(); }); await page.waitForTimeout(100);
  await page.selectOption('#correctDistanceRunSel', 'hub:' + hubId); await page.evaluate(() => pbUpdateCorrectDistanceField());
  await page.fill('#correctHubStation', String(station)); await page.fill('#correctHubElev', String(elev));
  await page.evaluate(() => { window._c = pbApplyCorrectDistance(); }); await page.waitForTimeout(wait);
  const err = await page.evaluate(() => { const e = document.getElementById('correctDistanceError'); return e.style.display === 'none' ? '' : e.innerText; });
  await L.dismiss(page);
  return err;
}
const entryState = (page, id) => page.evaluate((i) => { const e = window.__debugGetArchive().find(x => x.id === i); return e && { dist: e.distance, completed: e.completedDistance, stop: e.stoppedAtStation, flagged: e.depthFlagged, vol: e.volumeYd3, volInc: e.volumeIncomplete, ncf: e.netCutFill, corr: (e.correctionHistory || []).length, incomplete: e.incomplete, rows: e.intervalRows.map(r => ({ st: r.stationFt, label: r.label, pid: r.pointId, pi: r.piFt, added: r.addedTime })) }; }, id);
module.exports = { L, fill, lockStakeHubRun, correctDist, correctHub, entryState };
