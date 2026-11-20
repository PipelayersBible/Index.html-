#!/bin/sh
# Local test of the generated SQL and the shelf search on a throwaway Postgres 16 (no server access). ~1 minute.
#   tools/pgtest.sh [rows]      rows = shelf size to time (default 85000, about 30x today's library)
set -e
cd "$(dirname "$0")/.."; HERE=$(pwd)
ROWS=${1:-85000}; PORT=54391; D=${PGTEST_DIR:-/var/lib/postgresql/libarch_pg}   # must be a folder the postgres user can reach
BIN=/usr/lib/postgresql/16/bin
rm -rf "$D"; mkdir -p "$D"; chown postgres "$D"
su postgres -c "$BIN/initdb -D $D/data -A trust >/dev/null && $BIN/pg_ctl -D $D/data -o '-p $PORT -c listen_addresses= -k $D' -l $D/log -w start >/dev/null"
P="psql -q -h $D -p $PORT -U postgres -v ON_ERROR_STOP=1 postgres"
trap "su postgres -c \"$BIN/pg_ctl -D $D/data -m immediate stop >/dev/null\"" EXIT
python3 tools/pgtest_setup.py "$ROWS" "$D"
chmod -R a+rX "$D"/*.sql "$D"/*.csv 2>/dev/null || true
$P -f "$D/setup.sql" >/dev/null
echo "== core batch SQL (lib_kb.py), run twice"
for n in 1 2; do $P -f "$D/sql/pgt_core_00.sql" >/dev/null; $P -At -c "select 'run $n: rows ' || count(*) || ', max ord ' || max(ord) || ', n ' || (select n from pb_ai.kb_versions) || ', index rows ' || (select count(*) from pb_ai.kb_index) from pb_ai.kb_chunks"; done
$P -At -c "select 'superseded row: ' || (chunk->>'id') || ' at ord ' || ord from pb_ai.kb_chunks where chunk->>'id' = 'tc-tx-pgt-9'"
echo "== shelf table + search function"
$P -f sql/PROPOSED_kb_shelf.sql >/dev/null
for n in 1 2; do $P -f "$D/sql/pgt_shelf_00.sql" >/dev/null; done
$P -At -c "select 'shelf batch run twice: ' || count(*) || ' rows' from pb_ai.kb_shelf"
$P -c "\copy pb_ai.kb_shelf (id, chunk) from '$D/shelf.csv' csv" 
$P -c "analyze pb_ai.kb_shelf" 
$P -At -c "select 'shelf rows ' || count(*) || ', states ' || count(distinct state) || ', table+index ' || pg_size_pretty(pg_total_relation_size('pb_ai.kb_shelf')) from pb_ai.kb_shelf"
$P -At -f "$D/time.sql"
echo "== eval style grading (sql/PROPOSED_eval_style.sql)"
$P -q -c "create table pb_ai.eval_set (id text primary key, cat text, q text, \"where\" text, level text, must jsonb, mustnot jsonb, maxwords int, active boolean);
create table pb_ai.eval_results (run text, id text, status int, text text, local boolean, usd numeric, ms int);
create view pb_ai.eval_graded as select r.run, s.id, s.cat, r.status, r.local, r.usd, r.ms, array_length(regexp_split_to_array(btrim(coalesce(r.text,'')), '\s+'), 1) as words, s.maxwords,
 (select coalesce(array_agg(m.value), '{}'::text[]) from jsonb_array_elements_text(s.must) m(value) where not (coalesce(r.text,'') ~* m.value)) as missing,
 (select coalesce(array_agg(m.value), '{}'::text[]) from jsonb_array_elements_text(s.mustnot) m(value) where coalesce(r.text,'') ~* m.value) as forbidden
 from pb_ai.eval_results r join pb_ai.eval_set s on s.id = r.id;
create function pb_ai.eval_score(p_run text) returns jsonb language sql as 'select null::jsonb';"
$P -f sql/PROPOSED_eval_style.sql >/dev/null
$P -q -c "insert into pb_ai.eval_set (id, must, mustnot, maxwords, lead, complex) values
 ('a', '[\"14 working days\"]', '[\"28 days\"]', 70, '[\"14 working days\"]', false),
 ('b', '[\"14 working days\"]', '[\"28 days\"]', 70, '[\"14 working days\"]', false),
 ('c', '[\"5 ?ft\"]', '[]', 110, '[\"5 ?ft\"]', true),
 ('d', '[\"5 ?ft\"]', '[]', 110, '[\"5 ?ft\"]', true),
 ('e', '[\"14 working days\"]', '[]', 170, null, null),
 ('f', '[\"14 working days\"]', '[]', 70, '[\"14 working days\"]', false);
insert into pb_ai.eval_results values
 ('r','a',200,'A Texas ticket is good for 14 working days. - Renew it before it runs out if work goes on.',false,0.02,5000),
 ('r','b',200,'TYPE: safety' || chr(10) || 'Tickets are set by state law and the rules differ from place to place, so it is worth knowing how the one-call system works before getting to the number, which depends on where the job is and when the ticket was called in and by whom. In Texas the answer is 14 working days.',false,0.02,5000),
 ('r','c',200,'TYPE: safety' || chr(10) || 'A protective system is required at 5 ft or deeper. - Your competent person decides on site.' || chr(10) || 'Want the details on sloping angles by soil type?',false,0.02,5000),
 ('r','d',200,'A protective system is required at 5 ft or deeper. Your competent person decides on site.',false,0.02,5000),
 ('r','e',200,'Old-style case with no lead rule: it is 14 working days.',false,0.02,5000),
 ('r','f',200,'A Texas ticket is good for 14 working days. Want the details on renewals?',false,0.02,5000);"
$P -At -c "select 'expect pass a,c,e; b buried; d offer missing; f offer not wanted -> ' || (pb_ai.eval_score('r')->>'pass') || ' pass, fails ' || (pb_ai.eval_score('r')->'fails')::text"
