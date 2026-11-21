#!/bin/bash
# local_sql_test.sh : rolled-back style test of the promotion SQL on a LOCAL Postgres 16 copy of the live library (scratch cluster on port 55432).
# Live rows = ask_state_nov20/work/kb_after.json + ords 110-239 re-read from the server Nov 21 (app-data rows changed on live since); md5 must equal the server's.
set -e
D=/tmp/claude-0/-home-claude/301429b0-ad8e-5cc1-a9ea-816c5040b6d3/scratchpad/pgkb; P=/home/claude/index.html-/tests/staged/library_load_nov20/promotion; Q="psql -h $D -p 55432 -U postgres -X -v ON_ERROR_STOP=1 -q"
$Q -c "truncate pb_ai.kb_chunks, pb_ai.kb_index, pb_ai.kb_index_parts, pb_ai.kb_shelf; update pb_ai.kb_versions set n = 2840, counts = '{\"app\":238,\"osha\":278,\"field\":2324}'"
$Q -c "insert into pb_ai.kb_chunks select 'b3e91f6c47d2', (j::jsonb->>'o')::int, j::jsonb->>'lib', j::jsonb->'c' from raw; update pb_ai.kb_chunks k set lib=j::jsonb->>'lib', chunk=j::jsonb->'c' from raw2 where k.ord=(j::jsonb->>'o')::int; insert into pb_ai.kb_index values ('b3e91f6c47d2', 2840, 1, 'x', 2); insert into pb_ai.kb_index_parts values ('b3e91f6c47d2',0,'a'),('b3e91f6c47d2',1,'b')"
echo "live copy md5 (server 6d20fceeb4976ce1f304c75338fd89d3):"; $Q -Atc "select md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks"
echo "precheck:"; $Q -A -F' ' -f $P/03_library_precheck.sql
$Q -f $P/04_library_core.sql; echo "after core:"; $Q -Atc "select n, counts from pb_ai.kb_versions; select count(*), max(ord), count(distinct chunk->>'id') from pb_ai.kb_chunks; select (select count(*) from pb_ai.kb_index) + (select count(*) from pb_ai.kb_index_parts) index_rows"
$Q -Atc "select jsonb_build_object('o',ord,'lib',lib,'c',chunk) from pb_ai.kb_chunks order by ord" > $D/after.jsonl
$Q -f $P/04_library_core.sql; echo "core run twice, rows:"; $Q -Atc "select count(*) from pb_ai.kb_chunks"
$Q -f $P/05_library_shelf.sql; $Q -f $P/05_library_shelf.sql; echo "shelf (run twice):"; $Q -Atc "select count(*), count(distinct state) from pb_ai.kb_shelf"
$Q -f $P/94_library_rollback.sql; echo "after rollback md5 (must be 6d20fceeb4976ce1f304c75338fd89d3):"; $Q -Atc "select count(*), md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks; select n, counts from pb_ai.kb_versions"
