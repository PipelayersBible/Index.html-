#!/bin/bash
# retr_all.sh (library_consolidate_cs_nov21): free retrieval check. before = live code e661 (state_live.mjs) + live 3,243 rows;
# after = patched code (state.mjs) + consolidated rows. Cases: 700 existing core + 204 trench/811 state cases (consol1) + 113 new (cases_cs.jsonl). 127 text cases via regress.mjs.
set -e
H=/home/claude/index.html-/tests/staged/library_consolidate_cs_nov21; cd $H
python3 - <<'PY'
import json
H='/home/claude/index.html-/tests/staged/library_consolidate_cs_nov21'
live=json.load(open(f'{H}/work/live_rows_3243.json'))
for rows, dst in ((live, 'kb_before.json'), ([json.loads(l) for l in open(f'{H}/work/after_rows.jsonl')], 'kb_after.json')):
    kb = {'app': [], 'field': [], 'osha': []}
    for r in rows: kb[r['lib']].append(r['c'])
    json.dump(kb, open(f'{H}/work/{dst}', 'w'))
A = {f'confined-space-field-numbers-1': ['osha-pl-cs-air-1'], 'confined-space-field-numbers-2': ['osha-pl-cs-monitor-1'], 'confined-space-field-numbers-3': ['osha-pl-cs-retrieval-1'],
     'confined-space-field-numbers-4': ['osha-pl-cs-permit-keep-1'], 'confined-space-field-numbers-5': ['osha-pl-cs-rescue-1'], 'confined-space-field-numbers-6': ['osha-pl-cs-altproc-1'],
     'confined-space-silica-1': ['osha-pl-cs-scope-1'], 'confined-space-silica-2': ['osha-pl-cs-monitor-1', 'osha-pl-cs-air-1'], 'ca-cal-osha-trench-and-confined-4': ['sp-ca-confined-1'],
     'ca-cal-osha-trench-and-confined-3': ['sp-ca-confined-air-1'], 'osha-pl-cs-altproc-1': ['osha-pl-cs-altproc-1', 'osha-pl-cs-reclass-1'],
     'osha-pl-cs-rescue-1': ['osha-pl-cs-rescue-1', 'osha-pl-cs-retrieval-1'], 'osha-pl-cs-permit-1': ['osha-pl-cs-permit-1', 'osha-pl-cs-permit-keep-1']}
json.dump(A, open(f'{H}/work/alias.json', 'w'))
PY
for P in ${PLAINS:-0}; do
  export PLAIN_MIN=$P
  for C in cases_existing cases_consol204; do
    node tools/retr.mjs ./work/state_live.mjs work/kb_before.json work/$C.jsonl work/r_${C}_before_p$P.json
    node tools/retr.mjs ./work/state.mjs work/kb_after.json work/$C.jsonl work/r_${C}_after_p$P.json work/alias.json
  done
  node tools/retr.mjs ./work/state_live.mjs work/kb_before.json cases_cs.jsonl work/r_cs_before_p$P.json
  node tools/retr.mjs ./work/state.mjs work/kb_after.json cases_cs.jsonl work/r_cs_after_p$P.json
  node tools/regress.mjs ./work/state_live.mjs work/kb_before.json work/reg_before_p$P.json
  node tools/regress.mjs ./work/state.mjs work/kb_after.json work/reg_after_p$P.json
done
