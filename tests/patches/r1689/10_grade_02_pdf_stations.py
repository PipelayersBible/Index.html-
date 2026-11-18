import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# Run report PDF: a run entered with real stations (entry.runStations) printed the right stations in the grade
# table's Station column, but everywhere else "Sta" was the distance from the start written as a station
# (photo captions, Laid to, timeline), and the grade sheet's intro said the plan stationing "is not recorded".
# While a run's report is being built, pbRptSta() gives the run's own station for a distance when the run has stations.
rep("""  function pbRptSta(ft) { return typeof ft === 'number' && isFinite(ft) ? pbCutsheetStaText(ft) : '\\u2014'; }""",
    """  var pbRptStaFn = null; // bughunt grade 02: set while a run's report is built: distance (ft) -> the run's own station, '' when it has none
  function pbRptSta(ft) { if (!(typeof ft === 'number' && isFinite(ft))) return '\\u2014'; if (pbRptStaFn) { let t = ''; try { t = pbRptStaFn(ft); } catch (x) { t = ''; } if (t) return t; } return pbCutsheetStaText(ft); }""")
rep("""  function pbRptRunInto(R, e) {
    const G = PB_RPT, fp = pbRptFingerprint(e);""",
    """  function pbRptRunInto(R, e) { /* bughunt grade 02 */
    const prev = pbRptStaFn;
    try { const f = e && e.runStations && typeof e.runStations === 'object' ? pbStRowStaFn(e) : null; pbRptStaFn = f ? (ft) => f({ stationFt: ft, pointId: '' }) : null; } catch (x) { pbRptStaFn = null; }
    try { return pbRptRunInto0(R, e); } finally { pbRptStaFn = prev; }
  }
  function pbRptRunInto0(R, e) {
    const G = PB_RPT, fp = pbRptFingerprint(e);""")
rep("""    R.para('Stations are measured from the start of this run (0+00.00 at ' + (e.startLabel || 'the start point') + '); the plan\\u2019s own stationing is not recorded with the run. Elevations in feet.""",
    """    R.para((rows.some(r => !!pbStRowStaFn(e)(r)) ? 'Dist. is feet from the start of this run (' + (e.startLabel || 'the start point') + '); Station is the station entered on the run form for the start, carried along the run.' : 'Stations are measured from the start of this run (0+00.00 at ' + (e.startLabel || 'the start point') + '); the plan\\u2019s own stationing is not recorded with the run.') + ' Elevations in feet.""")
open(out, "w", encoding="utf-8").write(s)

