#!/usr/bin/env python3
# Builds the test blocks from t01.plpgsql.
#   local_t01.sql  the test alone (the migration was applied as a plain file before it); ends with RAISE NOTICE 'RESULT: ...'
#   block_t01.sql  the migration inlined in the block, local-only checks kept (local proof that the block shape works)
#   live_t01.sql   the migration inlined, local-only checks and GRANT/REVOKE lines removed; ends with RAISE EXCEPTION 'RESULT: ...'
#                  so the WHOLE block rolls back. For the lead to run on live; never run by the helper.
import os, re
H = os.path.dirname(os.path.abspath(__file__)); S = os.path.dirname(H)
t = open(f'{H}/t01.plpgsql').read(); mig = open(f'{S}/01_pricing_limits.sql').read()
assert '$T$' not in mig and '$T$' not in t
decl, body = t.split('\nbegin\n', 1)
inl = mig.replace('\nselect pg_temp.pb_patch(', '\nperform pg_temp.pb_patch(')
def no_grants(x):
    out, skip = [], False
    for l in x.split('\n'):
        if re.match(r'^(revoke|grant) ', l): skip = True
        if skip:
            if l.rstrip().endswith(';'): skip = False
            continue
        out.append(l)
    return '\n'.join(out)
local_only = lambda x: re.sub(r'--@local-only-begin.*?--@local-only-end\n', '', x, flags=re.S)
open(f'{H}/local_t01.sql', 'w').write('do $T$\n' + t + "  raise notice 'RESULT: %', res;\nend $T$;\n")
open(f'{H}/block_t01.sql', 'w').write('do $T$\n' + decl + '\nbegin\n' + inl + '\n' + body + "  raise exception 'RESULT: %', res;\nend $T$;\n")
open(f'{H}/live_t01.sql', 'w').write('do $T$\n' + decl + '\nbegin\n' + no_grants(inl) + '\n' + local_only(body) + "  raise exception 'RESULT: %', res;\nend $T$;\n")
print('built')
