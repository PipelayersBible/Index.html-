import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# Backfill estimate: a point with no stake (the "Left off" hub a Resume adds, a hub typed as an invert) blocked the
# whole volume. Ground is a straight line between stakes for every row already, so an unstaked point with staked
# ground of its own run on both sides does not leave a gap. A run whose Start or End has no stake is still incomplete.
rep("""      if (modeVal !== 'stake') { allStaked = false; unstakedStations.push(station); return; }
      if (stakeElev === null || cutFillVal === null || station === null) { allStaked = false; unstakedStations.push(station); return; }""",
    """      if (modeVal !== 'stake') { allStaked = false; unstakedStations.push(station); unstakedPts.push({ station, run: pbRunOfPointId(prefix) }); return; }
      if (stakeElev === null || cutFillVal === null || station === null) { allStaked = false; unstakedStations.push(station); unstakedPts.push({ station, run: pbRunOfPointId(prefix) }); return; }""")
rep("""    const unstakedStations = []; // where a point has no stake: a run ended early only needs stakes over the part that was dug""",
    """    const unstakedStations = []; // where a point has no stake: a run ended early only needs stakes over the part that was dug
    const unstakedPts = []; // bughunt grade 07: the same points with their run""")
rep("""    const netCutFill = totalCut - totalFill;
    let volumeYd3 = null;""",
    """    const netCutFill = totalCut - totalFill;
    // bughunt grade 07: every unstaked point lies between staked ground of its own run: no gap in the ground line
    if (!allStaked && unstakedPts.length && unstakedPts.every(u => u.station !== null && Number.isFinite(u.station)
      && groundPoints.some(g => g.run === u.run && g.station <= u.station + 1e-9) && groundPoints.some(g => g.run === u.run && g.station >= u.station - 1e-9))) allStaked = true;
    let volumeYd3 = null;""")
open(out, "w", encoding="utf-8").write(s)

