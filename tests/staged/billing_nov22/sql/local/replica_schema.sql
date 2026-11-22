-- LOCAL ONLY (throwaway Postgres 16): enough of the live schema for the billing_nov22 blocks.
-- Table DDL read from live Nov 22 2026. Live function texts are in replica_live.sql (checked by md5 against live in
-- replica_check.sql). Leaf helpers that only log, send or name people are stubs here.
do $r$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $r$;
alter default privileges revoke execute on functions from public;
create extension if not exists pgcrypto;
create schema auth; create schema pb_billing; create schema pb_crew; create schema pb_onboard; create schema pb_support;
create schema pb_audit; create schema pb_prod; create schema pb_pm; create schema pb_reports; create schema pb_plans;
grant usage on schema public, auth to authenticated, anon, service_role;
-- like live: the app roles can't use these schemas directly (everything goes through security-definer functions)
create table auth.users (id uuid primary key, email text, invited_at timestamptz, email_confirmed_at timestamptz, confirmed_at timestamptz, last_sign_in_at timestamptz);
create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid, status text);
create function auth.uid() returns uuid language sql stable as $f$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
$f$;
create function auth.role() returns text language sql stable as $f$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))
$f$;
CREATE OR REPLACE FUNCTION auth.jwt()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$function$;
grant execute on function auth.uid(), auth.role(), auth.jwt() to public;

create table public.companies (id uuid not null default gen_random_uuid() primary key, name text not null, owner_user_id uuid not null, status text not null default 'inactive'::text, stripe_customer_id text, stripe_subscription_id text, current_period_end timestamp with time zone, created_at timestamp with time zone default now(), updated_at timestamp with time zone default now(), plan text not null default 'paid'::text, trial_ends_at timestamp with time zone);
create table public.company_members (id uuid not null default gen_random_uuid() primary key, company_id uuid not null, user_id uuid not null unique, role text not null, created_at timestamp with time zone default now(), joined_at timestamp with time zone default now(), title text not null default 'project_manager'::text);
create table public.subscriptions (id uuid not null default gen_random_uuid() primary key, user_id uuid not null unique, tier text not null default 'none'::text, status text not null default 'inactive'::text, stripe_customer_id text, stripe_subscription_id text, current_period_end timestamp with time zone, created_at timestamp with time zone default now(), updated_at timestamp with time zone default now());
create table public.ai_usage (user_id uuid not null, day date not null, feature text not null, count integer not null default 0, primary key (user_id, day, feature));
create table pb_crew.invitations (id uuid not null default gen_random_uuid() primary key, company_id uuid not null, user_id uuid not null, role text not null, invited_by uuid not null, status text not null default 'pending'::text, created_at timestamp with time zone not null default now(), decided_at timestamp with time zone, title text);
create table pb_onboard.links (id uuid not null default gen_random_uuid() primary key, kind text not null, company_id uuid, role text, label text, for_user uuid, pair_foreman uuid, replaces_user uuid, token_hash bytea not null, code text not null, created_by uuid not null, created_at timestamp with time zone not null default now(), expires_at timestamp with time zone not null, claimed_until timestamp with time zone, used_at timestamp with time zone, used_by uuid, revoked_at timestamp with time zone, revoked_by uuid);
create table pb_support.admins (user_id uuid not null primary key);
create table pb_support.messages (id uuid not null default gen_random_uuid() primary key, user_id uuid not null, client_message_id text not null, body text not null, app_build text, screen text, status text not null default 'new'::text, created_at timestamp with time zone not null default now(), kind text not null default 'problem'::text, notified_at timestamp with time zone, company_id uuid, triaged_at timestamp with time zone, triage text, phone text, unique (user_id, client_message_id));
create table pb_reports.managers (company_id uuid not null, user_id uuid not null, added_at timestamptz not null default now(), primary key (company_id, user_id));
create table pb_plans.sets (id uuid primary key default gen_random_uuid(), company_id uuid, state text);

create table pb_billing.accounts (company_id uuid not null primary key references public.companies(id) on delete restrict, legal_name text not null check (length(btrim(legal_name)) >= 1 and length(btrim(legal_name)) <= 200), billing_email text not null check (billing_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(billing_email) <= 254), billing_contact text check (length(billing_contact) <= 200), billing_address jsonb not null default '{}'::jsonb, tax_status text not null default 'taxable'::text check (tax_status = any (array['taxable','exempt'])), seller_legal_name text, seats_paid integer not null check (seats_paid >= 0 and seats_paid <= 1000), base_seats integer not null check (base_seats >= 1 and base_seats <= 100), base_cents integer not null check (base_cents >= 0 and base_cents <= 10000000), seat_cents integer not null check (seat_cents >= 0 and seat_cents <= 1000000), billing_interval text not null default 'month'::text check (billing_interval = any (array['month','year'])), yearly_months integer not null default 10 check (yearly_months >= 1 and yearly_months <= 12), collection text not null default 'invoice'::text, plan_reading boolean not null default false, plan_reading_cents integer check (plan_reading_cents >= 0 and plan_reading_cents <= 10000000), state text not null default 'active'::text check (state = any (array['active','read_only','canceled'])), period_start date not null, paid_through date not null, grace_days integer not null default 7 check (grace_days >= 0 and grace_days <= 30), cancel_at timestamp with time zone, founder_until date, founder_set_by uuid, founder_set_at timestamp with time zone, order_signed_by text check (length(order_signed_by) <= 200), order_signed_at timestamp with time zone, terms_version text, stripe_customer_id text unique, stripe_subscription_id text unique, created_by uuid, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), beta_ended_at timestamp with time zone);
create table pb_billing.ai_pool (owner_key text not null, day date not null, n integer not null default 0, usd numeric not null default 0, primary key (owner_key, day));
create sequence pb_billing.events_id_seq;
create table pb_billing.events (id bigint not null default nextval('pb_billing.events_id_seq'::regclass) primary key, company_id uuid references public.companies(id) on delete set null, user_id uuid, kind text not null, detail jsonb, stripe_event_id text unique, actor uuid, at timestamp with time zone not null default now());
create table pb_billing.individual_accounts (user_id uuid not null primary key references auth.users(id) on delete cascade, cents integer not null check (cents >= 0), year_cents integer not null check (year_cents >= 0), billing_interval text not null default 'month'::text check (billing_interval = any (array['month','year'])), period_start date not null, paid_through date not null, grace_days integer not null default 7, state text not null default 'active'::text check (state = any (array['active','canceled'])), created_by uuid, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());
create table pb_billing.left_company (user_id uuid not null primary key, company_id uuid, company_name text, left_at timestamp with time zone not null default now(), dismissed_at timestamp with time zone);
create table pb_billing.limit_overrides (company_id uuid not null primary key, limits jsonb not null, note text, created_at timestamptz not null default now());
create sequence pb_billing.plan_requests_id_seq;
create table pb_billing.plan_requests (id bigint not null default nextval('pb_billing.plan_requests_id_seq'::regclass) primary key, user_id uuid not null, company_id uuid, kind text not null default 'individual'::text, created_at timestamp with time zone not null default now(), done_at timestamp with time zone, billing_interval text check (billing_interval is null or billing_interval = any (array['month','year'])), unique (user_id, kind));
create table pb_billing.settings (key text not null primary key, value jsonb, note text, updated_at timestamp with time zone not null default now(), updated_by uuid);
insert into pb_billing.settings (key, value) values ('base_cents', '9900'), ('base_seats', '5'), ('grace_days', '7'), ('seat_cents', '1200'), ('yearly_months', '10'),
  ('founder_months', '12'), ('individual_cents', '1500'), ('plan_sheet_cents', '100'), ('seller_legal_name', 'null'), ('invoice_ahead_days', '7'),
  ('plan_reading_cents', 'null'), ('individual_year_cents', '14400');

-- stubs (leaf helpers: logging, names, email budget, pushes)
create function pb_audit.admin_note(p_kind text, p_company uuid, p_user uuid, p_detail jsonb) returns void language sql security definer set search_path to '' as $f$ select $f$;
create function pb_plans.kick() returns void language sql security definer set search_path to '' as $f$ select $f$;
create function pb_prod.managed_company(p_uid uuid) returns uuid language sql stable security definer set search_path to '' as $f$
  select coalesce((select c.id from public.companies c where c.owner_user_id = p_uid and c.status = 'active' limit 1),
                  (select m.company_id from public.company_members m where m.user_id = p_uid and m.role = 'pm' limit 1)) $f$;
create function pb_crew.invites_today(p_company uuid) returns integer language sql stable security definer set search_path to '' as $f$ select 0 $f$;
create function pb_crew.invite_limit() returns integer language sql stable security definer set search_path to '' as $f$ select 30 $f$;
create function pb_crew.title_note() returns jsonb language sql stable security definer set search_path to '' as $f$ select '{}'::jsonb $f$;
create function pb_crew.log(p_company uuid, p_actor uuid, p_action text, p_target uuid, p_email text, p_before jsonb, p_after jsonb, p_result text, p_code text, p_extra jsonb) returns bigint language sql security definer set search_path to '' as $f$ select 1::bigint $f$;
create function pb_crew.find_account(p_email text) returns uuid language sql stable security definer set search_path to '' as $f$ select u.id from auth.users u where lower(u.email) = lower(p_email) limit 1 $f$;
create function pb_crew.refuse_other_company(p_company uuid, p_actor uuid, p_action text, p_target uuid, p_email text, p_detail jsonb, p_x text) returns jsonb language sql security definer set search_path to '' as $f$ select jsonb_build_object('ok', false, 'code', 'pb:other_company') $f$;
create function pb_crew.after_accept(p_inv uuid, p_company uuid, p_user uuid) returns void language sql security definer set search_path to '' as $f$ select $f$;
create function pb_crew.display_name(p_company uuid, p_user uuid) returns text language sql stable security definer set search_path to '' as $f$ select null::text $f$;
create function pb_crew.name_parts(p_company uuid, p_user uuid) returns jsonb language sql stable security definer set search_path to '' as $f$ select null::jsonb $f$;
create function pb_crew.invitation_label(p_inv uuid) returns text language sql stable security definer set search_path to '' as $f$ select null::text $f$;
create function pb_pm.ready() returns boolean language sql stable security definer set search_path to '' as $f$ select true $f$;
create function pb_pm.email_budget_take(p_kind text, p_n integer) returns boolean language sql security definer set search_path to '' as $f$ select true $f$;
create table pb_pm.settings_tbl (company_id uuid primary key, x int);
create function pb_pm.settings_of(p_company uuid) returns pb_pm.settings_tbl language sql stable security definer set search_path to '' as $f$ select s from pb_pm.settings_tbl s where s.company_id = p_company $f$;
create function public.ai_feature_limit(p_user uuid, p_feature text) returns integer language sql stable security definer set search_path to '' as $f$ select 10 $f$;
create function pb_crew.clean_email(p text) returns text language sql immutable set search_path to '' as $f$
  select case when e ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(e) <= 254 then e else null end from (select lower(btrim(coalesce(p, ''))) e) x $f$;
create function pb_crew.valid_role(p text) returns boolean language sql immutable set search_path to '' as $f$ select coalesce(p in ('foreman', 'pipelayer', 'pm'), false) $f$;
create function pb_crew.require_service() returns void language plpgsql stable set search_path to '' as $f$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then raise exception 'pb:service_only'; end if;
end $f$;
