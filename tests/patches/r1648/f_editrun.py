import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:90])
    s = s.replace(old, new)
rep("""  window.pbEditRunData = function() {
    if (pbRefuseWhileCorrectionSaving()) return;
    const entry = getCurrentArchiveEntry();""", """  window.pbEditRunData = function(seen) {
    if (pbRefuseWhileCorrectionSaving()) return;
    const entry = getCurrentArchiveEntry();
    // r16.48: an open run with work on it can't be locked again from the form; say so before the edit, not after
    if (seen !== true && entry && entry.kind === 'run' && runArchive.includes(entry) && !entry.runEndTime && !entry.completed && !entry.incomplete && !pbReplaceablePriorRun(entry)) {
      pbShowModal('Pipe is already laid on this run, so its stake numbers can\\u2019t be changed. A distance or a hub\\u2019s station can be fixed.', [
        { label: 'Just Look', onClick: () => window.pbEditRunData(true) },
        { label: 'Fix a Distance or Hub', primary: true, onClick: () => { try { const pn = document.getElementById('correctDistancePanel'); if (!pn || pn.style.display === 'none' || !pn.offsetParent) window.pbToggleCorrectDistance(); setTimeout(() => { const el = document.getElementById('correctDistancePanel'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 50); } catch (e) { console.error(e); } } }
      ], 'Run Already Started');
      return;
    }""")
rep("""        pbShowModal(prior.startLabel + ' \\u2192 ' + prior.endLabel + ' is still open. Fix a distance or hub with Correct a Distance or Hub on its Results, or end it before locking another run.', [{ label: 'OK', primary: true }], 'Run Still Open');""",
    """        pbShowModal(prior.startLabel + ' \\u2192 ' + prior.endLabel + ' is still open, with pipe laid on it. Fix a distance or hub on its Results, or end it before locking another run.', [{ label: 'OK' }, { label: 'Go to Its Results', primary: true, onClick: () => { try { pbGoto('results'); setTimeout(() => { const pn = document.getElementById('correctDistancePanel'); if (!pn || !pn.offsetParent) window.pbToggleCorrectDistance(); }, 100); } catch (e) { console.error(e); } } }], 'Run Still Open'); /* r16.48 */""")
open(out, 'w', encoding='utf-8').write(s)
