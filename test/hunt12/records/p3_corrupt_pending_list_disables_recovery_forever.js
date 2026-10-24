// The stored pending-Lock list is unreadable (corrupt bytes). At start-up the app copies the
// bytes to a backup key and tells the foreman they were "preserved separately". But the corrupt
// main key is left in place, and every later savePendingLockRetries re-reads it, fails to parse
// and refuses to write. Result: from then on, NO Lock's recovery record can ever be saved for
// this account. A run whose Archive save fails (storage full) has no recovery copy and is lost
// on reload, although storage for the small recovery record works fine.
const L = require('/home/claude/test/lib.js');
(async () => {
  const browser = await L.chromium.launch();
  const uid = 'uP11p3' + (process.env.VARIANT || '');
  const context = await browser.newContext({ viewport: { width: 400, height: 900 } });
  if (process.env.VARIANT !== 'control') await context.addInitScript((u) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(u + ':pendingLockRetries', '[{"entryId":1,'); sessionStorage.setItem('seeded', '1'); } }, uid);
  await context.addInitScript((u) => { localStorage.setItem('lastKnownUserId', u); localStorage.setItem(u + ':cachedSubscription', JSON.stringify({tier:'individual',status:'active'})); }, uid);
  const page = await L.newPage(browser, uid, context);
  const t0 = await page.evaluate(() => document.getElementById('pbModalTitle').textContent);
  console.log('boot alert:', t0); await L.dismiss(page);
  if (process.env.VARIANT !== 'control') L.check('setup: boot said the unreadable recovery data was preserved', /Recovery Data Unreadable/.test(t0) && await page.evaluate((u) => localStorage.getItem(u + ':pendingLockRetries_corrupt_backup') !== null, uid));
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
  if (process.env.VARIANT !== 'control') {
    L.check('the unreadable bytes are still kept in the backup key', await page.evaluate((u) => localStorage.getItem(u + ':pendingLockRetries_corrupt_backup') === '[{"entryId":1,', uid));
    L.check('the unreadable-data alert does not come back on the next start-up', !/Unreadable/.test(t1));
  }
  await browser.close();
})();
