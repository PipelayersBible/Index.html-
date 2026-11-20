#!/bin/sh
# Starts a throwaway local Postgres 16 for this folder's tests (no server access). tools/pg_up.sh ; tools/pg_down.sh
D=${PGTEST_DIR:-/var/lib/postgresql/askshelf_pg}; PORT=54395; BIN=/usr/lib/postgresql/16/bin
if [ ! -d "$D/data" ]; then mkdir -p "$D"; chown postgres "$D"; su postgres -c "$BIN/initdb -D $D/data -A trust >/dev/null"; fi
su postgres -c "$BIN/pg_ctl -D $D/data -o '-p $PORT -c listen_addresses= -k $D -c shared_buffers=256MB -c fsync=off' -l $D/log -w start >/dev/null" || true
echo "psql -q -h $D -p $PORT -U postgres -v ON_ERROR_STOP=1 postgres"
