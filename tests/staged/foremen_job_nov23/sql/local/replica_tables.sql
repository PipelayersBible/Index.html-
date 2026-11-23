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
