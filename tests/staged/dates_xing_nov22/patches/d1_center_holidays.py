# dates_xing_nov22 d1: 811-center / state holidays missing from the WAIT (the ticket life keeps the short list).
# python3 d1_center_holidays.py in.html out.html   (on r17.14 _src/index.html, md5 25adfdd9...; stack d1..d8 in order)
# Confirmed (read Nov 21-22 2026):
#  NC  nc811.org/education/calendars.html: Good Friday, Christmas Eve & Day, Christmas Day After (3 Christmas days by the
#      NC state schedule; oshr.nc.gov lists 2026 Dec 24, 25, 28 / 2027 Dec 23, 24, 27 / 2028 Dec 22, 25, 26). "State
#      Holidays indicated below are excluded from and not part of the three (3) working day notice."
#  VA  va811.com holiday list: Columbus Day (already counted) and Election Day (Tue Nov 3 2026).
#  MA, ME Patriots' Day; RI Victory Day; VT Bennington Battle Day; NH Election Day (even years): digsafe.com/faqs
#      ("Observed Legal Holidays") and the Dig Safe Excavator Manual (Nov 2025).
#  HI  HRS 269E-7 / Hawaii excavator guide: a working day excludes "any federal or state holiday"; state holidays include
#      Kuhio Day (Mar 26), Good Friday, Kamehameha Day (Jun 11), Statehood Day (3rd Fri Aug), General Election Day.
#  TX  Utilities Code 251.151(a) excludes "legal holidays"; 251.002(9) = Gov Code 662 Subchapter B, which lists the
#      state holidays Jan 19, Mar 2, Apr 21, Jun 19, Aug 27, the Friday after Thanksgiving, Dec 24, Dec 26 (662.003(b)).
# Unconfirmed, applied because the law counts state holidays (strictest wins):
#  TX  Good Friday (an optional holiday, 662.003(c)). Rosh Hashanah / Yom Kippur NOT added (Hebrew calendar; decision).
#  TN  Good Friday, Christmas Eve: TCA 65-31-102(26) excludes "national and legal state holidays"; TN811's own list
#      not found online.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
from _sr import SR, write_changes
p = P(); CH = []; sr = SR(p, CH)

p.rep("""    if (code !== 'NV' && code !== 'UT' && code !== 'SC') return [];
    const k = y + code; if (pbSrHolXC[k]) return pbSrHolXC[k];
    const D = (m, d) => Date.UTC(y, m - 1, d, 12), W = (t) => new Date(t).getUTCDay(), DAY = 86400000;""",
"""    if (PB_SR_HOLX.indexOf(code) < 0) return [];
    const k = y + code; if (pbSrHolXC[k]) return pbSrHolXC[k];
    const D = (m, d) => Date.UTC(y, m - 1, d, 12), W = (t) => new Date(t).getUTCDay(), DAY = 86400000;
    const nth = (m, wd, n) => D(m, 1) + (((wd - W(D(m, 1)) + 7) % 7) + 7 * (n - 1)) * DAY;
    const gf = (() => { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), kk = c % 4, l = (32 + 2 * e + 2 * i - h - kk) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return Date.UTC(y, mo - 1, da, 12) - 2 * DAY; })(); /* Good Friday: Easter Sunday - 2 */
    const elect = nth(11, 1, 1) + DAY; /* Election Day: the Tuesday after the first Monday in November */""")
p.rep("""    if (code === 'SC') L = [obs(D(5, 10)), eve, after];
    return (pbSrHolXC[k] = L.map(t => new Date(t).toISOString().slice(0, 10)));""",
"""    if (code === 'SC') L = [obs(D(5, 10)), eve, after];
    /* dates_xing_nov22: NC811 (nc811.org/education/calendars.html): Good Friday and the 3 NC Christmas days (oshr.nc.gov) */
    if (code === 'NC') { const w = W(D(12, 25)); L = [gf].concat((w === 0 ? [23, 26, 27] : w === 1 ? [22, 25, 26] : w === 5 ? [24, 25, 28] : w === 6 ? [23, 24, 27] : [24, 25, 26]).map(d => D(12, d))); }
    if (code === 'VA') L = [elect]; /* VA811 holiday list */
    if (code === 'MA' || code === 'ME') L = [nth(4, 1, 3)]; /* Dig Safe: Patriots' Day */
    if (code === 'RI') L = [nth(8, 1, 2)]; /* Dig Safe: Victory Day */
    if (code === 'VT') L = [obs(D(8, 16))]; /* Dig Safe: Bennington Battle Day */
    if (code === 'NH') L = y % 2 ? [] : [elect]; /* Dig Safe: Election Day, even years */
    if (code === 'HI') L = [obs(D(3, 26)), gf, obs(D(6, 11)), nth(8, 5, 3)].concat(y % 2 ? [] : [elect]); /* HRS 269E: state holidays */
    if (code === 'TX') L = [D(1, 19), D(3, 2), D(4, 21), D(6, 19), D(8, 27), D(12, 24), D(12, 26), gf]; /* Gov Code 662.003(b); Good Friday (optional holiday, 662.003(c)) to be safe */
    if (code === 'TN') L = [gf, eve]; /* TCA 65-31-102(26) "legal state holidays": not confirmed with TN811, skipped to be safe */
    return (pbSrHolXC[k] = L.map(t => new Date(t).toISOString().slice(0, 10)));""")
p.rep("""  const pbSrHolXC = {};
  function pbSrHolX(y, code) {""", """  const pbSrHolXC = {}, PB_SR_HOLX = ['NV', 'UT', 'SC', 'NC', 'VA', 'MA', 'ME', 'RI', 'VT', 'NH', 'HI', 'TX', 'TN']; /* dates_xing_nov22: + NC VA MA ME RI VT NH HI TX TN */
  function pbSrHolX(y, code) {""")

def add_text(code, extra, src):
    T = sr.table(); N = dict(T['states'][code]['notice']); assert extra not in N['text']
    N['text'] = N['text'] + ' ' + extra
    sr.fix(code, {'notice': N}, [src] if src else [], 'holidays')

NC = {'what': 'NC811 holiday calendar 2026-2027 (state holidays excluded from the 3 working day notice)', 'url': 'https://nc811.org/education/calendars.html'}
VA = {'what': 'VA811 holiday list (Columbus Day, Election Day)', 'url': 'https://va811.com/events/category/holiday/list/'}
DS = {'what': 'Dig Safe FAQ: observed legal holidays by state', 'url': 'https://digsafe.com/faqs'}
HI = {'what': 'Hawaii excavator guide: working day excludes federal and state holidays; state holiday list (HRS 269E-7)', 'url': 'https://cca.hawaii.gov/pvl/files/2021/04/Hawaii-ExcavatorGuide_Sixth-Edition-1.pdf'}
TX = {'what': 'Gov Code 662.003: Texas legal holidays (Utilities Code 251.002(9))', 'url': "https://texas.public.law/statutes/tex._gov't_code_section_662.003"}
TN = {'what': 'TCA 65-31-102(26): a working day excludes national and legal state holidays and runs from the time of the call', 'url': 'https://law.counselstack.com/statute/tn/65-31-102'}
add_text('NC', 'NC811’s holidays (Good Friday, Christmas Eve, the day after Christmas) don’t count.', NC)
add_text('VA', 'Election Day doesn’t count (a VA811 holiday).', VA)
add_text('MA', 'Patriots’ Day doesn’t count.', DS)
add_text('ME', 'Patriots’ Day doesn’t count.', DS)
add_text('RI', 'Victory Day doesn’t count.', DS)
add_text('VT', 'Bennington Battle Day doesn’t count.', DS)
add_text('NH', 'Election Day in even years doesn’t count.', DS)
add_text('HI', 'State holidays don’t count (Kuhio Day, Good Friday, Kamehameha Day, Statehood Day, Election Day).', HI)
add_text('TX', 'Texas state holidays don’t count (Jan 19, Mar 2, Apr 21, Aug 27, Dec 24, Dec 26); the app also skips Good Friday to be safe.', TX)
add_text('TN', 'State holidays don’t count; the app also skips Good Friday and Christmas Eve to be safe.', TN)
p.save(); write_changes(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'results', 'd1_changes.md'), CH)
