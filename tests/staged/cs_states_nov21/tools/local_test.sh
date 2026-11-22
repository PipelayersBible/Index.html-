#!/bin/bash
# local_test.sh (cs_states_nov21): test sql/20, 21, 91, 21t on a PRIVATE local Postgres 16 copy of the live library (own cluster, port 55471,
# /var/lib/postgresql/cs_states_pg). Snapshot live_3240.dump = cs_live_3243.dump + library_consolidate_cs_nov21/promotion/21_load.sql
# -> 3240 / 131904c2... (= live after the Nov 21 evening load), with the 5 live constraints (pkey, CHECK ord >= 0, chunk, lib, FK).
set -e
H=/home/claude/index.html-/tests/staged/cs_states_nov21; D=/var/lib/postgresql/cs_states_pg; V=b3e91f6c47d2
Q="psql -h $D -p 55471 -U postgres -X -v ON_ERROR_STOP=1 -q"
ALL="select count(*), md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks where version='$V'"
reset() { su postgres -c "/usr/lib/postgresql/16/bin/pg_restore -h $D -p 55471 -U postgres -d postgres --clean --if-exists --no-owner $D/live_3240.dump"; echo "reset: $($Q -Atc "$ALL") (want 3240|131904c2de6b687c14ff4d68ccaea531)"; }
cd $H
echo "== pass 1"; python3 tools/mk_sql.py >/dev/null; reset; $Q -f sql/21_load.sql 2>&1 | tail -1
PA=$($Q -Atc "$ALL"); echo "{\"post_all\": \"${PA#*|}\"}" > work/expected.json; cat work/expected.json
echo "== pass 2"; reset; python3 tools/mk_sql.py work/expected.json
echo "-- constraints:"; $Q -Atc "select conname from pg_constraint where conrelid='pb_ai.kb_chunks'::regclass order by 1" | tr '\n' ' '; echo
echo "-- rolled-back test (21t):"; $Q -f sql/21t_live_test.sql 2>&1 | grep -o 'ERROR:.*' || true
echo "after 21t (want unchanged 3240|131904c2...): $($Q -Atc "$ALL"); index rows: $($Q -Atc "select (select count(*) from pb_ai.kb_index)+(select count(*) from pb_ai.kb_index_parts)")"
echo "-- precheck before:"; $Q -A -F' ' -f sql/20_precheck.sql
echo "-- load:"; $Q -f sql/21_load.sql 2>&1
echo "-- load again:"; $Q -f sql/21_load.sql 2>&1
echo "-- precheck after:"; $Q -A -F' ' -f sql/20_precheck.sql
$Q -Atc "select n, counts from pb_ai.kb_versions; select (select count(*) from pb_ai.kb_index) + (select count(*) from pb_ai.kb_index_parts) as index_rows_left"
$Q -Atc "select jsonb_build_object('o',ord,'lib',lib,'c',chunk) from pb_ai.kb_chunks where version='$V' order by ord" > work/loaded_rows.jsonl
python3 -c "
import json
a=[json.loads(l) for l in open('$H/work/after_rows.jsonl')]; b=[json.loads(l) for l in open('$H/work/loaded_rows.jsonl')]
print('loaded rows = work/after_rows.jsonl (what the retrieval check used):', a==b, len(a), len(b))"
echo "-- 21t on the loaded state (must refuse):"; $Q -f sql/21t_live_test.sql 2>&1 | grep -o 'ERROR:.*' || true
echo "-- rollback:"; $Q -f sql/91_rollback.sql 2>&1
echo "after rollback (want 3240|131904c2de6b687c14ff4d68ccaea531): $($Q -Atc "$ALL")"
echo "-- rollback again:"; $Q -f sql/91_rollback.sql 2>&1
echo "-- guard: an edited row changed -> load refuses, nothing written"
$Q -c "update pb_ai.kb_chunks set chunk = jsonb_set(chunk, '{title}', '\"x\"') where version='$V' and ord = 3239"
$Q -f sql/21_load.sql 2>&1 | grep -o 'FAIL[^(]*' | head -1; echo "md5 still the changed one (not 131904c2): $($Q -Atc "$ALL")"
reset
echo "-- guard: rollback on a changed result -> refuses"
$Q -f sql/21_load.sql >/dev/null 2>&1; $Q -c "update pb_ai.kb_chunks set chunk = jsonb_set(chunk, '{title}', '\"x\"') where version='$V' and ord = 5"
$Q -f sql/91_rollback.sql 2>&1 | grep -o 'FAIL[^(]*' | head -1
reset
