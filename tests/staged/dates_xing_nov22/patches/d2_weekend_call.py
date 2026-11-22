# dates_xing_nov22 d2: a call on a weekend or holiday came out one working day LATE in the states whose clock starts
# the next business day / counts only full working days after the call day. The app moved the call to the next
# working day and then waited the full n days, so that day was skipped twice.
#   MN Sat Dec 5 2026: app Thu Dec 10; law (48 h from 12:01 AM the next business day, Mon) -> Wed Dec 9.
# Fixed where the wording plainly starts the clock on the next business day or counts full working days (the first
# working day after a weekend call is a full day): MN IA SD VA UT LA (clock starts next business day, from their rows'
# sources), FL WA CO KY NC SC IN KS NE WY AR CT OK AZ ("full" working/business days, or "not the notice day").
# NOT changed: OR (a call after 5 PM counts as the next business day, so a weekend call is Monday's call: stays as is);
# CA and the same-wording states NV NY OH IL NM ("not including the date of notification": left with CA until
# DigAlert / USA North answer how a weekend online ticket counts); hour states (TX WV MA ME NH RI VT MI TN DC: the hours
# start at the next working day, which the app already does); PA MD DE NJ WI and the rest (raw n, no wording to read).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""    if (!pbLocIsDay(called) || !R || !R.notice || !(R.notice.n >= 0)) return '';
    let d = called, g = 0; while (!pbSrWorkDay(d, code, false) && g++ < 20) d = pbLocAddDays(d, 1);""",
"""    if (!pbLocIsDay(called) || !R || !R.notice || !(R.notice.n >= 0)) return '';
    if (PB_SR_NBD.indexOf(code) >= 0) return pbSrAddWd(called, R.notice.n, code, false); /* dates_xing_nov22: a weekend / holiday call: the next working day is the first one counted */
    let d = called, g = 0; while (!pbSrWorkDay(d, code, false) && g++ < 20) d = pbLocAddDays(d, 1);""")
p.rep("""  function pbSrCanDig(called, code) {""", """  /* dates_xing_nov22: states whose wait starts the next business day (or counts only full working days after the call
     day): a call on a weekend or holiday counts that next working day as day 1 (MN Sat call -> Wed, not Thu) */
  const PB_SR_NBD = ['MN', 'IA', 'SD', 'VA', 'UT', 'LA', 'FL', 'WA', 'CO', 'KY', 'NC', 'SC', 'IN', 'KS', 'NE', 'WY', 'AR', 'CT', 'OK', 'AZ'];
  function pbSrCanDig(called, code) {""")
p.save()
