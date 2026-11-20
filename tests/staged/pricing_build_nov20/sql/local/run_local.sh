#!/bin/bash
# Fresh throwaway local Postgres 16: base (billing0 stubs + live definitions + billing0 01/03/04 = what is live now), extra
# stubs, then 01_pricing_limits.sql as a plain migration (one transaction), then the test block. Never the live project.
# MODE=block : instead inline the migration inside the test DO block (the shape the lead runs on live, rolled back).
S=$(cd "$(dirname "$0")/.." && pwd); B=/usr/lib/postgresql/16/bin; P=${PORT:-55861}
python3 "$S/tests/mk.py" >/dev/null || exit 1
D=$(mktemp -d /tmp/pbprice.XXXXXX); cp "$S"/local/base/*.sql "$S"/local/stubs2.sql "$S"/01_pricing_limits.sql "$S"/tests/local_t01.sql "$S"/tests/block_t01.sql "$S"/local/md5.sql "$D"/; chmod -R a+rwx "$D"; chown -R postgres "$D"
su postgres -c "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p $P -k $D' -l $D/log start >/dev/null"
Q="psql -h $D -p $P -U postgres -v ON_ERROR_STOP=1 -q -X"
base="$Q -f $D/stubs.sql && $Q -f $D/live_defs.sql && $Q -1 -f $D/01_billing_accounts.sql && $Q -1 -f $D/03_plan_reading_gate.sql && $Q -1 -f $D/04_ai_readonly.sql && $Q -f $D/stubs2.sql && $Q -At -f $D/md5.sql"
if [ "$MODE" = block ]; then out=$(su postgres -c "$base && $Q -f $D/block_t01.sql" 2>&1)
else out=$(su postgres -c "$base && $Q -1 -f $D/01_pricing_limits.sql && $Q -1 -f $D/01_pricing_limits.sql && $Q -f $D/local_t01.sql" 2>&1); fi
echo "$out" | grep -E 'RESULT|ERROR|FAIL|md5|CONTEXT' | head -40
su postgres -c "$B/pg_ctl -D $D/data stop >/dev/null"; rm -rf "$D"
