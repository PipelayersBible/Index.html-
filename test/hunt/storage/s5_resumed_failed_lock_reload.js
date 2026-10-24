const L = require('/home/claude/test/lib.js');
// Run A ended incomplete; resumed as B; B's Lock fails to save (storage full); app reloads before Retry Save.
// On boot the pending-retry snapshot revives B (resumedFromId = A), but A's resumedIntoId link is not restored,
// so A is still offered under "Runs to Finish" and can be resumed a second time (a second session for the same pipe).
async function endIncompleteAt(page, label) {
  await page.evaluate(() => { document.getElementById('endIncompletePanel').style.display = 'none'; pbToggleEndIncomplete(); }); await page.waitForTimeout(120);
  await page.evaluate((lab) => { const s = document.getElementById('endIncompleteStation'); s.selectedIndex = Array.from(s.options).findIndex(o => o.textContent.trim() === lab); }, label);
  await page.evaluate(() => pbEndRunIncomplete()); await page.waitForTimeout(900);
}
(async () => {
  const browser = await L.chromium.launch();
  const uid = 'uStRes';
  const page = await L.newPage(browser, uid);
  const A = await L.lockRun(page, { stats: true }); await endIncompleteAt(page, '30.0');
  await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(300);
  const i = await page.evaluate((id) => window.__debugGetArchive().findIndex(e => e.id === id), A);
  await page.evaluate((i) => pbResumeIncompleteRun(i), i); await page.waitForTimeout(500); await L.dismiss(page);
  await page.click('text=Review & Calculate'); await page.waitForTimeout(500);
  await L.failSaves(page);
  await page.click('button[onclick="pbLock()"]'); await page.waitForTimeout(1200); await L.dismiss(page);
  const B = await page.evaluate(() => window.__debugGetCurrentArchiveEntry().id);
  L.check('setup: B is a new entry resumed from A and not saved', B !== A && !(await L.archive(page, uid)).some(e => e.id === B));
  await L.okSaves(page);
  await page.reload(); await page.waitForTimeout(2500); await L.dismiss(page);
  const arch = await L.archive(page, uid);
  const a = arch.find(e => e.id === A), b = arch.find(e => e.id === B);
  console.log('A.resumedIntoId', a && a.resumedIntoId, 'B.resumedFromId', b && b.resumedFromId);
  L.check('control: B was recovered from the pending-retry snapshot after reload', !!b && b.resumedFromId === A);
  L.check('A is linked forward to the recovered B (resumedIntoId)', !!a && a.resumedIntoId === B);
  const resumable = await page.evaluate(() => window.__debugGetArchive().filter(e => e.kind === 'run' && e.incomplete && !e.resumedIntoId).map(e => e.id));
  L.check('A is no longer offered under "Runs to Finish" (it was already resumed as B)', !resumable.includes(A));
  L.check('no JS errors', page._errors.length === 0);
  await browser.close();
})();
