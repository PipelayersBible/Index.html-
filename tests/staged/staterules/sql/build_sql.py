#!/usr/bin/env python3
# Writes sql/01_state_rules.sql from data/state_rules.json (the same table the app carries). Re-run after the yearly check.
import json, os
here = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(here, '..', 'data', 'state_rules.json'), encoding='utf-8'))
rows = []
for r in d['states']:
    j = json.dumps(r, ensure_ascii=False, separators=(',', ':'))
    assert '$sr$' not in j
    rows.append("  ('%s', $sr$%s$sr$, $sr$%s$sr$::jsonb, date '%s', date '%s')" % (r['code'], r['name'], j, r['checked'], d['recheck_by']))
head = open(os.path.join(here, '01_state_rules.head.sql'), encoding='utf-8').read()
tail = open(os.path.join(here, '01_state_rules.tail.sql'), encoding='utf-8').read()
seed = ("insert into pb_prod.state_rules (code, name, rules, checked, recheck_by) values\n" + ",\n".join(rows) +
        "\non conflict (code) do update set name = excluded.name, rules = excluded.rules, checked = excluded.checked, recheck_by = excluded.recheck_by, updated_at = now();\n")
open(os.path.join(here, '01_state_rules.sql'), 'w', encoding='utf-8').write(head + seed + tail)
print('wrote 01_state_rules.sql', len(rows), 'rows')
