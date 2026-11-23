# build stamp r17.16. python3 9_stamp.py in.html out.html
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("const PB_APP_BUILD = 'r17.15 · 2026-11-22';", "const PB_APP_BUILD = 'r17.16 · 2026-11-23';")
p.save()
