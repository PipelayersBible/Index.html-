#!/usr/bin/env python3
# Builds the rolled-back live test: t01.plpgsql with ../01_beta_summary.sql inlined at --@SQL.
# live_t01.sql: GRANT/REVOKE lines dropped (the SQL client cancels blocks containing them; the grants are checked
# separately with has_function_privilege after a real apply), ends with RAISE EXCEPTION 'RESULT: %' so nothing persists.
import os, re
H = os.path.dirname(os.path.abspath(__file__)); S = os.path.dirname(H)
fn = open(f'{S}/01_beta_summary.sql').read()
fn_live = '\n'.join(l for l in fn.split('\n') if not re.match(r'^(revoke|grant) ', l) and not l.startswith('--'))
t = open(f'{H}/t01.plpgsql').read()
assert t.count('  --@SQL') == 1 and '$T$' not in fn
body = t.replace(t[t.index('  --@SQL'):t.index('\n', t.index('  --@SQL')) + 1], '  -- ===== 01_beta_summary.sql (rolled back with the block) =====\n' + fn_live + '\n')
open(f'{H}/live_t01.sql', 'w').write('do $T$\n' + body + "  raise exception 'RESULT: %', res;\nend $T$;\n")
print('built live_t01.sql', len(body))
