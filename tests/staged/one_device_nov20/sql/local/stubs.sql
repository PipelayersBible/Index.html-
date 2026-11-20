-- Local stand-ins (shapes read from live Nov 20 2026) for a throwaway Postgres 16. Never the live project.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create role authenticator noinherit login; grant anon, authenticated, service_role to authenticator;
create role supabase_auth_admin nologin;
create schema auth authorization supabase_auth_admin;
create type auth.aal_level as enum ('aal1', 'aal2', 'aal3');
create type auth.factor_status as enum ('unverified', 'verified'); create type auth.factor_type as enum ('totp', 'webauthn', 'phone');
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_app_meta_data jsonb);
create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(), updated_at timestamptz, factor_id uuid, aal auth.aal_level, not_after timestamptz, refreshed_at timestamp, user_agent text, ip inet, tag text);
create table auth.refresh_tokens (id bigserial primary key, token varchar unique, user_id varchar, session_id uuid references auth.sessions(id) on delete cascade);
create table auth.mfa_factors (id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, friendly_name text, factor_type auth.factor_type not null, status auth.factor_status not null, created_at timestamptz not null, updated_at timestamptz not null);
alter table auth.users owner to supabase_auth_admin; alter table auth.sessions owner to supabase_auth_admin; alter table auth.refresh_tokens owner to supabase_auth_admin; alter table auth.mfa_factors owner to supabase_auth_admin;
alter table auth.sessions enable row level security; alter table auth.refresh_tokens enable row level security;
grant usage on schema auth to anon, authenticated, service_role;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub', '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;
create schema pb_onboard; create table pb_onboard.links (id uuid primary key default gen_random_uuid(), kind text not null, for_user uuid, token_hash bytea not null unique, code text not null, created_by uuid not null, created_at timestamptz not null default now(), expires_at timestamptz not null, used_at timestamptz);
create table public.companies (id uuid primary key default gen_random_uuid(), name text not null, owner_user_id uuid not null, status text not null default 'active', plan text not null default 'trial', created_at timestamptz default now());
create table public.company_members (id uuid primary key default gen_random_uuid(), company_id uuid not null, user_id uuid not null unique, role text not null);
create schema pb_reports; create table pb_reports.managers (company_id uuid, user_id uuid);
create schema pb_prod; create schema pb_crew; create schema pb_support;
create table pb_crew.own_names (user_id uuid primary key, name text);
create table pb_support.admins (user_id uuid primary key);
create function pb_prod.managed_company(p_uid uuid) returns uuid language sql stable security definer set search_path to '' as $$
  select c.id from public.companies c where p_uid is not null and c.status = 'active' and (c.owner_user_id = p_uid
    or exists (select 1 from pb_reports.managers mg where mg.company_id = c.id and mg.user_id = p_uid)) limit 1 $$;
create function pb_crew.display_name(p_company uuid, p_user uuid) returns text language sql stable security definer set search_path to '' as $$ select o.name from pb_crew.own_names o where o.user_id = p_user $$;
create function pb_support.admin_ok(p_uid uuid, p_aal text) returns boolean language sql stable security definer set search_path to '' as $$
  select p_uid is not null and exists (select 1 from pb_support.admins a where a.user_id = p_uid)
    and (coalesce(p_aal, '') = 'aal2' or not exists (select 1 from auth.mfa_factors f where f.user_id = p_uid and f.status = 'verified')) $$;
-- as on live: functions made by postgres in public are not runnable by everyone unless granted; postgres is not a superuser there
alter default privileges in schema public revoke execute on functions from public;
grant all on all tables in schema auth to postgres; grant usage on schema auth to postgres;
