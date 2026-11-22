# OPTIONAL (not in the default B build; build with EXTRA=1): design phase 2 left one made choice in solid yellow:
# Run Setup's "Enter as: Station | Distance" toggle (.pb-st-tog has role=group but its buttons carry no .active class,
# so look_css.py's made-choice rule misses it). This gives it the same dark-ink "choice made" fill as the other toggles.
# Display only. Applies after design_nov22/patches/p2/look_css.py.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""/* A-1: decorative yellow off: step numbers, Home quick-action icons */""",
"""#pbApp#pbApp#pbApp #screen-input .pb-st-tog button[aria-pressed="true"] { background: var(--pb-sel-bg); color: var(--pb-sel-ink); box-shadow: none; font-weight: 700; } /* r1716 p2x: Station/Distance is a made choice */
/* A-1: decorative yellow off: step numbers, Home quick-action icons */""")
p.save()
