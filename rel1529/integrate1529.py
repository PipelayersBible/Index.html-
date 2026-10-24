# r15.29: live index.html + feat_xtab.
import importlib.util, sys
def load(n, p):
    spec = importlib.util.spec_from_file_location('p_' + n, p); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
PF = load('xtab', '/home/claude/feat_xtab/patch.py')
steps = [('xtab', PF.apply)]
s = open('/home/claude/rel1529/live.html', encoding='utf-8').read()
for n, f in steps:
    try: s2 = f(s); assert s2 != s; s = s2; print('OK', n, len(s))
    except BaseException as e: print('FAIL', n, repr(e)[:300]); sys.exit(1)
a = "PB_APP_BUILD = 'r15.28 · 2026-10-23'"; assert s.count(a) == 1
s = s.replace(a, "PB_APP_BUILD = 'r15.29 · 2026-10-23'")
open(sys.argv[1] if len(sys.argv) > 1 else 'm1529.html', 'w', encoding='utf-8').write(s)
