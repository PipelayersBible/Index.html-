# dups.py: near-duplicate scan over the live library (word 4-gram shingles, Jaccard and containment). Writes work/dups.tsv.
import json, re, sys, itertools
from collections import defaultdict
rows = [json.loads(l) for l in open(sys.argv[1] if len(sys.argv) > 1 else 'live_rows.jsonl')]
def sh(t):
    w = re.findall(r"[a-z0-9.]+", t.lower()); return {' '.join(w[i:i+4]) for i in range(len(w)-3)}
S = [(r['o'], r['c']['id'], r['lib'], sh(r['c']['text'])) for r in rows]
inv = defaultdict(list)
for k, (_, _, _, s) in enumerate(S):
    for g in s: inv[g].append(k)
cnt = defaultdict(int)
for g, ks in inv.items():
    if len(ks) > 40: continue
    for a, b in itertools.combinations(ks, 2): cnt[(a, b)] += 1
out = []
for (a, b), n in cnt.items():
    sa, sb = S[a][3], S[b][3]
    j = n / len(sa | sb); cont = n / min(len(sa), len(sb))
    if j >= .3 or cont >= .5: out.append((round(j, 2), round(cont, 2), S[a][1], S[b][1], S[a][2], S[b][2]))
out.sort(reverse=True)
with open('dups.tsv', 'w') as f:
    for o in out: f.write('\t'.join(map(str, o)) + '\n')
print(len(out))
