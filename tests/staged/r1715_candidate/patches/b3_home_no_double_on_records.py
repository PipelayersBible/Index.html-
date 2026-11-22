# design B-3 rebased on records_nov22 A1 (pbUnsentGroups(uid, full)): a third argument forHome.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""  function pbUnsentGroups(uid, full) { // full: every run worked out now (Log Out); else a few per call (Home)
    const out = []; if (!uid || uid === 'shared') return out;""",
"""  function pbUnsentGroups(uid, full, forHome) { // full: every run worked out now (Log Out); else a few per call (Home). forHome (design B-3): leave out the run Home's "Run ended" card already shows
    const out = []; if (!uid || uid === 'shared') return out;""")
p.rep("""    run(() => { if (pbArchiveOwnerUid !== uid) return; const W = runArchive.filter(e => e && e.kind === 'run' && e.reportSendWanted && !e.reportSentAt && (e.completed || e.incomplete));""",
"""    run(() => { if (pbArchiveOwnerUid !== uid) return; const shownId = forHome && typeof window.pbFxEndedId === 'function' ? window.pbFxEndedId() : null;
      const W = runArchive.filter(e => e && e.kind === 'run' && e.reportSendWanted && !e.reportSentAt && (e.completed || e.incomplete) && !(shownId !== null && shownId !== undefined && e.id === shownId));""")
p.rep("""    const g = pbUnsentGroups(uid); if (!g.length) return null;""",
"""    const g = pbUnsentGroups(uid, false, true); if (!g.length) return null;""")
p.save()
