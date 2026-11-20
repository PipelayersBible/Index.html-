#!/bin/bash
# Fresh throwaway local Postgres 16: stubs, then 01 applied twice (safe to re-run), the test, then 02 + undo. Never live.
# MODE=block: the single rolled-back script the lead runs on live.
S=$(cd "$(dirname "$0")/.." && pwd); B=/usr/lib/postgresql/16/bin; P=${PORT:-10140}
python3 "$S/tests/mk.py" >/dev/null || exit 1
D=$(mktemp -d /tmp/pb1dev.XXXXXX); cp "$S"/local/stubs.sql "$S"/01_one_device.sql "$S"/02_gate_on.sql "$S"/99_undo.sql "$S"/tests/t01.plpgsql "$S"/tests/block_t01.sql "$D"/; chmod -R a+rwx "$D"; chown -R postgres "$D"
su postgres -c "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p $P -k $D' -l $D/log start >/dev/null"
Q="psql -h $D -p $P -U postgres -v ON_ERROR_STOP=1 -q -X"
if [ "$MODE" = block ]; then out=$(su postgres -c "$Q -f $D/stubs.sql && $Q -f $D/block_t01.sql; $Q -At -c \"select 'left behind: ' || count(*) from pg_namespace where nspname = 'pb_auth'\"" 2>&1)
else out=$(su postgres -c "$Q -f $D/stubs.sql && $Q -1 -f $D/01_one_device.sql && $Q -1 -f $D/01_one_device.sql && (cat $D/01_one_device.sql; echo 'begin;'; cat $D/t01.plpgsql) > /dev/null; (echo 'begin;'; cat $D/t01.plpgsql; echo 'rollback;') > $D/run.sql; $Q -f $D/run.sql; $Q -f $D/02_gate_on.sql && $Q -At -c \"select 'gate setting: ' || array_to_string(setconfig, ',') from pg_db_role_setting s join pg_roles r on r.oid = s.setrole where r.rolname = 'authenticator'\" && $Q -f $D/99_undo.sql && $Q -At -c \"select 'after undo: schemas ' || (select count(*) from pg_namespace where nspname = 'pb_auth') || ', triggers ' || (select count(*) from pg_trigger where tgname like 'pb_one_device%') || ', functions ' || (select count(*) from pg_proc where proname in ('pb_session_gate','pb_session_why','pb_session_take_slot','pb_device_seen','pb_share_notes','pb_owner_share_notes')) || ', setting ' || (select count(*) from pg_db_role_setting s join pg_roles r on r.oid = s.setrole where r.rolname = 'authenticator')\"" 2>&1); fi
echo "$out" | grep -E 'RESULT|ERROR|FAIL|WARNING|gate setting|after undo|left behind|CONTEXT' | head -40
su postgres -c "$B/pg_ctl -D $D/data stop >/dev/null"; rm -rf "$D"
