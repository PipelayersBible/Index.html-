-- foremen_job_nov23 01: "Foremen on this job" (Tommy, Nov 23 2026), next to the job page's PMs & supers. NOT APPLIED.
-- Mirrors the PM/super assignment exactly (read on live Nov 23, read only):
--   pb_pm.job_pms (one row per assignment, ended not deleted, unique while open), pb_pm.job_state / job_ver,
--   public.pb_job_pms_get(text) and pb_job_pms_set(text, uuid[], uuid, integer) (version check "pb:changed",
--   advisory lock per job, audit row in pb_pm.audit for every save or refusal), pb_crew.pm_role_sync (ends a PM's
--   assignments when they stop being a PM or leave).
-- Who may change it (same rules as PMs/supers): anyone pb_prod.managed_company() says manages the company (the company
-- account and managers) may ADD foremen; the company account, PMs and supers take anyone off; another manager can take only
-- themselves off. Only people who are a foreman of the company now (pb_prod.is_foreman_of) can be picked.
-- New: table pb_pm.job_foremen, helpers pb_pm.job_foremen_state / job_foremen_ver / company_foremen, trigger function
-- pb_pm.foreman_role_sync (+ trigger company_members_foreman_sync), app functions public.pb_job_foremen_get /
-- pb_job_foremen_set (EXECUTE for authenticated only). Changed live object: pb_pm.audit's check audit_action_check also
-- allows 'job_foremen' (one audit trail with the PM changes). No live function is replaced.
-- Not kept on the phone, like the PM list (it holds email addresses): it loads with signal.
-- Run as postgres, in one transaction (apply/01_job_foremen.apply.sql). Safe to run twice. Undo: undo/99_undo_01.sql.

-- ---- guard: refuse (nothing changes) if what this builds on is not as read on Nov 23 ----
do $guard$
declare d text;
begin
  if to_regclass('pb_pm.job_pms') is null or to_regclass('pb_pm.audit') is null or to_regprocedure('pb_pm.permanent()') is null
     or to_regprocedure('pb_prod.managed_company(uuid)') is null or to_regprocedure('pb_prod.is_foreman_of(uuid,uuid)') is null
     or to_regprocedure('pb_pm.is_pm(uuid,uuid)') is null or to_regprocedure('pb_crew.display_name(uuid,uuid)') is null then
    raise exception 'foremen_job_nov23: refused: pb_pm / pb_prod objects this builds on are missing';
  end if;
  select pg_get_constraintdef(c.oid) into d from pg_constraint c where c.conrelid = 'pb_pm.audit'::regclass and c.conname = 'audit_action_check';
  if d is distinct from $c$CHECK ((action = ANY (ARRAY['job_pms'::text, 'settings'::text])))$c$
     and d is distinct from $c$CHECK ((action = ANY (ARRAY['job_pms'::text, 'settings'::text, 'job_foremen'::text])))$c$ then
    raise exception 'foremen_job_nov23: refused: pb_pm.audit audit_action_check changed on live since Nov 23 (%)', d;
  end if;
  if md5(pg_get_functiondef('pb_prod.is_foreman_of(uuid,uuid)'::regprocedure)) <> '58f30a56c0fb2ffe9d284109025d054a' then
    raise exception 'foremen_job_nov23: refused: pb_prod.is_foreman_of changed on live since Nov 23';
  end if;
end $guard$;

-- ---- the assignments (like pb_pm.job_pms) ----
create table if not exists pb_pm.job_foremen (
  id          bigint generated always as identity primary key,
  company_id  uuid not null references public.companies(id),
  job_key     text not null check (length(job_key) between 1 and 60),
  job_number  text check (length(job_number) <= 60),
  user_id     uuid not null references auth.users(id),
  assigned_by uuid not null,
  assigned_at timestamptz not null default now(),
  ended_at    timestamptz,
  ended_by    uuid,
  end_reason  text check (end_reason in ('unassigned', 'not_foreman', 'left_company'))
);
create unique index if not exists pm_job_foremen_active_idx on pb_pm.job_foremen (company_id, job_key, user_id) where ended_at is null;
create index if not exists pm_job_foremen_user_idx on pb_pm.job_foremen (user_id) where ended_at is null;
alter table pb_pm.job_foremen enable row level security;      -- no policies, no grants: only the functions below read it
revoke all on table pb_pm.job_foremen from public, anon, authenticated;
drop trigger if exists pm_job_foremen_no_delete on pb_pm.job_foremen;
create trigger pm_job_foremen_no_delete before delete on pb_pm.job_foremen for each row execute function pb_pm.permanent();
drop trigger if exists pm_job_foremen_no_truncate on pb_pm.job_foremen;
create trigger pm_job_foremen_no_truncate before truncate on pb_pm.job_foremen for each statement execute function pb_pm.permanent();

-- one audit trail with the PM changes
alter table pb_pm.audit drop constraint if exists audit_action_check;
alter table pb_pm.audit add constraint audit_action_check check (action = any (array['job_pms'::text, 'settings'::text, 'job_foremen'::text]));

-- ---- helpers (private: pb_pm has no API access) ----
-- the company's foremen now, to pick from
create or replace function pb_pm.company_foremen(p_company uuid) returns jsonb
language sql stable security definer set search_path to '' as $f$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', m.user_id, 'email', u.email, 'name', pb_crew.display_name(p_company, m.user_id))
      order by lower(coalesce(pb_crew.display_name(p_company, m.user_id), u.email, ''))), '[]'::jsonb)
  from public.company_members m left join auth.users u on u.id = m.user_id
  where m.company_id = p_company and m.role = 'foreman' and pb_prod.is_foreman_of(m.user_id, p_company)
$f$;
-- the job's list as the app shows it (like pb_pm.job_state)
create or replace function pb_pm.job_foremen_state(p_company uuid, p_job_key text) returns jsonb
language sql stable security definer set search_path to '' as $f$
  select jsonb_build_object(
    'job_key', p_job_key,
    'assigned', coalesce((select jsonb_agg(jsonb_build_object('user_id', a.user_id, 'email', u.email,
          'name', pb_crew.display_name(p_company, a.user_id), 'since', a.assigned_at,
          'current', pb_prod.is_foreman_of(a.user_id, p_company)) order by a.assigned_at, a.id)
        from pb_pm.job_foremen a left join auth.users u on u.id = a.user_id
        where a.company_id = p_company and a.job_key = p_job_key and a.ended_at is null), '[]'::jsonb),
    'candidates', pb_pm.company_foremen(p_company),
    'server_at', now())
$f$;
-- changes every time the list changes (like pb_pm.job_ver): a save made on an older copy is refused with pb:changed
create or replace function pb_pm.job_foremen_ver(p_company uuid, p_job_key text) returns integer
language sql stable security definer set search_path to '' as $f$
  select (count(*) + count(a.ended_at))::integer from pb_pm.job_foremen a where a.company_id = p_company and a.job_key = p_job_key
$f$;
-- a foreman who stops being a foreman, or leaves, comes off every job (like pb_crew.pm_role_sync does for PMs)
create or replace function pb_pm.foreman_role_sync() returns trigger
language plpgsql security definer set search_path to '' as $f$
begin
  if tg_op = 'UPDATE' and old.role = 'foreman' and (new.role is distinct from 'foreman' or new.company_id is distinct from old.company_id) then
    update pb_pm.job_foremen set ended_at = now(), end_reason = 'not_foreman' where company_id = old.company_id and user_id = old.user_id and ended_at is null;
  end if;
  if tg_op = 'DELETE' and old.role = 'foreman' then
    update pb_pm.job_foremen set ended_at = now(), end_reason = 'left_company' where company_id = old.company_id and user_id = old.user_id and ended_at is null;
  end if;
  return null;
end $f$;
drop trigger if exists company_members_foreman_sync on public.company_members;
create trigger company_members_foreman_sync after delete or update of role, company_id on public.company_members
  for each row execute function pb_pm.foreman_role_sync();

-- ---- app functions ----
create or replace function public.pb_job_foremen_get(p_job_number text) returns jsonb
language plpgsql stable security definer set search_path to '' as $f$
declare v_uid uuid := auth.uid(); v_co uuid; v_key text := pb_prod.job_key(p_job_number); v_own boolean;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  v_co := pb_prod.managed_company(v_uid);
  if v_co is null then raise exception 'pb:not_company_account'; end if;
  if v_key = '' then raise exception 'pb:bad_job'; end if;
  v_own := exists (select 1 from public.companies c where c.id = v_co and c.owner_user_id = v_uid);
  return jsonb_build_object('ok', true, 'company_id', v_co, 'can_edit', true, 'is_owner', v_own,
      'may_remove', v_own or pb_pm.is_pm(v_uid, v_co))       -- takes other foremen off (else only themselves)
    || pb_pm.job_foremen_state(v_co, v_key) || jsonb_build_object('ver', pb_pm.job_foremen_ver(v_co, v_key));
end $f$;

create or replace function public.pb_job_foremen_set(p_job_number text, p_user_ids uuid[], p_expect_uid uuid, p_expect_ver integer) returns jsonb
language plpgsql security definer set search_path to '' as $f$
declare v_uid uuid := auth.uid(); v_co uuid; v_key text := pb_prod.job_key(p_job_number); v_ids uuid[]; v_old jsonb; v_bad uuid; v_ver integer;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is distinct from v_uid then raise exception 'pb:wrong_account'; end if;
  v_co := pb_prod.managed_company(v_uid);
  if v_co is null then raise exception 'pb:not_company_account'; end if;
  if v_key = '' then raise exception 'pb:bad_job'; end if;
  if p_expect_ver is null or p_expect_ver < 0 then raise exception 'pb:bad_version'; end if;
  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(coalesce(p_user_ids, '{}'::uuid[])) x where x is not null;
  if cardinality(v_ids) > 20 then raise exception 'pb:too_many_foremen'; end if;
  perform pg_advisory_xact_lock(hashtextextended('pb_pm_jobfm:' || v_co::text || ':' || v_key, 0));
  v_ver := pb_pm.job_foremen_ver(v_co, v_key);
  if v_ver <> p_expect_ver then -- someone changed the list since this copy read it; nothing is written
    return jsonb_build_object('ok', false, 'code', 'pb:changed', 'company_id', v_co) || pb_pm.job_foremen_state(v_co, v_key) || jsonb_build_object('ver', v_ver);
  end if;
  v_old := (pb_pm.job_foremen_state(v_co, v_key))->'assigned';
  select x into v_bad from unnest(v_ids) x where not pb_prod.is_foreman_of(x, v_co) limit 1;
  if v_bad is not null then
    insert into pb_pm.audit (company_id, actor, action, job_key, old_value, new_value, outcome, code)
      values (v_co, v_uid, 'job_foremen', v_key, v_old, to_jsonb(v_ids), 'refused', 'pb:not_foreman');
    return jsonb_build_object('ok', false, 'code', 'pb:not_foreman', 'user_id', v_bad);
  end if;
  -- the company account, PMs and supers take anyone off; another manager only themselves (as for PMs/supers)
  if not (exists (select 1 from public.companies c where c.id = v_co and c.owner_user_id = v_uid) or pb_pm.is_pm(v_uid, v_co)) then
    select a.user_id into v_bad from pb_pm.job_foremen a
      where a.company_id = v_co and a.job_key = v_key and a.ended_at is null and a.user_id <> v_uid and not (a.user_id = any (v_ids)) limit 1;
    if v_bad is not null then
      insert into pb_pm.audit (company_id, actor, action, job_key, old_value, new_value, outcome, code)
        values (v_co, v_uid, 'job_foremen', v_key, v_old, to_jsonb(v_ids), 'refused', 'pb:owner_only');
      return jsonb_build_object('ok', false, 'code', 'pb:owner_only', 'user_id', v_bad);
    end if;
  end if;
  update pb_pm.job_foremen set ended_at = now(), ended_by = v_uid, end_reason = 'unassigned'
    where company_id = v_co and job_key = v_key and ended_at is null and not (user_id = any (v_ids));
  insert into pb_pm.job_foremen (company_id, job_key, job_number, user_id, assigned_by)
    select v_co, v_key, left(btrim(p_job_number), 60), x, v_uid from unnest(v_ids) x
    on conflict (company_id, job_key, user_id) where ended_at is null do nothing;
  insert into pb_pm.audit (company_id, actor, action, job_key, old_value, new_value, outcome, code)
    values (v_co, v_uid, 'job_foremen', v_key, v_old, to_jsonb(v_ids), 'ok', null);
  return jsonb_build_object('ok', true, 'company_id', v_co) || pb_pm.job_foremen_state(v_co, v_key) || jsonb_build_object('ver', pb_pm.job_foremen_ver(v_co, v_key));
end $f$;

-- ---- privileges: the two app functions for signed-in people only; nothing else reachable from the API ----
revoke all on function pb_pm.company_foremen(uuid), pb_pm.job_foremen_state(uuid, text), pb_pm.job_foremen_ver(uuid, text), pb_pm.foreman_role_sync()
  from public, anon, authenticated;
revoke all on function public.pb_job_foremen_get(text), public.pb_job_foremen_set(text, uuid[], uuid, integer) from public, anon;
grant execute on function public.pb_job_foremen_get(text), public.pb_job_foremen_set(text, uuid[], uuid, integer) to authenticated;
