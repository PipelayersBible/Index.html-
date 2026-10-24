#!/usr/bin/env python3
"""Instrument a Pipelayer's Bible index.html for the browser test suite.
Usage: python3 instrument.py path/to/index.html path/to/test/app.html
Adds test-only hooks (window.__debug*), held-save / held-start-up gates, mail/PDF/CSV sinks. None exist in the deliverable."""
import sys
c=open(sys.argv[1],encoding='utf-8').read()
t=c
def r(o,n):
    global t
    assert t.count(o)==1,o[:70]
    t=t.replace(o,n)
r('function checkAtmoThresholds(o2, lel, options) {','window.__debugCheckAtmoThresholdsCalls = []; function checkAtmoThresholds(o2, lel, options) { window.__debugCheckAtmoThresholdsCalls.push({o2, lel, time: Date.now()});')
r('async function saveRunArchive() {','''window.__debugSaveRunArchive = () => saveRunArchive();
window.__debugPushToRunArchive = (e) => runArchive.push(e);
window.__debugUnshiftToRunArchive = (e) => runArchive.unshift(e);
window.__debugSetRunArchive = (arr) => { runArchive.length = 0; arr.forEach(e => runArchive.push(e)); };
window.__debugGetArchive = () => runArchive;
window.__debugGetCurrentArchiveEntry = () => getCurrentArchiveEntry();
window.__debugRenderCrewLog = () => renderCrewLog(getCurrentArchiveEntry());
window.__debugPersistLockedNotePhoto = (npId, idx, ctx, photo) => pbPersistLockedNotePhoto(npId, idx, ctx, photo);
window.__debugGetConfinedPermit = () => confinedPermit;
window.__debugSetConfinedPermitForTest = (p) => { confinedPermit = p; };
window.__debugGetConfinedEmergencyIncidents = () => confinedEmergencyIncidents;
window.__debugPushToAtmoLog = (r) => confinedAtmoLog.push(r);
window.__debugGetAtmoLog = () => confinedAtmoLog;
window.__debugGetObservation = () => confinedLastObservation;
window.__debugGetRoster = () => confinedRoster;\nwindow.__debugSaveSession = () => saveActiveConfinedSession();\nwindow.__debugOpenPermitReal = () => pbOpenConfinedPermitFormReal();\nwindow.__debugStash = () => pbDraftStash;\nwindow.__debugPending = () => pbPendingNotePhotos;\nwindow.__debugEmergencyState = () => ({ start: confinedEmergencyStartTime, end: confinedEmergencyEndTime, incidents: confinedEmergencyIncidents.map(i => ({ s: i.start, e: i.end })), timer: !!confinedEmergencyTimer, atmoTimer: !!confinedAtmoTimer, commTimer: !!confinedCommTimer });\nwindow.__debugSetIncidentsForTest = (arr) => { confinedEmergencyIncidents = arr.map(x => ({ start: new Date(x.s), end: x.e ? new Date(x.e) : null })); confinedEmergencyStartTime = arr.length ? new Date(arr[arr.length-1].s) : null; confinedEmergencyEndTime = null; };
window.__debugGetCommLog = () => confinedCommLog;
window.__debugBuildRunReportFromEntry = (e) => buildRunReportFromEntry(e);
window.__debugGetRev = (e) => pbEntryRevs.get(e);
window.__debugShowEmergencyFailure = (k, s) => showConfinedEmergencySaveFailure(k, s);
window.__debugGetEmergencyPending = () => confinedEmergencySavePending;
window.__debugRunOnEntry = (e, fn) => pbRunOnEntry(e, fn);
window.__debugGetLastCalc = () => lastCalc;
window.__debugHash = (s) => pbHashText(s);
window.__debugBuildRow = (calc, st, label, tm, ph) => buildInterpolatedIntervalRow(calc, st, label, tm, ph);
window.__debugAddRunEntryToPDF = (doc, e, y) => addRunEntryToPDF(doc, e, y);
window.__debugRepairPendingSize = () => pbRepairPending.size;
async function saveRunArchive() {
    if (window.__debugSaveHold && (!window.__debugSaveHold.match || window.__debugSaveHold.match(runArchive))) { const h = window.__debugSaveHold; window.__debugSaveHold = null; const r = await h.promise; if (r === false) return false; }
    if (window.__debugTriggerInjectDuringSave) {
      window.__debugTriggerInjectDuringSave = false;
      runArchive.unshift({ kind: 'confined', id: 999999, sent: false, reportText: 'injected', roster: [], atmoLog: [], commLog: [] });
    }''')
r('  async function saveActiveConfinedSession(ownReading) {','  async function saveActiveConfinedSession(ownReading) {\n    if (window.__debugSessionHold && (!window.__debugSessionHold.match || window.__debugSessionHold.match())) { const h = window.__debugSessionHold; window.__debugSessionHold = null; const r = await h.promise; if (r === false) return false; }')
r('    await loadRunArchive();\n    pbArchiveReadyResolve();','    if (window.__debugBootHold) await window.__debugBootHold; // TEST-ONLY: hold start-up just before the archive loads\n    await loadRunArchive();\n    pbArchiveReadyResolve();')
r("    try { raw = await pbGetCriticalFor(uid, 'activeConfinedSession'); } catch (e) { readError = e; }","    try { raw = await pbGetCriticalFor(uid, 'activeConfinedSession'); } catch (e) { readError = e; }\n    if (window.__debugAfterSessionRead) { const f = window.__debugAfterSessionRead; window.__debugAfterSessionRead = null; f(); } // TEST-ONLY synchronous hook (no await)")
r('  function pbNavigateExternal(url) {','  function pbNavigateExternal(url) {\n    if (window.__debugExternalSink) { window.__debugExternalSink(url); return; } // TEST-ONLY: observe mail/tel handoffs without leaving the page')
r("    doc.save('archive-' + entry.kind + '-' + entry.id + '.pdf');","    if (window.__debugPdfSink) { window.__debugPdfSink(doc.output('datauristring')); return; } // TEST-ONLY: capture the PDF bytes\n    doc.save('archive-' + entry.kind + '-' + entry.id + '.pdf');")
r("    doc.save('job-summary-' + s.jobNumber.replace(/[^a-z0-9]/gi,'_') + '.pdf');","    if (window.__debugPdfSink) { window.__debugPdfSink(doc.output('datauristring')); return; } // TEST-ONLY\n    doc.save('job-summary-' + s.jobNumber.replace(/[^a-z0-9]/gi,'_') + '.pdf');")
_o = "    doc.save('emergency-incident-' + entry.id + '.pdf');"
if t.count(_o) == 1: t = t.replace(_o, "    if (window.__debugPdfSink) { window.__debugPdfSink(doc.output('datauristring')); return; } // TEST-ONLY (r14 emergency incident PDF)\n" + _o)
r('function segHasData(n) {','window.__debugSegHasData = (n) => segHasData(n); function segHasData(n) {')
r('  function downloadCSV(filename, rows) {','  function downloadCSV(filename, rows) {\n    if (window.__debugCsvSink) { window.__debugCsvSink(filename, rows); return; }')
# feat_pdf (r15.27): the report renderer and its primitives, for real-byte PDF tests (lead lines, symbol mapping, footer)
r("  window.pbRptFingerprintOf = (e) => pbRptFingerprint(e);", "  window.__debugRptMake = pbRptMake; window.__debugRptG = PB_RPT; window.__debugProdCatName = pbProdCatName; // TEST-ONLY\n  window.pbRptFingerprintOf = (e) => pbRptFingerprint(e);")

# feat_xtab (r15.29): a hold at the start of processing one pending entry, a count of which entries each tab processed, and a
# way to stop the lease heartbeat (a frozen tab)
r("  async function processOnePendingEntry(pending, targetEntry, passStale) {\n", "  async function processOnePendingEntry(pending, targetEntry, passStale) {\n    (window.__debugPendingProcessed = window.__debugPendingProcessed || []).push(pending.entryId); // TEST-ONLY\n    if (window.__debugPendingHold) { const h = window.__debugPendingHold; window.__debugPendingHold = null; await h.promise; } // TEST-ONLY\n")
r("xtabHb = setInterval(() => pbReconLeaseWrite(passUid), 5000);", "xtabHb = setInterval(() => { if (!window.__debugLeaseFreeze) pbReconLeaseWrite(passUid); }, 5000); // TEST-ONLY freeze")

# feat_phonechk (r15.30): let a test stand in for the real push origin (pbPushHostOk) so the re-login restore can be exercised
r("  function pbPushHostOk() {\n    try { return", "  function pbPushHostOk() {\n    if (window.__debugPushHost === true) return true; // TEST-ONLY\n    try { return")

open(sys.argv[2],'w',encoding='utf-8').write(t)
print('instrumented ->', sys.argv[2])
