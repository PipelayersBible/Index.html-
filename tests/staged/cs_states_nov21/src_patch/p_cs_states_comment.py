# p_cs_states_comment.py (cs_states_nov21): OPTIONAL, comment only (no user-visible change). python3 p.py in.html out.html
# The permit rule line already reads "Permit items: federal OSHA 29 CFR 1926.1206." for IN, KY, SC, IA, VT, WY and MD, which is right.
import sys
s = open(sys.argv[1], encoding='utf-8').read()
def rep(a, b):
    global s; n = s.count(a); assert n == 1, (n, a[:60]); s = s.replace(a, b)
rep("(8 CCR 1952(a)(1) survey, 1960(a) rescue standby) as a form note. Maryland: no supplement (MOSH list).",
    "(8 CCR 1952(a)(1) survey, 1960(a) rescue standby) as a form note. Maryland: the supplement MOSH lists links to the federal\n"
    "  // Subpart AA text (no Maryland change). cs_states_nov21: IN, KY, SC, IA, VT, WY adopted Subpart AA unchanged (checked 2026-11-21).")
open(sys.argv[2], 'w', encoding='utf-8').write(s)
