#!/usr/bin/env python3
# Builds the rolled-back test blocks: head + (pre) + the SQL files inlined + the test body.
# local_*.sql end with RAISE NOTICE; live_*.sql end with RAISE EXCEPTION 'RESULT: %' so the whole block rolls back.
import os, sys
H = os.path.dirname(os.path.abspath(__file__)); S = os.path.dirname(H)
r = lambda p: open(p).read()
TESTS = {'t01': (['01_billing_accounts.sql'], None), 't02': (['01_billing_accounts.sql', '02_owner_handover.sql'], None),
         't03': (['01_billing_accounts.sql', '03_plan_reading_gate.sql'], 't03pre')}
for name, (files, pre) in TESTS.items():
    strip = lambda t: '\n'.join(l for l in t.split('\n') if l.strip() and not (l.startswith(' ') and l.lstrip().startswith('--'))) + '\n'  # test scaffolding only
    body = strip(r(f'{H}/head.plpgsql') + (r(f'{H}/{pre}.plpgsql') if pre else ''))
    body += '\n  -- ===== the SQL under test, inlined (rolled back with the block) =====\n'
    for f in files:
        txt = r(f'{S}/{f}'); assert '$T$' not in txt
        body += f'\n  -- ----- {f}\n' + txt + '\n'
    body += strip(r(f'{H}/{name}.plpgsql'))
    md5 = "  res := res || jsonb_build_object('defs', (select jsonb_object_agg(p.proname, md5(rtrim(pg_get_functiondef(p.oid), E'\\n'))) from pg_proc p join pg_namespace n2 on n2.oid = p.pronamespace where (n2.nspname, p.proname) in (('pb_billing','beta_closed_guard'),('public','pb_my_plan'),('public','pb_owner_company_set'),('public','pb_plans_uploaded'),('public','pb_plans_svc_take'),('public','pb_plans_svc_more'))));\n"
    import re
    def live_only(t):
        t = re.sub(r'--@local-only-begin.*?--@local-only-end\n', '', t, flags=re.S)
        out, skip = [], False
        for l in t.split('\n'):
            if re.match(r'^(revoke|grant) ', l): skip = True
            if skip:
                if l.rstrip().endswith(';'): skip = False
                continue
            if l.startswith('--'): continue   # top-level comments only; function bodies (indented) stay byte-identical
            out.append(l)
        return '\n'.join(out)
    for kind, end in (('local', "  raise notice 'RESULT: %', res;\n"), ('live', "  raise exception 'RESULT: %', res;\n")):
        out = 'do $T$\n' + body + md5 + end + 'end $T$;\n'
        if kind == 'live': out = live_only(out)
        open(f'{H}/{kind}_{name}.sql', 'w').write(out)
print('built', ', '.join(TESTS))
