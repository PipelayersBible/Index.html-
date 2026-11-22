#!/bin/bash
# Throwaway local Postgres 16 (never live): replica (live texts, md5-checked) -> block_t01 -> apply x2 + undo x2 (exact
# texts back) -> apply inside a DO block -> block_t01 again. The md5 guard is skipped locally only (PGOPTIONS).
L=$(cd "$(dirname "$0")" && pwd); D=/tmp/pbbill_pg
python3 $L/../src/mk.py >/dev/null || exit 1
cp $L/../01_billing.apply.sql $L/../99_undo_01.sql $L/../block_t01.sql $L/
$L/pg.sh start; $L/pg.sh fresh
$L/pg.sh psql -At -c "\"select p.proname||'('||pg_get_function_identity_arguments(p.oid)||'):'||md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('pb_billing','public','pb_crew') order by p.proname\"" > $D/md5_before.txt
echo "== replica = live texts: $(grep -c -F -f $L/live_md5.txt $D/md5_before.txt) of $(wc -l < $L/live_md5.txt)"
echo "== block_t01: $($L/pg.sh psql -q -f $D/block_t01.sql 2>&1 | grep -o 'RESULT:.*' | head -1)"
out=$($L/pg.sh psql -v ON_ERROR_STOP=1 -q -f $D/01_billing.apply.sql -f $D/01_billing.apply.sql -f $D/99_undo_01.sql -f $D/99_undo_01.sql 2>&1 | grep ERROR)
$L/pg.sh psql -At -c "\"select p.proname||'('||pg_get_function_identity_arguments(p.oid)||'):'||md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('pb_billing','public','pb_crew') order by p.proname\"" > $D/md5_after.txt
echo "== apply x2 + undo x2: ${out:-no errors}; functions back exactly: $(diff -q <(sort $D/md5_before.txt) <(sort $D/md5_after.txt) >/dev/null && echo yes || echo NO)"
printf 'do $W$ begin\n%s\nend $W$;\n' "$(cat $L/../01_billing.apply.sql)" > $D/w01.sql; chmod a+r $D/w01.sql
out=$($L/pg.sh psql -v ON_ERROR_STOP=1 -q -f $D/w01.sql 2>&1 | grep ERROR); echo "== apply inside a DO block: ${out:-no errors}"
echo "== block_t01 after apply: $($L/pg.sh psql -q -f $D/block_t01.sql 2>&1 | grep -o 'RESULT:.*' | head -1)"
[ -n "$KEEP" ] || $L/pg.sh stop
