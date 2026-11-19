import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# Decision #63 (Nov 18): the Trench Sloping calculator at exactly 20 ft requires an engineer instead of giving a slope.
# OSHA's Table B-1 (29 CFR 1926 Subpart P App. B) covers excavations "less than 20 feet deep", so 20.0 ft is outside the
# table. The calculator gave Table B-1's slope at 20.0 ft with an "At the Limit" note; it now gives no slope there, the
# same as over 20 ft. Below 20 ft nothing changes (19.9 ft still gets the table's slope).
rep("""    if (depth > 20) {
      resultEl.innerHTML = `<div class="pb-answer-box"><div class="pb-answer-label">Outside Tabulated Data</div><div class="pb-answer-val pb-answer-warn">Over 20 ft</div><div class="pb-answer-sub">No slope is given for this depth.</div></div>${pbTrench20Warn(depth)}`;""",
    """    if (depth >= 20) { // #63: Table B-1 is for excavations less than 20 ft deep: no slope at 20 ft either
      resultEl.innerHTML = `<div class="pb-answer-box"><div class="pb-answer-label">Engineer Required</div><div class="pb-answer-val pb-answer-warn">${depth === 20 ? '20 ft' : 'Over 20 ft'}</div><div class="pb-answer-sub">No slope is given at 20 ft or deeper. A registered professional engineer designs the sloping or benching.</div></div>${pbTrench20Warn(depth)}`;""")
rep("""    return depth === 20
      ? '<div class="pb-answer-box pb-trench-20warn"><div class="pb-answer-label">At the Limit of Table B-1</div><div class="pb-answer-sub">This depth is at the limit of the table. ' + q + '</div></div>'""",
    """    return depth === 20 // #63: 20 ft is not "less than 20 feet": outside the table, like deeper
      ? '<div class="pb-answer-box pb-trench-20warn"><div class="pb-answer-label">20 Feet Is Outside Table B-1</div><div class="pb-answer-sub">' + q + ' At exactly 20 ft the table does not apply, so have a registered professional engineer design it.</div></div>'""")
rep("""  // Table B-1 covers excavations "less than 20 feet deep": at 20 ft and deeper every result carries
  // OSHA's two sentences (owner decision). It is added after the answer; the slope itself never changes.""",
    """  // Table B-1 covers excavations "less than 20 feet deep": at 20 ft and deeper every result carries
  // OSHA's two sentences (owner decision). #63: at 20 ft and deeper no slope is given (engineer required).""")
# Education (Trench Safety) and the calculator's Details say the same
rep("""<span class="k">Greater than 20 feet</span><br>""", """<span class="k">20 feet or more</span><br>""")
rep("""This app's slope calculator gives no slope for depths greater than 20 feet for exactly this reason.</div>""",
    """Table B-1 covers excavations &ldquo;less than 20 feet deep&rdquo;, so this app's slope calculator gives no slope at 20 feet or deeper: a registered professional engineer designs it.</div>""")
rep("""(App. B, Table B-1 note 3); any non-standard condition also needs a P.E.'s design.</span></details>""",
    """(App. B, Table B-1 note 3); any non-standard condition also needs a P.E.'s design. At 20 ft or deeper this calculator gives no slope.</span></details>""")
open(out, "w", encoding="utf-8").write(s)
