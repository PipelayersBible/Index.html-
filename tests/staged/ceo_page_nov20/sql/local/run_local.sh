#!/bin/bash
# Throwaway local Postgres 16: stand-ins of the live objects, the migration applied TWICE, then the local test (rolled back by its RESULT error),
# then the live test block (tests/live_t01.sql) on the same base, then the undo twice. Never the live project.
S=$(cd "$(dirname "$0")/.." && pwd); B=/usr/lib/postgresql/16/bin; P=${PORT:-10271}
D=$(mktemp -d /tmp/pbdash.XXXXXX); cp "$S"/local/stubs.sql "$S"/local/flags_stub.sql "$S"/01_owner_dashboard.sql "$S"/99_undo.sql "$S"/tests/local_t01.sql "$S"/tests/live_t01.sql "$D"/; chmod -R a+rwx "$D"; chown -R postgres "$D"
su postgres -c "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p $P -k $D' -l $D/log start >/dev/null"
Q="psql -h $D -p $P -U postgres -v ON_ERROR_STOP=1 -q -X"
echo "== migration x2 + local test (pb_auth not there)"
su postgres -c "$Q -f $D/stubs.sql && $Q -1 -f $D/01_owner_dashboard.sql && $Q -1 -f $D/01_owner_dashboard.sql && $Q -f $D/local_t01.sql" 2>&1 | grep -E 'RESULT|ERROR|FAIL|CONTEXT|LINE' | head -20
echo "== live test block, without pb_auth"
su postgres -c "$Q -f $D/live_t01.sql" 2>&1 | grep -E 'RESULT|ERROR|FAIL|CONTEXT' | head -10
echo "== with pb_auth.flags (one_device_nov20 shape) + local test sharing section"
su postgres -c "$Q -f $D/flags_stub.sql && $Q -f $D/live_t01.sql" 2>&1 | grep -E 'RESULT|ERROR|FAIL|CONTEXT' | head -10
echo "== undo x2"
su postgres -c "$Q -1 -f $D/99_undo.sql && $Q -1 -f $D/99_undo.sql && $Q -At -c \"select count(*) from pg_proc where proname in ('pb_owner_dashboard','dash_uc')\"" 2>&1 | tail -3
su postgres -c "$B/pg_ctl -D $D/data stop >/dev/null"; rm -rf "$D"
