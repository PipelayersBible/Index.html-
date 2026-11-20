#!/usr/bin/env python3
"""officeview 01: the office's TODAY table across crews (company accounts, 1024 px and wider). python3 p01_today_table.py in.html out.html"""
import sys, os
H = os.path.dirname(os.path.abspath(__file__))
s = open(sys.argv[1], encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:80])
    s = s.replace(a, b)
js = open(os.path.join(H, 'ov_today.js'), encoding='utf-8').read()
css = open(os.path.join(H, 'ov.css'), encoding='utf-8').read()
# 1. the place on the Company Home, right under the tiles
A = '<div id="homeCxPulse" class="pbx-pulse" role="group" aria-label="Needs your attention"></div>'
rep(A, A + '\n      <section id="homeCxToday" class="ov-today" aria-labelledby="ovHead" hidden></section><!-- officeview 01: Today across crews (a computer only) -->')
# 2. the code, inside the app's closure, before the company lists
A = '  // ---- the filtered lists: Live now, Material alerts, Waiting on foremen ----'
rep(A, js + A)
# 3. the styles
A = '<style id="cpTopStyle">'
rep(A, css + A)
open(sys.argv[2], 'w', encoding='utf-8').write(s)
