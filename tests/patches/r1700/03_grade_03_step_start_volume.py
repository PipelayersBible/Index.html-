import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# grade2 audit 03: a Run 2+ Start whose invert comes from the measured step (the app's own default for an Additional
# Run) has no stake, and nothing of its own run lies before it, so the grade 07 rule ("between stakes of its own run")
# never held and every such job had no backfill estimate. The ground at a run's start is the previous run's End stake
# (the same station): it counts as that run's own ground, for the check and for the ground line leaving the start.
rep("""  function interpGroundForRun(points, run, station, side) {
    const own = points.filter(p => p.run === run);""",
    """  function interpGroundForRun(points, run, station, side) {
    const rs = points.runStart ? points.runStart[run] : undefined; // grade2 audit 03: the stake at this run's start station (the previous End) is its ground too
    const own = points.filter(p => p.run === run || (rs !== undefined && Math.abs(p.station - rs) < 1e-6));""")
rep("""    // bughunt grade 07: every unstaked point lies between staked ground of its own run: no gap in the ground line
    if (!allStaked && unstakedPts.length && unstakedPts.every(u => u.station !== null && Number.isFinite(u.station)
      && groundPoints.some(g => g.run === u.run && g.station <= u.station + 1e-9) && groundPoints.some(g => g.run === u.run && g.station >= u.station - 1e-9))) allStaked = true;""",
    """    // bughunt grade 07: every unstaked point lies between staked ground of its own run: no gap in the ground line
    groundPoints.runStart = {}; calc.points.forEach(p => { const m = /^seg(\\d+)start$/.exec(p.id || ''); if (m && Number.isFinite(p.station)) groundPoints.runStart[Number(m[1])] = p.station; }); // grade2 audit 03
    const ownG = (g, run) => g.run === run || (groundPoints.runStart[run] !== undefined && Math.abs(g.station - groundPoints.runStart[run]) < 1e-6);
    if (!allStaked && unstakedPts.length && unstakedPts.every(u => u.station !== null && Number.isFinite(u.station)
      && groundPoints.some(g => ownG(g, u.run) && g.station <= u.station + 1e-9) && groundPoints.some(g => ownG(g, u.run) && g.station >= u.station - 1e-9))) allStaked = true;""")
open(out, "w", encoding="utf-8").write(s)
