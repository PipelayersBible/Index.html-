# state_audit_nov21/811 patch 1 (CONFIRMED in writing): the first legal dig day was one working day EARLY in six
# states, and three states' 811 holidays were missing from the wait. python3 p1_wait_days_confirmed.py in.html out.html
# Applies alone on r17.13 (_src/index.html md5 4f2101b2...) or stacked with p2..p5 in any order.
#
# How the app counts: canDig = the call day + notice.n working days (the call day itself is day 0). A law that says
# "48 hours, not counting the day of the notice" (or "starting the next business day") ends at the start of the 3rd
# working day, so a Monday call can be dug Thursday: n must be 3, not 2.
#  MN  GSOC (gopherstateonecall.org/?p=3558, read Nov 20 2026): "if you submit a ticket on Tuesday, you can start
#      digging on Friday"; the 48 hours begin "12:01 a.m. the business day after the request".            n 2 -> 3
#  IA  Iowa Code 480.1(6) (2026): the 48-hour period begins "6:00 a.m. the next business day".              n 2 -> 3
#  IN  Ind. Code 8-1-26-16: work may start at 7 a.m. on the next working day AFTER the two full working days. n 2 -> 3
#  SD  SDCL 49-7A-5 (2026 SB 9): the 48 hours start 12:01 a.m. the day after the notice.                    n 2 -> 3
#  OK  63 O.S. 142.4 / OKIE811 guide 2026: 48 hours "not counting the day you call".                         n 2 -> 3
#  SC  SC811: "three full working days to mark, not counting the day you call"; holiday page: notice "calculated
#      from the next business day". Mon call: Tue, Wed, Thu full -> dig Fri.                                  n 3 -> 4
# A new ticket / update waits like the first call, so the Renew-by days follow for MN, IA, IN (PB_LOC_RB 2 -> 3).
# Ticket life "from the dig day" (MN, IA, OK, SD, SC) moves with it: it is counted from the real legal start.
#
# 811 center holidays (wait only; ticket life keeps the short list, so an expiry is never later than the law's):
#  NV  Nevada Day (last Friday of October): USA North 811 list of holidays (usanorth811.org/list-of-holidays).
#  UT  Pioneer Day (Jul 24) and Christmas Eve: Blue Stakes HolidayClosures_2026.pdf ("System treats as closed for
#      all date and time calculations").
#  SC  Confederate Memorial Day (May 10), Christmas Eve, the day after Christmas: sc811.com/holidays.
# Also: Oregon's 30-day ticket life now also on the center's own page; OHIO811's site moved to ohio811.org.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
from _sr import SR, write_changes
p = P(); CH = []; sr = SR(p, CH)

GSOC = {'what': 'Gopher State One Call: when can I dig (Tuesday ticket, dig Friday; 48 hours from 12:01 AM the next business day)', 'url': 'https://gopherstateonecall.org/?p=3558'}
IA = {'what': 'Iowa Code 480.1(6), 480.4 (2026): the 48 hours start 6 AM the next business day', 'url': 'https://www.legis.iowa.gov/docs/code//480.pdf'}
SC = {'what': 'SC811 2026 holidays (the 3 full working days are counted from the next business day)', 'url': 'https://sc811.com/holidays/'}
ORH = {'what': 'Oregon 811 homeowners page: marks "should no longer be used after 30 days"', 'url': 'https://digsafelyoregon.com/homeowners/'}

sr.notice_n('MN', 2, 3, 'Give notice at least 48 hours (not the notice day, weekends or holidays) and not more than 14 calendar days before digging. The 48 hours start 12:01 AM the next business day: a Tuesday ticket can be dug Friday.', [GSOC])
sr.notice_n('IA', 2, 3, 'The 48 hours start at 6 AM the next business day and skip weekends and holidays: a Monday notice can be dug Thursday.', [IA])
sr.notice_n('IN', 2, 3, 'Call at least 2 full working days and not more than 10 calendar days before digging. Digging may start at 7 AM after those 2 full working days: a Monday call can be dug Thursday at 7 AM.', [])
sr.notice_n('SD', 2, 3, 'Give notice at least 48 hours ahead. The 48 hours start 12:01 AM the next day and skip weekends and state holidays (2026 law): a Monday notice can be dug Thursday.', [])
sr.notice_n('OK', 2, 3, 'Give notice at least 48 hours (not the notice day, weekends or holidays) before digging: a Monday notice can be dug Thursday.', [])
sr.notice_n('SC', 3, 4, 'Operators have 3 full working days to mark, not counting the call day: a Monday call can be dug Friday. SC811’s holidays (Confederate Memorial Day, Christmas Eve, the day after Christmas) don’t count.', [SC])
sr.rb('MN', 2, 3); sr.rb('IA', 2, 3); sr.rb('IN', 2, 3)

# Oregon: one more source for the 30 days; Ohio: the center's site address
T = sr.table(); sr.fix('OR', {}, [ORH])
T = sr.table(); C = [dict(c) for c in T['states']['OH']['centers']]; assert C[0]['url'] == 'https://oups.org'; C[0]['url'] = 'https://ohio811.org'
sr.fix('OH', {'centers': C}, [], 'oups.org now redirects to ohio811.org (seen Nov 20 2026)')

# the 811 centers' own extra days off, for the wait only
p.rep("""  function pbSrWorkDay(d, code, core) {
    if (code === 'CA') return pbLocWorkDay(d);
    const w = new Date(pbLocDayMs(d)).getUTCDay(); if (w === 0 || w === 6) return false;
    const y = Number(String(d).slice(0, 4)); return !pbSrHolidays(y, core).includes(d) && !pbSrHolidays(y + 1, core).includes(d);
  }""", """  /* state_audit_nov21/811: days an 811 center also counts as off, for the WAIT only (a later dig day; ticket life keeps
     the short list). NV: Nevada Day (USA North 811's list). UT: Pioneer Day, Christmas Eve (Blue Stakes 2026 closures).
     SC: Confederate Memorial Day, Christmas Eve, the day after Christmas (sc811.com/holidays). */
  const pbSrHolXC = {};
  function pbSrHolX(y, code) {
    if (code !== 'NV' && code !== 'UT' && code !== 'SC') return [];
    const k = y + code; if (pbSrHolXC[k]) return pbSrHolXC[k];
    const D = (m, d) => Date.UTC(y, m - 1, d, 12), W = (t) => new Date(t).getUTCDay(), DAY = 86400000;
    const obs = (t) => t + (W(t) === 6 ? -DAY : W(t) === 0 ? DAY : 0);
    const eve = D(12, 24) - (W(D(12, 24)) === 6 ? DAY : W(D(12, 24)) === 0 ? 2 * DAY : 0);
    const a26 = D(12, 26), after = a26 + (W(a26) === 6 ? 2 * DAY : W(a26) === 0 || W(a26) === 1 ? DAY : 0);
    let L = [];
    if (code === 'NV') { const t = Date.UTC(y, 10, 0, 12); L = [t - ((W(t) - 5 + 7) % 7) * DAY]; }
    if (code === 'UT') L = [obs(D(7, 24)), eve];
    if (code === 'SC') L = [obs(D(5, 10)), eve, after];
    return (pbSrHolXC[k] = L.map(t => new Date(t).toISOString().slice(0, 10)));
  }
  function pbSrWorkDay(d, code, core) {
    if (code === 'CA') return pbLocWorkDay(d);
    const w = new Date(pbLocDayMs(d)).getUTCDay(); if (w === 0 || w === 6) return false;
    const y = Number(String(d).slice(0, 4)); return !pbSrHolidays(y, core).includes(d) && !pbSrHolidays(y + 1, core).includes(d) && (core || !pbSrHolX(y, code).includes(d));
  }""")
p.rep("workDay: pbSrWorkDay, holidays: pbSrHolidays,", "workDay: pbSrWorkDay, holidays: pbSrHolidays, holX: pbSrHolX,")
p.save()
write_changes(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'results', 'p1_changes.md'), CH)
print('p1 ok:', len(CH), 'changes')
