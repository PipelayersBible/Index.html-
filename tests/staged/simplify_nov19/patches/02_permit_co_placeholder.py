# 02 Entry Permit, Maximum CO: the gray hint in the empty box said 35, but a blank box uses 25 ppm (the label and the
# locked permit both say 25). The hint now says 25. No limit or rule changes. Usage: python3 02_... in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep('id="cpMaxCO" placeholder="35"', 'id="cpMaxCO" placeholder="25"')
p.save()
