#!/bin/bash
# Throwaway local Postgres 16 (never live): one_device stubs + pb_auth as live (01_one_device.sql), our stubs, then for each
# block_tNN.sql: run it (expects RESULT: n pass, 0 fail), and each apply file twice + its undo, checking nothing is left.
S=$(cd "$(dirname "$0")/.." && pwd); OD=$S/../../one_device_nov20/sql; B=/usr/lib/postgresql/16/bin; P=${PORT:-10751}
python3 "$S/tests/mk.py" >/dev/null || exit 1
D=$(mktemp -d /tmp/pbsec.XXXXXX); mkdir -p $D/s; cp -r "$S"/* $D/s/; cp $OD/local/stubs.sql $D/od_stubs.sql; cp $OD/01_one_device.sql $D/od_01.sql; chmod -R a+rwx "$D"; chown -R postgres "$D"
Q="psql -h $D -p $P -U postgres -v ON_ERROR_STOP=1 -q -X"
fresh() { su postgres -c "$B/pg_ctl -D $D/data stop -m fast >/dev/null 2>&1; rm -rf $D/data; $B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p $P -k $D' -l $D/log start >/dev/null && $Q -c 'create database t'" >/dev/null 2>&1; su postgres -c "$Q -d t -f $D/od_stubs.sql && $Q -d t -f $D/s/local/stubs.sql && $Q -d t -1 -f $D/od_01.sql" 2>&1 | grep -E 'ERROR' ; }
LG="PGOPTIONS='-c pb_sec.guard=skip-local-test'"
for n in ${ONLY:-01 02 03 04}; do
  fresh
  echo "== block_t$n"; su postgres -c "$LG $Q -d t -f $D/s/tests/block_t$n.sql" 2>&1 | grep -E 'RESULT|ERROR|CONTEXT' | grep -v '^$' | head -6
  a=$(ls $D/s/apply/${n}_*.apply.sql)
  out=$(su postgres -c "$LG $Q -d t -f $a && $LG $Q -d t -f $a && $Q -d t -f $D/s/undo/99_undo_$n.sql -At" 2>&1); echo "   apply x2 + undo: $(echo "$out" | grep -E 'ERROR' | head -3) restored=$(echo "$out" | tail -1)"
done
fresh; out=$(for n in 01 02 03 04; do echo "\\i $D/s/apply/${n}_$(ls $D/s/apply | grep "^$n" | sed "s/^${n}_//")"; done > $D/all.sql; su postgres -c "$LG $Q -d t -f $D/all.sql && $Q -d t -f $D/s/undo/99_undo_04.sql -f $D/s/undo/99_undo_03.sql -f $D/s/undo/99_undo_02.sql -f $D/s/undo/99_undo_01.sql -f $D/s/undo/99_undo_guard.sql -At && $Q -d t -At -c \"select 'left after all undo: pb_sec ' || (select count(*) from pg_namespace where nspname = 'pb_sec') || ', session_ok ' || (select count(*) from pg_proc where proname in ('pb_session_ok','still_in','caller','closed_frozen')) || ', who col ' || (select count(*) from information_schema.columns where table_schema = 'pb_onboard' and column_name = 'who')\"" 2>&1)
echo "== all four applied in order, then all undone: $(echo "$out" | grep -E 'ERROR|left after' | head -4)"
su postgres -c "$B/pg_ctl -D $D/data stop >/dev/null"; rm -rf "$D"
