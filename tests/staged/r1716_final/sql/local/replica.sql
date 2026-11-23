-- r1716_final throwaway LOCAL replica (never live) for block_t11: only what pb_onboard.make_link and the app's
-- pb_onboard_link_make touch. Functions marked LIVE are the live texts read Nov 22 2026; the rest are small stand-ins.
create extension if not exists pgcrypto schema public;
create schema if not exists extensions;
create or replace function extensions.digest(bytea, text) returns bytea language sql immutable as $$ select public.digest($1, $2) $$;
create or replace function extensions.gen_random_bytes(integer) returns bytea language sql volatile as $$ select public.gen_random_bytes($1) $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;
create schema auth; create schema pb_onboard; create schema pb_prod; create schema pb_billing; create schema pb_crew; create schema pb_reports; create schema pb_sec;
grant usage on schema public, auth, extensions to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub', '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
create table public.companies (id uuid primary key, name text, owner_user_id uuid, status text default 'active', plan text, trial_ends_at timestamptz, created_at timestamptz default now());
create table public.company_members (company_id uuid references public.companies(id) on delete cascade, user_id uuid unique, role text);
create table pb_reports.managers (company_id uuid, user_id uuid);
create table pb_crew.invitations (company_id uuid, user_id uuid, role text, status text default 'pending', invited_by uuid, created_at timestamptz default now());
create table pb_crew.member_labels (company_id uuid, user_id uuid, label text);
create table pb_crew.own_names (user_id uuid, name text);
create table pb_billing.accounts (company_id uuid, state text, cancel_at timestamptz);
create or replace function pb_billing.state_of(a pb_billing.accounts) returns text language sql stable as $$ select coalesce(a.state, 'active') $$;
create or replace function pb_crew.invitation_expired(p timestamptz) returns boolean language sql stable as $$ select p < now() - interval '7 days' $$;
create or replace function pb_prod.my_member(p_uid uuid) returns table (company_id uuid, role text) language sql stable as $$ select m.company_id, m.role from public.company_members m where m.user_id = p_uid $$;
create or replace function pb_crew.clean_name(p text) returns text language sql immutable set search_path to '' as $$ select nullif(btrim(left(btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g')), 80)), '') $$;
-- onboard2 tables (as live)
create table pb_onboard.links (
  id uuid primary key default gen_random_uuid(), kind text not null check (kind in ('join', 'handoff')),
  company_id uuid references public.companies(id) on delete cascade, role text check (role in ('foreman', 'pipelayer')),
  label text check (length(label) <= 80), for_user uuid references auth.users(id) on delete cascade,
  pair_foreman uuid references auth.users(id) on delete set null, replaces_user uuid, token_hash bytea not null unique,
  code text not null check (code ~ '^[ACDEFHJKMNPRTUVWXY34679]{6}$'), created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), expires_at timestamptz not null, claimed_until timestamptz, used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null, revoked_at timestamptz, revoked_by uuid);
create table pb_onboard.events (id bigserial primary key, at timestamptz not null default now(), company_id uuid, actor uuid, action text not null, link_id uuid, target_user uuid, code text, detail jsonb);
create table pb_onboard.settings (company_id uuid primary key, foreman_links boolean not null default true, updated_at timestamptz not null default now(), updated_by uuid);
-- pb_sec (LIVE, security_nov22)
create table pb_sec.fn_backup (tag text not null, sig text not null, def text not null, md5 text not null, saved_at timestamptz not null default now(), primary key (tag, sig));
CREATE OR REPLACE FUNCTION pb_onboard.make_link(p_company uuid, p_uid uuid, p_role text, p_label text, p_pair uuid, p_replaces uuid, p_freed integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_tok text; v_code text; v_id uuid; v_exp timestamptz := now() + interval '24 hours'; why text;
begin
  perform pg_advisory_xact_lock(hashtextextended('pb_onboard_make:' || p_company::text, 0));
  if pb_onboard.live_links(p_company) >= 10 then
    perform pb_onboard.log(p_company, p_uid, 'refused', null, null, 'pb:too_many_links', null);
    return jsonb_build_object('ok', false, 'code', 'pb:too_many_links');
  end if;
  if (select count(*) from pb_onboard.links l where l.company_id = p_company and l.kind = 'join' and l.created_at > now() - interval '24 hours') >= 30 then
    perform pb_onboard.log(p_company, p_uid, 'refused', null, null, 'pb:link_limit', null);
    return jsonb_build_object('ok', false, 'code', 'pb:link_limit');
  end if;
  why := pb_onboard.room(p_company, coalesce(p_freed, 0), null);
  if why is not null then
    perform pb_onboard.log(p_company, p_uid, 'refused', null, null, why, null);
    return jsonb_build_object('ok', false, 'code', why);
  end if;
  v_tok := pb_onboard.new_token(); v_code := pb_onboard.new_code();
  insert into pb_onboard.links (kind, company_id, role, label, pair_foreman, replaces_user, token_hash, code, created_by, expires_at)
    values ('join', p_company, p_role, p_label, case when p_role = 'pipelayer' then p_pair end, p_replaces, pb_onboard.hash(v_tok), v_code, p_uid, v_exp) returning id into v_id;
  perform pb_onboard.log(p_company, p_uid, 'made', v_id, null, null, jsonb_build_object('role', p_role, 'label', p_label, 'pair', p_pair, 'replaces', p_replaces));
  return jsonb_build_object('ok', true, 'id', v_id, 'token', v_tok, 'code', v_code, 'expires_at', v_exp, 'role', p_role, 'label', p_label,
    'company_name', (select c.name from public.companies c where c.id = p_company),
    'pair_name', case when p_role = 'pipelayer' and p_pair is not null then pb_crew.display_name(p_company, p_pair) end);
end $function$;


CREATE OR REPLACE FUNCTION pb_sec.guard(p_tag text, p_sig text, p_md5 text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_def text; v_md5 text;
begin
  v_def := pg_get_functiondef(p_sig::regprocedure);
  v_md5 := md5(v_def);
  if v_md5 = p_md5 then
    insert into pb_sec.fn_backup (tag, sig, def, md5) values (p_tag, p_sig, v_def, v_md5) on conflict (tag, sig) do nothing;
    return;
  end if;
  if exists (select 1 from pb_sec.fn_backup b where b.tag = p_tag and b.sig = p_sig) then return; end if; -- this migration ran before
  -- (throwaway local test database only: the stand-in functions there are not the live text)
  if current_setting('pb_sec.guard', true) = 'skip-local-test' then
    insert into pb_sec.fn_backup (tag, sig, def, md5) values (p_tag, p_sig, v_def, v_md5) on conflict (tag, sig) do nothing;
    return;
  end if;
  raise exception 'pb_sec: % changed on live since Nov 21 2026 (md5 % , expected %). Nothing was applied. Re-read it and rebase this migration.', p_sig, v_md5, p_md5;
end $function$;
CREATE OR REPLACE FUNCTION pb_sec.restore(p_tag text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r record; n integer := 0;
begin
  for r in select b.sig, b.def from pb_sec.fn_backup b where b.tag = p_tag order by b.sig loop
    execute r.def; n := n + 1;
  end loop;
  delete from pb_sec.fn_backup where tag = p_tag;
  return n;
end $function$;
CREATE OR REPLACE FUNCTION pb_onboard.hash(p_token text)
 RETURNS bytea
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select extensions.digest(convert_to(coalesce(p_token, ''), 'UTF8'), 'sha256')
$function$;
CREATE OR REPLACE FUNCTION pb_onboard.new_token()
 RETURNS text
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=')
$function$;
CREATE OR REPLACE FUNCTION pb_onboard.new_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a text := 'ACDEFHJKMNPRTUVWXY34679'; c text; b bytea; i int; tries int := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended('pb_onboard_code', 0));
  loop
    b := extensions.gen_random_bytes(6); c := '';
    for i in 0..5 loop c := c || substr(a, 1 + (get_byte(b, i) % length(a)), 1); end loop;
    exit when not exists (select 1 from pb_onboard.links l where l.code = c and l.used_at is null and l.revoked_at is null and l.expires_at > now() - interval '1 day');
    tries := tries + 1; if tries > 20 then raise exception 'pb:server'; end if;
  end loop;
  return c;
end $function$;
CREATE OR REPLACE FUNCTION pb_onboard.log(p_company uuid, p_actor uuid, p_action text, p_link uuid, p_target uuid, p_code text, p_detail jsonb)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  insert into pb_onboard.events (company_id, actor, action, link_id, target_user, code, detail) values (p_company, p_actor, p_action, p_link, p_target, p_code, p_detail)
$function$;
CREATE OR REPLACE FUNCTION pb_prod.my_company(p_uid uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select x.company_id from pb_prod.my_member(p_uid) x
$function$;
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
$function$;
CREATE OR REPLACE FUNCTION pb_prod.is_foreman_of(p_uid uuid, p_company uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from pb_prod.my_member(p_uid) x where x.company_id = p_company and x.role = 'foreman')
$function$;
CREATE OR REPLACE FUNCTION pb_billing.trial_seats_used(p_company uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select 1 + (select count(*)::int from public.company_members m where m.company_id = p_company)
    + (select count(*)::int from pb_crew.invitations i where i.company_id = p_company and i.status = 'pending' and not pb_crew.invitation_expired(i.created_at))
$function$;
CREATE OR REPLACE FUNCTION pb_crew.own_name(p_user uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select o.name from pb_crew.own_names o where o.user_id = p_user
$function$;
CREATE OR REPLACE FUNCTION pb_crew.label_of(p_company uuid, p_user uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select l.label from pb_crew.member_labels l where l.company_id = p_company and l.user_id = p_user
$function$;
CREATE OR REPLACE FUNCTION pb_crew.display_name(p_company uuid, p_user uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(pb_crew.label_of(p_company, p_user), pb_crew.own_name(p_user))
$function$;
CREATE OR REPLACE FUNCTION pb_billing.read_only(p_company uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from pb_billing.accounts a where a.company_id = p_company
                 and (pb_billing.state_of(a) = 'read_only'
                      or (a.state = 'canceled' and coalesce(a.cancel_at, now()) <= now())))
$function$;
CREATE OR REPLACE FUNCTION pb_billing.trial_limits()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select jsonb_build_object('days', 30, 'stake', 30, 'teacher', 10, 'analysis', 10, 'cutsheet', 5, 'ticket', 5, 'plans_strong', 0,
    'other', 10, 'company_day', 200, 'plan_sets_month', 2, 'seats', 7)
$function$;
CREATE OR REPLACE FUNCTION pb_billing.beta_closed(p_company uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.companies c where c.id = p_company and c.plan = 'trial'
                 and coalesce(c.trial_ends_at, now()) + interval '3 days' <= now())
$function$;
CREATE OR REPLACE FUNCTION pb_onboard.live_links(p_company uuid, p_except uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select count(*)::int from pb_onboard.links l
   where l.company_id = p_company and l.kind = 'join' and l.used_at is null and l.revoked_at is null and l.expires_at > now()
     and l.id is distinct from p_except
$function$;
CREATE OR REPLACE FUNCTION pb_onboard.room(p_company uuid, p_freed integer DEFAULT 0, p_except uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case
    when not exists (select 1 from public.companies c where c.id = p_company and c.status = 'active') then 'pb:company_inactive'
    when pb_billing.beta_closed(p_company) then 'pb:beta_ended'
    when pb_billing.read_only(p_company) then 'pb:read_only'
    when exists (select 1 from public.companies c where c.id = p_company and c.plan = 'trial')
         and pb_billing.trial_seats_used(p_company) - p_freed + pb_onboard.live_links(p_company, p_except) >= (pb_billing.trial_limits()->>'seats')::int then 'pb:trial_seats'
    else null end
$function$;
CREATE OR REPLACE FUNCTION pb_onboard.maker_company(p_uid uuid, p_role text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v uuid;
begin
  if p_uid is null then raise exception 'pb:signed_out'; end if;
  if p_role is null or p_role not in ('foreman', 'pipelayer') then raise exception 'pb:bad_role'; end if;
  v := pb_prod.managed_company(p_uid);
  if v is not null then return v; end if;
  v := pb_prod.my_company(p_uid);
  if v is not null and pb_prod.is_foreman_of(p_uid, v) then
    if not coalesce((select s.foreman_links from pb_onboard.settings s where s.company_id = v), true) then raise exception 'pb:foreman_links_off'; end if;
    if p_role <> 'pipelayer' then raise exception 'pb:foreman_pipelayer_only'; end if;
    return v;
  end if;
  raise exception 'pb:not_company_account';
end $function$;
CREATE OR REPLACE FUNCTION public.pb_onboard_link_make(p_role text, p_name text DEFAULT NULL::text, p_pair_foreman uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_co uuid; v_mgr boolean; v_pair uuid;
begin
  v_co := pb_onboard.maker_company(v_uid, p_role);
  if length(coalesce(p_name, '')) > 400 then return jsonb_build_object('ok', false, 'code', 'pb:name_too_long'); end if;
  v_mgr := pb_prod.managed_company(v_uid) is not distinct from v_co;
  if v_mgr then
    if p_pair_foreman is not null then
      if p_role <> 'pipelayer' then return jsonb_build_object('ok', false, 'code', 'pb:bad_role'); end if;
      if not pb_prod.is_foreman_of(p_pair_foreman, v_co) then return jsonb_build_object('ok', false, 'code', 'pb:not_a_foreman'); end if;
      v_pair := p_pair_foreman;
    end if;
  else
    v_pair := v_uid; -- a foreman's link: the pipelayer goes on his crew (#15)
  end if;
  return pb_onboard.make_link(v_co, v_uid, p_role, pb_crew.clean_name(p_name), v_pair, null, 0);
end $function$;

revoke all on function public.pb_onboard_link_make(text, text, uuid) from public, anon;
grant execute on function public.pb_onboard_link_make(text, text, uuid) to authenticated;
revoke all on schema pb_onboard, pb_prod, pb_billing, pb_crew, pb_reports, pb_sec from public, anon, authenticated;
revoke all on function pb_onboard.make_link(uuid,uuid,text,text,uuid,uuid,integer) from public, anon, authenticated; -- as live (read Nov 22: neither may execute)
