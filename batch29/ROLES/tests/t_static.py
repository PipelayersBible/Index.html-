#!/usr/bin/env python3
"""Batch 29 ROLES static checks: the patch applies once (a second apply is refused), the base lines it changes are
only production / crew lines (none of grade, cut/fill, elevations, permits or the calculators), and src/roles.js
writes no run record field other than through the existing functions (it writes no runArchive / saveRunArchive)."""
import difflib, importlib.util, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
spec = importlib.util.spec_from_file_location('roles', os.path.join(ROOT, 'patch.py')); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
base = open(os.path.join(ROOT, 'work', 'base.html'), encoding='utf-8').read()
ok = True
def check(label, cond, detail=''):
    global ok
    print(('OK   - ' if cond else '*** FAIL *** - ') + label + ('' if cond or not detail else ' :: ' + str(detail)[:400]))
    ok = ok and cond
out = m.apply(base)
try:
    m.apply(out); check('a second apply is refused', False)
except AssertionError:
    check('a second apply is refused', True)
a, b = base.split('\n'), out.split('\n')
removed = [l for l in difflib.ndiff(a, b) if l.startswith('- ')]
check('at most 16 base lines change (the rest is inserted)', len(removed) <= 16, len(removed))
bad = [l for l in removed if re.search(r'cut.?fill|cutFill|grade|elev|invert|confined|permit|pbCalc|slope', l, re.I)]
check('no grade, cut/fill, elevation, permit or calculator line changes', not bad, bad)
js = open(os.path.join(ROOT, 'src', 'roles.js'), encoding='utf-8').read()
check('roles.js writes no run record (no saveRunArchive, no runArchive write, no .foreman = / .crewLog =)', not re.search(r'saveRunArchive|runArchive\s*(=|\.push|\.splice)|\.foreman\s*=|\.crewLog\s*=', js))
check('roles.js decides only from answers this phone holds (no rpc of its own)', 'pbPermitRpc' not in js and 'sbClient' not in js)
sys.exit(0 if ok else 1)
