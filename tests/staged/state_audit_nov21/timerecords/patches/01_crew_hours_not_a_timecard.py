#!/usr/bin/env python3
# state_audit_nov21/timerecords patch 01 (OPTIONAL, wording only): the signed daily report PDF and the run report PDF
# show each person's First in / Last out / Hours. Add one line saying it is a job record, not a time card, and that meal
# and rest breaks are not shown. Same idea as legal_nov19 patch 01 (which did the "Crew hours for payroll" spreadsheet).
# Usage: python3 01_crew_hours_not_a_timecard.py in.html out.html   (applies alone on r17.13 _src/index.html)
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, f'expected exactly 1 match, found {n}: {old[:80]}'
    s = s.replace(old, new)
NOTE = 'Job record, not a time card: meal and rest breaks are not shown here.'
# signed daily report PDF, crew section
rep("R.section('crew', 'Crew and equipment hours', { keep: 30 });",
    "R.section('crew', 'Crew and equipment hours', { keep: 30, intro: 'Hours as the foreman signed them. " + NOTE + "' });")
# run report PDF, Crew & Equipment Log section
rep("intro: 'Hours count completed check-in/check-out periods only; open time (never checked out) is not counted.' });",
    "intro: 'Hours count completed check-in/check-out periods only; open time (never checked out) is not counted. " + NOTE + "' });")
open(dst, 'w', encoding='utf-8').write(s)
print('ok')
