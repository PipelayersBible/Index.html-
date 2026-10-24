#!/usr/bin/env python3
"""feat_xtab (r15.29, checklist "coordinate queue PROCESSING across tabs"): the pending-Lock queue's writes were already
coordinated across tabs (Web Lock + merge), but each tab ran its own reconciliation pass, so two tabs could both process the
same pending entry (deferred Stats, cloud upload). Now one tab at a time runs the pass:
 - a cross-tab Web Lock, 'pb-pending-reconcile:<account>', taken only if free (ifAvailable); a tab that finds it held skips
   this pass and tries again in 10 s (by then the other tab's tombstones say what is done);
 - a heartbeat lease in localStorage (<account>:pendingReconcileLease = {tab, at}, every 5 s) so a FROZEN tab (iOS puts
   background tabs to sleep while they hold their locks) never blocks the others: a lease older than 30 s is dead and the lock
   is taken over (steal). The frozen tab, when it wakes, sees another tab's lease in passStale() and stops without saving.
 - without Web Locks the lease alone decides (take it when absent, mine, or dead)."""
import sys
R = []
def r(n, a, b, cnt=1): R.append((n, a, b, cnt))
r('X1', """    const passStale = () => pbArchiveOwnerUid !== passUid || pbPendingOwnerUid !== passUid || pbCompletedOwnerUid !== passUid || (sbUser ? sbUser.id : cachedStorageUserId) !== passUid;
    try {
    const stillPending = [];""",
"""    const passStale = () => pbArchiveOwnerUid !== passUid || pbPendingOwnerUid !== passUid || pbCompletedOwnerUid !== passUid || (sbUser ? sbUser.id : cachedStorageUserId) !== passUid || !pbReconLeaseMine(passUid); // feat_xtab: another tab took the pass over
    let xtabSkipped = false, xtabHb = null; // feat_xtab
    const pass = async () => {
    const stillPending = [];""")
r('X2', """    if (!finalSaveOk) console.error('Reconciliation pass completed but its final queue-state save failed — in-memory state is correct, but has not reached disk yet. The next triggered save will retry it.');
    } finally {
      pbReconcilingPendingRetries = false;""",
"""    if (!finalSaveOk) console.error('Reconciliation pass completed but its final queue-state save failed — in-memory state is correct, but has not reached disk yet. The next triggered save will retry it.');
    }; // end of the pass (feat_xtab)
    try {
      // feat_xtab: one tab at a time. The lock is taken only if free; a dead lease (its tab frozen or gone) is taken over.
      const lease = pbReconLeaseRead(passUid), dead = !!lease && Date.now() - lease.at > PB_XTAB_LEASE_MS; // whoever wrote it stopped beating 30 s ago
      const run = async (lock) => {
        if (!lock) { xtabSkipped = true; return; }
        pbReconLeaseWrite(passUid); xtabHb = setInterval(() => pbReconLeaseWrite(passUid), 5000);
        await pass();
      };
      if (navigator.locks && typeof navigator.locks.request === 'function') await navigator.locks.request('pb-pending-reconcile:' + passUid, dead ? { steal: true } : { ifAvailable: true }, run);
      else await run(!lease || lease.tab === pbTabId || dead);
    } catch (e) { console.error(e); } finally {
      if (xtabHb) clearInterval(xtabHb);
      pbReconLeaseClear(passUid);
      if (xtabSkipped) { if (!pbReconRetryTimer) pbReconRetryTimer = setTimeout(() => { pbReconRetryTimer = null; reconcilePendingLockRetries(); }, PB_XTAB_RETRY_MS); }
      pbReconcilingPendingRetries = false;""")
r('X3', """  async function processOnePendingEntry(pending, targetEntry, passStale) {
""",
"""  // ==== feat_xtab: the cross-tab lease for the reconciliation pass ====
  const PB_XTAB_LEASE_MS = 30000, PB_XTAB_RETRY_MS = 10000;
  // pbTabId: the app's existing per-tab id (sessionStorage, set near the Supabase client); it is settled long before any pass runs.
  let pbReconRetryTimer = null;
  function pbReconLeaseKey(uid) { return uid + ':pendingReconcileLease'; }
  function pbReconLeaseRead(uid) { try { const v = JSON.parse(localStorage.getItem(pbReconLeaseKey(uid)) || 'null'); return v && typeof v.tab === 'string' && Number.isFinite(v.at) ? v : null; } catch (e) { return null; } }
  function pbReconLeaseWrite(uid) { try { localStorage.setItem(pbReconLeaseKey(uid), JSON.stringify({ tab: pbTabId, at: Date.now() })); } catch (e) {} }
  function pbReconLeaseMine(uid) { const l = pbReconLeaseRead(uid); return !l || l.tab === pbTabId; } // no lease at all (an older build's tab) counts as mine
  function pbReconLeaseClear(uid) { try { const l = pbReconLeaseRead(uid); if (l && l.tab === pbTabId) localStorage.removeItem(pbReconLeaseKey(uid)); } catch (e) {} }
  window.__pbReconLease = { read: pbReconLeaseRead, tab: () => pbTabId }; // read-only (tests)
  async function processOnePendingEntry(pending, targetEntry, passStale) {
""")

def apply(s):
    for n, a, b, cnt in R:
        c = s.count(a); assert c == cnt, (n, c); s = s.replace(a, b)
    return s
if __name__ == '__main__':
    s = open(sys.argv[1], encoding='utf-8').read(); s = apply(s); open(sys.argv[2], 'w', encoding='utf-8').write(s); print('xtab written', len(s))
