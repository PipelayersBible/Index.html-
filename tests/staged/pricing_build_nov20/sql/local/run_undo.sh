#!/bin/bash
# Builds sql/undo_01_pricing_limits.sql and proves it on a throwaway local Postgres:
# base (= live now) -> md5 of every touched function -> migration -> undo -> the same md5 again.
S=$(cd "$(dirname "$0")/.." && pwd); B=/usr/lib/postgresql/16/bin; P=${PORT:-10003}
D=$(mktemp -d /tmp/pbundo.XXXXXX); cp "$S"/local/base/*.sql "$S"/local/stubs2.sql "$S"/01_pricing_limits.sql "$S"/local/md5_undo.sql "$S"/local/dump_old.sql "$D"/; chmod -R a+rwx "$D"; chown -R postgres "$D"
su postgres -c "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p $P -k $D' -l $D/log start >/dev/null"
Q="psql -h $D -p $P -U postgres -v ON_ERROR_STOP=1 -q -X"
su postgres -c "$Q -f $D/stubs.sql && $Q -f $D/live_defs.sql && $Q -1 -f $D/01_billing_accounts.sql && $Q -1 -f $D/03_plan_reading_gate.sql && $Q -1 -f $D/04_ai_readonly.sql && $Q -f $D/stubs2.sql" >/dev/null 2>&1 || { echo base failed; exit 1; }
su postgres -c "$Q -At -f $D/md5_undo.sql" > "$D/before.txt"
su postgres -c "$Q -At -f $D/dump_old.sql" > "$D/old_defs.sql"
python3 "$S/mk_undo.py" "$D/old_defs.sql" || exit 1
cp "$S/undo_01_pricing_limits.sql" "$D/"; chmod a+r "$D/undo_01_pricing_limits.sql"
su postgres -c "$Q -1 -f $D/01_pricing_limits.sql" >/dev/null 2>"$D/mig.err"; grep -E "ERROR|FAIL" "$D/mig.err"
su postgres -c "$Q -At -f $D/md5_undo.sql" > "$D/mid.txt"
su postgres -c "$Q -1 -f $D/undo_01_pricing_limits.sql && $Q -1 -f $D/undo_01_pricing_limits.sql" >/dev/null 2>"$D/undo.err"; grep -E "ERROR|FAIL" "$D/undo.err"
su postgres -c "$Q -At -f $D/md5_undo.sql" > "$D/after.txt"
echo "functions changed by the migration: $(diff "$D/before.txt" "$D/mid.txt" | grep -c '^>')"
X='ai_daily_limit|pb_docs.limits\(p_kind'   # the local base copies of these two differ from live (a comment, line ends); the undo holds the LIVE text
if diff <(grep -Ev "$X" "$D/before.txt") <(grep -Ev "$X" "$D/after.txt") >/dev/null; then echo "UNDO OK: every touched function is back to its old text ($(grep -c . "$D/after.txt") lines compared; undo run twice)"; else echo "UNDO DIFFERS"; diff "$D/before.txt" "$D/after.txt"; fi
grep -q 'ai_daily_limit(p_user uuid) 3f9aee6fc0b4f444e93184945f88bb49' "$D/after.txt" && grep -q 'pb_docs.limits(p_kind text) 85670c8d03d94dd04f2d1c8244232b53' "$D/after.txt" && echo "UNDO OK: ai_daily_limit and pb_docs.limits have the md5 they have on live today" || echo "UNDO DIFFERS from live: ai_daily_limit / pb_docs.limits"
su postgres -c "$Q -At -c \"select 'left after undo: ' || string_agg(x, ', ') from (select n.nspname || '.' || p.proname x from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.proname in ('pb_my_limits','pb_plan_prices','pb_owner_individual_paid','prices','plan_limits','limits_of','paid_people','ai_who','ai_block','storage_gb','storage_room','individual_open','individuals_json') union all select 'setting ' || key from pb_billing.settings where key in ('individual_cents','individual_year_cents','plan_sheet_cents') union all select 'table ' || c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'pb_billing' and c.relname in ('ai_pool','individual_accounts','limit_overrides')) z\""
su postgres -c "$B/pg_ctl -D $D/data stop >/dev/null"; rm -rf "$D"
