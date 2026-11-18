-- Local stand-in for the live objects sql/01-03 touch (shapes and function bodies copied from live, Nov 17 2026).
create role authenticated; create role anon; create role service_role;
create schema auth; create schema pb_billing; create schema pb_crew; create schema pb_support; create schema pb_audit; create schema pb_plans; create schema pb_prod;
create table auth.users (id uuid primary key, email text, aud text, role text);
create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid, status text);
create function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
create table public.companies (id uuid primary key default gen_random_uuid(), name text, owner_user_id uuid references auth.users(id), status text not null default 'active' check (status in ('active','inactive','canceled','past_due')),
  plan text not null default 'trial' check (plan in ('paid','trial')), trial_ends_at timestamptz, stripe_customer_id text, stripe_subscription_id text, current_period_end timestamptz, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.company_members (id uuid primary key default gen_random_uuid(), company_id uuid references public.companies(id) on delete cascade, user_id uuid unique references auth.users(id),
  role text check (role in ('foreman','pipelayer','pm')), created_at timestamptz default now(), joined_at timestamptz, title text check (title in ('project_manager','superintendent')));
create table public.subscriptions (id uuid primary key default gen_random_uuid(), user_id uuid unique references auth.users(id), tier text check (tier in ('none','individual')), status text check (status in ('active','inactive','canceled','past_due')), updated_at timestamptz);
create table pb_crew.invitations (id uuid primary key default gen_random_uuid(), company_id uuid, user_id uuid, role text, invited_by uuid, status text default 'pending', created_at timestamptz default now(), decided_at timestamptz, title text);
CREATE OR REPLACE FUNCTION pb_crew.invitation_expired(p_created timestamp with time zone) RETURNS boolean LANGUAGE sql STABLE SET search_path TO '' AS $function$
  select p_created < now() - interval '7 days'
$function$;
create table pb_billing.plan_requests (id bigserial primary key, user_id uuid, company_id uuid, kind text, created_at timestamptz default now(), done_at timestamptz, unique (user_id, kind));
create table pb_billing.left_company (user_id uuid primary key, company_id uuid, company_name text, left_at timestamptz, dismissed_at timestamptz);
create table pb_support.admins (user_id uuid primary key);
CREATE OR REPLACE FUNCTION pb_support.admin_ok(p_uid uuid, p_aal text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select p_uid is not null and exists (select 1 from pb_support.admins a where a.user_id = p_uid)
    and (coalesce(p_aal, '') = 'aal2' or not exists (select 1 from auth.mfa_factors f where f.user_id = p_uid and f.status = 'verified'))
$function$;
create table pb_audit.admin_log (id bigserial primary key, at timestamptz not null default now(), kind text not null, session_user_name text, request_role text, app_name text, tbl text, op text, row_id text, company_id uuid, user_id uuid, actor uuid, detail jsonb);
CREATE OR REPLACE FUNCTION pb_audit.admin_note(p_action text, p_company uuid, p_user uuid, p_detail jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
begin
  insert into pb_audit.admin_log (kind, session_user_name, request_role, app_name, op, company_id, user_id, actor, detail)
    values ('admin_action', session_user::text, nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', left(coalesce(current_setting('application_name', true), ''), 80), p_action, p_company, p_user, auth.uid(), p_detail);
exception when others then raise warning 'pb_audit.admin_note: %', sqlerrm;
end $function$;
create table pb_plans.sets (id uuid primary key default gen_random_uuid(), company_id uuid, owner_user uuid, created_by uuid not null, job_key text not null, job_number text not null, title text not null, pages int not null, sha256 text not null,
  state text not null default 'uploading' check (state in ('uploading','reading','parked','ready','failed','removed')), usd numeric not null default 0, created_at timestamptz not null default now(), ready_at timestamptz, removed_at timestamptz);
create table pb_plans.sheets (id bigserial primary key, set_id uuid not null, page int not null, grid jsonb, state text not null default 'waiting', tries int not null default 0, claimed_at timestamptz, sheet_no text, sheet_title text, error text, usd numeric not null default 0);
create table pb_plans.issues (id bigserial primary key, state text);
create table pb_plans.kicks (at timestamptz default now());
create function pb_plans.kick() returns void language sql security definer set search_path to '' as $$ insert into pb_plans.kicks default values $$;
CREATE OR REPLACE FUNCTION pb_billing.trial_limits() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO '' AS $function$
  select jsonb_build_object('days', 30, 'stake', 30, 'teacher', 10, 'analysis', 10, 'cutsheet', 5, 'ticket', 5, 'plans_strong', 0,
    'other', 10, 'company_day', 200, 'plan_sets_month', 2, 'seats', 7)
$function$;
CREATE OR REPLACE FUNCTION pb_billing.beta_closed(p_company uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select exists (select 1 from public.companies c where c.id = p_company and c.plan = 'trial'
                 and coalesce(c.trial_ends_at, now()) + interval '3 days' <= now())
$function$;
CREATE OR REPLACE FUNCTION pb_billing.company_of(p_user uuid) RETURNS TABLE(company_id uuid, plan text, trial_ends_at timestamp with time zone, expired boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select c.id, c.plan, c.trial_ends_at, (c.plan = 'trial' and coalesce(c.trial_ends_at, now()) <= now())
  from public.companies c
  where c.status = 'active' and p_user is not null
    and (c.owner_user_id = p_user or exists (select 1 from public.company_members m where m.company_id = c.id and m.user_id = p_user))
  order by (c.owner_user_id = p_user) desc, c.created_at desc limit 1
$function$;
CREATE OR REPLACE FUNCTION pb_billing.has_individual(p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select exists (select 1 from public.subscriptions s where s.user_id = p_user and s.tier = 'individual' and s.status = 'active')
$function$;
CREATE OR REPLACE FUNCTION pb_billing.on_member_removed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
begin
  insert into pb_billing.left_company (user_id, company_id, company_name, left_at, dismissed_at)
    values (old.user_id, old.company_id, (select c.name from public.companies c where c.id = old.company_id), now(), null)
    on conflict (user_id) do update set company_id = excluded.company_id, company_name = excluded.company_name, left_at = now(), dismissed_at = null;
  return old;
exception when others then return old; -- never block a removal
end $function$;
CREATE OR REPLACE FUNCTION pb_billing.trial_seats_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
begin
  if exists (select 1 from public.companies c where c.id = new.company_id and c.plan = 'trial')
     and 1 + (select count(*) from public.company_members m where m.company_id = new.company_id) >= (pb_billing.trial_limits()->>'seats')::int then
    raise exception 'pb:trial_seats';
  end if;
  return new;
end $function$;
create trigger pb_member_removed after delete on public.company_members for each row execute function pb_billing.on_member_removed();
create trigger pb_trial_seats before insert on public.company_members for each row execute function pb_billing.trial_seats_guard();
create table pb_prod.site_log (id uuid primary key default gen_random_uuid(), user_id uuid not null, company_id uuid not null, client_item_id text not null, kind text not null check (kind in ('delay','utility','rework','equip')), job_key text not null default '', data jsonb not null);
