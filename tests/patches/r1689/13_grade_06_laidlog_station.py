import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# The laid log kept only the row's 1-decimal label ("65.3" for a hub at 65.25), and the run report printed that
# as the station. The log now also keeps the exact distance; the report uses it (older logs: the row with that label).
rep("""      L.log.push({ a: on ? 'laid' : 'undo', at, by, to: String(row.station), keys });""",
    """      L.log.push({ a: on ? 'laid' : 'undo', at, by, to: String(row.station), ft: typeof row.stationFt === 'number' && isFinite(row.stationFt) ? row.stationFt : undefined, keys }); /* bughunt grade 06: the exact distance too */""")
rep("""  function pbRptStaTxt(t) { const f = parseFloat(t); return isFinite(f) ? 'Sta ' + pbRptSta(f) : String(t || '?'); }""",
    """  function pbRptStaTxt(t) { const f = parseFloat(t); return isFinite(f) ? 'Sta ' + pbRptSta(f) : String(t || '?'); }
  // bughunt grade 06: a laid-log entry's station: its exact distance, else the one row whose label it kept, else the label
  function pbRptLaidLogSta(e, x) {
    if (x && typeof x.ft === 'number' && isFinite(x.ft)) return 'Sta ' + pbRptSta(x.ft);
    const m = ((e && e.intervalRows) || []).filter(r => r && String(r.station) === String(x && x.to) && typeof r.stationFt === 'number');
    return m.length === 1 ? 'Sta ' + pbRptSta(m[0].stationFt) : pbRptStaTxt(x && x.to);
  }""")
rep("""x.a === 'undo' ? { content: 'Undo: laid marks removed from ' + pbRptStaTxt(x.to) + ' on', _accent: true } : 'Marked laid to ' + pbRptStaTxt(x.to),""",
    """x.a === 'undo' ? { content: 'Undo: laid marks removed from ' + pbRptLaidLogSta(e, x) + ' on', _accent: true } : 'Marked laid to ' + pbRptLaidLogSta(e, x),""")
rep("""(x.a === 'undo' ? 'Laid marks undone from ' : 'Rows marked laid to ') + pbRptStaTxt(x.to) +""",
    """(x.a === 'undo' ? 'Laid marks undone from ' : 'Rows marked laid to ') + pbRptLaidLogSta(e, x) +""")
open(out, "w", encoding="utf-8").write(s)

