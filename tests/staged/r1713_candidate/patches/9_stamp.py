# r17.13 build stamp. python3 9_stamp.py in.html out.html
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("const PB_APP_BUILD = 'r17.12 · 2026-11-20';", "const PB_APP_BUILD = 'r17.13 · 2026-11-20';")
p.save()
