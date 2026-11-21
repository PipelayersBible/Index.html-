# state_audit_nov21/811 patch 2 (STRICT READING, decision 1): "2 full business days" means the call day (a part day)
# does not count, so a Monday call can be dug Thursday. python3 p2_wait_full_days.py in.html out.html
# Applies alone on r17.13 or stacked with p1, p3..p5 in any order.
# Basis: Indiana's statute spells the same words out (Ind. Code 8-1-26-16: work may start at 7 a.m. on the next working
# day AFTER the two full working days); MN, IA, SD, VA, GA, LA (same structure) all give Thursday for a Monday call.
# No center page with a worked example was found for these states (search budget), so they are on the call list.
#  CO C.R.S. 9-1.5-103 "2 business days (not counting the day of actual notice)"; Colorado 811's page says "Allow 3 full
#     business days ... not counting the day of the request" (stricter: on the call list).                    2 -> 3
#  FL 556.105 "not less than 2 full business days"   KS 66-1804 "two full working days"   KY 367.4911 "two (2) full
#  working days"   AR 14-271-112 "two (2) ... full working days"   NE 76-2321 "two full business days"
#  OR OAR 952-001 "2 full business days"   WA RCW 19.122.030 "two full business days"   WY 37-12-302 "two (2) full
#  business days"   CT RCSA 16-345-4 "two full days"                                                         2 -> 3
#  NC G.S. 87-122 "three full working days": Mon call -> Tue, Wed, Thu -> dig Fri                             3 -> 4
#  UT the row's own source (Blue Stakes): the 48 hours start 8 AM the next business day -> Thu 8 AM             2 -> 3
# A new notice waits like the first call: PB_LOC_RB CT, OR, WA, AR 2 -> 3, NC 3 -> 4 (KY, CO, UT name their own day).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
from _sr import SR, write_changes
p = P(); CH = []; sr = SR(p, CH)
M = ' a Monday call can be dug Thursday'
sr.notice_n('CO', 2, 3, 'Call at least 2 business days before digging, not counting the call day:' + M + '. Colorado 811 asks you to allow 3 full business days.', [])
sr.notice_n('FL', 2, 3, 'Call at least 2 full business days before digging (10 for underwater work):' + M + '.', [])
sr.notice_n('KS', 2, 3, 'Call at least 2 full working days and not more than 20 calendar days before the start date:' + M + '.', [])
sr.notice_n('KY', 2, 3, 'Call at least 2 and not more than 10 full working days before digging:' + M + '.', [])
sr.notice_n('AR', 2, 3, 'Call at least 2 and not more than 10 full working days before digging:' + M + '.', [])
sr.notice_n('NE', 2, 3, 'Call at least 2 full business days and not more than 10 business days before digging:' + M + '.', [])
sr.notice_n('OR', 2, 3, 'Call at least 2 full business days and not more than 10 business days before digging:' + M + '. After 5 PM counts as the next business day.', [])
sr.notice_n('WA', 2, 3, 'Call at least 2 full business days and not more than 10 full business days before digging:' + M + '. From Jan 1, 2026, wait for a positive response from every operator.', [])
sr.notice_n('WY', 2, 3, 'Call at least 2 full business days and not more than 14 business days before digging:' + M + '.', [])
sr.notice_n('CT', 2, 3, 'Call at least 2 full days (not weekends or holidays) and not more than 30 days before digging:' + M + '.', [])
sr.notice_n('NC', 3, 4, 'Call at least 3 full working days before the start date: a Monday call can be dug Friday.', [])
sr.notice_n('UT', 2, 3, 'Give notice at least 48 hours (business days) and not more than 14 days before digging. The clock starts 8 AM the next business day: a Monday notice can be dug Thursday at 8 AM.', [])
for c, o, n in (('CT', 2, 3), ('OR', 2, 3), ('WA', 2, 3), ('AR', 2, 3), ('NC', 3, 4)): sr.rb(c, o, n)
p.save()
write_changes(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'results', 'p2_changes.md'), CH)
print('p2 ok:', len(CH), 'changes')
