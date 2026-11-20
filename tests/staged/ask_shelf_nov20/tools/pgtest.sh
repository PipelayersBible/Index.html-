#!/bin/sh
# Everything this folder's SQL can be tested on without the server, on a throwaway local Postgres 16. About 3 minutes.
#   tools/pgtest.sh            -> prints the summary (also kept in work/pgtest.txt)
# 1 the rolled-back test (sql/02) on an empty database   2 the content helpers' real shelf batches loaded twice with
# lib_kb.py's own SQL   3 speed at 15,000 and 85,000 rows (the 127 eval questions, asked as Ask asks them), and how
# often the fast search returns what ranking every matching row would   4 undo.
cd "$(dirname "$0")/.."; S=..; D=${PGTEST_DIR:-/var/lib/postgresql/askshelf_pg}
tools/pg_up.sh >/dev/null; P0="psql -q -h $D -p 54395 -U postgres -v ON_ERROR_STOP=1"
deno run -A --no-check tools/gen_groups.ts ${ASK_SRC:-$PWD/work/src} >/dev/null 2>&1
python3 tools/gen_test_sql.py >/dev/null
# the local-only baseline: the staged search with the rare-word step taken out
python3 - <<'PY'
s = open('sql/01_kb_shelf.sql').read(); a = s.index("create or replace function public.pb_ai_kb_shelf_search"); b = s.index("revoke all on function public.pb_ai_kb_shelf_search")
open('tools/baseline_rank_all.sql', 'w').write("-- LOCAL COMPARISON ONLY, never for the server: the staged search with the rare-word step taken out (ranks every row that has any of the words).\n"
  + s[a:b].replace("public.pb_ai_kb_shelf_search", "public.zz_shelf_all").replace("where s.tsv @@ v_drive", "where s.tsv @@ v_all"))
PY
fresh() { $P0 postgres -c "drop database if exists $1" -c "create database $1" 2>/dev/null; $P0 $1 -c "create schema pb_ai; grant usage on schema pb_ai to authenticated"; }
$P0 postgres -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; create role authenticated; create role service_role; end if; end \$\$"
echo "== 1. rolled-back test on an empty database (sql/02_test_rolled_back.sql)"
fresh t1; psql -q -h $D -p 54395 -U postgres t1 -f sql/02_test_rolled_back.sql 2>&1 | grep -o "RESULT: .*"
$P0 t1 -At -c "select 'left behind after the test: ' || (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'pb_ai') || ' tables, ' || (select count(*) from pg_proc where proname like '%kb_shelf%') || ' functions'"
echo "== 2. real shelf batches, loaded twice with lib_kb.py's SQL"
fresh real; $P0 real -f sql/01_kb_shelf.sql
for n in 1 2; do for f in $S/lib_*_nov20/sql/*_shelf_[0-9][0-9].sql; do $P0 real -f "$f" >/dev/null || echo "FAILED to load $f"; done
  $P0 real -At -c "select 'run $n: ' || count(*) || ' shelf chunks, ' || count(distinct coll) || ' collections, ' || count(distinct state) || ' states' from pb_ai.kb_shelf"; done
echo "   and the test again with 01 already applied and rows loaded:"; psql -q -h $D -p 54395 -U postgres real -f sql/02_test_rolled_back.sql 2>&1 | grep -o "RESULT: [A-Z]*"
$P0 real -At -c "select '   rows after it: ' || count(*) from pb_ai.kb_shelf"
for N in 15000 85000; do
  echo "== 3. speed at $N rows"
  python3 tools/pg_setup.py $N $D; sed '/^create temp table tr/,$d' $D/time.sql > $D/tq.sql; cat $D/tq.sql tools/compare.sql > $D/cmp.sql; chmod a+r $D/*.sql $D/*.csv
  fresh big; $P0 big -f sql/01_kb_shelf.sql -f tools/baseline_rank_all.sql
  $P0 big -c "\copy pb_ai.kb_shelf (id, chunk) from '$D/shelf.csv' csv" -c "vacuum analyze pb_ai.kb_shelf"
  $P0 big -At -c "select count(*) || ' rows, ' || count(distinct state) || ' states, table + indexes ' || pg_size_pretty(pg_total_relation_size('pb_ai.kb_shelf')) from pb_ai.kb_shelf"
  $P0 big -At -f $D/time.sql; $P0 big -At -f $D/cmp.sql
done
echo "== 4. undo (sql/03_undo_kb_shelf.sql)"
$P0 big -f sql/03_undo_kb_shelf.sql; $P0 big -At -c "select 'after undo: ' || (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'pb_ai' and c.relname like 'kb_shelf%') || ' shelf tables, ' || (select count(*) from pg_proc where proname in ('pb_ai_kb_shelf_search', 'kb_shelf_excerpt')) || ' shelf functions'"
$P0 postgres -c "drop database big" -c "drop database t1"
