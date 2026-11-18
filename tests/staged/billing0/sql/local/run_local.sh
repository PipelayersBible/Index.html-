#!/bin/bash
# Runs each test block on a FRESH throwaway local Postgres 16 (stubs + live definitions, then the block). Never the live project.
S=$(cd "$(dirname "$0")/.." && pwd); B=/usr/lib/postgresql/16/bin; P=${PORT:-55481}
python3 "$S/tests/mk.py" >/dev/null || exit 1
for t in ${TESTS:-t01 t02 t03}; do
  D=$(mktemp -d /tmp/pbbill0.XXXXXX); cp "$S"/local/stubs.sql "$S"/local/live_defs.sql "$S"/tests/local_$t.sql "$D"/; chmod -R a+rwx "$D"; chown -R postgres "$D"
  su postgres -c "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p $P -k $D' -l $D/log start >/dev/null"
  Q="psql -h $D -p $P -U postgres -v ON_ERROR_STOP=1 -q -X"
  out=$(su postgres -c "$Q -f $D/stubs.sql && $Q -f $D/live_defs.sql && $Q -f $D/local_$t.sql" 2>&1)
  echo "== $t: $(echo "$out" | grep -E 'RESULT|ERROR|FAIL' | head -5)"
  su postgres -c "$B/pg_ctl -D $D/data stop >/dev/null"; rm -rf "$D"
done
