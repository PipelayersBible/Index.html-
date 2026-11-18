-- A local stand-in for the live objects 01_onboard.sql touches, for testing on a throw-away local Postgres 16
-- (the live rolled-back run needs a confirmation this session's client can't give; see DESIGN.md).
-- Every function body below is copied verbatim from the live project (pg_get_functiondef, read-only, Nov 17 2026);
-- tables carry the live columns and constraints that matter here. Seed: the live company, its owner, foreman, PM and
-- pipelayer ids (no personal data).
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema extensions; create schema pb_prod; create schema pb_crew; create schema pb_billing; create schema pb_reports;
grant usage on schema public, auth to anon, authenticated, service_role;
create extension pgcrypto schema extensions;
create table auth.users (id uuid primary key, email text, aud text, role text, raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz);
create or replace function auth.uid() returns uuid language sql stable as $function$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
$function$;
create or replace function auth.role() returns text language sql stable as $function$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text
$function$;
grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;

create table public.companies (id uuid primary key default gen_random_uuid(), name text not null, owner_user_id uuid not null, status text not null default 'inactive', created_at timestamptz default now(), plan text not null default 'paid');
create table public.company_members (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, user_id uuid not null unique references auth.users(id),
  role text not null check (role = any (array['foreman','pipelayer','pm'])), created_at timestamptz default now(), joined_at timestamptz default now(), title text not null default 'project_manager');
create table pb_reports.managers (company_id uuid not null references public.companies(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, added_at timestamptz not null default now(), primary key (company_id, user_id));
create table pb_crew.invitations (id uuid primary key default gen_random_uuid(), company_id uuid not null, user_id uuid not null, role text not null, invited_by uuid not null, status text not null default 'pending', created_at timestamptz not null default now(), decided_at timestamptz, title text);
create table pb_crew.member_labels (company_id uuid not null references public.companies(id), user_id uuid not null references auth.users(id), label text check (length(label) between 1 and 80), set_by uuid not null, set_at timestamptz not null default now(), primary key (company_id, user_id));
create table pb_crew.own_names (user_id uuid primary key references auth.users(id), name text check (length(name) between 1 and 80), updated_at timestamptz not null default now());
create table pb_crew.name_audit (id bigserial primary key, at timestamptz not null default now(), company_id uuid, actor uuid not null, target_user uuid not null, kind text not null check (kind = any (array['own','label','invite_label'])), old_name text, new_name text, outcome text not null check (outcome = any (array['ok','refused'])), code text);

CREATE OR REPLACE FUNCTION pb_prod.my_member(p_uid uuid)
 RETURNS TABLE(company_id uuid, role text, joined_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  select m.company_id, m.role, coalesce(m.joined_at, m.created_at) from public.company_members m join public.companies c on c.id = m.company_id
  where m.user_id = p_uid and c.status = 'active' order by m.created_at desc nulls last limit 1
$function$;
CREATE OR REPLACE FUNCTION pb_prod.my_company(p_uid uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select x.company_id from pb_prod.my_member(p_uid) x
$function$;
CREATE OR REPLACE FUNCTION pb_prod.managed_company(p_uid uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select c.id from public.companies c
  where p_uid is not null and c.status = 'active'
    and (c.owner_user_id = p_uid
      or (exists (select 1 from pb_reports.managers mg where mg.company_id = c.id and mg.user_id = p_uid)
          and c.id = (select x.company_id from pb_prod.my_member(p_uid) x)))
  order by (c.id = (select x.company_id from pb_prod.my_member(p_uid) x)) desc nulls last, c.created_at desc
  limit 1
$function$;
CREATE OR REPLACE FUNCTION pb_prod.is_foreman_of(p_uid uuid, p_company uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select exists (select 1 from pb_prod.my_member(p_uid) x where x.company_id = p_company and x.role = 'foreman')
$function$;
CREATE OR REPLACE FUNCTION pb_crew.clean_name(p text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO '' AS $function$
  select nullif(btrim(left(btrim(regexp_replace(regexp_replace(coalesce(p, ''),
    '[[:cntrl:]<>​-‏‪-‮⁠-⁩﻿]', '', 'g'), '\s+', ' ', 'g')), 80)), '')
$function$;
CREATE OR REPLACE FUNCTION pb_crew.label_of(p_company uuid, p_user uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select l.label from pb_crew.member_labels l where l.company_id = p_company and l.user_id = p_user
$function$;
CREATE OR REPLACE FUNCTION pb_crew.own_name(p_user uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select o.name from pb_crew.own_names o where o.user_id = p_user
$function$;
CREATE OR REPLACE FUNCTION pb_crew.display_name(p_company uuid, p_user uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select coalesce(pb_crew.label_of(p_company, p_user), pb_crew.own_name(p_user))
$function$;
CREATE OR REPLACE FUNCTION pb_crew.put_label(p_company uuid, p_actor uuid, p_target uuid, p_name text, p_kind text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare v_new text := pb_crew.clean_name(p_name); v_old text := pb_crew.label_of(p_company, p_target);
begin
  if v_new is not distinct from v_old then return null; end if;
  insert into pb_crew.member_labels (company_id, user_id, label, set_by, set_at) values (p_company, p_target, v_new, p_actor, now())
    on conflict (company_id, user_id) do update set label = excluded.label, set_by = excluded.set_by, set_at = excluded.set_at;
  insert into pb_crew.name_audit (company_id, actor, target_user, kind, old_name, new_name, outcome) values (p_company, p_actor, p_target, p_kind, v_old, v_new, 'ok');
  return null;
end $function$;
CREATE OR REPLACE FUNCTION pb_crew.in_other_company(p_user uuid, p_company uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select exists (select 1 from public.company_members m where m.user_id = p_user and m.company_id <> p_company)
      or exists (select 1 from public.companies o where o.owner_user_id = p_user and o.id <> p_company)
$function$;
CREATE OR REPLACE FUNCTION pb_crew.invitation_expired(p_created timestamp with time zone) RETURNS boolean LANGUAGE sql STABLE SET search_path TO '' AS $function$
  select p_created < now() - interval '7 days'
$function$;
CREATE OR REPLACE FUNCTION pb_billing.trial_limits() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO '' AS $function$
  select jsonb_build_object('days', 30, 'stake', 30, 'teacher', 10, 'analysis', 10, 'cutsheet', 5, 'ticket', 5, 'plans_strong', 0,
    'other', 10, 'company_day', 200, 'plan_sets_month', 2, 'seats', 7)
$function$;
CREATE OR REPLACE FUNCTION pb_billing.trial_seats_used(p_company uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select 1 + (select count(*)::int from public.company_members m where m.company_id = p_company)
    + (select count(*)::int from pb_crew.invitations i where i.company_id = p_company and i.status = 'pending' and not pb_crew.invitation_expired(i.created_at))
$function$;
CREATE OR REPLACE FUNCTION pb_billing.trial_seats_full(p_company uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select exists (select 1 from public.companies c where c.id = p_company and c.plan = 'trial')
     and pb_billing.trial_seats_used(p_company) >= (pb_billing.trial_limits()->>'seats')::int
$function$;
CREATE OR REPLACE FUNCTION pb_billing.trial_seats_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
begin
  if exists (select 1 from public.companies c where c.id = new.company_id and c.plan = 'trial')
     and 1 + (select count(*) from public.company_members m where m.company_id = new.company_id) >= (pb_billing.trial_limits()->>'seats')::int then
    raise exception 'pb:trial_seats';
  end if;
  return new;
end $function$;
create trigger pb_trial_seats before insert on public.company_members for each row execute function pb_billing.trial_seats_guard();
CREATE OR REPLACE FUNCTION pb_prod.member_joined_at_stamp() RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $function$
begin
  if tg_op = 'INSERT' then new.joined_at := now();
  elsif new.company_id is distinct from old.company_id then new.joined_at := now();
  else new.joined_at := old.joined_at; end if;
  return new;
end $function$;
create trigger company_members_joined_at before insert or update on public.company_members for each row execute function pb_prod.member_joined_at_stamp();

-- seed: the live company (ids only)
insert into auth.users (id, email) values
  ('e03416b7-6086-40a5-8d42-9267b846fc26', 'owner@x.test'), ('4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e', 'foreman@x.test'),
  ('e4a0170b-1189-4bd5-86fe-e47e092ede3f', 'pm@x.test'), ('8cd34746-efb4-469c-b1d7-caa8709ba3e4', 'pipelayer@x.test');
insert into public.companies (id, name, owner_user_id, status, plan) values ('d01a4a5f-312a-418f-9172-ea9aec9784b5', 'DIG Civil Construction', 'e03416b7-6086-40a5-8d42-9267b846fc26', 'active', 'paid');
insert into public.company_members (company_id, user_id, role) values
  ('d01a4a5f-312a-418f-9172-ea9aec9784b5', '4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e', 'foreman'),
  ('d01a4a5f-312a-418f-9172-ea9aec9784b5', 'e4a0170b-1189-4bd5-86fe-e47e092ede3f', 'pm'),
  ('d01a4a5f-312a-418f-9172-ea9aec9784b5', '8cd34746-efb4-469c-b1d7-caa8709ba3e4', 'pipelayer');
insert into pb_reports.managers (company_id, user_id) values ('d01a4a5f-312a-418f-9172-ea9aec9784b5', 'e4a0170b-1189-4bd5-86fe-e47e092ede3f');
insert into pb_crew.own_names (user_id, name) values ('4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e', 'Foreman F');
