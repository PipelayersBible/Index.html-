#!/bin/bash
# local_test.sh (ask_quality_nov22): test promotion/20, 21, 91, 21t on a PRIVATE local Postgres 16 copy of the live library (own cluster,
# port 55481, /var/lib/postgresql/aq_pg). Snapshot live_3240_a9e6.dump = cs_states live_3240.dump + cs_states 21_load -> 3240 / a9e67ec6 (= live),
# with the 5 live constraints (pkey, CHECK ord >= 0, chunk, lib, FK).
set -e
H=/home/claude/index.html-/tests/staged/ask_quality_nov22; D=/var/lib/postgresql/aq_pg; V=b3e91f6c47d2
Q="psql -h $D -p 55481 -U postgres -X -v ON_ERROR_STOP=1 -q"
ALL="select count(*), md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks where version='$V'"
reset() { su postgres -c "/usr/lib/postgresql/16/bin/pg_restore -h $D -p 55481 -U postgres -d postgres --clean --if-exists --no-owner $D/live_3240_a9e6.dump"; echo "reset: $($Q -Atc "$ALL") (want 3240|a9e67ec6527df46b665cbc03bdb6ca6c)"; }
cd $H
echo "== pass 1"; python3 tools/mk_sql.py >/dev/null; reset; $Q -f promotion/21_load.sql 2>&1 | tail -1
PA=$($Q -Atc "$ALL"); echo "{\"post_all\": \"${PA#*|}\"}" > work/expected.json; cat work/expected.json
echo "== pass 2"; reset; python3 tools/mk_sql.py work/expected.json
echo "-- constraints:"; $Q -Atc "select conname from pg_constraint where conrelid='pb_ai.kb_chunks'::regclass order by 1" | tr '\n' ' '; echo
echo "-- rolled-back test (21t):"; $Q -f promotion/21t_live_test.sql 2>&1 | grep -o 'ERROR:.*' || true
echo "after 21t (want unchanged 3240|a9e67ec6...): $($Q -Atc "$ALL"); index rows: $($Q -Atc "select (select count(*) from pb_ai.kb_index)+(select count(*) from pb_ai.kb_index_parts)")"
echo "-- precheck before:"; $Q -A -F' ' -f promotion/20_precheck.sql
echo "-- load:"; $Q -f promotion/21_load.sql 2>&1
echo "-- load again:"; $Q -f promotion/21_load.sql 2>&1
echo "-- precheck after:"; $Q -A -F' ' -f promotion/20_precheck.sql
$Q -Atc "select n, counts from pb_ai.kb_versions where version='$V'; select (select count(*) from pb_ai.kb_index) + (select count(*) from pb_ai.kb_index_parts) as index_rows_left"
$Q -Atc "select jsonb_build_object('o',ord,'lib',lib,'c',chunk) from pb_ai.kb_chunks where version='$V' order by ord" > work/loaded_rows.jsonl
python3 -c "
import json
a=[json.loads(l) for l in open('$H/work/after_rows.jsonl')]; b=[json.loads(l) for l in open('$H/work/loaded_rows.jsonl')]
print('loaded rows = work/after_rows.jsonl (what the free check and the ai-next overlay used):', a==b, len(a), len(b))"
echo "-- 21t on the loaded state (must refuse):"; $Q -f promotion/21t_live_test.sql 2>&1 | grep -o 'ERROR:.*' || true
echo "-- rollback:"; $Q -f promotion/91_rollback.sql 2>&1
echo "after rollback (want 3240|a9e67ec6527df46b665cbc03bdb6ca6c): $($Q -Atc "$ALL")"
echo "-- rollback again:"; $Q -f promotion/91_rollback.sql 2>&1
echo "-- guard: a live row changed -> load refuses, nothing written"
$Q -c "update pb_ai.kb_chunks set chunk = jsonb_set(chunk, '{title}', '\"x\"') where version='$V' and ord = 5"
$Q -f promotion/21_load.sql 2>&1 | grep -o 'FAIL[^(]*' | head -1; echo "md5 still the changed one: $($Q -Atc "$ALL")"
reset
echo "-- guard: rollback on a changed result -> refuses"
$Q -f promotion/21_load.sql >/dev/null 2>&1; $Q -c "update pb_ai.kb_chunks set chunk = jsonb_set(chunk, '{title}', '\"x\"') where version='$V' and ord = 5"
$Q -f promotion/91_rollback.sql 2>&1 | grep -o 'FAIL[^(]*' | head -1
reset
