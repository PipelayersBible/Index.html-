#!/bin/bash
# Integration (throwaway local Postgres 16, never live): messaging_nov22's local DB (its stubs) + the live pieces foremen 01
# needs (bridge_messaging.sql) + foremen 01 applied for real -> messaging block_t01, so 3t6 runs through pb_job_foremen_set.
F=$(cd "$(dirname "$0")/.." && pwd); M=$F/../../messaging_nov22/sql; ST=$F/../..; B=/usr/lib/postgresql/16/bin; P=${PORT:-10933}
python3 $F/tests/mk.py >/dev/null; python3 $M/tests/mk.py >/dev/null || exit 1
D=$(mktemp -d /tmp/pbfmjm.XXXXXX); cp $ST/one_device_nov20/sql/local/stubs.sql $D/od.sql; cp $ST/security_nov22/sql/local/stubs.sql $D/sec.sql; cp $M/local/stubs.sql $D/msg.sql
cp $F/local/bridge_messaging.sql $F/apply/01_job_foremen.apply.sql $M/tests/block_t01.sql $D/; chmod -R a+rwx $D; chown -R postgres $D
Q="psql -h $D -p $P -U postgres -X -q"
su postgres -c "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p $P -k $D' -l $D/log start >/dev/null && $Q -c 'create database t'" >/dev/null
su postgres -c "$Q -d t -f $D/od.sql && $Q -d t -f $D/sec.sql && $Q -d t -f $D/msg.sql && $Q -d t -v ON_ERROR_STOP=1 -f $D/bridge_messaging.sql" 2>&1 | grep ERROR
echo "== foremen 01 applied on the messaging DB: $(su postgres -c "$Q -d t -v ON_ERROR_STOP=1 -f $D/01_job_foremen.apply.sql" 2>&1 | grep ERROR || echo ok)"
echo "== messaging block_t01 with foremen 01: $(su postgres -c "PGOPTIONS='-c pb_msg.guard=skip-local-test' $Q -d t -f $D/block_t01.sql" 2>&1 | grep -o 'RESULT:.*\|ERROR:.*' | head -1)"
su postgres -c "$B/pg_ctl -D $D/data stop >/dev/null"; rm -rf $D
