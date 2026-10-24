const L = require('/home/claude/test/lib.js');
// A Lock whose archive save fails leaves a pending-retry record with an entrySnapshot.
// The user then deletes that (unsaved) run from the Archive, and the delete save succeeds.
// Expected: the run stays deleted. Bug: reconcilePendingLockRetries revives it from the snapshot.
(async () => {
  const browser = await L.chromium.launch();
  const uid = 'uStDel1';
  const page = await L.newPage(browser, uid);
  // one earlier saved run, so the delete has something else to keep
  const keepId = await L.lockRun(page, { dist: 50 });
  await page.evaluate(() => pbOpenNewRun()); await page.waitForTimeout(300);
  await page.click('#rodToggle button[data-val="lenker"]');
  await page.fill('#startElev','100.00'); await page.fill('#endElev','99.00'); await page.fill('#totalDist','120'); await page.fill('#interval','10');
  await page.fill('#runWT','0.3'); await page.selectOption('#runIdSel','10');
  await page.click('text=Review & Calculate'); await page.waitForTimeout(400);
  await L.failSaves(page);
  await page.click('button[onclick="pbLock()"]'); await page.waitForTimeout(1200); await L.dismiss(page);
  const badId = await page.evaluate(() => window.__debugGetCurrentArchiveEntry().id);
  L.check('setup: failed Lock did not persist the 120 ft run', !(await L.archive(page, uid)).some(e => e.id === badId));
  await L.okSaves(page);
  // user decides this run was a mistake and deletes it from the Archive (instead of Retry Save)
  await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(300);
  const idx = await page.evaluate((i) => window.__debugGetArchive().findIndex(x => x.id === i), badId);
  await page.evaluate((i) => pbDeleteArchiveEntry(i), idx); await page.waitForTimeout(200);
  await page.click('button:has-text("Continue")'); await page.waitForTimeout(2000); await L.dismiss(page);
  const disk = await L.archive(page, uid);
  const mem = await page.evaluate(() => window.__debugGetArchive().map(e => e.id));
  console.log('disk ids', disk.map(e => e.id + ':' + e.distance), 'mem', mem, 'deleted', badId);
  L.check('control: the other run is still saved', disk.some(e => e.id === keepId));
  L.check('deleted (never-saved) run stays deleted in memory', !mem.includes(badId));
  L.check('deleted (never-saved) run is NOT written back to the stored archive', !disk.some(e => e.id === badId));
  const pend = await page.evaluate((u) => JSON.parse(localStorage.getItem(u + ':pendingLockRetries') || '[]'), uid);
  L.check('the deleted run\'s pending-retry record is cleared from storage', !pend.some(p => p.entryId === badId));
  await page.reload(); await page.waitForTimeout(1500); await L.dismiss(page);
  const disk2 = await L.archive(page, uid);
  L.check('after reload, the deleted run is still gone', !disk2.some(e => e.id === badId));
  L.check('no JS errors', page._errors.length === 0);
  // Control: when the delete itself fails to save, the unsaved run is put back exactly once and still saves later.
  const p2 = await L.newPage(browser, 'uStDel2');
  await L.lockRun(p2, { dist: 50 });
  await p2.evaluate(() => pbOpenNewRun()); await p2.waitForTimeout(300);
  await p2.fill('#startElev','100.00'); await p2.fill('#endElev','99.00'); await p2.fill('#totalDist','120'); await p2.fill('#interval','10');
  await p2.fill('#runWT','0.3'); await p2.selectOption('#runIdSel','10');
  await p2.click('text=Review & Calculate'); await p2.waitForTimeout(400);
  await L.failSaves(p2);
  await p2.click('button[onclick="pbLock()"]'); await p2.waitForTimeout(1200); await L.dismiss(p2);
  const bad2 = await p2.evaluate(() => window.__debugGetCurrentArchiveEntry().id);
  const i2 = await p2.evaluate((i) => window.__debugGetArchive().findIndex(x => x.id === i), bad2);
  await p2.evaluate((i) => pbDeleteArchiveEntry(i), i2); await p2.waitForTimeout(200);
  await p2.click('button:has-text("Continue")'); await p2.waitForTimeout(1200); await L.dismiss(p2);
  L.check('control: a delete that fails to save leaves exactly one copy of the run in memory', (await p2.evaluate((i) => window.__debugGetArchive().filter(x => x.id === i).length, bad2)) === 1);
  await L.okSaves(p2);
  await p2.evaluate(() => pbRetryLockSave()); await p2.waitForTimeout(1500); await L.dismiss(p2);
  L.check('control: Retry Save then stores that run once', (await L.archive(p2, 'uStDel2')).filter(x => x.id === bad2).length === 1);
  L.check('no JS errors (control)', p2._errors.length === 0);
  // Durability: delete, then reload before any reconcile pass can finish. Every pass aborts here: its
  // unlocked read of the completed-ids record fails (pbFreshCompletedIds returns null). Reads made while
  // holding that record's own Web Lock (a deliberate tombstone write) still work. So only what the
  // delete itself persisted can protect the run after the reload.
  const p3 = await L.newPage(browser, 'uStDel3');
  await L.lockRun(p3, { dist: 50 });
  await p3.evaluate(() => pbOpenNewRun()); await p3.waitForTimeout(300);
  await p3.fill('#startElev','100.00'); await p3.fill('#endElev','99.00'); await p3.fill('#totalDist','120'); await p3.fill('#interval','10');
  await p3.fill('#runWT','0.3'); await p3.selectOption('#runIdSel','10');
  await p3.click('text=Review & Calculate'); await p3.waitForTimeout(400);
  await L.failSaves(p3);
  await p3.click('button[onclick="pbLock()"]'); await p3.waitForTimeout(1200); await L.dismiss(p3);
  const bad3 = await p3.evaluate(() => window.__debugGetCurrentArchiveEntry().id);
  await L.okSaves(p3);
  await p3.evaluate(() => {
    const origReq = navigator.locks.request.bind(navigator.locks);
    window.__inIdsLock = 0;
    navigator.locks.request = (name, cb) => name !== 'pb-completed-ids-save' ? origReq(name, cb)
      : origReq(name, async () => { window.__inIdsLock++; try { return await cb(); } finally { window.__inIdsLock--; } });
    const origGet = localStorage.getItem.bind(localStorage);
    localStorage.getItem = (k) => { if (/completedPendingEntryIds$/.test(k) && !window.__inIdsLock) throw new Error('sim read failure'); return origGet(k); };
  });
  const i3 = await p3.evaluate((i) => window.__debugGetArchive().findIndex(x => x.id === i), bad3);
  await p3.evaluate((i) => pbDeleteArchiveEntry(i), i3); await p3.waitForTimeout(200);
  await p3.click('button:has-text("Continue")'); await p3.waitForTimeout(1200);
  L.check('control (aborting pass): the delete saved the archive without the run', !(await L.archive(p3, 'uStDel3')).some(x => x.id === bad3));
  await p3.reload(); await p3.waitForTimeout(2000); await L.dismiss(p3);
  L.check('CRITICAL: reload before any reconcile pass finished does not revive the deleted run', !(await L.archive(p3, 'uStDel3')).some(x => x.id === bad3)
    && !(await p3.evaluate((i) => window.__debugGetArchive().some(x => x.id === i), bad3)));
  L.check('no JS errors (durability)', p3._errors.length === 0);
  await browser.close();
})();
