# survey s4: the Slope / Grade Converter also shows feet per foot (how pipe plans write it: S = 0.0050) and the
# horizontal : vertical ratio (how grading and DOT plans write side slopes: 2:1 = 2 ft across for 1 ft up or down).
# Display only; the math is the same numbers it already works out. python3 s4_slope_ftft_hv.py in.html out.html
import sys
s = open(sys.argv[1], encoding='utf-8').read()
def rep(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

rep("""    const html = `<div class="pb-answer-box"><div class="pb-answer-label">Percent</div><div class="pb-answer-val">${pct.toFixed(2)}%</div></div>
      <div class="pb-answer-box"><div class="pb-answer-label">Ratio (vertical : horizontal)</div>""",
"""    const ftft = pct / 100; /* survey s4 */
    const html = `<div class="pb-answer-box"><div class="pb-answer-label">Percent</div><div class="pb-answer-val">${pct.toFixed(2)}%</div></div>
      <div class="pb-answer-box"><div class="pb-answer-label">Feet per foot</div><div class="pb-answer-val">${ftft < 0.001 ? ftft.toFixed(5) : ftft.toFixed(4)} ft/ft</div><div class="pb-answer-sub">How pipe plans often write it: S = ${ftft < 0.001 ? ftft.toFixed(5) : ftft.toFixed(4)}. That is ${(ftft * 100).toFixed(2)} ft per 100 ft.</div></div>
      <div class="pb-answer-box"><div class="pb-answer-label">Ratio (horizontal : vertical)</div><div class="pb-answer-val">${ratioX.toFixed(2)} : 1</div><div class="pb-answer-sub">How grading and road plans write side slopes: 2:1 means 2 ft across for 1 ft up or down.</div></div>
      <div class="pb-answer-box"><div class="pb-answer-label">Ratio (vertical : horizontal)</div>""")

rep("""<p class="pb-help" style="margin-top:0;">Rise : run, so 2% is 1 : 50. OSHA&rsquo;s trench tables write it run : rise.</p>""",
"""<p class="pb-help" style="margin-top:0;">Rise : run, so 2% is 1 : 50. OSHA&rsquo;s trench tables and most grading plans write it run : rise (horizontal : vertical), so a &ldquo;2:1&rdquo; slope is 2 across for 1 up: enter 2 here. Some plans write it with letters, like 2H:1V or 1V:2H: the H number is the across part.</p>""")

open(sys.argv[2], 'w', encoding='utf-8').write(s)
print('s4 ok')
