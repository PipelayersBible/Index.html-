import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# audit pdfs 06: a field note's place in the Job Summary (PDF and screen) and in the daily report's "Other run notes" /
# delays "Where" was the note's DISTANCE from the run start printed as a station: "0+20.00" / "Sta 20.0" for a note the run
# PDF puts at Sta 1+70.00 (run starting at 1+50). One helper now gives the note's real station (the run's stations when it
# has them, as the run PDF does; distance formatted as a station from 0+00 otherwise, as before).
rep("""  function getFullCorrectionHistory(entry) {""",
    """  function pbNoteStaTxt(e, n) { // audit pdfs 06: a note's station in words, the way the run PDF prints it
    const ft = parseFloat(pbNoteStation(e, n));
    if (!isFinite(ft)) return String((n && n.station) || '');
    try { if (e && e.runStations && typeof e.runStations === 'object') { const t = pbStRowStaFn(e)({ stationFt: ft, pointId: (n && n.pointId) || '' }); if (t) return t; } } catch (x) {}
    return pbRptSta(ft);
  }
  function getFullCorrectionHistory(entry) {""")
rep("""          station: pbNoteStation(e, n) + pbNoteOffRunText(e, n),""",
    """          station: pbNoteStation(e, n) + pbNoteOffRunText(e, n),
          staTxt: pbNoteStaTxt(e, n) + pbNoteOffRunText(e, n), /* audit pdfs 06 */""")
rep("""(isFinite(parseFloat(n.station)) ? pbRptSta(parseFloat(n.station)) : n.station) + (n.pointLabel""",
    """(n.staTxt ? n.staTxt : isFinite(parseFloat(n.station)) ? pbRptSta(parseFloat(n.station)) : n.station) + (n.pointLabel""")
rep("""<td>${escapeHtml(n.station)}${n.pointLabel ? ' (' + escapeHtml(n.pointLabel) + ')' : ''}</td>""",
    """<td>${escapeHtml(n.staTxt || n.station)}${n.pointLabel ? ' (' + escapeHtml(n.pointLabel) + ')' : ''}</td>""")
rep("""where: (n.station ? 'Sta ' + n.station + ' · ' : '')""", """where: (n.station ? 'Sta ' + pbNoteStaTxt(e, n) + ' · ' : '')""")
rep("""where: (n.station ? 'Sta ' + n.station : '')""", """where: (n.station ? 'Sta ' + pbNoteStaTxt(e, n) : '')""")
open(out, 'w', encoding='utf-8').write(s)
