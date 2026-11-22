# records_nov22 A2: deleting what never reached the company.
#  Runs (company crew member): photos still going -> not deleted ("delete it after they've gone"). Record not accepted ->
#  "This run has NOT reached your company. Deleting it deletes the only copy." then the usual confirm (asked twice).
#  Permits: one that isn't backed up and was closed less than 1 year ago (OSHA 1926.1205(f): keep each canceled permit
#  at least 1 year) can't be deleted from the phone except by a company manager: "Back It Up First".
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""  window.pbDeleteArchiveEntry = function(i) {
    const e = runArchive[i];""", """  window.pbDeleteArchiveEntry = function(i, unsentOk) {
    const e = runArchive[i];
    // records_nov22 A2: what hasn't reached the company is the only copy
    if (e && e.kind === 'run' && unsentOk !== 'unsentOk' && !(pbUnsavedResumeOf(e.id) || pbResumeFormOpenFor(e.id))) {
      const s = pbRrRunState(pbArchiveOwnerUid, e, null, true);
      if (s.k === 'photos') { pbAlert(s.n + ' photo' + (s.n === 1 ? '' : 's') + ' from this run ' + (s.n === 1 ? 'hasn’t' : 'haven’t') + ' reached your company yet. They go on their own with signal. Delete the run after that.', 'Not Deleted'); return; }
      if (['unsent', 'held', 'refused', 'unknown'].includes(s.k)) {
        pbShowModal((s.k === 'unknown' ? 'This run may NOT have reached your company yet (it couldn’t be checked).' : 'This run has NOT reached your company.') + ' Deleting it deletes the only copy.', [{ label: 'Keep It', primary: true }, { label: 'Delete Anyway', danger: true, onClick: () => { const j = runArchive.indexOf(e); if (j !== -1) window.pbDeleteArchiveEntry(j, 'unsentOk'); } }], 'Not at Your Company');
        return;
      }
    }
    if (e && e.kind === 'confined') { const why = pbPermitDeleteBlock(e); if (why) { pbAlert(why, 'Back It Up First'); return; } }""")
p.rep("""    pbConfirm(warningPrefix + 'Delete the record for ' + archiveEntryLabel(e) + '? This can\\'t be undone.' + (e && e.kind === 'confined' ? pbPermitDeleteNote(e) : ''), () => {""",
"""    pbConfirm(warningPrefix + 'Delete the record for ' + archiveEntryLabel(e) + '? ' + (unsentOk === 'unsentOk' ? 'It has NOT reached your company: this deletes the only copy. ' : '') + 'This can\\'t be undone.' + (e && e.kind === 'confined' ? pbPermitDeleteNote(e) : ''), () => {""")
p.rep("""  function pbPermitDeleteNote(e) {""", """  // records_nov22 A2: a closed permit that isn't backed up, closed less than a year ago: only a company manager deletes it
  function pbPermitDeleteBlock(e) {
    const uid = pbArchiveOwnerUid; let mgr = false; try { mgr = !!(uid && pbDlyAcc(uid).manager); } catch (x) {}
    if (mgr) return '';
    const st = pbPermitBkStateOf(e); if (st.k === 'ok') return '';
    const t = (e.lockTime instanceof Date ? e.lockTime : new Date(e.lockTime)).getTime();
    if (isFinite(t) && Date.now() - t >= 365 * 86400000) return ''; // kept a year: the usual warning
    return 'This permit isn’t backed up to your account, so the copy on this phone is the only one. Keep closed permits at least 1 year (OSHA 1926.1205(f)).\\n\\n'
      + (st.k === 'signedout' ? 'Log in with signal so it backs up, then delete it if you need to.' : st.k === 'refused' ? 'It can’t back up (' + st.why + '). Save its PDF and ask your office. Only a company manager can delete it before it’s a year old.' : 'It backs up on its own with signal; Records shows Backed up when it has. Then you can delete it.');
  }
  function pbPermitDeleteNote(e) {""")
p.save()
