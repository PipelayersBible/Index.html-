#!/bin/sh
# ask_followups_nov20: retrieval-only check of the two Washington trench chunks. No AI calls, no server. About 15 s.
# A) nationwide tools (retr.mjs = the build LIVE today + its filter): the 8 WA cases and its own 22, before / after
# B) ask_state tools (evalret.mjs = live build vs staged ask_state build): the 5 WA eval cases and the 127, before / after
cd "$(dirname "$0")"; F="$(pwd)"; N=../../ask_nationwide_nov20/tools; S=../../ask_state_nov20/tools
(cd ../sql && python3 kb_followups.py >/dev/null)
echo "A1) live build, WA cases, KB today:";       (cd $N && node retr.mjs --cases "$F/cases_retrieval_wa.json" | grep -E "^(PASS|FAIL)|pass$")
echo "A2) live build, WA cases, + new chunks:";   (cd $N && node retr.mjs --cases "$F/cases_retrieval_wa.json" "$F/../sql/kb_followups.jsonl" | grep -E "^(PASS|FAIL)|pass$")
echo "A3) nationwide's own 22 cases, before / after (must not move):"
(cd $N && EDITS=../work/edited_chunks.json node retr.mjs --cases cases_retrieval.json ../sql/kb_nationwide.jsonl | tail -1)
(cd $N && EDITS=../work/edited_chunks.json node retr.mjs --cases cases_retrieval.json ../sql/kb_nationwide.jsonl "$F/../sql/kb_followups.jsonl" | tail -1)
cp cases_wa.json $S/_cases_wa_tmp.json
echo "B1) WA eval cases (facts in the first excerpts; 'before' = live build, 'after' = ask_state build), KB today:"
(cd $S && CASES=_cases_wa_tmp.json KB=../work/kb_after.json node evalret.mjs own | sed -n '1p')
echo "B2) same, + new chunks:"
(cd $S && CASES=_cases_wa_tmp.json KB=../work/kb_after.json EXTRA="$F/../sql/kb_followups.jsonl" node evalret.mjs own | sed -n '1p;/^BETTER/,$p')
rm -f $S/_cases_wa_tmp.json
echo "B3) all 127 text cases, KB today / + new chunks (must not get worse):"
(cd $S && KB=../work/kb_after.json node evalret.mjs own | sed -n '1p')
(cd $S && KB=../work/kb_after.json EXTRA="$F/../sql/kb_followups.jsonl" node evalret.mjs own | sed -n '1p;/^WORSE/,$p')
echo "B4) every case x every location, + new chunks:"
(cd $S && KB=../work/kb_after.json EXTRA="$F/../sql/kb_followups.jsonl" node regress.mjs | head -1)
