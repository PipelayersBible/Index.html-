# trial.py <label> <saved result file | inline json file>: quick read of a small trial against the pool's cases (facts, words, lead, offer). No history update.
import json, os, re, sys, statistics
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
raw = open(sys.argv[2]).read()
try: raw = json.loads(raw)['result']
except Exception: pass
res = {}
for m in re.finditer(r'<untrusted-data-[0-9a-f-]+>\s*(\[.*?\])\s*</untrusted-data', raw, re.S):
    for row in json.loads(m.group(1)):
        for r in (row.get('results') or []): res[r['id']] = r
by = {}
for l in open(os.path.join(H, 'out/cases.jsonl')): c = json.loads(l); by[c['id']] = c
for c in json.load(open(os.path.join(H, 'canaries.json'))): by[c['id']] = dict(c, kind='old', lead=[])
r1 = {g['id']: g for g in json.load(open(os.path.join(H, 'work/round1/graded.json')))}
rx = lambda p: re.compile(p.replace(r'\m', r'\b').replace(r'\M', r'\b'), re.I)
LIM = {'simple': 70, 'rule': 100, 'complex': 110, 'steps': 170}
rows = []
for i, r in res.items():
    c = by[i]; t = r.get('text') or ''; w = len(t.split())
    miss = [p for p in c.get('must', []) if not rx(p).search(t)]; bad = [p for p in c.get('mustnot', []) if rx(p).search(t)]
    first = ' '.join(re.sub(r'^\s*TYPE:\s*\w+\s*', '', t).split()[:40]); bur = [p for p in c.get('lead', []) if not rx(p).search(first)]
    last = re.split(r'(?<=[.!?])\s+|\n', t.strip())[-1].strip(); of = bool(re.search(r'\?\s*$', last))
    lim = c.get('maxwords') or LIM.get(c.get('kind'), 120)
    rows.append(dict(id=i, w=w, w1=r1.get(i, {}).get('words'), facts=not miss, miss=miss, bad=bad, lead=not bur, offer=of, cx=bool(c.get('complex')), ok_len=w <= lim, usd=r.get('usd') or 0, text=t, q=c.get('q', '')))
W = [x['w'] for x in rows]
print(f"{sys.argv[1]}: n {len(rows)}  words mean {statistics.mean(W):.0f} median {statistics.median(W)} max {max(W)}  (round 1 on the same: mean {statistics.mean([x['w1'] for x in rows if x['w1']]):.0f})  facts {sum(x['facts'] for x in rows)}  lead-first {sum(x['lead'] for x in rows)}  within limit {sum(x['ok_len'] for x in rows)}  offers on complex {sum(1 for x in rows if x['cx'] and x['offer'])}/{sum(1 for x in rows if x['cx'])}  question-endings on others {sum(1 for x in rows if not x['cx'] and x['offer'])}  forbidden {sum(1 for x in rows if x['bad'])}  usd {sum(x['usd'] for x in rows):.2f}")
json.dump(rows, open(os.path.join(H, 'work', 'trial_' + sys.argv[1] + '.json'), 'w'), indent=0)
for x in rows:
    if not x['facts'] or x['bad']: print('  MISS', x['id'], x['miss'], x['bad'], '|', x['text'][:260].replace('\n', ' '))
