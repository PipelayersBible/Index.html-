#!/bin/bash
# Throwaway local Postgres 16: the pricing build's local base (= live before Nov 20 pricing) + 01_pricing_limits.sql
# (applied on live Nov 20) + stubs3, then this migration twice, then tests/t01.sql. MODE=undo: migration, undo, md5 again.
S=$(cd "$(dirname "$0")/.." && pwd); PB=$S/../../pricing_build_nov20/sql; B=/usr/lib/postgresql/16/bin; P=${PORT:-10331}
D=$(mktemp -d /tmp/pbyear.XXXXXX); cp "$PB"/local/base/*.sql "$PB"/local/stubs2.sql "$PB"/01_pricing_limits.sql "$S"/local/stubs3.sql "$S"/local/md5.sql "$S"/01_yearly_sheets.sql "$S"/undo_01_yearly_sheets.sql "$S"/tests/t01.sql "$S"/tests/live_t01.sql "$D"/; chmod -R a+rwx "$D"; chown -R postgres "$D"
su postgres -c "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p $P -k $D' -l $D/log start >/dev/null"
Q="psql -h $D -p $P -U postgres -v ON_ERROR_STOP=1 -q -X"
base="$Q -f $D/stubs.sql && $Q -f $D/live_defs.sql && $Q -1 -f $D/01_billing_accounts.sql && $Q -1 -f $D/03_plan_reading_gate.sql && $Q -1 -f $D/04_ai_readonly.sql && $Q -f $D/stubs2.sql && $Q -1 -f $D/01_pricing_limits.sql && $Q -f $D/stubs3.sql && $Q -At -f $D/md5.sql"
if [ "$MODE" = undo ]; then out=$(su postgres -c "$base && $Q -1 -f $D/01_yearly_sheets.sql && $Q -1 -f $D/undo_01_yearly_sheets.sql && $Q -1 -f $D/undo_01_yearly_sheets.sql && $Q -At -f $D/md5.sql && $Q -At -c \"select 'acl '||proacl::text from pg_proc where oid=to_regprocedure('public.pb_owner_individual_on(uuid)')\"" 2>&1)
elif [ "$MODE" = live ]; then out=$(su postgres -c "$base && $Q -1 -f $D/live_t01.sql; $Q -At -f $D/md5.sql; $Q -At -c \"select 'sheets_read_fn '||(to_regprocedure('public.pb_owner_sheets_read()') is not null)\"" 2>&1)
else out=$(su postgres -c "$base && $Q -1 -f $D/01_yearly_sheets.sql && $Q -1 -f $D/01_yearly_sheets.sql && $Q -f $D/t01.sql" 2>&1); fi
echo "$out" | grep -E -A3 "RESULT|ERROR|FAIL|md5|acl|sheets_read_fn|CONTEXT|pb_patch:" | head -60
su postgres -c "$B/pg_ctl -D $D/data stop >/dev/null"; rm -rf "$D"
