# records_nov22 A3: the false "1 run with no cloud copy — Tap Retry Sync".
# The old runs-table copy (public.runs, still read by Ask's my_runs for individual accounts, so it is NOT retired) counted
# every try, including tries with no signal: 5 tries in a dead zone marked the run "failed" for good. Now:
#  - a try that never reached the server (no signal, fetch failed, timeout) is 'offline': it uses up no try and the run
#    stays owed; the pass runs again when the phone gets signal ('online') and on start-up as before;
#  - a run already marked "no cloud copy" is tried again quietly when signal comes back (up to 5 a time); success clears it;
#  - Retry Sync with no signal says so plainly.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""      if (error) { console.error('Supabase run sync failed (local copy is unaffected):', error.message); pbNoteCloudFail(entry, navigator.onLine === false ? 'offline' : 'rejected', error.message); return 'failed'; }""",
"""      if (error) { const off = navigator.onLine === false || /failed to fetch|networkerror|load failed|timeout|timed out|no client|network/i.test(String(error.message || '')); (off ? console.warn : console.error)('Supabase run sync failed (local copy is unaffected):', error.message); pbNoteCloudFail(entry, off ? 'offline' : 'rejected', error.message); return off ? 'offline' : 'failed'; } /* records_nov22 A3: no signal isn't a failed try */""")
p.rep("""    } catch (e) { console.error('Supabase run sync failed (local copy is unaffected):', e.message); pbNoteCloudFail(entry, navigator.onLine === false ? 'offline' : 'network', e && e.message); return 'failed'; }
  }""", """    } catch (e) { const off = navigator.onLine === false || /failed to fetch|networkerror|load failed|timeout|timed out|network|abort/i.test(String(e && e.message || '')); (off ? console.warn : console.error)('Supabase run sync failed (local copy is unaffected):', e.message); pbNoteCloudFail(entry, navigator.onLine === false ? 'offline' : 'network', e && e.message); return off ? 'offline' : 'failed'; } /* records_nov22 A3: no signal isn't a failed try */
  }""")
p.rep("""      if (syncResult === 'not-applicable' && pending.syncOwed) pending.syncAttempts -= 1;""",
"""      if ((syncResult === 'not-applicable' && pending.syncOwed) || syncResult === 'offline') pending.syncAttempts -= 1; // records_nov22 A3: nothing reached the server: still owed, no try used""")
p.rep("""    if (result === 'success') {
      e.cloudSyncFailed = false;
      await saveRunArchive();
      renderArchiveList();
    } else {""", """    if (result === 'success') {
      e.cloudSyncFailed = false;
      await saveRunArchive();
      renderArchiveList();
    } else if (result === 'offline') { // records_nov22 A3
      if (btn) { btn.disabled = false; btn.textContent = 'Retry Sync'; }
      pbAlert('No signal right now. The copy on this phone is fine; it tries again on its own when there’s signal.', 'No Signal');
    } else {""")
# signal back: the owed pass, and a quiet retry of runs marked "no cloud copy"
p.rep("""  function pbNoteCloudFail(entry, kind, detail) {""", """  // records_nov22 A3: when signal comes back
  let pbLegacyHealBusy = false;
  async function pbLegacyHeal() {
    if (pbLegacyHealBusy || !sbClient || !sbUser || navigator.onLine === false || archiveLoadFailed || pbArchiveOwnerUid !== sbUser.id) return;
    pbLegacyHealBusy = true; let fixed = false;
    try {
      for (const e of runArchive.filter(x => x && x.kind === 'run' && x.cloudSyncFailed && !pendingLockRetries.some(p => p && p.entryId === x.id)).slice(0, 5)) {
        const r = await pbSyncRunToSupabase(e);
        if (r === 'success') { e.cloudSyncFailed = false; fixed = true; } else if (r === 'offline') break;
      }
      if (fixed) { await saveRunArchive(); try { window.pbRenderHome(); } catch (x) {} try { if (pbCurrentScreen === 'archive') renderArchiveList(); } catch (x) {} }
    } catch (x) { console.error('Cloud copy retry:', x); } finally { pbLegacyHealBusy = false; }
  }
  window.addEventListener('online', () => { setTimeout(() => { try { reconcilePendingLockRetries(); } catch (x) {} pbLegacyHeal().catch(() => {}); }, 3500); });
  setTimeout(() => { pbLegacyHeal().catch(() => {}); }, 45000);
  window.__pbLegacyHeal = pbLegacyHeal; // tests
  function pbNoteCloudFail(entry, kind, detail) {""")
p.save()
