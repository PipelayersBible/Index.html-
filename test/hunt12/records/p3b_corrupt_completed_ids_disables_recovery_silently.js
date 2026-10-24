// Same as p3, but the unreadable key is the completed-ids (tombstone) list. No alert at all: start-up
// loads an empty set, and every later savePendingLockRetries gets null from pbFreshCompletedIds
// and refuses to write, so no Lock recovery record is ever saved for this account again.
const L = require('/home/claude/test/lib.js');
(async () => {
  const browser = await L.chromium.launch();
  const uid = 'uP11p3b' + (process.env.VARIANT || '');
  const context = await browser.newContext({ viewport: { width: 400, height: 900 } });
  await context.addInitScript((u) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(u + ':completedPendingEntryIds', '[{"entryId":1,'); sessionStorage.setItem('seeded', '1'); } }, uid);
  await context.addInitScript((u) => { localStorage.setItem('lastKnownUserId', u); localStorage.setItem(u + ':cachedSubscription', JSON.stringify({tier:'individual',status:'active'})); }, uid);
  const page = await L.newPage(browser, uid, context);
  const t0 = await page.evaluate(() => document.getElementById('pbModalTitle').textContent);
  console.log('boot alert:', t0); await L.dismiss(page);
  L.check('setup: no alert at boot about the unreadable completion list', !/Unreadable/.test(t0));
  await L.failSaves(page); // Archive full: only the runArchive key fails
  await L.lockRun(page, { dist: 50 }).catch(() => {});
  await page.waitForTimeout(800);
  const banner = await page.evaluate(() => document.getElementById('lockSaveStatusText').textContent);
  console.log('banner:', banner.slice(0, 160));
  const disk = await page.evaluate((u) => localStorage.getItem(u + ':pendingLockRetries'), uid);
  console.log('stored pending list:', (disk || 'null').slice(0, 80));
  await L.dismiss(page);
  L.check('the failed Lock\'s recovery record was saved (storage for it works)', !/could not be saved either/.test(banner) && /entrySnapshot/.test(disk || ''));
  await L.okSaves(page);
  await page.reload(); await page.waitForTimeout(1500);
  const t1 = await page.evaluate(() => getComputedStyle(document.getElementById('pbModalOverlay')).display !== 'none' ? document.getElementById('pbModalTitle').textContent : '');
  await L.dismiss(page); await page.waitForTimeout(1500); await L.dismiss(page);
  const arch = await L.archive(page, uid);
  console.log('after reload: alert="' + t1 + '" archive runs=' + arch.length);
  L.check('after reload the run is back in the Archive from its recovery record', arch.length === 1);
  L.check('the unreadable completion-list bytes are kept in the backup key', await page.evaluate((u) => localStorage.getItem(u + ':completedPendingEntryIds_corrupt_backup') === '[{"entryId":1,', uid));
  await browser.close();
})();
