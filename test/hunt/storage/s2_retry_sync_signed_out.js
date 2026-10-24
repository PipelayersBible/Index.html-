const L = require('/home/claude/test/lib.js');
// A run whose cloud sync gave up (cloudSyncFailed) shows a "Retry Sync" warning in the Archive.
// If the person taps Retry Sync while NOT signed in (logged out, or the session not restored offline),
// pbSyncRunToSupabase returns 'not-applicable' and pbRetryCloudSync treats that as success:
// it clears cloudSyncFailed and saves, so the warning disappears for good although nothing was synced.
(async () => {
  const browser = await L.chromium.launch();
  const uid = 'uStSync';
  // contractor tier cached on the device (Archive is a contractor screen); offline, so no Supabase session
  const ctx = await browser.newContext({ viewport: { width: 400, height: 900 } });
  await ctx.addInitScript((u) => { localStorage.setItem('lastKnownUserId', u); localStorage.setItem(u + ':cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active' })); }, uid);
  const page = await L.newPage(browser, uid, ctx);
  const id = await L.lockRun(page);
  await page.evaluate(async () => { const e = window.__debugGetCurrentArchiveEntry(); e.cloudSyncFailed = true; await window.__debugSaveRunArchive(); });
  L.check('setup: stored entry carries the cloud-sync-failed marker', (await L.archive(page, uid)).find(e => e.id === id).cloudSyncFailed === true);
  await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(300);
  const html = await page.evaluate(() => document.getElementById('archiveList').innerHTML);
  L.check('setup: Archive shows the Retry Sync warning', /Retry Sync/.test(html));
  L.check('setup: not signed in (no Supabase user)', await page.evaluate(() => /Not signed in/.test(document.getElementById('loggedInAs').textContent)));
  await page.locator('#archiveList button:has-text("Retry Sync")').click(); await page.waitForTimeout(800);
  const modal = await page.evaluate(() => getComputedStyle(document.getElementById('pbModalOverlay')).display !== 'none' ? document.getElementById('pbModalTitle').textContent : '');
  console.log('modal after Retry Sync:', JSON.stringify(modal));
  const stored = (await L.archive(page, uid)).find(e => e.id === id);
  L.check('Retry Sync while signed out does NOT clear the never-synced marker on disk', stored.cloudSyncFailed === true);
  L.check('Retry Sync while signed out tells the person it could not sync (or that they must log in)', modal !== '');
  // Sibling path: a run locked while signed in whose upload failed (attempt 1 of 5) is still owed a sync.
  // The app is reopened without a Supabase session (offline: the client library / session isn't available).
  // Boot reconciliation gets 'not-applicable' and treats the sync as finished: the pending record is
  // tombstoned and dropped, and no failure marker is set, so the run is never uploaded and nothing says so.
  await L.dismiss(page); await page.waitForTimeout(200);
  const id2 = await L.lockRun(page, { dist: 70 });
  await page.waitForTimeout(800);
  // Control (changed in round 14): a run locked on this account's records with nobody signed in is now OWED its upload
  // under that account (accounts s1 fix), so its pending record stays, marked owed, until the account signs in.
  L.check('control: a run locked while signed out on an account\'s records stays owed to that account',
    (await page.evaluate((id) => JSON.parse(localStorage.getItem('uStSync:pendingLockRetries') || '[]'), id2)).some(p => p.entryId === id2 && p.syncOwed));
  // Seed what a Lock made while signed in writes (syncOwed: true), after one failed upload.
  await page.evaluate((id) => {
    const e = JSON.parse(localStorage.getItem('uStSync:runArchive')).find(x => x.id === id);
    // an owed upload is never tombstoned, so drop the one this signed-out Lock recorded
    localStorage.setItem('uStSync:completedPendingEntryIds', JSON.stringify(JSON.parse(localStorage.getItem('uStSync:completedPendingEntryIds') || '[]').filter(t => t.entryId !== id)));
    localStorage.setItem('uStSync:pendingLockRetries', JSON.stringify([{ entryId: id, entrySnapshot: null, calc: null, lockTime: e.lockTime, cfv: null,
      createdAt: Date.now(), everCommitted: true, statsStatus: 'done', syncStatus: 'pending', syncAttempts: 1, syncOwed: true }]));
  }, id2);
  await page.reload(); await page.waitForTimeout(2000); await L.dismiss(page);
  const pend = await page.evaluate(() => JSON.parse(localStorage.getItem('uStSync:pendingLockRetries') || '[]'));
  const tomb = await page.evaluate(() => JSON.parse(localStorage.getItem('uStSync:completedPendingEntryIds') || '[]'));
  const e2 = (await L.archive(page, uid)).find(e => e.id === id2);
  console.log('pending after offline boot:', JSON.stringify(pend), 'tombstoned:', tomb.some(t => t.entryId === id2), 'cloudSyncFailed:', e2.cloudSyncFailed);
  L.check('an owed cloud sync is NOT discarded just because this boot has no Supabase session (still pending, or flagged as not synced)',
    pend.some(p => p.entryId === id2) || e2.cloudSyncFailed === true);
  L.check('no JS errors', page._errors.length === 0);
  await browser.close();
})();
