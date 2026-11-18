import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# grade2 audit 02: a Reducer hub with another hub at the SAME station. buildCalc joins same-station hubs in the order they
# were entered and takes each section's pipe from the point it leaves, but a reducer only counted for points strictly past
# it: a hub entered after the reducer at its station (IE IN / IE OUT of a structure, a cut-sheet import) still had the old
# pipe, and so did the section leaving it and every interval row up to the next hub (BOP and TOP of the old size). A
# reducer at the same station entered BEFORE a hub has already changed the pipe there. Start and End are unchanged.
rep("""    let best = null, bestAt = -Infinity;
    hubs.forEach(h => { const hs = numVal(h + 'Station'); if (hs === null) return; if ((hs < at - 1e-6 || (inclusive && h === p)) && hs >= bestAt) { bestAt = hs; best = h; } });""",
    """    let best = null, bestAt = -Infinity;
    const order = /^seg\\d+hub|^hub/.test(p) ? (n === 1 ? getAllHubPrefixes() : n === 2 ? getAllHub2Prefixes() : getAllHubPrefixesForSeg(n)) : null, myAt = order ? order.indexOf(p) : -1; // grade2 audit 02
    hubs.forEach(h => { const hs = numVal(h + 'Station'); if (hs === null) return; const sameBefore = myAt !== -1 && h !== p && Math.abs(hs - at) <= 1e-6 && order.indexOf(h) !== -1 && order.indexOf(h) < myAt; if ((hs < at - 1e-6 || sameBefore || (inclusive && h === p)) && hs >= bestAt) { bestAt = hs; best = h; } });""")
open(out, "w", encoding="utf-8").write(s)
