#!/bin/sh
D=${PGTEST_DIR:-/var/lib/postgresql/askshelf_pg}; su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D $D/data -m immediate stop >/dev/null"; [ "$1" = "rm" ] && rm -rf "$D"; true
