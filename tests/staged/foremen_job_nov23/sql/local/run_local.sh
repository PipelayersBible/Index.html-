#!/bin/bash
# Throwaway local Postgres 16 (NEVER live): replica.sql (live table shapes + 21 live function texts, md5-checked) ->
# block_t01 (expect RESULT: 25 pass, 0 fail) -> apply x2 -> assign on a job -> undo -> nothing of ours left but the kept rows,
# live functions unchanged -> apply again: the kept assignment is back -> block_t01 again on top of the applied state.
L=$(cd "$(dirname "$0")" && pwd); Q=$(dirname $L); B=/usr/lib/postgresql/16/bin; P=${PORT:-10931}; D=/tmp/pbfmj_pg
python3 $L/make_replica.py >/dev/null && python3 $Q/tests/mk.py >/dev/null || exit 1
su postgres -c "$B/pg_ctl -D $D/data stop -m fast" >/dev/null 2>&1; rm -rf $D; mkdir -p $D
cp $L/replica.sql $Q/apply/01_job_foremen.apply.sql $Q/undo/99_undo_01.sql $Q/tests/block_t01.sql $D/; chmod -R a+rX $D; chown -R postgres $D
su postgres -c "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p $P -k $D' -l $D/log start >/dev/null"
q() { su postgres -c "psql -h $D -p $P -U postgres -X -q $*"; }
q "-c 'create database t'"
q "-d t -v ON_ERROR_STOP=1 -f $D/replica.sql" 2>&1 | grep -E 'ERROR|LINE'
MD="select count(*) || ' of ' || (select count(*) from zz.live_md5) from zz.live_md5 z where md5(pg_get_functiondef(z.sig::regprocedure)) = z.md5"
echo "== replica functions with the live md5: $(q "-d t -At -c \"$MD\"")"
echo "== block_t01: $(q "-d t -f $D/block_t01.sql" 2>&1 | grep -o 'RESULT:.*\|ERROR:.*' | head -1)"
echo "== nothing kept by the block: job_foremen table $(q "-d t -At -c \"select to_regclass('pb_pm.job_foremen') is not null\""), users $(q "-d t -At -c 'select count(*) from auth.users'"), audit $(q "-d t -At -c 'select count(*) from pb_pm.audit'")"
out=$(q "-d t -v ON_ERROR_STOP=1 -f $D/01_job_foremen.apply.sql -f $D/01_job_foremen.apply.sql" 2>&1 | grep ERROR); echo "== apply x2: ${out:-no errors}"
q "-d t -v ON_ERROR_STOP=1" >/dev/null <<'SQL'
insert into auth.users values ('00000000-0000-0000-0000-00000000000a', 'o@x.invalid'), ('00000000-0000-0000-0000-00000000000f', 'f@x.invalid');
insert into public.companies (id, name, owner_user_id, status) values ('00000000-0000-0000-0000-0000000000c1', 'k', '00000000-0000-0000-0000-00000000000a', 'active');
insert into public.company_members (company_id, user_id, role) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000f', 'foreman');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', false);
set role authenticated;
select public.pb_job_foremen_set('K-1', array['00000000-0000-0000-0000-00000000000f']::uuid[], '00000000-0000-0000-0000-00000000000a', 0);
reset role;
SQL
echo "== assigned on job K-1 as the company account (role authenticated): $(q "-d t -At -c 'select count(*) from pb_pm.job_foremen where ended_at is null'") row"
echo "== undo: $(q "-d t -At -f $D/99_undo_01.sql" 2>&1 | grep -E 'ERROR|undo 01' | tr '\n' ' ')"
LEFT="select 'functions ' || (select count(*) from pg_proc where proname in ('pb_job_foremen_get','pb_job_foremen_set','company_foremen','job_foremen_state','job_foremen_ver','foreman_role_sync'))
 || ', trigger ' || (select count(*) from pg_trigger where tgname = 'company_members_foreman_sync') || ', audit check ' || (select pg_get_constraintdef(oid) from pg_constraint where conname = 'audit_action_check')"
echo "== left after undo: $(q "-d t -At -c \"$LEFT\"")"
echo "== live functions still the live md5: $(q "-d t -At -c \"$MD\"")"
out=$(q "-d t -v ON_ERROR_STOP=1 -f $D/01_job_foremen.apply.sql" 2>&1 | grep ERROR); echo "== apply again: ${out:-no errors}; K-1 list: $(q "-d t -At -c \"select jsonb_array_length(pb_pm.job_foremen_state('00000000-0000-0000-0000-0000000000c1', 'k-1')->'assigned')\"") foreman"
echo "== block_t01 on the applied state: $(q "-d t -f $D/block_t01.sql" 2>&1 | grep -o 'RESULT:.*\|ERROR:.*' | head -1)"
[ -n "$KEEP" ] || { su postgres -c "$B/pg_ctl -D $D/data stop >/dev/null"; rm -rf $D; }
