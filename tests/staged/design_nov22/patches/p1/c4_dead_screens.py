# C-4: (1) the 4 old calculator category screens (calcCatGrade, calcCatTrench "Safety", calcCatPipe, calcCatStructures)
# are removed: nothing opens them (the Calculators tab has one searchable list since UX batch 2; no pbGoto, link,
# shortcut, search entry or test opens them; only CSS and two name maps mention them, left as they are, harmless).
# (2) Confined Space (reached from the permit form's Back, Ventilation's Back and More's search) showed blank grey
# squares where its tile icons should be (it used a --b4-tile-img that is never set): each tile gets its icon
# (permit: helmet, ventilation: air, resume: helmet, kept permit: phone) in the same style as Home's rows.
# pdfView is not dead (it is the in-app PDF viewer; opened with nothing to show it goes back, by design).
import sys, os, re; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
p = P()
a = p.s.index('  <!-- CALCULATOR CATEGORY: GRADE & ELEVATION -->\n  <div class="pb-screen" id="screen-calcCatGrade">')
b = p.s.index('  <!-- BEND CALCULATOR -->\n  <div class="pb-screen pb-b6-calc" id="screen-bendCalc">')
assert 0 < a < b and b - a < 12000, (a, b)
block = p.s[a:b]
assert block.count('class="pb-screen"') == 4 and block.count('id="screen-calcCat') == 4, 'unexpected block'
assert p.s.count('<!-- CALCULATOR CATEGORY: GRADE & ELEVATION -->') == 1
p.s = p.s[:a] + '  <!-- design C-4: the 4 calculator category screens (calcCat*) were removed: nothing opened them -->\n' + p.s[b:]
p.rep("""#pbApp#pbApp #screen-confinedHub .pb-home-tile::before { content: ""; width: 44px; height: 44px; border-radius: 12px; background: var(--pb-raised) var(--b4-tile-img, none) center / 24px 24px no-repeat; }""",
"""#pbApp#pbApp #screen-confinedHub .pb-home-tile::before { content: ""; width: 44px; height: 44px; border-radius: 12px; background: var(--pb-raised) var(--b4-tile-img, none) center / 24px 24px no-repeat; }
/* design C-4: the hub's tile icons (were blank squares) */
#pbApp#pbApp #screen-confinedHub .cp-hub-list > .pb-home-tile::before { background: var(--pb-text-2); border-radius: 0; -webkit-mask: var(--pb-hub-ic, var(--pb-icon-helmet)) center / 26px 26px no-repeat; mask: var(--pb-hub-ic, var(--pb-icon-helmet)) center / 26px 26px no-repeat; }
#pbApp #screen-confinedHub .cp-hub-list > .pb-home-tile[onclick*="Vent"], #pbApp #screen-confinedHub .cp-hub-list > .pb-home-tile[onclick*="vent"] { --pb-hub-ic: var(--pb-icon-air); }
#pbApp #screen-confinedHub .cp-hub-list > #confinedSharedTile2 { --pb-hub-ic: var(--pb-icon-device); }""")
p.save()
