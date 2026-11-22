#!/bin/bash
# Throwaway local Postgres 16 helper (never live). usage: pg.sh start|stop|fresh|psql <args>
B=/usr/lib/postgresql/16/bin; P=${PORT:-10871}; D=/tmp/pbbill_pg
case "$1" in
  start) rm -rf $D; mkdir -p $D; chown postgres $D; su postgres -c "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p $P -k $D' -l $D/log start >/dev/null" ;;
  stop) su postgres -c "$B/pg_ctl -D $D/data stop >/dev/null"; rm -rf $D ;;
  fresh) L=$(cd "$(dirname "$0")" && pwd); cp $L/*.sql $D/ 2>/dev/null; chmod a+r $D/*.sql
    su postgres -c "psql -h $D -p $P -U postgres -q -X -c 'drop database if exists t' -c 'create database t'" >/dev/null
    for f in replica_schema replica_live replica_live2 patchfn; do su postgres -c "psql -h $D -p $P -U postgres -v ON_ERROR_STOP=1 -q -X -d t -f $D/$f.sql" 2>&1 | grep -E 'ERROR|LINE' ; done ;;
  psql) shift; su postgres -c "PGOPTIONS='-c pb_stage.guard=skip-local-test' psql -h $D -p $P -U postgres -X -d t $*" ;;
esac
