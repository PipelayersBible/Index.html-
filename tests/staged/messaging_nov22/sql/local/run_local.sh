#!/bin/bash
# Throwaway local Postgres 16 (NEVER live): one_device + security stubs + ours; each block_tNN.sql (expects RESULT: n pass, 0 fail);
# each apply file twice; then all undone, checking nothing is left. PORT default 10771.
S=$(cd "$(dirname "$0")/.." && pwd); ST=$S/../..; B=/usr/lib/postgresql/16/bin; P=${PORT:-10771}
python3 "$S/tests/mk.py" >/dev/null || exit 1
D=$(mktemp -d /tmp/pbmsg.XXXXXX); mkdir -p $D/s; cp -r "$S"/* $D/s/; cp $ST/one_device_nov20/sql/local/stubs.sql $D/od_stubs.sql; cp $ST/security_nov22/sql/local/stubs.sql $D/sec_stubs.sql
chmod -R a+rwx "$D"; chown -R postgres "$D"
Q="psql -h $D -p $P -U postgres -v ON_ERROR_STOP=1 -q -X"
fresh() { su postgres -c "$B/pg_ctl -D $D/data stop -m fast >/dev/null 2>&1; rm -rf $D/data; $B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p $P -k $D' -l $D/log start >/dev/null && $Q -c 'create database t'" >/dev/null 2>&1
  su postgres -c "$Q -d t -f $D/od_stubs.sql && $Q -d t -f $D/sec_stubs.sql && $Q -d t -f $D/s/local/stubs.sql" 2>&1 | grep -E 'ERROR' ; }
LG="PGOPTIONS='-c pb_msg.guard=skip-local-test'"
for n in ${ONLY:-01 02 03}; do
  fresh
  echo "== block_t$n"; su postgres -c "$LG $Q -d t -f $D/s/tests/block_t$n.sql" 2>&1 | grep -E 'RESULT|ERROR|CONTEXT|LINE' | head -8
done
fresh
out=$(su postgres -c "for f in $D/s/apply/0*.apply.sql; do $LG $Q -d t -f \$f && $LG $Q -d t -f \$f || exit 1; done; echo applied-twice" 2>&1); echo "== apply 01..03 twice: $(echo "$out" | grep -E 'ERROR|applied' | head -3)"
out=$(su postgres -c "$Q -d t -f $D/s/undo/99_undo_03.sql -f $D/s/undo/99_undo_02.sql -f $D/s/undo/99_undo_01.sql -At" 2>&1); echo "== undo 03, 02, 01: $(echo "$out" | grep -E 'ERROR|undo 01 done' | head -3)"
out=$(su postgres -c "$Q -d t -At -c \"select 'left: buckets ' || (select count(*) from storage.buckets where id like 'msg-%') || ', policies ' || (select count(*) from pg_policy where polname like 'msg\_%') || ', offsite msg-archives ' || (position('msg-archives' in pg_get_functiondef('public.pb_offsite_todo(integer)'::regprocedure)) > 0) || ', outbox check has message ' || (position('message' in (select pg_get_constraintdef(oid) from pg_constraint where conname = 'pb_push_out_type')) > 0)\"" 2>&1); echo "== $out"
su postgres -c "$B/pg_ctl -D $D/data stop >/dev/null"; rm -rf "$D"
