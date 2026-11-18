#!/bin/bash
# Applies 01, 02, 03 as plain files (as a migration would) on a throwaway local Postgres over the live definitions,
# dumps pg_get_functiondef of every changed function to sql/new/, and diffs against sql/live/.
S=$(cd "$(dirname "$0")/.." && pwd); B=/usr/lib/postgresql/16/bin; P=55482
D=$(mktemp -d /tmp/pbbill0d.XXXXXX); cp "$S"/local/*.sql "$S"/0*.sql "$D"/; chmod -R a+rwx "$D"; chown -R postgres "$D"
su postgres -c "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p $P -k $D' -l $D/log start >/dev/null"
Q="psql -h $D -p $P -U postgres -v ON_ERROR_STOP=1 -q -X"
su postgres -c "$Q -f $D/stubs.sql && $Q -f $D/live_defs.sql && $Q -1 -f $D/01_billing_accounts.sql && $Q -1 -f $D/02_owner_handover.sql && $Q -1 -f $D/03_plan_reading_gate.sql" 2>&1 | grep -v '^$' && echo "migration files applied OK"
for f in pb_billing.beta_closed_guard public.pb_my_plan public.pb_owner_company_set public.pb_plans_uploaded public.pb_plans_svc_take public.pb_plans_svc_more; do
  n=${f#*.}; su postgres -c "$Q -At -c \"select rtrim(pg_get_functiondef('$f'::regproc), E'\\n')\"" > "$S/new/$n.sql"
  diff -u --label "live/$n.sql (pg_get_functiondef, live Nov 17)" --label "new/$n.sql (after 01-03)" "$S/live/$n.sql" "$S/new/$n.sql" > "$S/diffs/$n.diff"
  echo "$n $(printf '%s' "$(cat $S/new/$n.sql)" | md5sum | cut -c1-32) $(grep -c '^[-+][^-+]' $S/diffs/$n.diff) changed lines"
done
su postgres -c "$B/pg_ctl -D $D/data stop >/dev/null"; rm -rf "$D"
