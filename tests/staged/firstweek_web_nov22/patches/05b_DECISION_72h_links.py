# firstweek_web_nov22 patch 05b — DECISION, NOT in the default stack. Apply only if Tommy picks 72-hour join links,
# and only together with sql/DECISION_72h_links.sql (the server makes the links; the app only says how long they last).
# Stacks on 05. Usage: python3 05b_DECISION_72h_links.py in.html out.html
import sys, json
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:120]); s = s.replace(old, new)
rep("  const PB_OB_LINK_HOURS = 24;", "  const PB_OB_LINK_HOURS = 72;")
open(dst, 'w', encoding='utf-8').write(s)
print('05b_DECISION_72h_links: ok')
