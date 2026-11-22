#!/bin/bash
# Throwaway local Postgres 16 (never live): replica.sql, then for each block_tNN.sql a fresh database: the block (expects
# RESULT: n pass, 0 fail), each apply file twice + its undo, and finally all five applied in order then undone in reverse.
# The md5 guard is skipped locally (the stand-in functions are not the live text): PGOPTIONS -c pb_stage.guard=skip-local-test.
L=$(cd "$(dirname "$0")/.." && pwd); B=/usr/lib/postgresql/16/bin; P=${PORT:-10861}
python3 "$L/src/mk.py" >/dev/null || exit 1
D=$(mktemp -d /tmp/pbrec.XXXXXX); cp -r "$L" $D/s; chmod -R a+rwx "$D"; chown -R postgres "$D"
Q="psql -h $D -p $P -U postgres -v ON_ERROR_STOP=1 -q -X -d t"
G="PGOPTIONS='-c pb_stage.guard=skip-local-test'"
su postgres -c "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p $P -k $D' -l $D/log start >/dev/null"
fresh() { su postgres -c "psql -h $D -p $P -U postgres -q -X -c 'drop database if exists t' -c 'create database t'" >/dev/null 2>&1; su postgres -c "$Q -f $D/s/local/replica.sql" 2>&1 | grep -E 'ERROR' ; }
for n in ${ONLY:-01 02 03 04 05}; do
  fresh
  echo "== block_t$n"; su postgres -c "$G $Q -f $D/s/block_t$n.sql" 2>&1 | grep -E 'RESULT|ERROR|CONTEXT|LINE' | head -8
  a=$(ls $D/s/${n}_*.apply.sql); deps=""; for k in 01 02 03 04 05; do [ "$k" \< "$n" ] && deps="$deps -f $(ls $D/s/${k}_*.apply.sql)"; done
  out=$(su postgres -c "$G $Q $deps -f $a -f $a -f $D/s/99_undo_$n.sql -f $D/s/99_undo_$n.sql" 2>&1); echo "   deps + apply x2 + undo x2: $(echo "$out" | grep -E 'ERROR' | head -3 || true)${out:+ }ok"
done
fresh
out=$(su postgres -c "$G $Q -f $D/s/01_patchfn.apply.sql -f $D/s/02_b3.apply.sql -f $D/s/03_b9.apply.sql -f $D/s/04_b5.apply.sql -f $D/s/05_b8.apply.sql \
  -f $D/s/99_undo_05.sql -f $D/s/99_undo_04.sql -f $D/s/99_undo_03.sql -f $D/s/99_undo_02.sql -f $D/s/99_undo_01.sql" 2>&1)
left=$(su postgres -c "$Q -At -c \"select 'pb_stage ' || (select count(*) from pg_namespace where nspname = 'pb_stage') || ', new triggers ' || (select count(*) from pg_trigger where tgname in ('events_guard','talks_given_versions','open_permits_no_delete','zz_pb_audit') and tgrelid::regclass::text in ('pb_daily.events','pb_prod.talks_given','pb_safety.open_permits')) || ', run_versions fn ' || (select count(*) from pg_proc where proname = 'pb_prod_run_versions') || ', drop_open has flag ' || (position('allow_record_delete' in pg_get_functiondef('pb_safety.drop_open_on_close()'::regprocedure)) > 0)\"" 2>&1)
echo "== all five in order, then all undone in reverse: $(echo "$out" | grep -E 'ERROR' | head -3) left: $left"
# also: each apply file pasted inside a DO block (how the lead runs them)
fresh
for f in 01_patchfn 02_b3 03_b9 04_b5 05_b8; do printf 'do $W$ begin\n%s\nend $W$;\n' "$(cat $D/s/$f.apply.sql)" > $D/w_$f.sql; done
out=$(su postgres -c "$G $Q -f $D/w_01_patchfn.sql -f $D/w_02_b3.sql -f $D/w_03_b9.sql -f $D/w_04_b5.sql -f $D/w_05_b8.sql" 2>&1)
echo "== each apply file inside a DO block, in order: $(echo "$out" | grep -E 'ERROR' | head -3) done"
su postgres -c "$B/pg_ctl -D $D/data stop >/dev/null"; rm -rf "$D"
