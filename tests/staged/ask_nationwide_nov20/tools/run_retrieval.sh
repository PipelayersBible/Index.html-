#!/bin/sh
# Retrieval-only check (no AI calls, no server writes). ~2 seconds. Run from this folder.
#   1) today's live KB   2) with the staged chunks and edits   3) same, plus the proposed "add the job's state to the first search"
cd "$(dirname "$0")"
[ -f ../work/kb_live.json ] || python3 mkkb.py
[ -f ../work/retrieval.mjs ] || esbuild /home/claude/ask_v24/src/_shared/retrieval.ts --bundle --format=esm --platform=neutral --outfile=../work/retrieval.mjs
(cd ../sql && python3 kb_nationwide.py >/dev/null)
echo "1) live KB today:";                node retr.mjs --cases cases_retrieval.json | tail -1
echo "2) staged chunks + edits:";        EDITS=../work/edited_chunks.json node retr.mjs --cases cases_retrieval.json ../sql/kb_nationwide.jsonl | grep -E "^FAIL|pass$"
echo "3) + job state in first search:";  AUG=1 EDITS=../work/edited_chunks.json node retr.mjs --cases cases_retrieval.json ../sql/kb_nationwide.jsonl | grep -E "^FAIL|pass$"
