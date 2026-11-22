#!/bin/bash
# retr_all.sh (cs_states_nov21): free retrieval check, no model calls. Code = live build 4776ad1c5afb's search (work/state.mjs + work/retrieval.mjs,
# copied from library_consolidate_cs_nov21). before = live 3,240 rows; after = the 3 edited rows. Cases: 700 existing core, 204 trench/811 state,
# 113 confined space state cases (cases_cs.jsonl), 7 new (cases_cs_states), 127 text cases.
set -e; cd /home/claude/index.html-/tests/staged/cs_states_nov21; python3 tools/build.py
for P in ${PLAINS:-0 2}; do export PLAIN_MIN=$P
  for C in cases_existing cases_consol204 cases_cs cases_cs_states_retr; do
    node tools/retr.mjs ./work/state.mjs work/kb_before.json work/$C.jsonl work/r_${C}_before_p$P.json
    node tools/retr.mjs ./work/state.mjs work/kb_after.json work/$C.jsonl work/r_${C}_after_p$P.json
  done
  node tools/regress.mjs ./work/state.mjs work/kb_before.json work/reg_before_p$P.json
  node tools/regress.mjs ./work/state.mjs work/kb_after.json work/reg_after_p$P.json
  python3 tools/compare.py $P
done
