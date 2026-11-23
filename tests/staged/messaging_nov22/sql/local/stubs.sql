-- messaging_nov22: local stand-ins (live shapes read Nov 22 2026) for a throwaway Postgres 16. NEVER the live project.
-- Loaded after one_device_nov20/sql/local/stubs.sql and security_nov22/sql/local/stubs.sql.
alter table public.companies add column if not exists created_at timestamptz default now();
alter table public.companies drop constraint if exists companies_plan_check;
create or replace function pb_prod.job_key(p text) returns text language sql immutable set search_path to '' as $$ select left(lower(btrim(coalesce(p, ''))), 60) $$;
create table if not exists pb_prod.entries (id uuid primary key default gen_random_uuid(), user_id uuid not null, company_id uuid not null, client_entry_id text not null,
  kind text, job_number text, job_key text, record jsonb not null default '{}', voided boolean default false, updated_at timestamptz default now(), assigned_to uuid, assigned_at timestamptz);
alter table pb_prod.run_records add column if not exists job_key text, add column if not exists removed_at timestamptz, add column if not exists updated_at timestamptz default now();
create table if not exists pb_prod.site_log (id uuid primary key default gen_random_uuid(), user_id uuid not null, company_id uuid not null, client_item_id text not null,
  kind text not null, job_number text, job_key text, data jsonb not null default '{}', updated_at timestamptz default now());
create table if not exists pb_prod.crew_links (id bigint generated always as identity primary key, company_id uuid not null, foreman_id uuid not null, pipelayer_id uuid not null,
  started_at timestamptz default now(), ended_at timestamptz);
create table if not exists pb_prod.job_info (company_id uuid not null, job_key text not null, job_number text not null, project_name text, primary key (company_id, job_key));
create table if not exists pb_prod.push_prefs (user_id uuid primary key, crew_production boolean, tz text);
create schema if not exists pb_pm;
create table if not exists pb_pm.settings (company_id uuid primary key, tz text not null default 'America/Chicago');
-- pb_push as live (the parts used)
create schema if not exists pb_push;
create table if not exists pb_push.outbox (id uuid primary key default gen_random_uuid(), user_id uuid not null, type text not null, title text not null, body text not null,
  url text not null default '#/home', dedupe_key text not null unique, target_endpoint text, created_at timestamptz not null default now(), sent_at timestamptz,
  attempts integer not null default 0, next_attempt_at timestamptz not null default now(), claimed_at timestamptz, last_error text, given_up_at timestamptz,
  constraint pb_push_out_title_len check (length(title) between 1 and 80), constraint pb_push_out_body_len check (length(body) between 1 and 180),
  constraint pb_push_out_url check (url ~ '^#/[a-z0-9/_-]{1,60}$'),
  constraint pb_push_out_type check (type = any (array['runs_waiting', 'mgmt_report', 'test', 'crew_production', 'run_end_ask', 'material_alert', 'crew_nudge', 'permit_closed',
    'permit_due', 'schedule', 'delays', 'locates', 'safety', 'plan_change', 'run_back', 'weather', 'emergency', 'inspection', 'daily_missing'])));
create or replace function pb_push.request_role() returns text language sql stable set search_path to '' as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'), '') $$;
create or replace function pb_push.is_service() returns boolean language sql stable set search_path to '' as $$
  select pb_push.request_role() = 'service_role' and current_setting('role', true) = 'service_role' $$;
create or replace function pb_push.kick() returns void language sql security definer set search_path to '' as $$ select $$;
alter table storage.objects add column if not exists created_at timestamptz default now();
-- billing photo cap stand-in (live: pb_billing.storage_room counts today's own uploads against photos_day / the policy cap)
create schema if not exists pb_billing;
create or replace function pb_billing.plan_limits() returns jsonb language sql immutable set search_path to '' as $$
  select '{"member": {"photos_day": 150}, "owner": {"photos_day": 20}, "none": {"photos_day": 10, "storage_gb": 0.1}, "company": {"storage_gb_base": 10, "storage_gb_per_extra": 1}}'::jsonb $$;
create or replace function pb_billing.limits_of(p_company uuid) returns jsonb language sql stable set search_path to '' as $$ select pb_billing.plan_limits() $$;
create or replace function pb_billing.ai_who(p_user uuid, out who text, out company_id uuid) returns record language sql stable security definer set search_path to '' as $$
  select case when m.user_id is not null then 'member' when c.id is not null then 'owner' end, coalesce(m.company_id, c.id)
  from (select p_user u) x left join public.company_members m on m.user_id = x.u left join public.companies c on c.owner_user_id = x.u limit 1 $$;
create or replace function pb_billing.storage_gb(p_who text, p_company uuid) returns numeric language sql stable set search_path to '' as $$
  select case when p_who in ('member', 'owner') then 10::numeric else 0.1 end $$;
-- pb_billing.storage_room exactly as live (read Nov 22 2026, md5 9975ba51a21d2f2443b8d570e4b6d960 there; whitespace may differ here)
CREATE OR REPLACE FUNCTION pb_billing.storage_room(p_user uuid, p_bucket text, p_cap integer)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare w record; L jsonb := pb_billing.plan_limits(); v_cap int; v_bytes numeric;
begin
  select * into w from pb_billing.ai_who(p_user);
  L := pb_billing.limits_of(w.company_id);
  v_cap := (L->(case when w.who = 'member' then 'member' when w.who is null then 'none' else w.who end)->>'photos_day')::int;
  if w.who in ('member', 'individual', 'beta') and p_bucket <> 'run-photos' then v_cap := p_cap; end if;  -- sealed runs, cut sheet sources: the policy's own cap
  if (select count(*) from storage.objects o where o.bucket_id = p_bucket and o.owner_id = p_user::text and o.created_at > now() - interval '1 day') >= least(p_cap, v_cap) then return false; end if;
  select coalesce(sum((o.metadata->>'size')::numeric), 0) into v_bytes from storage.objects o
    where o.bucket_id in ('run-photos', 'run-seals', 'cutsheet-sources')
      and o.owner_id in (select p_user::text
                         union all select m.user_id::text from public.company_members m where m.company_id = w.company_id
                         union all select c.owner_user_id::text from public.companies c where c.id = w.company_id);
  return v_bytes < pb_billing.storage_gb(w.who, w.company_id) * 1073741824;
end $function$;
create or replace function public.pb_storage_put_ok(p_bucket text, p_cap integer, p_need_company boolean default false) returns boolean
language sql stable security definer set search_path to '' as $$ select auth.uid() is not null and pb_billing.storage_room(auth.uid(), p_bucket, p_cap) $$;
grant execute on function public.pb_storage_put_ok(text, integer, boolean) to authenticated;
-- job assignments as live (the parts read): PMs/supers per job, inspection/test items per foreman, office-filled dailies
create table if not exists pb_pm.job_pms (id bigint generated always as identity primary key, company_id uuid not null, job_key text not null, job_number text, user_id uuid not null,
  assigned_by uuid, assigned_at timestamptz default now(), ended_at timestamptz, ended_by uuid, end_reason text);
-- foremen_job_nov23 01 makes this on live ("Foremen on this job"); same columns. NOFM=1 run_local.sh drops it to test without it.
create table if not exists pb_pm.job_foremen (id bigint generated always as identity primary key, company_id uuid not null, job_key text not null, job_number text, user_id uuid not null,
  assigned_by uuid not null, assigned_at timestamptz not null default now(), ended_at timestamptz, ended_by uuid, end_reason text);
create schema if not exists pb_daily;
create table if not exists pb_daily.items (id uuid primary key default gen_random_uuid(), company_id uuid not null, client_item_id text, job_key text, job_number text, kind text,
  foreman_uid uuid, status text not null default 'open' check (status in ('open', 'done', 'canceled')), created_by uuid, updated_at timestamptz default now());
create table if not exists pb_daily.reports (id uuid primary key default gen_random_uuid(), company_id uuid not null, job_key text, job_number text, work_date date, foreman_uid uuid,
  for_foreman uuid, received_at timestamptz default now());
-- storage as live: RLS on, authenticated may insert/select (policies decide), buckets table
create table if not exists storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated, anon, service_role;
grant select, insert on storage.objects to authenticated;
grant all on storage.objects to service_role;
create table if not exists pb_backup_offsite_dummy (x int);
create schema if not exists pb_backup;
create table if not exists pb_backup.offsite (bucket text, name text, primary key (bucket, name));
create or replace function public.pb_offsite_todo(p_limit integer default 50) returns jsonb language plpgsql stable security definer set search_path to '' as $function$
begin
  if not pb_push.is_service() then raise exception 'pb:not_allowed'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('bucket', o.bucket_id, 'name', o.name) order by o.created_at)
    from (select x.* from storage.objects x where x.bucket_id in ('run-photos', 'run-seals', 'plan-sets')
            and not exists (select 1 from pb_backup.offsite c where c.bucket = x.bucket_id and c.name = x.name) order by x.created_at limit 50) o), '[]'::jsonb);
end $function$;
grant execute on function public.pb_offsite_todo(integer) to service_role;
grant usage on schema public to authenticated, anon, service_role;
