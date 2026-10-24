// Pass-12 review. The fix treats valid JSON that is not a list ('{}', 'null') as unreadable,
// but a LIST whose items are not objects ('[null]', '[0]' is harmless, '[null]' is not) still
// passes Array.isArray and then throws on e.entryId in arr.map: pbFreshCompletedIds returns
// null, so every savePendingLockRetries refuses to write, and markEntryDurablyCompleted's
// onDisk.map (outside its try) throws. A Lock whose Archive save failed has no recovery copy.
// '{}' and '[]' are the controls (fixed / normal).
const L = require('/home/claude/test/lib.js');
async function one(browser, bytes, tag) {
  const uid = 'uRBr1' + tag;
  const context = await browser.newContext({ viewport: { width: 400, height: 900 } });
  await context.addInitScript(([u, b]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(u + ':completedPendingEntryIds', b); sessionStorage.setItem('seeded', '1'); } }, [uid, bytes]);
  await context.addInitScript((u) => { localStorage.setItem('lastKnownUserId', u); localStorage.setItem(u + ':cachedSubscription', JSON.stringify({tier:'individual',status:'active'})); }, uid);
  const page = await L.newPage(browser, uid, context);
  await L.dismiss(page);
  await L.failSaves(page); // Archive full: only the runArchive key fails
  await L.lockRun(page, { dist: 50 }).catch(() => {});
  await page.waitForTimeout(800);
  const banner = await page.evaluate(() => document.getElementById('lockSaveStatusText').textContent);
  const disk = await page.evaluate((u) => localStorage.getItem(u + ':pendingLockRetries'), uid);
  await L.dismiss(page);
  L.check('[' + bytes + '] the failed Lock\'s recovery record was saved (storage for it works)', !/could not be saved either/.test(banner) && /entrySnapshot/.test(disk || ''));
  await L.okSaves(page);
  await page.reload(); await page.waitForTimeout(1500);
  await L.dismiss(page); await page.waitForTimeout(2000); await L.dismiss(page);
  const arch = await L.archive(page, uid);
  L.check('[' + bytes + '] after reload the run is back in the Archive from its recovery record', arch.length === 1);
  const after = await page.evaluate((u) => ({ list: localStorage.getItem(u + ':completedPendingEntryIds'), backup: localStorage.getItem(u + ':completedPendingEntryIds_corrupt_backup') }), uid);
  let isList = false; try { isList = Array.isArray(JSON.parse(after.list)); } catch (e) {}
  // Round 14: the recovered run's upload is now owed to its account until someone signs in, so nothing completes yet and the
  // damaged list is only rewritten at the first completion. Either it is a list again, or it was never rewritten and the run is still owed.
  const owed = await page.evaluate((u) => { try { return JSON.parse(localStorage.getItem(u + ':pendingLockRetries') || '[]').some(p => p.syncOwed); } catch (e) { return false; } }, uid);
  L.check('[' + bytes + '] the completed list is a readable list again (or untouched while the run is still owed its upload)', isList || (owed && after.list === bytes));
  if (bytes !== '[]') L.check('[' + bytes + '] the unreadable value is kept in the backup key', after.backup === bytes);
  else L.check('[[]] control: no backup made for a good list', after.backup === null);
  L.check('[' + bytes + '] no JS errors', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
  await context.close();
}
(async () => {
  const browser = await L.chromium.launch();
  await one(browser, '[null]', 'l');
  await one(browser, '{}', 'o');
  await one(browser, '[]', 'c');
  await browser.close();
})();
