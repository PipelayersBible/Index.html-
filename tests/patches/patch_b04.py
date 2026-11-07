import sys
src,out=sys.argv[1],sys.argv[2]; s=open(src,encoding='utf-8').read()
def rep(a,b):
    global s; n=s.count(a); assert n==1,(n,a[:70]); s=s.replace(a,b)
# pbLaidSummary: a run ended short shows no laid pipe past where it stopped
rep("""    const early = rows.map(r => !!E && E.reach !== null && Number.isFinite(Number(r && r.stationFt)) && Number(r.stationFt) <= E.reach + 0.005);
    const laid = rows.map((r, i) => {
      const t = marks[pbLaidKey(r)], own = typeof t === 'number' && Number.isFinite(t) ? t : null;""",
"""    const early = rows.map(r => !!E && E.reach !== null && Number.isFinite(Number(r && r.stationFt)) && Number(r.stationFt) <= E.reach + 0.005);
    const cap = pbLaidStopCap(entry); // feat_r1612 (B04): ended short before rows marked laid: those marks don't count
    const laid = rows.map((r, i) => {
      const t = marks[pbLaidKey(r)], own = typeof t === 'number' && Number.isFinite(t) && !(cap !== null && Number(r && r.stationFt) > cap + 0.005) ? t : null;""")
rep("""      const rows = Array.isArray(prev.intervalRows) ? prev.intervalRows : [], marks = pbLaidMarks(prev);
      rows.forEach(r => {
        const t = marks[pbLaidKey(r)], f = Number(r && r.stationFt);
        if (typeof t !== 'number' || !Number.isFinite(t) || !Number.isFinite(f)) return;""",
"""      const rows = Array.isArray(prev.intervalRows) ? prev.intervalRows : [], marks = pbLaidMarks(prev), cap = pbLaidStopCap(prev);
      rows.forEach(r => {
        const t = marks[pbLaidKey(r)], f = Number(r && r.stationFt);
        if (typeof t !== 'number' || !Number.isFinite(t) || !Number.isFinite(f) || (cap !== null && f > cap + 0.005)) return;""")
rep("""  function pbLaidEarlier(entry) {""",
"""  // feat_r1612 (B04): where a run ended short (End Run Without Completing), or null. Marks past it were made before
  // the stop was chosen; they stay in the record's history but are not laid pipe.
  function pbLaidStopCap(entry) { const c = entry && entry.incomplete === true ? entry.completedDistance : null; return typeof c === 'number' && Number.isFinite(c) ? c : null; }
  function pbLaidEarlier(entry) {""")
open(out,'w',encoding='utf-8').write(s); print('ok')
