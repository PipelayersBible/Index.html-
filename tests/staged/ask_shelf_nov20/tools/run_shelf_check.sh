#!/bin/sh
# The free shelf retrieval check on the real shelf chunks written so far (database "real" on the local Postgres).
#   tools/run_shelf_check.sh [DUMP=1]
cd "$(dirname "$0")/.."; S=..; D=${PGTEST_DIR:-/var/lib/postgresql/askshelf_pg}; P0="psql -q -h $D -p 54395 -U postgres -v ON_ERROR_STOP=1"
SRC=${ASK_SRC:-$PWD/work/src}
$P0 postgres -c "drop database if exists real" -c "create database real" 2>/dev/null
$P0 real -c "create schema pb_ai; grant usage on schema pb_ai to authenticated" -f sql/01_kb_shelf.sql
for f in $S/lib_*_nov20/sql/*_shelf_[0-9][0-9].sql; do $P0 real -f "$f" >/dev/null || echo "FAILED to load $f"; done
$P0 real -At -c "analyze pb_ai.kb_shelf" -c "select 'real shelf chunks loaded (lib_kb.py SQL as written by the content helpers): ' || count(*) || ' in ' || count(distinct coll) || ' collections' from pb_ai.kb_shelf"
CH=$(ls $S/lib_*_nov20/*.jsonl | grep -v cases); CA=$(ls $S/lib_*_nov20/cases*.jsonl)
PGDB=real deno run -A --no-check tools/shelf_check.ts "$SRC" $CH -- $CA
