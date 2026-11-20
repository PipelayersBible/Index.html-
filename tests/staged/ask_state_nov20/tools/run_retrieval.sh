#!/bin/sh
# ask_state_nov20: retrieval-only check, no AI calls, no server. Run from anywhere.
#   1) all 127 text eval cases at their own eval location, before (live build) / after (staged build)
#   2) the same with the staged KB fix (sql/01_ask_kb_state_fix.sql)
#   3) strict check over 52 locations: any case that the staged build makes worse anywhere
# The per-state table (slow, about 3 minutes): node perstate.mjs
cd "$(dirname "$0")"
esbuild ../src_patch/state.ts --format=esm --outfile=../work/state.mjs --log-level=warning
[ -f ../work/kb_live2.json ] || python3 mkkb2.py >/dev/null
(cd ../sql && python3 gen_kb_fix.py >/dev/null)
echo "1) live KB:";            node evalret.mjs own | sed -n '1p;/^WORSE/,$p'
echo "2) KB + staged fix:";    KB=../work/kb_after.json node evalret.mjs own | sed -n '1p;/^WORSE/,$p'
echo "3) every location:";     KB=../work/kb_after.json node regress.mjs
