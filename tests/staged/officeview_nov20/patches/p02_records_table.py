#!/usr/bin/env python3
"""officeview 02: Records as a full-width, sortable table for the office on a computer. Needs p01 (its styles and helpers). python3 p02_records_table.py in.html out.html"""
import sys, os
H = os.path.dirname(os.path.abspath(__file__))
s = open(sys.argv[1], encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:80])
    s = s.replace(a, b)
js = open(os.path.join(H, 'ov_records.js'), encoding='utf-8').read()
# 1. Records (and the older All reports page) take the wide page for company accounts
rep("wide = on && ['home', 'prodJob', 'prodDashboard', 'cxList', 'reportsInbox'].includes(pbCurrentScreen);",
    "wide = on && ['home', 'prodJob', 'prodDashboard', 'cxList', 'reportsInbox', 'archive', 'reportsAll'].includes(pbCurrentScreen); /* officeview 02 */")
# 2. the table, after the Today code (same closure)
A = '  // ================= end officeview 01 =================\n'
rep(A, A + js)
open(sys.argv[2], 'w', encoding='utf-8').write(s)
