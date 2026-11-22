#!/bin/bash
# retr_all.sh: free retrieval check, before (live d881 code + live 3,270 rows) vs after (patched code + consolidated rows). PLAIN_MIN=0 (live default) unless set.
set -e
H=/home/claude/index.html-/tests/staged/library_consolidate_nov21; S=/home/claude/index.html-/tests/staged; cd $H
python3 - <<'PY'
import json
H='/home/claude/index.html-/tests/staged/library_consolidate_nov21'; S='/home/claude/index.html-/tests/staged'
for src, dst in ((f'{S}/state_audit_nov21/ask_merge/work/after_rows.jsonl', 'kb_before.json'), (f'{H}/work/after_rows.jsonl', 'kb_after.json')):
    kb = {'app': [], 'field': [], 'osha': []}
    for l in open(src):
        r = json.loads(l); kb[r['lib']].append(r['c'])
    json.dump(kb, open(f'{H}/work/{dst}', 'w'))
# all existing cases: 688 library (676 core) + every state-audit case file, deduped by id
seen, out = set(), []
files = [f'{S}/library_load_nov20/out/cases.jsonl', f'{S}/state_audit_nov21/ask_merge/cases.jsonl', f'{S}/state_audit_nov21/811/lib/cases_audit811.jsonl',
         f'{S}/state_audit_nov21/safety/lib/cases.jsonl', f'{S}/state_audit_nov21/safety/lib/cases_fed.jsonl', f'{S}/state_audit_nov21/safety/lib/cases_states.jsonl',
         f'{S}/state_audit_nov21/survey/cases.jsonl', f'{S}/state_audit_nov21/specs_permits/lib/cases.jsonl']
alias0 = {'dig-or-tickets-1': ['dig-or-tickets-2']}
for f in files:
    for l in open(f):
        if not l.strip(): continue
        c = json.loads(l)
        if c['id'] in seen: continue
        seen.add(c['id']); c['chunks'] = [y for x in c.get('chunks', []) for y in alias0.get(x, [x])]; out.append(c)
with open(f'{H}/work/cases_existing.jsonl', 'w') as fo:
    for c in out: fo.write(json.dumps(c) + '\n')
print('existing cases', len(out))
# retired / renamed ids -> where their facts went (for the AFTER run only)
A = {'plan-trench-depth-1': ['osha-pl-trench-states-2'], 'sp-mn-trench-1': ['sp-mn-confined-1', 'osha-pl-trench-states-2'], 'sp-in-trench-1': ['osha-pl-trench-states-2'],
     'sp-wa-trench-other-1': ['sp-wa-trench-1'], 'sp-wa-trench-1': ['sp-wa-trench-1', 'sp-wa-trench-slope-1'], 'ca-cal-osha-trench-and-confined-1': ['sp-ca-trench-1'], 'cal-1': ['sp-ca-trench-1'],
     'ca-cal-osha-trench-and-confined-2': ['sp-ca-trench-other-1', 'sp-ca-trench-1'], 'dig-ca-overview-1': ['ca-dig-alert-4216-1', 'ca-dig-alert-4216-2', 'ca-dig-alert-4216-4'],
     'ca-dig-alert-4216-9': ['dig-ca-penalties-2'], 'dig-ca-penalties-1': ['dig-ca-penalties-2']}
for s in 'al ar co de dc fl ga id ks la ms mo mt ne nh nd oh ok pa ri sd tx wv wi'.split(): A[f'sp-{s}-trench-1'] = ['osha-pl-trench-states-1']
json.dump(A, open(f'{H}/work/alias.json', 'w'))
PY
for P in ${PLAINS:-0}; do
  export PLAIN_MIN=$P
  node tools/retr.mjs ./work/state_live.mjs work/kb_before.json work/cases_existing.jsonl work/retr_before_p$P.json
  node tools/retr.mjs ./work/state.mjs work/kb_after.json work/cases_existing.jsonl work/retr_after_p$P.json work/alias.json
  node tools/retr.mjs ./work/state_live.mjs work/kb_before.json cases_new.jsonl work/retr_new_before_p$P.json
  node tools/retr.mjs ./work/state.mjs work/kb_after.json cases_new.jsonl work/retr_new_after_p$P.json
  node tools/regress.mjs ./work/state_live.mjs work/kb_before.json work/reg_before_p$P.json
  node tools/regress.mjs ./work/state.mjs work/kb_after.json work/reg_after_p$P.json
done
