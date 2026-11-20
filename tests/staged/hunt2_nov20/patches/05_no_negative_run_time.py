# hunt2 05: a run never shows a negative time.
# The phone's clock was ahead when the run was locked (date set wrong, no network time in the trench), then corrected
# itself with signal before End Run: the run's end is "before" its start. The run report said
# "Total time on run: -1920h 0m" (reproduced: clock 40 days ahead; a clock 2 hours ahead gives "-1h -45m").
# Stats and rates already leave such a run out (they need a time above zero); only the words were wrong.
# Now the time reads "not known (this phone's clock changed during the run)". Nothing stored changes.
# Usage: python3 05_no_negative_run_time.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""  function fmtDuration(totalMinFloat) {
    const totalMin = Math.round(totalMinFloat);
""", """  function fmtDuration(totalMinFloat) {
    if (typeof totalMinFloat === 'number' && totalMinFloat < -0.5) return 'not known (this phone\\u2019s clock changed during the run)'; /* hunt2 05 */
    const totalMin = Math.round(totalMinFloat);
""")
p.save()
