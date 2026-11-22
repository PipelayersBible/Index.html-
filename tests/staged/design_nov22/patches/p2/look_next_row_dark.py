# PHASE 2, H-7: in dark mode the Next row's gold outline was faint (55% gold line on near-black, hard to find in sun
# glare on a dim screen). Dark mode only: the Next row gets a full-strength amber top and bottom line. Light mode unchanged.
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
p = P()
p.rep("""</style>
<!-- PB2:tabbar -->""", """/* H-7: dark mode: the Next row's outline at full strength */
html:not(.pb-light) #pbApp#pbApp#pbApp #screen-results #resultsBody tr.pb-laid-next:not([data-laid-strip]):not(.pb-laid-armed) > td { border-top: 2px solid var(--pb-brand); border-bottom: 2px solid var(--pb-brand); }
</style>
<!-- PB2:tabbar -->""")
p.save()
