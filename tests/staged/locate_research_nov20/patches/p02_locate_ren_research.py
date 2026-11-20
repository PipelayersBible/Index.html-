#!/usr/bin/env python3
# locate_research_nov20: what the Nov 20 811 research changes in the Renew form. Goes ON TOP of
# locate_form_nov20/patches/p01_locate_state_rule.py.
#   python3 p02_locate_ren_research.py in.html out.html     (in = r17.11 candidate + p01)
# - new ticket number on a renewal, now also: Georgia, Virginia, Utah (the center says the update gets a new number),
#   Iowa, Michigan (the center says to get a new ticket). Utah still counts from the old expiry.
# - Nevada's message after two renewals says when to call the new ticket in (NAC 455.165(4): a new notification under
#   NRS 455.110, so the usual 2 working days apply).
import sys

src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()


def rep(a, b):
    global s
    n = s.count(a)
    assert n == 1, 'expected once, found %d: %r' % (n, a[:90])
    s = s.replace(a, b)


rep("""const PB_LOC_REN = { UT: { exp: 1 }, NV: { max: 2 }, CT: { no: 1 }, FL: { no: 1 }, IN: { no: 1 }, ME: { no: 1 }, MN: { no: 1 }, NC: { no: 1 }, NJ: { no: 1 }, OK: { no: 1 }, OR: { no: 1 }, TN: { no: 1 }, TX: { no: 1 }, WA: { no: 1 } };""",
    """const PB_LOC_REN = { UT: { exp: 1, no: 1 }, NV: { max: 2 }, CT: { no: 1 }, FL: { no: 1 }, GA: { no: 1 }, IA: { no: 1 }, IN: { no: 1 }, ME: { no: 1 }, MI: { no: 1 }, MN: { no: 1 }, NC: { no: 1 }, NJ: { no: 1 }, OK: { no: 1 }, OR: { no: 1 }, TN: { no: 1 }, TX: { no: 1 }, VA: { no: 1 }, WA: { no: 1 } }; /* locate_research_nov20: + GA IA MI VA, UT no */""")

rep("""'. Call in a new ticket and add it here.', 'New Ticket Needed'); return; }""",
    """'. Call in a new ticket' + (function() { const N = (pbSrRow(U.code) || {}).notice; return N && N.n > 0 && N.unit === 'wd' ? ' at least ' + N.n + ' working days before this one runs out' : ''; })() + ', and add it here.', 'New Ticket Needed'); return; }""")

rep("""U.exp ? 'The app counts a renewal from the old expiry.' : U.no ?""",
    """U.exp ? 'The app counts a renewal from the old expiry.' + (U.no ? ' It asks for the new ticket number.' : '') : U.no ?""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', len(s))
