#!/bin/bash
# retr_all.sh (state audit Nov 21, ask_merge): free retrieval check, no model calls. Search code = the LIVE build d881cb695137
# (work/retrieval.mjs, work/state.mjs: esbuild of library_load_nov20/work/b7/src10live, same code as that folder's work/*.mjs).
# Before = live rows (work/live_rows.jsonl); after = the rows 11_load.sql produced on the local copy (work/after_rows.jsonl).
# Cases: all 688 library cases (library_load_nov20/out/cases.jsonl; 676 core) + the 24 new ones (cases.jsonl), and the 127 existing text cases (regress).
set -e
H=/home/claude/index.html-/tests/staged/state_audit_nov21/ask_merge; L=/home/claude/index.html-/tests/staged/library_load_nov20; cd $H/work
python3 - <<'EOF'
import json
for src, dst in (('live_rows.jsonl', 'kb_before.json'), ('after_rows.jsonl', 'kb_after.json')):
    kb = {'app': [], 'field': [], 'osha': []}
    for l in open(src):
        r = json.loads(l); c = dict(r['c']); c['_ord'] = r['o']; kb[r['lib']].append(c)
    json.dump(kb, open(dst, 'w')); print(dst, {k: len(v) for k, v in kb.items()})
# every case file, with the superseded id mapped to its replacement (dig-or-tickets-1 -> dig-or-tickets-2) so the after run can find it
alias = {'dig-or-tickets-1': 'dig-or-tickets-2'}
old = [json.loads(l) for l in open('/home/claude/index.html-/tests/staged/library_load_nov20/out/cases.jsonl')]
new = [json.loads(l) for l in open('../cases.jsonl')]
with open('cases_before.jsonl', 'w') as f:
    for c in old: f.write(json.dumps(c) + '\n')
with open('cases_after.jsonl', 'w') as f:
    for c in old + new: c = dict(c); c['chunks'] = [alias.get(x, x) for x in c.get('chunks', [])]; f.write(json.dumps(c) + '\n')
EOF
cp $L/tools/retr.mjs $L/tools/regress.mjs $H/tools/ 2>/dev/null || true
# the copied tools import ../work/retrieval.mjs and ../work/state.mjs relative to tools/: that is ask_merge/work (the live build's search)
sed -i 's#new URL("../../ask_state_nov20/tools/cases_all.json", import.meta.url)#"/home/claude/index.html-/tests/staged/ask_state_nov20/tools/cases_all.json"#' $H/tools/regress.mjs
node $H/tools/retr.mjs kb_before.json cases_before.jsonl retr_before.json
node $H/tools/retr.mjs kb_after.json cases_after.jsonl retr_after.json
node $H/tools/regress.mjs kb_before.json kb_after.json | tee regress.txt
python3 - <<'EOF'
import json
b, a = json.load(open('retr_before.json')), json.load(open('retr_after.json'))
new = [json.loads(l)['id'] for l in open('../cases.jsonl')]
worse = [k for k in b if (b[k]['ok'] and not a[k]['ok']) or (b[k]['facts'] and not a[k]['facts'])]
better = [k for k in b if (not b[k]['ok'] and a[k]['ok']) or (not b[k]['facts'] and a[k]['facts'])]
rank_down = [f"{k} {b[k]['rank']}->{a[k]['rank']}" for k in b if a[k]['ok'] and b[k]['ok'] and a[k]['rank'] > b[k]['rank']]
changed = [k for k in b if b[k]['ids'] != a[k]['ids']]
out = [f"existing library cases (core): {len(b)}; chunk found before {sum(v['ok'] for v in b.values())}, after {sum(a[k]['ok'] for k in b)}; facts before {sum(v['facts'] for v in b.values())}, after {sum(a[k]['facts'] for k in b)}",
       f"WORSE (lost chunk or facts): {len(worse)} {worse}", f"better: {len(better)} {better}",
       f"excerpt list changed: {len(changed)}; chunk still found but lower rank: {len(rank_down)} {rank_down}",
       f"new cases: {len(new)}; chunk found {sum(a[k]['ok'] for k in new if k in a)}, facts {sum(a[k]['facts'] for k in new if k in a)}"]
for k in new:
    if k in a and not (a[k]['ok'] and a[k]['facts']): out.append(f"  new miss {k}: rank {a[k]['rank']} facts {a[k]['facts']} ids {a[k]['ids']}")
for k in changed: out.append(f"  changed {k}: {b[k]['ids']} -> {a[k]['ids']}")
open('retr_compare.txt', 'w').write('\n'.join(out) + '\n'); print('\n'.join(out))
EOF
