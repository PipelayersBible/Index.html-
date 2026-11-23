#!/bin/bash
# Throwaway local Postgres 16 (never live): replica.sql (live texts where it matters) -> check make_link = live md5 ->
# block_t11 (expect 13 pass, 0 fail) -> apply x2 + undo -> make_link back to the live md5.
L=$(cd "$(dirname "$0")" && pwd); B=/usr/lib/postgresql/16/bin; P=10893; D=/tmp/pbt11_pg
python3 $L/../tests/mk.py >/dev/null || exit 1
rm -rf $D; mkdir -p $D; cp $L/replica.sql $L/../11_join_links_72h.apply.sql $L/../99_undo_11.sql $L/../tests/block_t11.sql $D/; chmod -R a+rX $D; chown -R postgres $D
su postgres -c "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p $P -k $D' -l $D/log start >/dev/null"
q() { su postgres -c "psql -h $D -p $P -U postgres -X -q $*"; }
q "-c 'create database t'"
q "-d t -v ON_ERROR_STOP=1 -f $D/replica.sql" 2>&1 | grep -E 'ERROR|LINE'
md5() { q "-d t -At -c \"select md5(pg_get_functiondef('pb_onboard.make_link(uuid,uuid,text,text,uuid,uuid,integer)'::regprocedure))\""; }
echo "== replica make_link md5 $(md5) (live ed3b2cf730367b7af102c6296a80c659)"
echo "== block_t11 (real guard): $(q "-d t -f $D/block_t11.sql" 2>&1 | grep -o 'RESULT:.*\|pb_sec:.*' | head -1)"
out=$(q "-d t -v ON_ERROR_STOP=1 -f $D/11_join_links_72h.apply.sql -f $D/11_join_links_72h.apply.sql" 2>&1 | grep ERROR); echo "== apply x2: ${out:-no errors}; make_link md5 now $(md5)"
echo "== undo: $(q "-d t -At -f $D/99_undo_11.sql") restored; md5 $(md5)"
echo "== block_t11 again: $(q "-d t -f $D/block_t11.sql" 2>&1 | grep -o 'RESULT:.*' | head -1)"
echo "== nothing kept by the block: links $(q "-d t -At -c 'select count(*) from pb_onboard.links'"), users $(q "-d t -At -c 'select count(*) from auth.users'"), backups $(q "-d t -At -c 'select count(*) from pb_sec.fn_backup'")"
[ -n "$KEEP" ] || { su postgres -c "$B/pg_ctl -D $D/data stop >/dev/null"; rm -rf $D; }
