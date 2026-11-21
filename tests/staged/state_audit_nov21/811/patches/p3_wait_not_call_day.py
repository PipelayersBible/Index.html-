# state_audit_nov21/811 patch 3 (STRICT READING, decision 2: check one California ticket first): "2 working days, not
# counting the day of the call" read strictly = the two days after the call day must pass, so a Monday call can be dug
# Thursday (the app says Wednesday). python3 p3_wait_not_call_day.py in.html out.html
# Applies alone on r17.13 or stacked with p1, p2, p4, p5 in any order.
#  CA Gov. Code 4216(l): "Legal excavation start date and time means two working days, not including the date of
#     notification"; 4216(v) working day = Mon-Fri 7:00 a.m. to 5:00 p.m. (findlaw, read Nov 21 2026)        2 -> 3
#  NV NRS 455.110 / USA North handbook: 2 working days (7 AM to 5 PM), the call day not counted (same center as CA) 2 -> 3
#  NY 16 NYCRR 753-3.1 "at least two ... working days, not including the date of the call"; National Grid: "wait at
#     least two full working days ... excludes the date of notification" (ngridsafety.com/?p=45)            2 -> 3
#  OH O.R.C. 3781.28 "at least two working days, not including the day of the notification"                  2 -> 3
#  IL 220 ILCS 50/2, 4: "not less than 2 days"; "'Day' does not include ... the day of the actual notice"       2 -> 3
#  NM 18.60.5 NMAC: 2 working days, not counting the notice day                                             2 -> 3
# NM's renewal is a new locate with the same wait: PB_LOC_RB NM 2 -> 3. (IL names its own window; CA renews by day 28.)
# NOTE: tests/r1706/staterules/tests/t130_staterules.js pins CA canDig (Fri->Tue, Wed->Tue Dec 1, Sat->Wed): those 3
# lines need the new dates (Fri Nov 20 -> Wed Nov 25; Wed Nov 25 -> Wed Dec 2; Sat Nov 21 -> Thu Nov 26 is Thanksgiving,
# so Wed Dec 2). tests/t_811_audit.js prints them.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
from _sr import SR, write_changes
p = P(); CH = []; sr = SR(p, CH)
CA = {'what': 'Gov. Code 4216(l): legal start = two working days, not including the date of notification', 'url': 'https://codes.findlaw.com/ca/government-code/gov-sect-4216/'}
sr.notice_n('CA', 2, 3, 'Call at least 2 working days before digging, not counting the call day: a Monday call can be dug Thursday at 7 AM. Working days are Mon-Fri, 7 AM to 5 PM, not holidays.', [CA])
sr.notice_n('NV', 2, 3, 'Call at least 2 working days (7 AM to 5 PM, not holidays, not counting the call day) and not more than 28 calendar days before digging: a Monday call can be dug Thursday.', [])
sr.notice_n('NY', 2, 3, 'Call at least 2 and not more than 10 working days before the start date, not counting the call day: a Monday call can be dug Thursday.', [])
sr.notice_n('OH', 2, 3, 'Call at least 2 working days (not counting the call day) and not more than 16 calendar days before digging: a Monday call can be dug Thursday.', [])
sr.notice_n('IL', 2, 3, 'Give notice not less than 2 days and not more than 10 days before digging. The law’s “day” skips the notice day: a Monday notice can be dug Thursday.', [])
sr.notice_n('NM', 2, 3, 'Give notice 2 working days ahead, not counting the notice day: a Monday notice can be dug Thursday. Operators have 2 full working days to mark.', [])
sr.rb('NM', 2, 3)
p.save()
write_changes(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'results', 'p3_changes.md'), CH)
print('p3 ok:', len(CH), 'changes')
