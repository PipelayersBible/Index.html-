// feat_xtab (r15.29): one tab at a time processes the pending-Lock queue.
//  1. tab A is mid-pass (held at its first entry); tab B boots -> B skips, A finishes, B's retry finds the tombstone:
//     the entry is processed ONCE across both tabs.
//  2. a frozen tab: A holds the pass but its heartbeat stops and its lease goes stale -> B takes the pass over and
//     processes; when A wakes, it sees the lease is B's and stops without saving: still processed once.
//  3. a dead lease left by a tab that is gone (no lock held) -> a new tab proceeds at once.
const L = require('/home/claude/test/lib.js');
const uid = 'uXtab';
const seedAccount = (u) => { localStorage.setItem('lastKnownUserId', u); localStorage.setItem(u + ':cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active' })); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
async function seedPending(page, id) { // an entry whose Stats are done and whose upload is done: processing is quick, and leaves a tombstone
  await page.evaluate((id) => {
    const e = JSON.parse(localStorage.getItem('uXtab:runArchive')).find(x => x.id === id);
    localStorage.setItem('uXtab:completedPendingEntryIds', JSON.stringify(JSON.parse(localStorage.getItem('uXtab:completedPendingEntryIds') || '[]').filter(t => t.entryId !== id)));
    localStorage.setItem('uXtab:pendingLockRetries', JSON.stringify([{ entryId: id, entrySnapshot: null, calc: null, lockTime: e.lockTime, cfv: null, createdAt: Date.now(), everCommitted: true, statsStatus: 'done', syncStatus: 'done', syncAttempts: 0 }]));
    localStorage.removeItem('uXtab:pendingReconcileLease');
  }, id);
}
const processed = (p) => p.evaluate(() => (window.__debugPendingProcessed || []).slice());
const tomb = (p, id) => p.evaluate((id) => JSON.parse(localStorage.getItem('uXtab:completedPendingEntryIds') || '[]').some(t => t.entryId === id), id);
(async () => {
  const browser = await L.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 400, height: 900 } });
  await ctx.addInitScript(seedAccount, uid);
  await ctx.addInitScript(() => { if (sessionStorage.getItem('__pendHold') === '1') { sessionStorage.removeItem('__pendHold'); window.__debugPendingHold = { promise: new Promise(res => { window.__releasePending = res; }) }; } }); // this tab only (sessionStorage)
  const A = await L.newPage(browser, uid, ctx);
  const id = await L.lockRun(A); await A.waitForTimeout(800);
  // ---- 1: A mid-pass, B boots ----
  await seedPending(A, id);
  await A.evaluate(() => sessionStorage.setItem('__pendHold', '1'));
  await A.reload(); await A.waitForTimeout(1500); await L.dismiss(A);
  L.check('1 setup: tab A is holding the pass at its first entry', (await processed(A)).includes(id) && !(await tomb(A, id)));
  const leaseA = await A.evaluate(() => window.__pbReconLease.read('uXtab'));
  L.check('1: while A works, the lease on disk is A\'s and fresh', !!leaseA && leaseA.tab === await A.evaluate(() => window.__pbReconLease.tab()) && Date.now() - leaseA.at < 10000);
  const B = await ctx.newPage(); B._errors = []; B.on('pageerror', e => B._errors.push(e.message));
  await B.goto(L.ORIGIN); await B.waitForTimeout(2500); await L.dismiss(B);
  L.check('1: tab B, booting during A\'s pass, does not process the entry', !(await processed(B)).includes(id));
  await A.evaluate(() => window.__releasePending()); await A.waitForTimeout(1500);
  L.check('1: A finished: the entry is tombstoned and the lease is cleared', (await tomb(A, id)) && (await A.evaluate(() => window.__pbReconLease.read('uXtab'))) === null);
  await wait(11000); // B's retry (10 s)
  L.check('1: after B\'s retry the entry was processed exactly once across both tabs', !(await processed(B)).includes(id) && (await processed(A)).filter(x => x === id).length === 1);
  const pendB = await B.evaluate(() => JSON.parse(localStorage.getItem('uXtab:pendingLockRetries') || '[]'));
  L.check('1: the queue on disk no longer holds the entry', !pendB.some(p => p.entryId === id));
  await B.close();
  // ---- 2: a frozen tab ----
  await seedPending(A, id);
  await A.evaluate(() => sessionStorage.setItem('__pendHold', '1'));
  await A.reload(); await A.waitForTimeout(1500); await L.dismiss(A);
  L.check('2 setup: A holds the pass again', (await processed(A)).includes(id));
  await A.evaluate(() => { window.__debugLeaseFreeze = true; const k = 'uXtab:pendingReconcileLease'; const l = JSON.parse(localStorage.getItem(k)); l.at = Date.now() - 60000; localStorage.setItem(k, JSON.stringify(l)); }); // the heartbeat stops and 60 s "pass"
  const B2 = await ctx.newPage(); B2._errors = []; B2.on('pageerror', e => B2._errors.push(e.message));
  await B2.goto(L.ORIGIN); await B2.waitForTimeout(2500); await L.dismiss(B2);
  L.check('2: B finds a dead lease, takes the pass over and processes the entry', (await processed(B2)).includes(id) && (await tomb(B2, id)));
  const pendBefore = await B2.evaluate(() => JSON.parse(localStorage.getItem('uXtab:pendingLockRetries') || '[]'));
  await A.evaluate(() => window.__releasePending()); await A.waitForTimeout(1500);
  const pendAfter = await A.evaluate(() => JSON.parse(localStorage.getItem('uXtab:pendingLockRetries') || '[]'));
  L.check('2: A, waking up, stops (the lease is B\'s): processed once in total, and A did not rewrite the queue', (await processed(A)).filter(x => x === id).length === 1 && JSON.stringify(pendAfter) === JSON.stringify(pendBefore) && !pendAfter.some(p => p.entryId === id));
  await B2.close();
  // ---- 3: a dead lease with nobody holding the lock ----
  await seedPending(A, id);
  await A.evaluate(() => localStorage.setItem('uXtab:pendingReconcileLease', JSON.stringify({ tab: 'gone-tab', at: Date.now() - 120000 })));
  await A.evaluate(() => { window.__debugPendingProcessed = []; });
  await A.reload(); await A.waitForTimeout(2000); await L.dismiss(A);
  L.check('3: a stale lease from a tab that is gone does not block: processed at once, lease cleared', (await processed(A)).includes(id) && (await tomb(A, id)) && (await A.evaluate(() => window.__pbReconLease.read('uXtab'))) === null);
  L.check('no JS errors', A._errors.length === 0, A._errors.join(' | '));
  await browser.close();
})();
