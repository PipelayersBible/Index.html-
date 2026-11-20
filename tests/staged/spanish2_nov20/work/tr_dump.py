#!/usr/bin/env python3
"""tr_dump.py <batch> <harvest.json> <screen> [screen...]   -> prints numbered English keys with no Spanish yet; saves keys_<batch>.json"""
import json, sys, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
batch, hv = sys.argv[1], json.load(open(sys.argv[2]))
d = json.load(open(os.path.join(HERE, '..', 'dict.json')))
have = set(d['t'].keys()); pats = [re.compile(p[0]) for p in d['p']]
done = set()
for f in os.listdir(HERE):
    if f.startswith('keys_') and f != 'keys_%s.json' % batch:
        for k in json.load(open(os.path.join(HERE, f))): done.add(k[2])
keys = []; seen = set()
for sc in sys.argv[3:]:
    for kind, k in hv.get(sc, {}).get('miss', []):
        if kind == 'part' or k in have or k in seen or k in done: continue
        if any(p.match(k) for p in pats): continue
        if not re.search(r'[A-Za-z]{2,}', k): continue
        seen.add(k); keys.append([sc, kind, k])
json.dump(keys, open(os.path.join(HERE, 'keys_%s.json' % batch), 'w'), ensure_ascii=False)
last = None
for i, (sc, kind, k) in enumerate(keys):
    if sc != last: print('## ' + sc); last = sc
    print('%d%s\t%s' % (i, 'M' if kind == 'mixed' else ('a' if kind.startswith('attr') else ''), k))
