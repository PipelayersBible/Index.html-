#!/bin/bash
# local_test.sh (library_consolidate_cs_nov21): test promotion/20, 21, 91 on a LOCAL Postgres 16 copy of the live library.
# Copy: /var/lib/postgresql/askmerge_pg (port 55433), snapshot cs_live_3243.dump = the Nov 20 cluster + 07_lib8_card.sql + the Nov 21 state-audit load;
# whole-library md5 eb05d565... = the server's (read 2026-11-21). Pass 1 finds the md5 after the load; pass 2 embeds it and runs the full test.
set -e
H=/home/claude/index.html-/tests/staged/library_consolidate_cs_nov21; D=/var/lib/postgresql/askmerge_pg
Q="psql -h $D -p 55433 -U postgres -X -v ON_ERROR_STOP=1 -q"; V=b3e91f6c47d2
ALL="select count(*), md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks where version='$V'"
reset() { su postgres -c "/usr/lib/postgresql/16/bin/pg_restore -h $D -p 55433 -U postgres -d postgres --clean --if-exists $D/cs_live_3243.dump"; echo "reset: $($Q -Atc "$ALL") (want 3243|a9af05ee01c9f8d4be6054b27f48bfb8)"; }
cd $H
echo "== pass 1"; python3 tools/mk_sql.py >/dev/null; reset; $Q -f promotion/21_load.sql 2>&1 | grep -v '^$' | tail -1
PA=$($Q -Atc "$ALL"); echo "{\"post_all\": \"${PA#*|}\"}" > work/expected.json; cat work/expected.json
echo "== pass 2"; reset; python3 tools/mk_sql.py work/expected.json
echo "-- precheck before:"; $Q -A -F' ' -f promotion/20_precheck.sql
echo "-- load:"; $Q -f promotion/21_load.sql 2>&1
echo "-- load again:"; $Q -f promotion/21_load.sql 2>&1
echo "-- precheck after:"; $Q -A -F' ' -f promotion/20_precheck.sql
$Q -Atc "select n, counts from pb_ai.kb_versions; select (select count(*) from pb_ai.kb_index) + (select count(*) from pb_ai.kb_index_parts) as index_rows_left"
$Q -Atc "select jsonb_build_object('o',ord,'lib',lib,'c',chunk) from pb_ai.kb_chunks where version='$V' order by ord" > work/loaded_rows.jsonl
python3 - <<'PY'
import json
a=[json.loads(l) for l in open('/home/claude/index.html-/tests/staged/library_consolidate_cs_nov21/work/after_rows.jsonl')]
b=[json.loads(l) for l in open('/home/claude/index.html-/tests/staged/library_consolidate_cs_nov21/work/loaded_rows.jsonl')]
print('loaded rows = work/after_rows.jsonl (what the free check and the ai-next overlay used):', a == b, len(a), len(b))
PY
echo "-- rollback:"; $Q -f promotion/91_rollback.sql 2>&1
echo "after rollback (want 3243|a9af05ee01c9f8d4be6054b27f48bfb8): $($Q -Atc "$ALL")"; $Q -Atc "select n, counts from pb_ai.kb_versions"
echo "-- rollback again:"; $Q -f promotion/91_rollback.sql 2>&1
echo "-- guard: one live row changed -> load must refuse, nothing changed"
$Q -c "update pb_ai.kb_chunks set chunk = jsonb_set(chunk, '{title}', '\"x\"') where version='$V' and ord = 5"
$Q -f promotion/21_load.sql 2>&1 | grep -o 'FAIL[^(]*' | head -1; echo "rows still: $($Q -Atc "select count(*) from pb_ai.kb_chunks where version='$V'")"
reset
echo "-- guard: rollback on a changed result -> must refuse"
$Q -f promotion/21_load.sql >/dev/null 2>&1; $Q -c "update pb_ai.kb_chunks set chunk = jsonb_set(chunk, '{title}', '\"x\"') where version='$V' and ord = 3238"
$Q -f promotion/91_rollback.sql 2>&1 | grep -o 'FAIL[^(]*' | head -1; echo "rows still: $($Q -Atc "select count(*) from pb_ai.kb_chunks where version='$V'")"
reset
echo "-- constraints on the local copy:"; $Q -Atc "select conname from pg_constraint where conrelid='pb_ai.kb_chunks'::regclass order by 1" | tr '\n' ' '; echo
