# hunt_nov19 02: the night-shift rule (r17.06 #47) moved a DAY crew's next-morning runs onto yesterday's report.
# A run started before noon joins the day before "while a run of the shift is still open". A day crew that never tapped
# End Run on Monday (the app lets the next run start: "Start Anyway" / "Check Them Out Now") had Tuesday morning's runs
# put on Monday's daily report (footage, crew, materials, the crew's default hours up to 24), and Tuesday's report was
# missing them, until Monday's report for that job was signed.
# Now the "still open" case only holds within 14 hours of the shift's first start (a 18:00 night shift reaches 08:00;
# a 7:00 day shift's open run no longer catches 7:15 the next morning). The 4-hours-after-the-last-stop case is unchanged.
# (14, not 16: with 16 a day crew whose first run of the day started at 2:30 PM and stayed open still had the next
# morning's 6:15 run moved to the day before; with 14 that needs a first run started after 4 PM. Checked in t_h02.)
# Usage: python3 02_night_shift_not_day_crew.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("  const PB_SHIFT_GAP_MS = 4 * 3600000;", "  const PB_SHIFT_GAP_MS = 4 * 3600000, PB_SHIFT_OPEN_MS = 14 * 3600000; /* hunt_nov19 02 */")
p.rep("    const m = new Map(); let day0 = null, end0 = -Infinity, open0 = false;",
      "    const m = new Map(); let day0 = null, end0 = -Infinity, open0 = false, start0 = NaN; /* hunt_nov19 02: start0 = the shift's first start */")
p.rep("pbDlyHourOf(x.s) < 12 && (open0 || x.s - end0 <= PB_SHIFT_GAP_MS) && !pbDlyShiftSigned(x.e, day0, x.s)) day = day0;\n      if (day !== day0) { day0 = day; end0 = -Infinity; open0 = false; }",
      "pbDlyHourOf(x.s) < 12 && ((open0 && x.s - start0 <= PB_SHIFT_OPEN_MS) || x.s - end0 <= PB_SHIFT_GAP_MS) && !pbDlyShiftSigned(x.e, day0, x.s)) day = day0;\n      if (day !== day0) { day0 = day; end0 = -Infinity; open0 = false; start0 = x.s; }")
p.save()
