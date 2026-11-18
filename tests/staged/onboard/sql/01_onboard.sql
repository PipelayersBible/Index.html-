-- Crew join links (feat onboard, Nov 17 2026, on r16.95). STAGED ONLY: not applied. Tested in a rolled-back DO block
-- (sql/01_onboard_test.sql, built by sql/mktest.py; results in DESIGN.md).
--
-- A foreman / the company account makes a single-use, expiring JOIN LINK for one person with the role preset, and texts
-- it from his own phone (sms: URL). Tapping it opens the app at  https://app.pipelayersbible.com/#join=<token> .
-- The token (24 random bytes, base64url, 32 characters) is never stored: only its SHA-256. Each link also has a
-- 6-character CODE (no look-alike letters) for typing into the iPhone Home Screen app, or reading out loud.
--
-- How the person gets an account (see DESIGN.md):
--   * no account yet: the crew-join edge function (functions/crew-join, service role) makes one with no email and no
--     password (a hidden placeholder address, never mailed), joins it here (pb_onboard_svc 'join') and signs the phone
--     in with a one-time magic-link hash that is never emailed (auth.admin.generateLink + auth.verifyOtp).
--   * already signed in on that phone: public.pb_onboard_join() joins the current account (no edge function).
-- A HANDOFF code (kind 'handoff') lets the same person sign in to the iPhone Home Screen app (its own storage and login)
-- without a password: made by the signed-in person for themselves, 15 minutes, single use.
--
-- Safety: single use (row lock + used_at), 24 h expiry, revocable, at most 10 live links and 30 made a day per company,
-- beta seat cap counted with live links, a foreman may only make Pipelayer links (and only while the company allows it),
-- wrong tokens / codes are counted and a global brake stops code lookups after 30 misses in 10 minutes, every step is
-- logged in pb_onboard.events, and the company sees who joined by which link and can remove them (crew-admin remove).
--
-- Every function: SECURITY DEFINER, set search_path to ''. Tables live in schema pb_onboard (the API can't reach it).

create schema if not exists pb_onboard;
revoke all on schema pb_onboard from public, anon, authenticated;

create table if not exists pb_onboard.links (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('join', 'handoff')),
  company_id uuid references public.companies(id) on delete cascade,
  role text check (role in ('foreman', 'pipelayer')),
  label text check (length(label) <= 80),
  for_user uuid references auth.users(id) on delete cascade,
  token_hash bytea not null unique,
  code text not null check (code ~ '^[ACDEFHJKMNPRTUVWXY34679]{6}$'),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  opened_at timestamptz,
  open_count int not null default 0,
  claimed_until timestamptz,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid,
  constraint links_join_shape check (kind <> 'join' or (company_id is not null and role is not null and for_user is null)),
  constraint links_handoff_shape check (kind <> 'handoff' or (for_user is not null and role is null))
);
create index if not exists links_company_idx on pb_onboard.links (company_id, created_at desc);
create index if not exists links_code_idx on pb_onboard.links (code) where used_at is null and revoked_at is null;

create table if not exists pb_onboard.misses (at timestamptz not null default now(), kind text not null);
create index if not exists misses_at_idx on pb_onboard.misses (at);

create table if not exists pb_onboard.events (
  id bigserial primary key,
  at timestamptz not null default now(),
  company_id uuid,
  actor uuid,
  action text not null check (action in ('made', 'opened', 'joined', 'revoked', 'refused', 'handoff_made', 'handoff_used', 'claimed', 'abandoned')),
  link_id uuid,
  target_user uuid,
  code text check (length(code) <= 80),
  detail jsonb
);
create index if not exists events_company_idx on pb_onboard.events (company_id, at desc);

-- Company setting (owner decision in DESIGN.md): may foremen make Pipelayer links? Default: yes.
create table if not exists pb_onboard.settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  foreman_links boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table pb_onboard.links enable row level security;
alter table pb_onboard.misses enable row level security;
alter table pb_onboard.events enable row level security;
alter table pb_onboard.settings enable row level security;

-- ---- helpers (not callable from the API) ----
create or replace function pb_onboard.hash(p_token text)
 returns bytea
 language sql
 immutable
 set search_path to ''
as $function$
  select extensions.digest(convert_to(coalesce(p_token, ''), 'UTF8'), 'sha256')
$function$;

create or replace function pb_onboard.new_token()
 returns text
 language sql
 volatile
 set search_path to ''
as $function$
  select translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_')
$function$;

create or replace function pb_onboard.new_code()
 returns text
 language plpgsql
 volatile
 security definer
 set search_path to ''
as $function$
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

create or replace function pb_onboard.clean_code(p text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select nullif(upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')), '')
$function$;

create or replace function pb_onboard.log(p_company uuid, p_actor uuid, p_action text, p_link uuid, p_target uuid, p_code text, p_detail jsonb)
 returns void
 language sql
 security definer
 set search_path to ''
as $function$
  insert into pb_onboard.events (company_id, actor, action, link_id, target_user, code, detail) values (p_company, p_actor, p_action, p_link, p_target, p_code, p_detail)
$function$;

-- the global brake for typed codes (a token is 192 bits: guessing one is hopeless, but misses are counted too)
create or replace function pb_onboard.braked()
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select (select count(*) from pb_onboard.misses m where m.at > now() - interval '10 minutes') >= 30
$function$;

create or replace function pb_onboard.miss(p_kind text)
 returns void
 language sql
 security definer
 set search_path to ''
as $function$
  delete from pb_onboard.misses where at < now() - interval '1 day';
  insert into pb_onboard.misses (kind) values (left(p_kind, 20));
$function$;

-- Who may make a join link for which role. Returns the company, or raises.
--   company account (owner / PM / super / listed manager): Foreman or Pipelayer
--   a foreman of the company: Pipelayer only, while the company allows it (pb_onboard.settings, default yes)
create or replace function pb_onboard.maker_company(p_uid uuid, p_role text)
 returns uuid
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
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

-- The link a token or a code points at (live or not), or null. Counts a miss when nothing matches.
create or replace function pb_onboard.find(p_token text, p_code text, p_kind text)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v uuid; c text := pb_onboard.clean_code(p_code);
begin
  if p_token is not null and length(p_token) between 20 and 100 then
    select l.id into v from pb_onboard.links l where l.token_hash = pb_onboard.hash(p_token) and (p_kind is null or l.kind = p_kind);
    if v is null then perform pb_onboard.miss('token'); end if;
    return v;
  end if;
  if c is null or length(c) <> 6 then return null; end if;
  if pb_onboard.braked() then raise exception 'pb:busy'; end if;
  select l.id into v from pb_onboard.links l
   where l.code = c and (p_kind is null or l.kind = p_kind) and l.used_at is null and l.revoked_at is null and l.expires_at > now()
   order by l.created_at desc limit 1;
  if v is null then perform pb_onboard.miss('code'); end if;
  return v;
end $function$;

-- Why a link can't be used now (null = it can). Locks nothing.
create or replace function pb_onboard.refusal(l pb_onboard.links)
 returns text
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select case
    when l.id is null then 'pb:link_not_found'
    when l.revoked_at is not null then 'pb:link_revoked'
    when l.used_at is not null then 'pb:link_used'
    when l.expires_at <= now() then 'pb:link_expired'
    when l.kind = 'join' and not exists (select 1 from public.companies c where c.id = l.company_id and c.status = 'active') then 'pb:company_inactive'
    when l.claimed_until is not null and l.claimed_until > now() then 'pb:link_busy'
    else null end
$function$;

-- The join itself: the account p_user becomes a member of the link's company with the preset role. One transaction.
create or replace function pb_onboard.join_link(p_link uuid, p_user uuid, p_name text, p_via text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare l pb_onboard.links; why text; v_co record; v_name text := pb_crew.clean_name(p_name); v_m record;
begin
  if p_user is null then raise exception 'pb:signed_out'; end if;
  select * into l from pb_onboard.links x where x.id = p_link and x.kind = 'join' for update;
  why := pb_onboard.refusal(l);
  if why = 'pb:link_busy' and p_via = 'edge' then why := null; end if; -- the edge function holds the claim itself
  if why is not null then
    perform pb_onboard.log(l.company_id, p_user, 'refused', l.id, p_user, why, jsonb_build_object('via', p_via));
    return jsonb_build_object('ok', false, 'code', why);
  end if;
  select c.id, c.name, c.owner_user_id into v_co from public.companies c where c.id = l.company_id;
  select m.company_id, m.role into v_m from public.company_members m where m.user_id = p_user;
  if p_user = v_co.owner_user_id then return jsonb_build_object('ok', false, 'code', 'pb:is_owner'); end if;
  if v_m.company_id = l.company_id then return jsonb_build_object('ok', false, 'code', 'pb:already_member', 'role', v_m.role, 'company_name', v_co.name); end if;
  if pb_crew.in_other_company(p_user, l.company_id) then
    perform pb_onboard.log(l.company_id, p_user, 'refused', l.id, p_user, 'pb:other_company', jsonb_build_object('via', p_via));
    return jsonb_build_object('ok', false, 'code', 'pb:other_company');
  end if;
  begin
    insert into public.company_members (company_id, user_id, role) values (l.company_id, p_user, l.role);
  exception when others then
    why := coalesce((regexp_match(sqlerrm, 'pb:[a-z_]+'))[1], case when sqlstate = '23505' then 'pb:other_company' else 'pb:server' end);
    perform pb_onboard.log(l.company_id, p_user, 'refused', l.id, p_user, why, jsonb_build_object('via', p_via));
    return jsonb_build_object('ok', false, 'code', why);
  end;
  update pb_onboard.links set used_at = now(), used_by = p_user, claimed_until = null where id = l.id;
  -- the name: the company's label (what the inviter typed, else what he typed himself); his own name if he has none
  if coalesce(l.label, v_name) is not null and pb_crew.label_of(l.company_id, p_user) is null then
    perform pb_crew.put_label(l.company_id, l.created_by, p_user, coalesce(l.label, v_name), 'invite_label');
  end if;
  if v_name is not null and pb_crew.own_name(p_user) is null then
    insert into pb_crew.own_names (user_id, name, updated_at) values (p_user, v_name, now()) on conflict (user_id) do nothing;
    insert into pb_crew.name_audit (company_id, actor, target_user, kind, old_name, new_name, outcome) values (null, p_user, p_user, 'own', null, v_name, 'ok');
  end if;
  perform pb_onboard.log(l.company_id, p_user, 'joined', l.id, p_user, null, jsonb_build_object('role', l.role, 'via', p_via, 'invited_by', l.created_by));
  return jsonb_build_object('ok', true, 'company_id', l.company_id, 'company_name', v_co.name, 'role', l.role, 'user_id', p_user);
end $function$;

-- ---- the API ----

-- Make a join link. Returns the token ONCE (only its hash is kept).
create or replace function public.pb_onboard_link_make(p_role text, p_name text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_co uuid; v_tok text; v_code text; v_id uuid; v_name text := pb_crew.clean_name(p_name); v_exp timestamptz := now() + interval '24 hours'; v_cn text;
begin
  v_co := pb_onboard.maker_company(v_uid, p_role);
  if length(coalesce(p_name, '')) > 400 then return jsonb_build_object('ok', false, 'code', 'pb:name_too_long'); end if;
  perform pg_advisory_xact_lock(hashtextextended('pb_onboard_make:' || v_co::text, 0));
  if (select count(*) from pb_onboard.links l where l.company_id = v_co and l.kind = 'join' and l.used_at is null and l.revoked_at is null and l.expires_at > now()) >= 10 then
    perform pb_onboard.log(v_co, v_uid, 'refused', null, null, 'pb:too_many_links', null);
    return jsonb_build_object('ok', false, 'code', 'pb:too_many_links');
  end if;
  if (select count(*) from pb_onboard.links l where l.company_id = v_co and l.kind = 'join' and l.created_at > now() - interval '24 hours') >= 30 then
    perform pb_onboard.log(v_co, v_uid, 'refused', null, null, 'pb:link_limit', null);
    return jsonb_build_object('ok', false, 'code', 'pb:link_limit');
  end if;
  if exists (select 1 from public.companies c where c.id = v_co and c.plan = 'trial')
     and pb_billing.trial_seats_used(v_co) + (select count(*) from pb_onboard.links l where l.company_id = v_co and l.kind = 'join' and l.used_at is null and l.revoked_at is null and l.expires_at > now())
         >= (pb_billing.trial_limits()->>'seats')::int then
    return jsonb_build_object('ok', false, 'code', 'pb:trial_seats');
  end if;
  v_tok := pb_onboard.new_token(); v_code := pb_onboard.new_code();
  insert into pb_onboard.links (kind, company_id, role, label, token_hash, code, created_by, expires_at)
    values ('join', v_co, p_role, v_name, pb_onboard.hash(v_tok), v_code, v_uid, v_exp) returning id into v_id;
  select c.name into v_cn from public.companies c where c.id = v_co;
  perform pb_onboard.log(v_co, v_uid, 'made', v_id, null, null, jsonb_build_object('role', p_role, 'label', v_name));
  return jsonb_build_object('ok', true, 'id', v_id, 'token', v_tok, 'code', v_code, 'expires_at', v_exp, 'role', p_role, 'label', v_name, 'company_name', v_cn);
end $function$;

-- The links the caller can see: the company account sees all of the company's (last 7 days), a foreman his own.
create or replace function public.pb_onboard_links()
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_co uuid; v_mgr boolean;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  v_co := pb_prod.managed_company(v_uid); v_mgr := v_co is not null;
  if v_co is null then v_co := pb_prod.my_company(v_uid); end if;
  if v_co is null then return jsonb_build_object('ok', true, 'links', '[]'::jsonb, 'server_at', now()); end if;
  return jsonb_build_object('ok', true, 'server_at', now(), 'manager', v_mgr,
    'foreman_links', coalesce((select s.foreman_links from pb_onboard.settings s where s.company_id = v_co), true),
    'links', coalesce((select jsonb_agg(jsonb_build_object(
      'id', l.id, 'role', l.role, 'label', l.label, 'code', case when l.used_at is null and l.revoked_at is null and l.expires_at > now() then l.code end,
      'made_by', coalesce(pb_crew.display_name(v_co, l.created_by), 'Company account'), 'mine', l.created_by = v_uid,
      'created_at', l.created_at, 'expires_at', l.expires_at, 'opened_at', l.opened_at, 'used_at', l.used_at,
      'joined_name', case when l.used_by is not null then pb_crew.display_name(v_co, l.used_by) end,
      'joined_user', l.used_by,
      'still_member', case when l.used_by is not null then exists (select 1 from public.company_members m where m.user_id = l.used_by and m.company_id = v_co) end,
      'status', case when l.used_at is not null then 'joined' when l.revoked_at is not null then 'revoked' when l.expires_at <= now() then 'expired' when l.opened_at is not null then 'opened' else 'waiting' end
    ) order by l.created_at desc)
    from pb_onboard.links l where l.company_id = v_co and l.kind = 'join' and l.created_at > now() - interval '7 days' and (v_mgr or l.created_by = v_uid)), '[]'::jsonb));
end $function$;

create or replace function public.pb_onboard_link_revoke(p_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); l pb_onboard.links; v_mgr uuid;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  select * into l from pb_onboard.links x where x.id = p_id and x.kind = 'join' for update;
  if l.id is null then return jsonb_build_object('ok', false, 'code', 'pb:link_not_found'); end if;
  v_mgr := pb_prod.managed_company(v_uid);
  if not coalesce(v_mgr = l.company_id or (l.created_by = v_uid and pb_prod.my_company(v_uid) = l.company_id), false) then return jsonb_build_object('ok', false, 'code', 'pb:not_company_account'); end if; -- null-safe: a foreman has no managed company
  if l.used_at is not null then return jsonb_build_object('ok', false, 'code', 'pb:link_used'); end if;
  if l.revoked_at is null then
    update pb_onboard.links set revoked_at = now(), revoked_by = v_uid where id = l.id;
    perform pb_onboard.log(l.company_id, v_uid, 'revoked', l.id, null, null, null);
  end if;
  return jsonb_build_object('ok', true);
end $function$;

-- What a link is, for the join screen (works signed out). Marks it opened. Never returns the token.
create or replace function public.pb_onboard_peek(p_token text default null, p_code text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v uuid; l pb_onboard.links; why text; v_cn text;
begin
  v := pb_onboard.find(p_token, p_code, 'join');
  select * into l from pb_onboard.links x where x.id = v;
  why := pb_onboard.refusal(l);
  if why = 'pb:link_busy' then why := null; end if;
  if why is not null then return jsonb_build_object('ok', false, 'code', why); end if;
  select c.name into v_cn from public.companies c where c.id = l.company_id;
  update pb_onboard.links set opened_at = coalesce(opened_at, now()), open_count = open_count + 1 where id = l.id;
  if l.opened_at is null then perform pb_onboard.log(l.company_id, auth.uid(), 'opened', l.id, null, null, null); end if;
  return jsonb_build_object('ok', true, 'company_name', v_cn, 'role', l.role, 'label', l.label,
    'invited_by', coalesce(pb_crew.display_name(l.company_id, l.created_by), 'Your company'), 'expires_at', l.expires_at,
    'code', case when p_token is not null then l.code end);
exception when others then
  if sqlerrm like 'pb:busy%' then return jsonb_build_object('ok', false, 'code', 'pb:busy'); end if;
  raise;
end $function$;

-- Join with the account already signed in on this phone.
create or replace function public.pb_onboard_join(p_token text default null, p_code text default null, p_name text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v uuid;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  begin v := pb_onboard.find(p_token, p_code, 'join'); exception when others then if sqlerrm like 'pb:busy%' then return jsonb_build_object('ok', false, 'code', 'pb:busy'); end if; raise; end;
  if v is null then return jsonb_build_object('ok', false, 'code', 'pb:link_not_found'); end if;
  return pb_onboard.join_link(v, v_uid, p_name, 'signed_in');
end $function$;

-- A code for this same account to sign in to the iPhone Home Screen app (15 minutes, single use, 5 an hour).
create or replace function public.pb_onboard_handoff_make()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_tok text; v_code text; v_id uuid; v_exp timestamptz := now() + interval '15 minutes';
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if (select count(*) from pb_onboard.links l where l.for_user = v_uid and l.kind = 'handoff' and l.created_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'code', 'pb:handoff_limit');
  end if;
  update pb_onboard.links set revoked_at = now(), revoked_by = v_uid where for_user = v_uid and kind = 'handoff' and used_at is null and revoked_at is null;
  v_tok := pb_onboard.new_token(); v_code := pb_onboard.new_code();
  insert into pb_onboard.links (kind, for_user, token_hash, code, created_by, expires_at) values ('handoff', v_uid, pb_onboard.hash(v_tok), v_code, v_uid, v_exp) returning id into v_id;
  perform pb_onboard.log(pb_prod.my_company(v_uid), v_uid, 'handoff_made', v_id, v_uid, null, null);
  return jsonb_build_object('ok', true, 'token', v_tok, 'code', v_code, 'expires_at', v_exp);
end $function$;

-- The company setting (owner / company account only).
create or replace function public.pb_onboard_settings_set(p_foreman_links boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_co uuid;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  v_co := pb_prod.managed_company(v_uid);
  if v_co is null then return jsonb_build_object('ok', false, 'code', 'pb:not_company_account'); end if;
  if p_foreman_links is null then return jsonb_build_object('ok', false, 'code', 'pb:bad_request'); end if;
  insert into pb_onboard.settings (company_id, foreman_links, updated_at, updated_by) values (v_co, p_foreman_links, now(), v_uid)
    on conflict (company_id) do update set foreman_links = excluded.foreman_links, updated_at = now(), updated_by = v_uid;
  return jsonb_build_object('ok', true, 'foreman_links', p_foreman_links);
end $function$;

-- The edge function's steps (service role only). The crew-join function makes / signs in the account.
--   claim   { token | code }              -> { ok, link_id, kind, company_name, role, for_user, email (handoff) }; holds the link 2 minutes
--   join    { link_id, user_id, name }     -> join_link(...)
--   handoff { link_id }                    -> marks the handoff used; { ok, user_id, email }
--   abandon { link_id }                    -> lets the claim go (the account couldn't be made)
create or replace function public.pb_onboard_svc(p_step text, p_args jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v uuid; l pb_onboard.links; why text; v_email text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then raise exception 'pb:service_only'; end if;
  if p_step = 'claim' then
    begin v := pb_onboard.find(p_args->>'token', p_args->>'code', null); exception when others then if sqlerrm like 'pb:busy%' then return jsonb_build_object('ok', false, 'code', 'pb:busy'); end if; raise; end;
    select * into l from pb_onboard.links x where x.id = v for update;
    why := pb_onboard.refusal(l);
    if why is not null then return jsonb_build_object('ok', false, 'code', why); end if;
    if l.kind = 'join' and pb_billing.trial_seats_full(l.company_id) then return jsonb_build_object('ok', false, 'code', 'pb:trial_seats'); end if; -- before an account is made
    if l.kind = 'handoff' then
      select u.email into v_email from auth.users u where u.id = l.for_user;
      if v_email is null then return jsonb_build_object('ok', false, 'code', 'pb:link_not_found'); end if;
    end if;
    update pb_onboard.links set claimed_until = now() + interval '2 minutes' where id = l.id;
    perform pb_onboard.log(l.company_id, null, 'claimed', l.id, l.for_user, null, null);
    return jsonb_build_object('ok', true, 'link_id', l.id, 'kind', l.kind, 'role', l.role, 'for_user', l.for_user, 'email', v_email,
      'company_name', (select c.name from public.companies c where c.id = l.company_id));
  elsif p_step = 'join' then
    return pb_onboard.join_link((p_args->>'link_id')::uuid, (p_args->>'user_id')::uuid, p_args->>'name', 'edge');
  elsif p_step = 'handoff' then
    select * into l from pb_onboard.links x where x.id = (p_args->>'link_id')::uuid and x.kind = 'handoff' for update;
    why := pb_onboard.refusal(l);
    if why = 'pb:link_busy' then why := null; end if;
    if why is not null then return jsonb_build_object('ok', false, 'code', why); end if;
    update pb_onboard.links set used_at = now(), used_by = l.for_user, claimed_until = null where id = l.id;
    perform pb_onboard.log(pb_prod.my_company(l.for_user), l.for_user, 'handoff_used', l.id, l.for_user, null, null);
    return jsonb_build_object('ok', true, 'user_id', l.for_user, 'email', (select u.email from auth.users u where u.id = l.for_user));
  elsif p_step = 'abandon' then
    update pb_onboard.links set claimed_until = null where id = (p_args->>'link_id')::uuid and used_at is null;
    perform pb_onboard.log(null, null, 'abandoned', (p_args->>'link_id')::uuid, null, left(p_args->>'why', 80), null);
    return jsonb_build_object('ok', true);
  end if;
  return jsonb_build_object('ok', false, 'code', 'pb:bad_request');
end $function$;

revoke all on all functions in schema pb_onboard from public, anon, authenticated;
revoke all on function public.pb_onboard_link_make(text, text) from public, anon;
revoke all on function public.pb_onboard_links() from public, anon;
revoke all on function public.pb_onboard_link_revoke(uuid) from public, anon;
revoke all on function public.pb_onboard_peek(text, text) from public;
revoke all on function public.pb_onboard_join(text, text, text) from public, anon;
revoke all on function public.pb_onboard_handoff_make() from public, anon;
revoke all on function public.pb_onboard_settings_set(boolean) from public, anon;
revoke all on function public.pb_onboard_svc(text, jsonb) from public, anon, authenticated;
grant execute on function public.pb_onboard_link_make(text, text) to authenticated;
grant execute on function public.pb_onboard_links() to authenticated;
grant execute on function public.pb_onboard_link_revoke(uuid) to authenticated;
grant execute on function public.pb_onboard_peek(text, text) to anon, authenticated;
grant execute on function public.pb_onboard_join(text, text, text) to authenticated;
grant execute on function public.pb_onboard_handoff_make() to authenticated;
grant execute on function public.pb_onboard_settings_set(boolean) to authenticated;
grant execute on function public.pb_onboard_svc(text, jsonb) to service_role;
-- ----------
-- (end of the statements the test runs)
