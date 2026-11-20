# 01 Home (foreman, pipelayer): "Start work" (New Run, Quick Run, Log Work Without a Run, Confined Space Permit, New)
# comes before the "Yours" rows (My production, My inspections & tests, Crew runs today). Nothing is removed or renamed:
# the three rows move, whole, to just under the Start work list. Usage: python3 01_home_start_first.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
A = '    <div id="homeMine" role="group" aria-label="Yours" hidden>'
B = '    <p class="pb-home-sec pb-sec-start" id="homeStartHead">Start work</p>'
C = '    </div>\n    <!-- PB2:shortcuts -->'
for x in (A, B, C): assert p.s.count(x) == 1, x
a, b = p.s.index(A), p.s.index(B); assert a < b
block = p.s[a:b]
assert block.count('<div class="pb-home-tile"') == 3 and block.rstrip().endswith('</div>'), 'homeMine block changed'
p.s = p.s[:a] + p.s[b:]
p.rep(C, '    </div>\n' + block + '    <!-- PB2:shortcuts -->')
p.save()
