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
