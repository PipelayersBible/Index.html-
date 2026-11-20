# build_kb.py: the next-only library as rows (ord, lib, chunk) from the live copy + out/edits.jsonl + out/core.jsonl.
#   python3 build_kb.py -> out/kb_next.json ({app, field, osha} in ord order, for the free check), out/rows_changed.jsonl (rows that differ from live: for the loader)
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); S = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(S, 'library_arch_nov20')); import lib_kb
L = lambda f: [json.loads(l) for l in open(f) if l.strip()]
live = json.load(open(os.path.join(S, 'ask_state_nov20/work/kb_live2.json')))
rows = {}
for lib, v in live.items():
    for c in v: rows[int(c['_ord'])] = [lib, {k: x for k, x in c.items() if k != '_ord'}]
assert sorted(rows) == list(range(len(rows)))
by_id = {r[1]['id']: o for o, r in rows.items()}; changed = {}
for c in L(os.path.join(HERE, 'out/edits.jsonl')):
    o = by_id[c['id']]; rows[o][1] = c; changed[o] = 1
n = len(rows)
for c in L(os.path.join(HERE, 'out/core.jsonl')):
    lib = lib_kb.lib_of(c)
    if c.get('supersedes'):
        o = by_id.pop(c['supersedes']); assert c['id'] not in by_id; rows[o] = [lib, c]; by_id[c['id']] = o; changed[o] = 1
    else:
        assert c['id'] not in by_id; rows[n] = [lib, c]; by_id[c['id']] = n; changed[n] = 1; n += 1
assert sorted(rows) == list(range(n)) and len(by_id) == n
out = {'app': [], 'field': [], 'osha': []}
for o in range(n): out[rows[o][0]].append(dict(rows[o][1], _ord=o))
json.dump(out, open(os.path.join(HERE, 'out/kb_next.json'), 'w'))
with open(os.path.join(HERE, 'out/rows_changed.jsonl'), 'w') as f:
    for o in sorted(changed): f.write(json.dumps({'ord': o, 'lib': rows[o][0], 'chunk': rows[o][1]}, ensure_ascii=False) + '\n')
print(f'{n} rows ({ {k: len(v) for k, v in out.items()} }), {len(changed)} differ from live ({n - len(live["app"]) - len(live["field"]) - len(live["osha"])} new)')
