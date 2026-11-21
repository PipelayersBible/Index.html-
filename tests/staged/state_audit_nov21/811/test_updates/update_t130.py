# Updates tests/r1706/staterules/tests/t130_staterules.js for the 811 audit patches that were applied.
# Usage: python3 update_t130.py <t130 in> <t130 out> p1 [p2] [p3]   (p4, p5 need no change: t130 passes on them)
# The pinned dates move because the first legal dig day moved (see ../patches/*.py headers).
import sys
src, dst, sets = sys.argv[1], sys.argv[2], set(sys.argv[3:])
s = open(src, encoding='utf-8').read()
def rep(a, b):
    global s; assert s.count(a) == 1, a; s = s.replace(a, b)
if 'p1' in sets:  # Iowa: the 48 hours start 6 AM the next business day (Iowa Code 480.1(6))
    rep("['expires',['2026-11-20','IA'],'2026-12-18','IA: 25 days counting the first legal dig day (Tue Nov 24) as day 1'],",
        "['expires',['2026-11-20','IA'],'2026-12-19','IA: 25 days counting the first legal dig day (Wed Nov 25: the 48 hours start Mon 6 AM) as day 1'],")
if 'p2' in sets:  # Colorado: 2 business days not counting the call day -> due Wed Nov 25
    rep("['expires',['2026-11-20','CO'],'2026-12-24','CO: 30 calendar days after the due date (Tue Nov 24)'],",
        "['expires',['2026-11-20','CO'],'2026-12-25','CO: 30 calendar days after the due date (Wed Nov 25: the call day does not count)'],")
if 'p3' in sets:  # California and New Mexico: the call day does not count
    rep("['canDig',['2026-11-20','CA'],'2026-11-24','CA: Fri call, 2 working days -> Tue'],",
        "['canDig',['2026-11-20','CA'],'2026-11-25','CA: Fri call, Mon + Tue are the 2 working days -> Wed'],")
    rep("['canDig',['2026-11-25','CA'],'2026-12-01','CA: Wed before Thanksgiving (Thu, Fri off) -> Tue Dec 1'],",
        "['canDig',['2026-11-25','CA'],'2026-12-02','CA: Wed before Thanksgiving (Thu, Fri off) -> Wed Dec 2'],")
    rep("['canDig',['2026-11-21','CA'],'2026-11-25','CA: Saturday call counts from Monday -> Wed'],",
        "['canDig',['2026-11-21','CA'],'2026-11-30','CA: Saturday call counts from Monday; Tue, Wed, then Thanksgiving + Friday off -> Mon Nov 30'],")
    rep("['expires',['2026-07-02','NM'],'2026-07-28','NM: wait ends Tue Jul 7 (Jul 3 off), then 15 working days'],",
        "['expires',['2026-07-02','NM'],'2026-07-29','NM: wait ends Wed Jul 8 (Jul 3 off, the call day not counted), then 15 working days'],")
open(dst, 'w', encoding='utf-8').write(s); print('t130 updated for', sorted(sets))
