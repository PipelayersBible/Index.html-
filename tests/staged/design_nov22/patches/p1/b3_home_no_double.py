# B-3: right after End Run, Home listed the same report twice: the "Sending the report to …" card AND a Needs Attention
# "Not sent · 1 run report" row. Home's Needs Attention row now leaves out the run whose card is showing (the same rule
# Home's own "Run report" waiting row already uses). Once the card is dismissed, or after a reload, the row counts it
# again. The Log Out / Lock This Phone warning and "See What's Waiting" still count everything.
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
p = P()
p.rep("""  function pbUnsentGroups(uid) {
    const out = []; if (!uid || uid === 'shared') return out;""",
"""  function pbUnsentGroups(uid, forHome) { // forHome (design B-3): leave out the run Home's "Run ended" card already shows
    const out = []; if (!uid || uid === 'shared') return out;""")
p.rep("""    run(() => { if (pbArchiveOwnerUid !== uid) return; const W = runArchive.filter(e => e && e.kind === 'run' && e.reportSendWanted && !e.reportSentAt && (e.completed || e.incomplete));""",
"""    run(() => { if (pbArchiveOwnerUid !== uid) return; const shownId = forHome && typeof window.pbFxEndedId === 'function' ? window.pbFxEndedId() : null;
      const W = runArchive.filter(e => e && e.kind === 'run' && e.reportSendWanted && !e.reportSentAt && (e.completed || e.incomplete) && !(shownId !== null && shownId !== undefined && e.id === shownId));""")
p.rep("""    pbUnsentWarm(uid);
    const g = pbUnsentGroups(uid); if (!g.length) return null;""",
"""    pbUnsentWarm(uid);
    const g = pbUnsentGroups(uid, true); if (!g.length) return null;""")
p.save()
