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
# askgrade (#40, Nov 19): the held-back version broke the Edit Run Data reload (grade2/ref/run_lock.js, architect seed 1:
# reloaded INV 4645.375 vs 4645.376). Root cause: the record keeps the exact invert (piFt), but Edit Run Data / Resume put it
# back in the Invert box, which rounds it to 1/16 in, as a typed invert with no step, so the reloaded run used the rounded box.
# The loader now remembers the recorded value, and the run uses it while the box still shows exactly what the loader put there
# (typing a new invert, a new step or a shot that moves the box drops it). Records locked before this fix have piFt equal to
# their box value, so they reload as before.
rep("""  function getPointPI(prefix) {
    const modeVal = activeVal(prefix+'ModeToggle');
    if (modeVal === 'elev') return getElevVal(prefix+'Elev');""",
    """  function pbSegStartExact(prefix) { // grade2 audit 04: the step's own invert, while the faded box still shows it
    const m = /^seg(\\d+)start$/.exec(String(prefix || '')); if (!m) return null;
    const ld = window._pbSegStartLoaded && window._pbSegStartLoaded[prefix]; // the record's own invert (Edit Run Data, Resume)
    if (ld && !pbSegStartStepDriven(prefix)) { const b = getElevVal(prefix + 'Elev'); return b !== null && Math.abs(b - ld.box) < 1e-9 && Math.abs(b - ld.v) <= 0.003 ? ld.v : null; }
    if (!pbSegStartStepDriven(prefix)) return null;
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
# the loader: remember each Run N Start's recorded invert next to what its box shows
rep("""  function pbLoadRunIntoForm(entry, opts) {
    pbNoStakeClear();""", """  function pbLoadRunIntoForm(entry, opts) {
    pbNoStakeClear();
    window._pbSegStartLoaded = {}; // grade2 audit 04""")
rep("""          setPredictedFillMarker(prefix + 'Elev', false); // a real, independently-known elevation — not the reducer-derived kind, so it must never get silently recalculated from the (blank) step field
""", """          setPredictedFillMarker(prefix + 'Elev', false); // a real, independently-known elevation — not the reducer-derived kind, so it must never get silently recalculated from the (blank) step field
          if (/start$/.test(prefix) && typeof r.piFt === 'number' && isFinite(r.piFt)) { const b = getElevVal(prefix + 'Elev'); if (b !== null) window._pbSegStartLoaded[prefix] = { v: r.piFt, box: b }; } // grade2 audit 04: its exact invert, not the box's 1/16 in
""")
rep("""  function pbResetRunForm() {
    pbNoStakeClear();""", """  function pbResetRunForm() {
    pbNoStakeClear();
    window._pbSegStartLoaded = {}; // grade2 audit 04""")
open(out, "w", encoding="utf-8").write(s)
