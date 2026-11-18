import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# grade2 audit 04: a Run 2+ Start set by the measured step was calculated from what its Invert box shows: on Architect's
# Rod that box rounds to 1/16 in (up to 0.0026 ft off; 0.0005 ft on Engineer's), so every row of that run carried the
# rounding, and readings shown to 1/16 in came out a sixteenth off the right one (up to 0.0052 ft). While the box still
# holds what the step put there, the run uses the step's own value (End invert - its wall + step + this run's wall).
rep("""  function getPointPI(prefix) {
    const modeVal = activeVal(prefix+'ModeToggle');
    if (modeVal === 'elev') return getElevVal(prefix+'Elev');""",
    """  function pbSegStartExact(prefix) { // grade2 audit 04: the step's own invert, while the faded box still shows it
    const m = /^seg(\\d+)start$/.exec(String(prefix || '')); if (!m || !pbSegStartStepDriven(prefix)) return null;
    const n = Number(m[1]), prevEnd = n === 2 ? 'end' : 'seg' + (n - 1) + 'end', step = getElevVal(n === 2 ? 'reducerStep' : 'seg' + n + 'Step');
    const pe = getPointPI(prevEnd), pw = getPointWT(prevEnd), tw = getPointWT(prefix), box = getElevVal(prefix + 'Elev');
    if (step === null || pe === null || pw === null || tw === null || box === null) return null;
    const x = pe - pw + step + tw;
    return Math.abs(box - x) <= 0.003 ? x : null;
  }
  function getPointPI(prefix) {
    const modeVal = activeVal(prefix+'ModeToggle');
    if (modeVal === 'elev') { const ex = pbSegStartExact(prefix); return ex !== null ? ex : getElevVal(prefix+'Elev'); }""")
rep("""      const stakeShot = pbStakeShotReading(prefix); // a stake hub corrected at the same invert keeps its own shot, as it did as a stake
      if (stakeShot !== null) return stakeShot;
      const elev = getElevVal(prefix+'Elev');
      if (elev === null || hi === null) return null;""",
    """      const stakeShot = pbStakeShotReading(prefix); // a stake hub corrected at the same invert keeps its own shot, as it did as a stake
      if (stakeShot !== null) return stakeShot;
      const ex = pbSegStartExact(prefix), elev = ex !== null ? ex : getElevVal(prefix+'Elev'); // grade2 audit 04
      if (elev === null || hi === null) return null;""")
open(out, "w", encoding="utf-8").write(s)
