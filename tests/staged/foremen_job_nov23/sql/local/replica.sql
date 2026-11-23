-- foremen_job_nov23: throwaway LOCAL replica (never live). Tables, constraints, triggers, RLS and grants as read on live
-- Nov 23 2026 (read only) for what the PM/super assignment and the new foremen assignment touch. Function texts come from
-- live_defs.json (verbatim pg_get_functiondef); make_replica.py joins the two into replica.sql and run_local.sh checks
-- every replica function's md5 equals live.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;
-- live: functions made by postgres get no PUBLIC execute (pg_default_acl "postgres=X/postgres")
alter default privileges for role postgres revoke execute on functions from public;
create schema auth; create schema pb_prod; create schema pb_crew; create schema pb_reports; create schema pb_pm;
revoke all on schema public from public; grant usage on schema public to public, anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub', '')::uuid $$;
grant execute on function auth.uid() to public;

create table public.companies (id uuid not null default gen_random_uuid() primary key, name text not null, owner_user_id uuid not null references auth.users(id),
  status text not null default 'inactive', stripe_customer_id text, stripe_subscription_id text, current_period_end timestamptz, created_at timestamptz default now(),
  updated_at timestamptz default now(), plan text not null default 'paid', trial_ends_at timestamptz,
  constraint companies_plan_check check (plan = any (array['paid'::text, 'trial'::text])),
  constraint companies_status_check check (status = any (array['active'::text, 'inactive'::text, 'canceled'::text, 'past_due'::text])));
create table public.company_members (id uuid not null default gen_random_uuid() primary key, company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) unique, role text not null, created_at timestamptz default now(), joined_at timestamptz default now(),
  title text not null default 'project_manager',
  constraint company_members_role_check check (role = any (array['foreman'::text, 'pipelayer'::text, 'pm'::text])),
  constraint company_members_title_check check (title = any (array['project_manager'::text, 'superintendent'::text])));
create table pb_reports.managers (company_id uuid not null references public.companies(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(), primary key (company_id, user_id));
create table pb_crew.invitations (id uuid not null default gen_random_uuid() primary key, company_id uuid not null references public.companies(id), user_id uuid not null references auth.users(id),
  role text not null, invited_by uuid not null, status text not null default 'pending', created_at timestamptz not null default now(), decided_at timestamptz, title text,
  constraint invitations_role_check check (role = any (array['foreman'::text, 'pipelayer'::text, 'pm'::text])));
create table pb_crew.member_labels (company_id uuid not null references public.companies(id), user_id uuid not null references auth.users(id), label text check (length(label) between 1 and 80),
  set_by uuid not null, set_at timestamptz not null default now(), primary key (company_id, user_id));
create table pb_crew.own_names (user_id uuid primary key references auth.users(id), name text check (length(name) between 1 and 80), updated_at timestamptz not null default now());
create table pb_prod.push_prefs (user_id uuid primary key, crew_production boolean not null default true, tz text check (tz is null or length(tz) <= 64), updated_at timestamptz not null default now());
create table pb_prod.tz_names (name text primary key);
insert into pb_prod.tz_names values ('America/Chicago'), ('America/Los_Angeles'), ('America/New_York'), ('America/Denver');
create table pb_pm.settings (company_id uuid primary key references public.companies(id), owner_copies boolean not null default false,
  digest_time time not null default '06:00:00', tz text not null default 'America/Chicago' check (length(tz) between 1 and 64), updated_by uuid,
  updated_at timestamptz not null default now(), locate_days integer not null default 28 check (locate_days between 1 and 60), tz_chosen boolean not null default false);
create table pb_pm.job_pms (id bigint generated always as identity primary key, company_id uuid not null references public.companies(id), job_key text not null check (length(job_key) between 1 and 60),
  job_number text check (length(job_number) <= 60), user_id uuid not null references auth.users(id), assigned_by uuid not null, assigned_at timestamptz not null default now(),
  ended_at timestamptz, ended_by uuid, end_reason text check (end_reason = any (array['unassigned'::text, 'not_pm'::text, 'left_company'::text])));
create unique index pm_job_pms_active_idx on pb_pm.job_pms (company_id, job_key, user_id) where ended_at is null;
create index pm_job_pms_user_idx on pb_pm.job_pms (user_id) where ended_at is null;
create table pb_pm.audit (id bigint generated always as identity primary key, at timestamptz not null default now(), company_id uuid not null, actor uuid not null,
  action text not null, job_key text, old_value jsonb, new_value jsonb, outcome text not null, code text,
  constraint audit_action_check check (action = any (array['job_pms'::text, 'settings'::text])),
  constraint audit_code_check check (length(code) <= 80), constraint audit_outcome_check check (outcome = any (array['ok'::text, 'refused'::text])));
create index pm_audit_company_idx on pb_pm.audit (company_id, at desc);
alter table public.companies enable row level security; alter table public.company_members enable row level security; alter table pb_reports.managers enable row level security;
alter table pb_pm.job_pms enable row level security; alter table pb_pm.audit enable row level security; alter table pb_pm.settings enable row level security;
grant select on public.company_members to authenticated;   -- (live also grants MAINTAIN, a Postgres 17 privilege; this replica is 16)

-- ==== live function texts (live rogfassochneycezecxa, Nov 23 2026, read only (pg_get_functiondef)) ====
CREATE OR REPLACE FUNCTION pb_prod.my_member(p_uid uuid)
 RETURNS TABLE(company_id uuid, role text, joined_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.company_id, m.role, coalesce(m.joined_at, m.created_at) from public.company_members m join public.companies c on c.id = m.company_id
  where m.user_id = p_uid and c.status = 'active' order by m.created_at desc nulls last limit 1
$function$
;
CREATE OR REPLACE FUNCTION pb_prod.managed_company(p_uid uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select c.id from public.companies c
  where p_uid is not null and c.status = 'active'
    and (c.owner_user_id = p_uid
      or (exists (select 1 from pb_reports.managers mg where mg.company_id = c.id and mg.user_id = p_uid)
          and c.id = (select x.company_id from pb_prod.my_member(p_uid) x)))
  order by (c.id = (select x.company_id from pb_prod.my_member(p_uid) x)) desc nulls last, c.created_at desc
  limit 1
$function$
;
CREATE OR REPLACE FUNCTION pb_prod.job_key(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select left(lower(btrim(coalesce(p, ''))), 60)
$function$
;
CREATE OR REPLACE FUNCTION pb_prod.is_foreman_of(p_uid uuid, p_company uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from pb_prod.my_member(p_uid) x where x.company_id = p_company and x.role = 'foreman')
$function$
;
CREATE OR REPLACE FUNCTION pb_prod.tz_valid(p text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  -- feat_server: the same answer as the zone list Postgres knows (pg_timezone_names), from its cached copy
  select p is not null and exists (select 1 from pb_prod.tz_names t where t.name = p)
$function$
;
CREATE OR REPLACE FUNCTION pb_crew.label_of(p_company uuid, p_user uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select l.label from pb_crew.member_labels l where l.company_id = p_company and l.user_id = p_user
$function$
;
CREATE OR REPLACE FUNCTION pb_crew.own_name(p_user uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select o.name from pb_crew.own_names o where o.user_id = p_user
$function$
;
CREATE OR REPLACE FUNCTION pb_crew.display_name(p_company uuid, p_user uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(pb_crew.label_of(p_company, p_user), pb_crew.own_name(p_user))
$function$
;
CREATE OR REPLACE FUNCTION pb_crew.title_of(p_company uuid, p_user uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case when m.role = 'pm' then coalesce(m.title, 'project_manager') end
  from public.company_members m where m.user_id = p_user and m.company_id = p_company
$function$
;
CREATE OR REPLACE FUNCTION pb_pm.is_pm(p_user uuid, p_company uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p_user is not null and p_company is not null
     and exists (select 1 from public.company_members m where m.user_id = p_user and m.company_id = p_company and m.role = 'pm')
     and pb_prod.managed_company(p_user) is not distinct from p_company
$function$
;
CREATE OR REPLACE FUNCTION pb_pm.fallback_tz(p_company uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  -- feat_server: the company's zone when nobody chose one: the owner's phone, else the latest PM's / super's / manager's
  -- phone (still a manager of this company), else America/Chicago
  select coalesce(
    (select p.tz from public.companies c join pb_prod.push_prefs p on p.user_id = c.owner_user_id
      where c.id = p_company and pb_prod.tz_valid(p.tz)),
    (select p.tz from pb_reports.managers m join pb_prod.push_prefs p on p.user_id = m.user_id
      where m.company_id = p_company and pb_prod.tz_valid(p.tz) and pb_prod.managed_company(m.user_id) = p_company
      order by p.updated_at desc limit 1),
    'America/Chicago')
$function$
;
CREATE OR REPLACE FUNCTION pb_pm.settings_of(p_company uuid, OUT owner_copies boolean, OUT digest_time time without time zone, OUT tz text)
 RETURNS record
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(s.owner_copies, false /* feat_office:copies default off (owner, Oct 28) */), coalesce(s.digest_time, '06:00'::time), case when s.tz_chosen and pb_prod.tz_valid(s.tz) then s.tz else pb_pm.fallback_tz(p_company) end /* feat_server:tzfb */
  from (select 1) x left join pb_pm.settings s on s.company_id = p_company
$function$
;
CREATE OR REPLACE FUNCTION pb_pm.ready()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from pg_catalog.pg_constraint c where c.conrelid = 'public.company_members'::regclass
                   and c.conname = 'company_members_role_check' and pg_catalog.pg_get_constraintdef(c.oid) like '%''pm''%')
     and exists (select 1 from pg_catalog.pg_constraint c where c.conrelid = 'pb_crew.invitations'::regclass
                   and c.conname = 'invitations_role_check' and pg_catalog.pg_get_constraintdef(c.oid) like '%''pm''%')
     and exists (select 1 from pg_catalog.pg_trigger t where t.tgrelid = 'public.company_members'::regclass
                   and t.tgname = 'company_members_pm_sync' and not t.tgisinternal)
$function$
;
CREATE OR REPLACE FUNCTION pb_pm.company_pms(p_company uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', m.user_id, 'email', u.email, 'name', pb_crew.display_name(p_company, m.user_id), 'title', coalesce(m.title, 'project_manager') /* feat_super */)
      order by lower(coalesce(pb_crew.display_name(p_company, m.user_id), u.email, ''))), '[]'::jsonb)
  from public.company_members m left join auth.users u on u.id = m.user_id
  where m.company_id = p_company and m.role = 'pm' and pb_pm.is_pm(m.user_id, p_company)
$function$
;
CREATE OR REPLACE FUNCTION pb_pm.job_state(p_company uuid, p_job_key text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'job_key', p_job_key,
    'assigned', coalesce((select jsonb_agg(jsonb_build_object('user_id', a.user_id, 'email', u.email,
          'name', pb_crew.display_name(p_company, a.user_id),
          'since', a.assigned_at, 'current', pb_pm.is_pm(a.user_id, p_company), 'title', pb_crew.title_of(p_company, a.user_id) /* feat_super */) order by a.assigned_at, a.id)
        from pb_pm.job_pms a left join auth.users u on u.id = a.user_id
        where a.company_id = p_company and a.job_key = p_job_key and a.ended_at is null), '[]'::jsonb),
    'candidates', pb_pm.company_pms(p_company),
    'owner_copies', (pb_pm.settings_of(p_company)).owner_copies,
    'ready', pb_pm.ready(),
    'server_at', now())
$function$
;
CREATE OR REPLACE FUNCTION pb_pm.job_ver(p_company uuid, p_job_key text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (count(*) + count(a.ended_at))::integer from pb_pm.job_pms a where a.company_id = p_company and a.job_key = p_job_key
$function$
;
CREATE OR REPLACE FUNCTION pb_pm.permanent()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  raise exception 'pb:pm_history_is_permanent';
end $function$
;
CREATE OR REPLACE FUNCTION pb_crew.pm_role_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  begin
    if tg_op in ('INSERT', 'UPDATE') and new.role = 'pm' then
      insert into pb_reports.managers (company_id, user_id) values (new.company_id, new.user_id) on conflict do nothing;
    end if;
    if tg_op = 'UPDATE' and old.role = 'pm' and (new.role is distinct from 'pm' or new.company_id is distinct from old.company_id) then
      delete from pb_reports.managers where company_id = old.company_id and user_id = old.user_id;
      update pb_pm.job_pms set ended_at = now(), end_reason = 'not_pm' where company_id = old.company_id and user_id = old.user_id and ended_at is null;
    end if;
    if tg_op = 'DELETE' and old.role = 'pm' then
      delete from pb_reports.managers where company_id = old.company_id and user_id = old.user_id;
      update pb_pm.job_pms set ended_at = now(), end_reason = 'left_company' where company_id = old.company_id and user_id = old.user_id and ended_at is null;
    end if;
    return null;
  end $function$
;
CREATE OR REPLACE FUNCTION public.pb_job_pms_get(p_job_number text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_co uuid; v_key text := pb_prod.job_key(p_job_number);
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  v_co := pb_prod.managed_company(v_uid);
  if v_co is null then raise exception 'pb:not_company_account'; end if;
  if v_key = '' then raise exception 'pb:bad_job'; end if;
  return jsonb_build_object('ok', true, 'company_id', v_co, 'can_edit', true,
    'is_owner', exists (select 1 from public.companies c where c.id = v_co and c.owner_user_id = v_uid)) || pb_pm.job_state(v_co, v_key)
    || jsonb_build_object('ver', pb_pm.job_ver(v_co, v_key)); -- office3 #32
end $function$
;
CREATE OR REPLACE FUNCTION public.pb_job_pms_set(p_job_number text, p_user_ids uuid[], p_expect_uid uuid, p_expect_ver integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_co uuid; v_key text := pb_prod.job_key(p_job_number); v_ids uuid[]; v_old jsonb; v_bad uuid; v_ver integer;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is distinct from v_uid then raise exception 'pb:wrong_account'; end if;
  v_co := pb_prod.managed_company(v_uid);
  if v_co is null then raise exception 'pb:not_company_account'; end if;
  if v_key = '' then raise exception 'pb:bad_job'; end if;
  if p_expect_ver is null or p_expect_ver < 0 then raise exception 'pb:bad_version'; end if;
  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(coalesce(p_user_ids, '{}'::uuid[])) x where x is not null;
  if cardinality(v_ids) > 10 then raise exception 'pb:too_many_pms'; end if;
  perform pg_advisory_xact_lock(hashtextextended('pb_pm_job:' || v_co::text || ':' || v_key, 0));
  v_ver := pb_pm.job_ver(v_co, v_key);
  if v_ver <> p_expect_ver then -- office3 #32: someone changed the list since this copy read it; nothing is written
    return jsonb_build_object('ok', false, 'code', 'pb:changed', 'company_id', v_co) || pb_pm.job_state(v_co, v_key) || jsonb_build_object('ver', v_ver);
  end if;
  select x into v_bad from unnest(v_ids) x where not pb_pm.is_pm(x, v_co) limit 1;
  v_old := (pb_pm.job_state(v_co, v_key))->'assigned';
  if v_bad is not null then
    insert into pb_pm.audit (company_id, actor, action, job_key, old_value, new_value, outcome, code)
      values (v_co, v_uid, 'job_pms', v_key, v_old, to_jsonb(v_ids), 'refused', 'pb:not_pm');
    return jsonb_build_object('ok', false, 'code', 'pb:not_pm', 'user_id', v_bad);
  end if;
  -- feat_office:pms (owner rule Oct 28): the owner, PMs and supers take anyone off; a manager only themselves
  if not (exists (select 1 from public.companies c where c.id = v_co and c.owner_user_id = v_uid) or pb_pm.is_pm(v_uid, v_co)) then
    select a.user_id into v_bad from pb_pm.job_pms a
      where a.company_id = v_co and a.job_key = v_key and a.ended_at is null and a.user_id <> v_uid and not (a.user_id = any (v_ids)) limit 1;
    if v_bad is not null then
      insert into pb_pm.audit (company_id, actor, action, job_key, old_value, new_value, outcome, code)
        values (v_co, v_uid, 'job_pms', v_key, v_old, to_jsonb(v_ids), 'refused', 'pb:owner_only');
      return jsonb_build_object('ok', false, 'code', 'pb:owner_only', 'user_id', v_bad);
    end if;
  end if;
  update pb_pm.job_pms set ended_at = now(), ended_by = v_uid, end_reason = 'unassigned'
    where company_id = v_co and job_key = v_key and ended_at is null and not (user_id = any (v_ids));
  insert into pb_pm.job_pms (company_id, job_key, job_number, user_id, assigned_by)
    select v_co, v_key, left(btrim(p_job_number), 60), x, v_uid from unnest(v_ids) x
    on conflict (company_id, job_key, user_id) where ended_at is null do nothing;
  insert into pb_pm.audit (company_id, actor, action, job_key, old_value, new_value, outcome, code)
    values (v_co, v_uid, 'job_pms', v_key, v_old, to_jsonb(v_ids), 'ok', null);
  return jsonb_build_object('ok', true, 'company_id', v_co) || pb_pm.job_state(v_co, v_key) || jsonb_build_object('ver', pb_pm.job_ver(v_co, v_key));
end $function$
;
CREATE OR REPLACE FUNCTION public.user_company_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* pb_sec S8 active only */
  select m.company_id from public.company_members m join public.companies c on c.id = m.company_id
   where m.user_id = auth.uid() and c.status = 'active' limit 1;
$function$
;
-- after the live functions: triggers, policies and grants as live (Nov 23)
create trigger pm_audit_no_delete before delete on pb_pm.audit for each row execute function pb_pm.permanent();
create trigger pm_audit_no_truncate before truncate on pb_pm.audit for each statement execute function pb_pm.permanent();
create trigger pm_audit_permanent before update on pb_pm.audit for each row execute function pb_pm.permanent();
create trigger pm_job_pms_no_delete before delete on pb_pm.job_pms for each row execute function pb_pm.permanent();
create trigger pm_job_pms_no_truncate before truncate on pb_pm.job_pms for each statement execute function pb_pm.permanent();
create trigger company_members_pm_sync after insert or delete or update of role, company_id on public.company_members for each row execute function pb_crew.pm_role_sync();
create policy "Members can view their own company" on public.companies for select using ((owner_user_id = auth.uid()) or (id = public.user_company_id()) or (id in (select m.company_id from public.company_members m where m.user_id = auth.uid())));
create policy "Users can view members of their own company" on public.company_members for select using ((user_id = auth.uid()) or (company_id = public.user_company_id()));
-- function grants as live
grant execute on function public.pb_job_pms_get(text), public.pb_job_pms_set(text, uuid[], uuid, integer), pb_prod.tz_valid(text) to authenticated, service_role;
grant execute on function public.user_company_id() to anon, authenticated, service_role;

create schema zz; create table zz.live_md5 (sig text primary key, md5 text);
insert into zz.live_md5 values
  ('pb_prod.my_member(uuid)', 'd7d00cfe39b05cfc5211563fa66cba10'),
  ('pb_prod.managed_company(uuid)', '1d90449cc03396489c4f746dbf097b7a'),
  ('pb_prod.job_key(text)', '506f6d4a7eca97f8d0c0adf53d02bd69'),
  ('pb_prod.is_foreman_of(uuid,uuid)', '58f30a56c0fb2ffe9d284109025d054a'),
  ('pb_prod.tz_valid(text)', '9cf30800fd43afcc9bef84a86a436e7b'),
  ('pb_crew.label_of(uuid,uuid)', '87d19ef9509ca67a71d49ea536fdcd91'),
  ('pb_crew.own_name(uuid)', '0cbe9f1de5fc385d715f07967e7938c6'),
  ('pb_crew.display_name(uuid,uuid)', 'ca5292283db0bed20119c0b69e83b559'),
  ('pb_crew.title_of(uuid,uuid)', 'c2c51a2b7684d8de12e643a494578513'),
  ('pb_pm.is_pm(uuid,uuid)', '011bfeb05b2e607c52b0087147edbf93'),
  ('pb_pm.fallback_tz(uuid)', 'a3151ea9fc5dd6114f4c3f7bd16c62ca'),
  ('pb_pm.settings_of(uuid)', '65a1db869a77a62a79e1764e9505c46a'),
  ('pb_pm.ready()', '527bbe740da562c8bbb80d378a281c48'),
  ('pb_pm.company_pms(uuid)', '2de7fd4d0d5d80b4d6947a1445fa3d4c'),
  ('pb_pm.job_state(uuid,text)', '82dcbd7a032f7533f9e28ab991c7ef6b'),
  ('pb_pm.job_ver(uuid,text)', '9ccbd5fe8b2fb1348885960ffa6ce996'),
  ('pb_pm.permanent()', '4cfbc82e273a3a26ace8632aae81848d'),
  ('pb_crew.pm_role_sync()', 'ec9f359c88de2abf4311d80fd1dbe74a'),
  ('public.pb_job_pms_get(text)', '5cffe3e89c17a6b523b245fb9d0dbda8'),
  ('public.pb_job_pms_set(text,uuid[],uuid,integer)', 'a551422b2b3618caef60642201cbe630'),
  ('public.user_company_id()', 'c017a94881496e474fa6aee42e518ae5');
