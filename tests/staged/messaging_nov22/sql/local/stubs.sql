-- messaging_nov22: local stand-ins (live shapes read Nov 22 2026) for a throwaway Postgres 16. NEVER the live project.
-- Loaded after one_device_nov20/sql/local/stubs.sql and security_nov22/sql/local/stubs.sql.
alter table public.companies add column if not exists created_at timestamptz default now();
alter table public.companies drop constraint if exists companies_plan_check;
create or replace function pb_prod.job_key(p text) returns text language sql immutable set search_path to '' as $$ select left(lower(btrim(coalesce(p, ''))), 60) $$;
create table if not exists pb_prod.entries (id uuid primary key default gen_random_uuid(), user_id uuid not null, company_id uuid not null, client_entry_id text not null,
  kind text, job_number text, job_key text, record jsonb not null default '{}', voided boolean default false, updated_at timestamptz default now());
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
create or replace function pb_billing.storage_room(p_user uuid, p_bucket text, p_cap integer) returns boolean language sql stable security definer set search_path to '' as $$
  select (select count(*) from storage.objects o where o.bucket_id = p_bucket and o.owner_id = p_user::text and o.created_at > now() - interval '1 day') < least(p_cap, 3) $$;
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
