#!/bin/bash
# local_test.sh (state audit Nov 21, ask_merge): test 10/11/91/12 on a LOCAL Postgres 16 copy of the live library (like library_load_nov20/tools/local_sql_test.sh).
# Copy: /var/lib/postgresql/askmerge_pg (port 55433) = the Nov 20 local cluster + 07_lib8_card.sql; whole-library md5 347ae4d8... = the server's (read Nov 20 21:00 PT).
# Pass 1 finds the md5s of the rows after the load; pass 2 embeds them in the SQL and runs the full test.
set -e
H=/home/claude/index.html-/tests/staged/state_audit_nov21/ask_merge; D=/var/lib/postgresql/askmerge_pg
Q="psql -h $D -p 55433 -U postgres -X -v ON_ERROR_STOP=1 -q"; V=b3e91f6c47d2
ALL="select count(*), md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks where version='$V'"
SH="select count(*), md5(string_agg(id||':'||(chunk::text), '|' order by id)) from pb_ai.kb_shelf"
reset() { su postgres -c "pg_restore -h $D -p 55433 -U postgres -d postgres --clean --if-exists $D/live_snapshot.dump"; echo "reset: $($Q -Atc "$ALL") | shelf $($Q -Atc "$SH")  (want 3236|347ae4d8eee91b042fc1ff49baf0fd60 | 47|fa1033cecf0744b3aa3d3ccac028160e)"; }
cd $H
echo "== pass 1"; python3 tools/mk_sql.py >/dev/null; reset; $Q -f sql/11_load.sql
T=$(python3 -c "import json;print(','.join(map(str,json.load(open('work/sql_meta.json'))['ords_touched'])))")
PT=$($Q -Atc "select md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks where version='$V' and ord in ($T)")
PN=$($Q -Atc "select md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks where version='$V' and ord >= 3236")
PS=$($Q -Atc "select md5(string_agg(id||':'||(chunk::text), '|' order by id)) from pb_ai.kb_shelf")
PA=$($Q -Atc "$ALL")
echo "{\"post_touched\": \"$PT\", \"post_new\": \"$PN\", \"post_shelf\": \"$PS\", \"post_all_local\": \"${PA#*|}\"}" > work/expected.json; cat work/expected.json
echo "== pass 2"; reset; python3 tools/mk_sql.py work/expected.json
echo "-- precheck before:"; $Q -A -F' ' -f sql/10_precheck.sql | cut -c1-400
echo "-- load:"; $Q -f sql/11_load.sql 2>&1
echo "-- load again:"; $Q -f sql/11_load.sql 2>&1
echo "-- precheck after:"; $Q -A -F' ' -f sql/10_precheck.sql | cut -c1-400
$Q -Atc "select n, counts from pb_ai.kb_versions; select (select count(*) from pb_ai.kb_index) + (select count(*) from pb_ai.kb_index_parts) as index_rows_left"
$Q -Atc "select jsonb_build_object('o',ord,'lib',lib,'c',chunk) from pb_ai.kb_chunks where version='$V' order by ord" > work/after_rows.jsonl
$Q -Atc "select jsonb_build_object('id',id,'c',chunk) from pb_ai.kb_shelf order by id" > work/after_shelf.jsonl
echo "-- rollback:"; $Q -f sql/91_rollback.sql 2>&1
echo "after rollback (want 3236|347ae4d8eee91b042fc1ff49baf0fd60 and 47|fa1033cecf0744b3aa3d3ccac028160e): $($Q -Atc "$ALL") | $($Q -Atc "$SH")"; $Q -Atc "select n, counts from pb_ai.kb_versions"
echo "-- rollback again:"; $Q -f sql/91_rollback.sql 2>&1
echo "-- guard: a touched row changed on live -> load must refuse"
$Q -c "update pb_ai.kb_chunks set chunk = jsonb_set(chunk, '{title}', '\"x\"') where version='$V' and ord = 2255"
$Q -f sql/11_load.sql 2>&1 | grep -o 'FAIL[^"]*' | head -1; echo "rows still: $($Q -Atc "select count(*) from pb_ai.kb_chunks")"
reset
echo "-- guard: rollback on the unloaded library with one extra row -> must refuse"
$Q -f sql/11_load.sql >/dev/null 2>&1; $Q -c "update pb_ai.kb_chunks set chunk = jsonb_set(chunk, '{title}', '\"x\"') where version='$V' and ord = 3240"
$Q -f sql/91_rollback.sql 2>&1 | grep -o 'FAIL[^"]*' | head -1; reset
echo "-- eval cases (local stand-in table with the server's columns), run twice"
$Q -c "drop table if exists pb_ai.eval_set; create table pb_ai.eval_set (id text primary key, cat text, q text, \"where\" text, level text, must jsonb, mustnot jsonb, maxwords int, active boolean, images jsonb, image_ids text[], feature text, model text)"
$Q -f sql/12_eval_cases_inactive.sql >/dev/null; $Q -f sql/12_eval_cases_inactive.sql -At | head -1
$Q -Atc "select count(*), count(*) filter (where active), min(maxwords), max(maxwords) from pb_ai.eval_set"; $Q -c "drop table pb_ai.eval_set"
