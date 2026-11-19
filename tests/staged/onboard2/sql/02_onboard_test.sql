do $obtest$
declare out text := ''; j jsonb; t1 text; c1 text; t2 text; id2 uuid; t3 text; c3 text; id3 uuid; t4 text; id4 uuid; th text; ch text; lid uuid; i int; snap text; ev int; t5 text; id5 uuid;
begin
  execute $obq$create schema if not exists pb_onboard
$obq$;
  execute $obq$revoke all on schema pb_onboard from public, anon, authenticated
$obq$;
  execute $obq$create table if not exists pb_onboard.links (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('join', 'handoff')),
  company_id uuid references public.companies(id) on delete cascade,
  role text check (role in ('foreman', 'pipelayer')),
  label text check (length(label) <= 80),
  for_user uuid references auth.users(id) on delete cascade,
  pair_foreman uuid references auth.users(id) on delete set null,
  replaces_user uuid,
  token_hash bytea not null unique,
  code text not null check (code ~ '^[ACDEFHJKMNPRTUVWXY34679]{6}$'),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_until timestamptz,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid,
  constraint links_join_shape check (kind <> 'join' or (company_id is not null and role is not null and for_user is null)),
  constraint links_handoff_shape check (kind <> 'handoff' or (for_user is not null and role is null)),
  constraint links_pair_shape check (pair_foreman is null or role = 'pipelayer')
)
$obq$;
  execute $obq$create index if not exists links_company_idx on pb_onboard.links (company_id, created_at desc)
$obq$;
  execute $obq$create index if not exists links_code_idx on pb_onboard.links (code) where used_at is null and revoked_at is null
$obq$;
  execute $obq$create table if not exists pb_onboard.misses (at timestamptz not null default now(), kind text not null)
$obq$;
  execute $obq$create index if not exists misses_at_idx on pb_onboard.misses (at)
$obq$;
  execute $obq$create table if not exists pb_onboard.events (
  id bigserial primary key,
  at timestamptz not null default now(),
  company_id uuid,
  actor uuid,
  action text not null check (action in ('made', 'joined', 'revoked', 'refused', 'handoff_made', 'handoff_used', 'claimed', 'abandoned', 'paired', 'lost_phone', 'setting')),
  link_id uuid,
  target_user uuid,
  code text check (length(code) <= 80),
  detail jsonb
)
$obq$;
  execute $obq$create index if not exists events_company_idx on pb_onboard.events (company_id, at desc)
$obq$;
  execute $obq$create table if not exists pb_onboard.settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  foreman_links boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
)
$obq$;
  execute $obq$alter table pb_onboard.links enable row level security
$obq$;
  execute $obq$alter table pb_onboard.misses enable row level security
$obq$;
  execute $obq$alter table pb_onboard.events enable row level security
$obq$;
  execute $obq$alter table pb_onboard.settings enable row level security
$obq$;
  execute $obq$create or replace function pb_onboard.hash(p_token text)
 returns bytea
 language sql
 immutable
 set search_path to ''
as $function$
  select extensions.digest(convert_to(coalesce(p_token, ''), 'UTF8'), 'sha256')
$function$
$obq$;
  execute $obq$create or replace function pb_onboard.new_token()
 returns text
 language sql
 volatile
 set search_path to ''
as $function$
  select rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=')
$function$
$obq$;
  execute $obq$create or replace function pb_onboard.new_code()
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
end $function$
$obq$;
  execute $obq$create or replace function pb_onboard.clean_code(p text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select nullif(upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')), '')
$function$
$obq$;
  execute $obq$create or replace function pb_onboard.log(p_company uuid, p_actor uuid, p_action text, p_link uuid, p_target uuid, p_code text, p_detail jsonb)
 returns void
 language sql
 security definer
 set search_path to ''
as $function$
  insert into pb_onboard.events (company_id, actor, action, link_id, target_user, code, detail) values (p_company, p_actor, p_action, p_link, p_target, p_code, p_detail)
$function$
$obq$;
  execute $obq$create or replace function pb_onboard.braked()
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select (select count(*) from pb_onboard.misses m where m.at > now() - interval '10 minutes') >= 30
$function$
$obq$;
  execute $obq$create or replace function pb_onboard.miss(p_kind text)
 returns void
 language sql
 security definer
 set search_path to ''
as $function$
  delete from pb_onboard.misses where at < now() - interval '1 day';
  insert into pb_onboard.misses (kind) values (left(p_kind, 20));
$function$
$obq$;
  execute $obq$create or replace function pb_onboard.live_links(p_company uuid, p_except uuid default null)
 returns integer
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select count(*)::int from pb_onboard.links l
   where l.company_id = p_company and l.kind = 'join' and l.used_at is null and l.revoked_at is null and l.expires_at > now()
     and l.id is distinct from p_except
$function$
$obq$;
  execute $obq$create or replace function pb_onboard.room(p_company uuid, p_freed integer default 0, p_except uuid default null)
 returns text
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select case
    when not exists (select 1 from public.companies c where c.id = p_company and c.status = 'active') then 'pb:company_inactive'
    when pb_billing.beta_closed(p_company) then 'pb:beta_ended'
    when pb_billing.read_only(p_company) then 'pb:read_only'
    when exists (select 1 from public.companies c where c.id = p_company and c.plan = 'trial')
         and pb_billing.trial_seats_used(p_company) - p_freed + pb_onboard.live_links(p_company, p_except) >= (pb_billing.trial_limits()->>'seats')::int then 'pb:trial_seats'
    else null end
$function$
$obq$;
  execute $obq$create or replace function pb_onboard.seat_info(p_company uuid)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select case when c.plan = 'trial' then jsonb_build_object(
      'plan', 'trial',
      'people', pb_billing.trial_seats_used(p_company) - 1,
      'waiting', pb_onboard.live_links(p_company),
      'limit', (pb_billing.trial_limits()->>'seats')::int - 1)
    else jsonb_build_object(
      'plan', c.plan,
      'people', pb_billing.seats_used(p_company),
      'waiting', pb_onboard.live_links(p_company),
      'paid', (select greatest(a.seats_paid, pb_crew.seats_included()) from pb_billing.accounts a where a.company_id = p_company),
      'interval', (select a.billing_interval from pb_billing.accounts a where a.company_id = p_company))
    end
  from public.companies c where c.id = p_company
$function$
$obq$;
  execute $obq$create or replace function pb_onboard.maker_company(p_uid uuid, p_role text)
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
end $function$
$obq$;
  execute $obq$create or replace function pb_onboard.make_link(p_company uuid, p_uid uuid, p_role text, p_label text, p_pair uuid, p_replaces uuid, p_freed integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
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
end $function$
$obq$;
  execute $obq$create or replace function pb_onboard.find(p_token text, p_code text, p_kind text)
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
end $function$
$obq$;
  execute $obq$create or replace function pb_onboard.refusal(l pb_onboard.links)
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
$function$
$obq$;
  execute $obq$create or replace function pb_onboard.record_legal(p_user uuid, p_company uuid, p_legal jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v text := '^[0-9]{1,3}(\.[0-9]{1,3}){0,2}$'; t text := p_legal->>'terms'; p text := p_legal->>'privacy'; n text := p_legal->>'notice';
  v_at timestamptz; v_terms boolean := false; v_notice boolean := false;
begin
  if p_legal is null or jsonb_typeof(p_legal) <> 'object' then return jsonb_build_object('terms', false, 'notice', false); end if;
  begin v_at := (p_legal->>'phone_at')::timestamptz; exception when others then v_at := null; end;
  if t ~ v and p ~ v then
    insert into pb_legal.acceptances (user_id, terms_version, privacy_version, phone_at, app_build, user_agent, company_id)
      values (p_user, t, p, v_at, left('join link · ' || coalesce(p_legal->>'build', ''), 60), left(p_legal->>'ua', 300), p_company);
    v_terms := true;
  end if;
  if n ~ v then
    if not exists (select 1 from pb_legal.notice_acks a where a.user_id = p_user and a.notice = 'crew_notice' and a.version = n) then
      insert into pb_legal.notice_acks (user_id, notice, version, phone_at, app_build, company_id) values (p_user, 'crew_notice', n, v_at, left('join link · ' || coalesce(p_legal->>'build', ''), 60), p_company);
    end if;
    v_notice := true;
  end if;
  return jsonb_build_object('terms', v_terms, 'notice', v_notice);
end $function$
$obq$;
  execute $obq$create or replace function pb_onboard.join_link(p_link uuid, p_user uuid, p_name text, p_via text, p_legal jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare l pb_onboard.links; why text; v_co record; v_name text := pb_crew.clean_name(p_name); v_m record; v_legal jsonb; v_paired text;
begin
  if p_user is null then raise exception 'pb:signed_out'; end if;
  select * into l from pb_onboard.links x where x.id = p_link and x.kind = 'join' for update;
  why := pb_onboard.refusal(l);
  if why = 'pb:link_busy' and p_via = 'edge' then why := null; end if; -- the edge function holds the claim itself
  if why is null and (pb_billing.beta_closed(l.company_id) or pb_billing.read_only(l.company_id)) then why := 'pb:company_closed'; end if;
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
  -- #17: the Terms ticked on the join screen, and the crew notice shown there
  v_legal := pb_onboard.record_legal(p_user, l.company_id, p_legal);
  -- #15: a Pipelayer link from a foreman (or one the office made for a foreman's crew) puts him on that crew
  if l.role = 'pipelayer' and l.pair_foreman is not null then
    if pb_prod.is_foreman_of(l.pair_foreman, l.company_id) then
      begin
        insert into pb_prod.crew_links (company_id, foreman_id, pipelayer_id, started_by) values (l.company_id, l.pair_foreman, p_user, p_user);
        v_paired := pb_crew.display_name(l.company_id, l.pair_foreman);
        perform pb_onboard.log(l.company_id, p_user, 'paired', l.id, p_user, null, jsonb_build_object('foreman', l.pair_foreman));
      exception when others then
        perform pb_onboard.log(l.company_id, p_user, 'refused', l.id, p_user, 'pb:pair_failed', jsonb_build_object('foreman', l.pair_foreman));
      end;
    else
      perform pb_onboard.log(l.company_id, p_user, 'refused', l.id, p_user, 'pb:pair_not_foreman', jsonb_build_object('foreman', l.pair_foreman));
    end if;
  end if;
  perform pb_onboard.log(l.company_id, p_user, 'joined', l.id, p_user, null, jsonb_build_object('role', l.role, 'via', p_via, 'invited_by', l.created_by, 'legal', v_legal, 'replaces', l.replaces_user));
  return jsonb_build_object('ok', true, 'company_id', l.company_id, 'company_name', v_co.name, 'role', l.role, 'user_id', p_user,
    'legal', v_legal, 'paired_with', v_paired);
end $function$
$obq$;
  execute $obq$create or replace function public.pb_onboard_link_make(p_role text, p_name text default null, p_pair_foreman uuid default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
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
end $function$
$obq$;
  execute $obq$create or replace function public.pb_onboard_links()
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
    'seats', case when v_mgr then pb_onboard.seat_info(v_co) end,
    'room', pb_onboard.room(v_co, 0, null),
    'links', coalesce((select jsonb_agg(jsonb_build_object(
      'id', l.id, 'role', l.role, 'label', l.label, 'code', case when l.used_at is null and l.revoked_at is null and l.expires_at > now() then l.code end,
      'made_by', coalesce(pb_crew.display_name(v_co, l.created_by), 'Company account'), 'mine', l.created_by = v_uid,
      'created_at', l.created_at, 'expires_at', l.expires_at, 'used_at', l.used_at,
      'pair_name', case when l.pair_foreman is not null and l.pair_foreman <> v_uid then pb_crew.display_name(v_co, l.pair_foreman) end,
      'paired_self', l.pair_foreman = v_uid,
      'replaces_name', case when l.replaces_user is not null then coalesce(pb_crew.display_name(v_co, l.replaces_user), 'a removed account') end,
      'joined_name', case when l.used_by is not null then pb_crew.display_name(v_co, l.used_by) end,
      'joined_user', l.used_by,
      'still_member', case when l.used_by is not null then exists (select 1 from public.company_members m where m.user_id = l.used_by and m.company_id = v_co) end,
      'status', case when l.used_at is not null then 'joined' when l.revoked_at is not null then 'revoked' when l.expires_at <= now() then 'expired' else 'waiting' end
    ) order by l.created_at desc)
    from pb_onboard.links l where l.company_id = v_co and l.kind = 'join' and l.created_at > now() - interval '7 days' and (v_mgr or l.created_by = v_uid)), '[]'::jsonb));
end $function$
$obq$;
  execute $obq$create or replace function public.pb_onboard_link_revoke(p_id uuid)
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
end $function$
$obq$;
  execute $obq$create or replace function public.pb_onboard_peek(p_token text default null, p_code text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v uuid; l pb_onboard.links; why text;
begin
  v := pb_onboard.find(p_token, p_code, 'join');
  select * into l from pb_onboard.links x where x.id = v;
  why := pb_onboard.refusal(l);
  if why = 'pb:link_busy' then why := null; end if;
  if why is null and (pb_billing.beta_closed(l.company_id) or pb_billing.read_only(l.company_id)) then why := 'pb:company_closed'; end if;
  if why is not null then return jsonb_build_object('ok', false, 'code', why); end if;
  return jsonb_build_object('ok', true, 'company_name', (select c.name from public.companies c where c.id = l.company_id), 'role', l.role, 'label', l.label,
    'invited_by', coalesce(pb_crew.display_name(l.company_id, l.created_by), 'Your company'), 'expires_at', l.expires_at,
    'pair_name', case when l.pair_foreman is not null then pb_crew.display_name(l.company_id, l.pair_foreman) end,
    'code', case when p_token is not null then l.code end);
exception when others then
  if sqlerrm like 'pb:busy%' then return jsonb_build_object('ok', false, 'code', 'pb:busy'); end if;
  raise;
end $function$
$obq$;
  execute $obq$create or replace function public.pb_onboard_join(p_token text default null, p_code text default null, p_name text default null, p_legal jsonb default null)
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
  return pb_onboard.join_link(v, v_uid, p_name, 'signed_in', p_legal);
end $function$
$obq$;
  execute $obq$create or replace function public.pb_onboard_handoff_make()
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
end $function$
$obq$;
  execute $obq$create or replace function public.pb_onboard_settings_set(p_foreman_links boolean)
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
  if not p_foreman_links then -- links foremen already made stop working too
    update pb_onboard.links l set revoked_at = now(), revoked_by = v_uid
     where l.company_id = v_co and l.kind = 'join' and l.used_at is null and l.revoked_at is null and l.expires_at > now()
       and pb_prod.managed_company(l.created_by) is distinct from v_co;
  end if;
  perform pb_onboard.log(v_co, v_uid, 'setting', null, null, null, jsonb_build_object('foreman_links', p_foreman_links));
  return jsonb_build_object('ok', true, 'foreman_links', p_foreman_links);
end $function$
$obq$;
  execute $obq$create or replace function public.pb_onboard_lost_phone(p_user uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_co uuid; v_owner uuid; v_is_owner boolean; why text; v_role text; v_label text; v_pair uuid; v_old jsonb; v_aid bigint; j jsonb; v_seats int;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  v_co := pb_prod.managed_company(v_uid);
  if v_co is null then return jsonb_build_object('ok', false, 'code', 'pb:not_company_account'); end if;
  select c.owner_user_id into v_owner from public.companies c where c.id = v_co; v_is_owner := v_owner = v_uid;
  why := pb_crew.target_refusal(v_uid, p_user, v_co, v_owner, v_is_owner);
  if why is not null then return jsonb_build_object('ok', false, 'code', why); end if;
  if not exists (select 1 from auth.users u where u.id = p_user and coalesce(u.raw_app_meta_data->>'pb_link', '') = 'true') then
    return jsonb_build_object('ok', false, 'code', 'pb:has_email');
  end if;
  select m.role into v_role from public.company_members m where m.user_id = p_user and m.company_id = v_co for update;
  if v_role not in ('foreman', 'pipelayer') or exists (select 1 from pb_reports.managers g where g.company_id = v_co and g.user_id = p_user) then
    return jsonb_build_object('ok', false, 'code', 'pb:not_crew');
  end if;
  v_label := pb_crew.display_name(v_co, p_user);
  select l.foreman_id into v_pair from pb_prod.crew_links l where l.pipelayer_id = p_user and l.company_id = v_co and l.ended_at is null;
  why := pb_onboard.room(v_co, 1, null);
  if why is not null then return jsonb_build_object('ok', false, 'code', why); end if;
  -- take the old account out (as pb_crew.svc_remove_begin + svc_take_out do, in one transaction)
  v_old := pb_crew.member_state(p_user, v_co); v_seats := pb_crew.seats(v_co);
  v_aid := pb_crew.log(v_co, v_uid, 'remove', p_user, null, v_old, jsonb_build_object('member', false, 'manager', false, 'lost_phone', true), 'requested', null, null);
  update pb_prod.crew_links set ended_at = now(), ended_by = v_uid, end_reason = 'membership_changed'
   where ended_at is null and (pipelayer_id = p_user or foreman_id = p_user);
  delete from public.company_members where company_id = v_co and user_id = p_user;
  perform pb_crew.log(v_co, v_uid, 'remove', p_user, null, v_old, pb_crew.member_state(p_user, v_co), 'ok', null, v_aid);
  delete from auth.sessions where user_id = p_user; -- its refresh tokens go with the sessions
  -- the new link: same role, same name, same foreman
  j := pb_onboard.make_link(v_co, v_uid, v_role, v_label, v_pair, p_user, 0);
  if not coalesce((j->>'ok')::boolean, false) then raise exception '%', coalesce(j->>'code', 'pb:server'); end if; -- undoes the removal too
  perform pb_onboard.log(v_co, v_uid, 'lost_phone', (j->>'id')::uuid, p_user, null, jsonb_build_object('role', v_role));
  return j || jsonb_build_object('removed', true, 'removed_name', v_label, 'seats_before', v_seats, 'seats_after', pb_crew.seats(v_co));
exception when others then
  if sqlerrm ~ '^pb:[a-z_]+$' then return jsonb_build_object('ok', false, 'code', sqlerrm); end if;
  raise;
end $function$
$obq$;
  execute $obq$create or replace function public.pb_onboard_start()
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_co uuid;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  v_co := pb_prod.managed_company(v_uid);
  if v_co is null then return jsonb_build_object('ok', false, 'code', 'pb:not_company_account'); end if;
  return jsonb_build_object('ok', true, 'company_id', v_co, 'server_at', now(),
    'crew', (select count(*) from public.company_members m where m.company_id = v_co and m.role in ('foreman', 'pipelayer')),
    'crew_signed_in', (select count(*) from public.company_members m join auth.users u on u.id = m.user_id
                        where m.company_id = v_co and m.role in ('foreman', 'pipelayer') and u.last_sign_in_at is not null),
    'links_waiting', pb_onboard.live_links(v_co),
    'invites_waiting', (select count(*) from pb_crew.invitations i where i.company_id = v_co and i.status = 'pending' and not pb_crew.invitation_expired(i.created_at)));
end $function$
$obq$;
  execute $obq$create or replace function public.pb_onboard_svc(p_step text, p_args jsonb)
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
    if l.kind = 'join' then -- before an account is made
      why := pb_onboard.room(l.company_id, 0, l.id);
      if why is not null then return jsonb_build_object('ok', false, 'code', case when why in ('pb:beta_ended', 'pb:read_only') then 'pb:company_closed' else why end); end if;
    end if;
    if l.kind = 'handoff' then
      select u.email into v_email from auth.users u where u.id = l.for_user;
      if v_email is null then return jsonb_build_object('ok', false, 'code', 'pb:link_not_found'); end if;
    end if;
    update pb_onboard.links set claimed_until = now() + interval '2 minutes' where id = l.id;
    perform pb_onboard.log(l.company_id, null, 'claimed', l.id, l.for_user, null, null);
    return jsonb_build_object('ok', true, 'link_id', l.id, 'kind', l.kind, 'role', l.role, 'for_user', l.for_user, 'email', v_email,
      'company_name', (select c.name from public.companies c where c.id = l.company_id));
  elsif p_step = 'join' then
    return pb_onboard.join_link((p_args->>'link_id')::uuid, (p_args->>'user_id')::uuid, p_args->>'name', 'edge', p_args->'legal');
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
end $function$
$obq$;
  execute $obq$revoke all on all functions in schema pb_onboard from public, anon, authenticated
$obq$;
  execute $obq$revoke all on function public.pb_onboard_link_make(text, text, uuid) from public, anon
$obq$;
  execute $obq$revoke all on function public.pb_onboard_links() from public, anon
$obq$;
  execute $obq$revoke all on function public.pb_onboard_link_revoke(uuid) from public, anon
$obq$;
  execute $obq$revoke all on function public.pb_onboard_peek(text, text) from public
$obq$;
  execute $obq$revoke all on function public.pb_onboard_join(text, text, text, jsonb) from public, anon
$obq$;
  execute $obq$revoke all on function public.pb_onboard_handoff_make() from public, anon
$obq$;
  execute $obq$revoke all on function public.pb_onboard_settings_set(boolean) from public, anon
$obq$;
  execute $obq$revoke all on function public.pb_onboard_lost_phone(uuid) from public, anon
$obq$;
  execute $obq$revoke all on function public.pb_onboard_start() from public, anon
$obq$;
  execute $obq$revoke all on function public.pb_onboard_svc(text, jsonb) from public, anon, authenticated
$obq$;
  execute $obq$grant execute on function public.pb_onboard_link_make(text, text, uuid) to authenticated
$obq$;
  execute $obq$grant execute on function public.pb_onboard_links() to authenticated
$obq$;
  execute $obq$grant execute on function public.pb_onboard_link_revoke(uuid) to authenticated
$obq$;
  execute $obq$grant execute on function public.pb_onboard_peek(text, text) to anon, authenticated
$obq$;
  execute $obq$grant execute on function public.pb_onboard_join(text, text, text, jsonb) to authenticated
$obq$;
  execute $obq$grant execute on function public.pb_onboard_handoff_make() to authenticated
$obq$;
  execute $obq$grant execute on function public.pb_onboard_settings_set(boolean) to authenticated
$obq$;
  execute $obq$grant execute on function public.pb_onboard_lost_phone(uuid) to authenticated
$obq$;
  execute $obq$grant execute on function public.pb_onboard_start() to authenticated
$obq$;
  execute $obq$grant execute on function public.pb_onboard_svc(text, jsonb) to service_role
$obq$;
  -- three throw-away accounts (rolled back with everything else): two joined by link (no email), one with an email
  insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at)
    values ('9e9e9e9e-0000-4000-8000-0000000000a1', 'm-test1@crew.pipelayersbible.com', 'authenticated', 'authenticated', '{"pb_link":true}', '{}', now(), now(), now()),
           ('9e9e9e9e-0000-4000-8000-0000000000a2', 'test2@example.com', 'authenticated', 'authenticated', '{}', '{}', now(), now(), null),
           ('9e9e9e9e-0000-4000-8000-0000000000a3', 'm-test3@crew.pipelayersbible.com', 'authenticated', 'authenticated', '{"pb_link":true}', '{}', now(), now(), now());
  -- 0. grants: nothing new is open by default
  out := '0.grants anonMake=' || has_function_privilege('anon', 'public.pb_onboard_link_make(text,text,uuid)', 'execute')
    || ' anonPeek=' || has_function_privilege('anon', 'public.pb_onboard_peek(text,text)', 'execute')
    || ' authSvc=' || has_function_privilege('authenticated', 'public.pb_onboard_svc(text,jsonb)', 'execute')
    || ' authLost=' || has_function_privilege('authenticated', 'public.pb_onboard_lost_phone(uuid)', 'execute')
    || ' anonLost=' || has_function_privilege('anon', 'public.pb_onboard_lost_phone(uuid)', 'execute')
    || ' authInner=' || has_function_privilege('authenticated', 'pb_onboard.join_link(uuid,uuid,text,text,jsonb)', 'execute');
  -- 1. the owner: a Pipelayer link for Mike on Ray's (the foreman's) crew, a Foreman link; not PM; not paired with a non-foreman
  reset role; perform set_config('request.jwt.claims', '{"sub":"e03416b7-6086-40a5-8d42-9267b846fc26","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_link_make('pipelayer', 'Mike', '4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e'); t1 := j->>'token'; c1 := j->>'code';
  out := out || ' | 1.O.make=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end || ' toklen=' || length(t1) || ' code=' || (c1 ~ '^[ACDEFHJKMNPRTUVWXY34679]{6}$') || ' role=' || (j->>'role') || ' exp_h=' || round(extract(epoch from ((j->>'expires_at')::timestamptz - now()))/3600) || ' pairName=' || coalesce(j->>'pair_name', '-');
  j := public.pb_onboard_link_make('foreman', null); t2 := j->>'token'; id2 := (j->>'id')::uuid; out := out || ' O.makeForeman=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  begin j := public.pb_onboard_link_make('pm', null); out := out || ' O.makePm=ALLOWED'; exception when others then out := out || ' O.makePm=' || sqlerrm; end;
  j := public.pb_onboard_link_make('pipelayer', null, '8cd34746-efb4-469c-b1d7-caa8709ba3e4'); out := out || ' O.pairWithPipelayer=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  j := public.pb_onboard_link_make('foreman', null, '4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e'); out := out || ' O.pairForemanLink=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  -- 2. the foreman: Pipelayer yes (on his own crew), Foreman no
  reset role; perform set_config('request.jwt.claims', '{"sub":"4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_link_make('pipelayer', null); t3 := j->>'token'; c3 := j->>'code'; id3 := (j->>'id')::uuid; out := out || ' | 2.F.makePl=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  begin j := public.pb_onboard_link_make('foreman', null); out := out || ' F.makeFm=ALLOWED'; exception when others then out := out || ' F.makeFm=' || sqlerrm; end;
  reset role; out := out || ' F.linkPair=' || ((select l.pair_foreman from pb_onboard.links l where l.id = id3) = '4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e');
  -- 3. a pipelayer can't
  reset role; perform set_config('request.jwt.claims', '{"sub":"8cd34746-efb4-469c-b1d7-caa8709ba3e4","role":"authenticated"}', true); set local role authenticated;
  begin j := public.pb_onboard_link_make('pipelayer', null); out := out || ' | 3.P.make=ALLOWED'; exception when others then out := out || ' | 3.P.make=' || sqlerrm; end;
  -- 4. signed out: what the link is. Opening it (3 times, like a scanner and a preview) changes nothing.
  reset role; select md5(string_agg(l::text, ',' order by l.id)) into snap from pb_onboard.links l; select count(*) into ev from pb_onboard.events;
  reset role; perform set_config('request.jwt.claims', '{"role":"anon"}', true); set local role anon;
  j := public.pb_onboard_peek(t1, null); out := out || ' | 4.anon.peek=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end || ' co=' || (j->>'company_name') || ' role=' || (j->>'role') || ' label=' || (j->>'label') || ' pair=' || coalesce(j->>'pair_name', '-') || ' codeBack=' || ((j->>'code') = c1);
  j := public.pb_onboard_peek(t1, null); j := public.pb_onboard_peek(t1, null);
  j := public.pb_onboard_peek(null, lower(substr(c1,1,3)) || '-' || substr(c1,4)); out := out || ' peekByCode=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end || ' codeHidden=' || (j->'code' = 'null'::jsonb or j->'code' is null);
  reset role; out := out || ' peekChangedNothing=' || ((select md5(string_agg(l::text, ',' order by l.id)) from pb_onboard.links l) = snap and (select count(*) from pb_onboard.events) = ev);
  reset role; perform set_config('request.jwt.claims', '{"role":"anon"}', true); set local role anon;
  j := public.pb_onboard_peek('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', null); out := out || ' peekWrong=' || (j->>'code');
  begin perform public.pb_onboard_join(t1, null, 'x'); out := out || ' anon.join=ALLOWED'; exception when others then out := out || ' anon.join=denied'; end;
  begin perform pb_onboard.find(t1, null, null); out := out || ' anon.find=ALLOWED'; exception when others then out := out || ' anon.find=denied'; end;
  begin perform public.pb_onboard_svc('claim', jsonb_build_object('token', t1)); out := out || ' anon.svc=ALLOWED'; exception when others then out := out || ' anon.svc=denied'; end;
  begin perform public.pb_onboard_lost_phone('8cd34746-efb4-469c-b1d7-caa8709ba3e4'); out := out || ' anon.lost=ALLOWED'; exception when others then out := out || ' anon.lost=denied'; end;
  begin perform public.pb_onboard_start(); out := out || ' anon.start=ALLOWED'; exception when others then out := out || ' anon.start=denied'; end;
  -- 5. the edge function: claim, (account made), join with the Terms and the crew notice ticked on the join screen
  reset role; perform set_config('request.jwt.claims', '{"role":"service_role"}', true); set local role service_role;
  j := public.pb_onboard_svc('claim', jsonb_build_object('token', t1)); lid := (j->>'link_id')::uuid; out := out || ' | 5.svc.claim=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end || ' kind=' || (j->>'kind');
  j := public.pb_onboard_svc('claim', jsonb_build_object('token', t1)); out := out || ' claimAgain=' || coalesce(j->>'code', 'ok');
  j := public.pb_onboard_svc('join', jsonb_build_object('link_id', lid, 'user_id', '9e9e9e9e-0000-4000-8000-0000000000a1', 'name', 'Mike Rivera', 'legal', jsonb_build_object('terms', '1.0', 'privacy', '1.0', 'notice', '3', 'phone_at', now(), 'build', 'r17.05 test', 'ua', 'test')));
  out := out || ' join=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end || ' role=' || (j->>'role') || ' legal=' || (j->>'legal') || ' pairedWith=' || coalesce(j->>'paired_with', '-');
  reset role;
  out := out || ' member=' || coalesce((select m.role from public.company_members m where m.user_id = '9e9e9e9e-0000-4000-8000-0000000000a1' and m.company_id = 'd01a4a5f-312a-418f-9172-ea9aec9784b5'), 'NONE')
     || ' label=' || coalesce(pb_crew.label_of('d01a4a5f-312a-418f-9172-ea9aec9784b5', '9e9e9e9e-0000-4000-8000-0000000000a1'), '-') || ' own=' || coalesce(pb_crew.own_name('9e9e9e9e-0000-4000-8000-0000000000a1'), '-')
     || ' crewLink=' || exists (select 1 from pb_prod.crew_links l where l.pipelayer_id = '9e9e9e9e-0000-4000-8000-0000000000a1' and l.foreman_id = '4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e' and l.ended_at is null)
     || ' terms=' || coalesce((select a.terms_version || '/' || a.privacy_version || '/' || a.app_build from pb_legal.acceptances a where a.user_id = '9e9e9e9e-0000-4000-8000-0000000000a1'), 'NONE')
     || ' notice=' || coalesce((select a.version from pb_legal.notice_acks a where a.user_id = '9e9e9e9e-0000-4000-8000-0000000000a1' and a.notice = 'crew_notice'), 'NONE');
  reset role; perform set_config('request.jwt.claims', '{"role":"service_role"}', true); set local role service_role;
  j := public.pb_onboard_svc('claim', jsonb_build_object('token', t1)); out := out || ' claimUsed=' || (j->>'code');
  reset role; perform set_config('request.jwt.claims', '{"role":"anon"}', true); set local role anon;
  j := public.pb_onboard_peek(t1, null); out := out || ' peekUsed=' || (j->>'code');
  -- 6. an account already signed in on that phone joins with the foreman's code: on the foreman's crew
  reset role; perform set_config('request.jwt.claims', '{"sub":"9e9e9e9e-0000-4000-8000-0000000000a2","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_join(null, c3, 'Dave', jsonb_build_object('terms', '1.0', 'privacy', '1.0', 'notice', '3', 'phone_at', now(), 'build', 'r17.05 test', 'ua', 'test')); out := out || ' | 6.N2.join=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end || ' role=' || (j->>'role') || ' paired=' || coalesce(j->>'paired_with', '-');
  j := public.pb_onboard_join(t3, null, 'Dave'); out := out || ' again=' || (j->>'code');
  reset role; out := out || ' N2.crewLink=' || exists (select 1 from pb_prod.crew_links l where l.pipelayer_id = '9e9e9e9e-0000-4000-8000-0000000000a2' and l.foreman_id = '4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e' and l.ended_at is null)
    || ' N2.terms=' || exists (select 1 from pb_legal.acceptances a where a.user_id = '9e9e9e9e-0000-4000-8000-0000000000a2');
  -- 7. an existing member with the Foreman link: refused, role unchanged
  reset role; perform set_config('request.jwt.claims', '{"sub":"8cd34746-efb4-469c-b1d7-caa8709ba3e4","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_join(t2, null, null); reset role; out := out || ' | 7.P.join=' || (j->>'code') || ' P.role=' || (select m.role from public.company_members m where m.user_id = '8cd34746-efb4-469c-b1d7-caa8709ba3e4');
  -- 8. revoke: the foreman can't revoke the owner's link; the owner can
  reset role; perform set_config('request.jwt.claims', '{"sub":"4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_link_revoke(id2); out := out || ' | 8.F.revokeOwners=' || coalesce(j->>'code', 'ok');
  reset role; perform set_config('request.jwt.claims', '{"sub":"e03416b7-6086-40a5-8d42-9267b846fc26","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_link_revoke(id2); out := out || ' O.revoke=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  reset role; perform set_config('request.jwt.claims', '{"role":"anon"}', true); set local role anon;
  j := public.pb_onboard_peek(t2, null); out := out || ' peekRevoked=' || (j->>'code');
  -- 9. expiry
  reset role; perform set_config('request.jwt.claims', '{"sub":"e03416b7-6086-40a5-8d42-9267b846fc26","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_link_make('pipelayer', null); t4 := j->>'token'; id4 := (j->>'id')::uuid;
  reset role; update pb_onboard.links set expires_at = now() - interval '1 minute' where id = id4;
  reset role; perform set_config('request.jwt.claims', '{"role":"anon"}', true); set local role anon;
  j := public.pb_onboard_peek(t4, null); out := out || ' | 9.peekExpired=' || (j->>'code');
  -- 10. the lists
  reset role; perform set_config('request.jwt.claims', '{"sub":"e03416b7-6086-40a5-8d42-9267b846fc26","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_links(); out := out || ' | 10.O.links=' || jsonb_array_length(j->'links') || ' statuses=' || (select string_agg(x->>'status', ',' order by x->>'status') from jsonb_array_elements(j->'links') x)
     || ' joinedName=' || coalesce((select x->>'joined_name' from jsonb_array_elements(j->'links') x where (x->>'joined_user') = '9e9e9e9e-0000-4000-8000-0000000000a1'), '-')
     || ' pairShown=' || coalesce((select x->>'pair_name' from jsonb_array_elements(j->'links') x where (x->>'joined_user') = '9e9e9e9e-0000-4000-8000-0000000000a1'), '-')
     || ' seats=' || coalesce(j->>'seats', '-') || ' room=' || coalesce(j->>'room', 'null');
  reset role; perform set_config('request.jwt.claims', '{"sub":"4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_links(); out := out || ' F.links=' || jsonb_array_length(j->'links') || ' F.mgr=' || (j->>'manager') || ' F.seats=' || coalesce(j->>'seats', 'hidden') || ' F.pairedSelf=' || coalesce((select x->>'paired_self' from jsonb_array_elements(j->'links') x limit 1), '-');
  reset role; perform set_config('request.jwt.claims', '{"sub":"8cd34746-efb4-469c-b1d7-caa8709ba3e4","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_links(); out := out || ' P.links=' || jsonb_array_length(j->'links');
  -- 11. handoff: N1 signs in to the Home Screen app with a code
  reset role; perform set_config('request.jwt.claims', '{"sub":"9e9e9e9e-0000-4000-8000-0000000000a1","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_handoff_make(); th := j->>'token'; ch := j->>'code'; out := out || ' | 11.N1.handoff=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end || ' min=' || round(extract(epoch from ((j->>'expires_at')::timestamptz - now()))/60);
  reset role; perform set_config('request.jwt.claims', '{"role":"anon"}', true); set local role anon;
  j := public.pb_onboard_peek(null, ch); out := out || ' peekHandoffAsJoin=' || (j->>'code');
  reset role; perform set_config('request.jwt.claims', '{"role":"service_role"}', true); set local role service_role;
  j := public.pb_onboard_svc('claim', jsonb_build_object('code', ch)); lid := (j->>'link_id')::uuid; out := out || ' claim=' || (j->>'kind') || ' email=' || (j->>'email');
  j := public.pb_onboard_svc('handoff', jsonb_build_object('link_id', lid)); out := out || ' use=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end || ' user=' || ((j->>'user_id') = '9e9e9e9e-0000-4000-8000-0000000000a1');
  j := public.pb_onboard_svc('claim', jsonb_build_object('code', ch)); out := out || ' again=' || (j->>'code');
  -- 12. the brake on typed codes (a token still works)
  reset role; perform set_config('request.jwt.claims', '{"sub":"e03416b7-6086-40a5-8d42-9267b846fc26","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_link_make('pipelayer', null); t4 := j->>'token';
  reset role; insert into pb_onboard.misses (kind) select 'code' from generate_series(1, 30);
  reset role; perform set_config('request.jwt.claims', '{"role":"anon"}', true); set local role anon;
  j := public.pb_onboard_peek(null, c3); out := out || ' | 12.peekCodeBraked=' || (j->>'code');
  j := public.pb_onboard_peek(t4, null); out := out || ' peekFreshTokenBraked=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  reset role; delete from pb_onboard.misses;
  -- 13. beta seat cap (company switched to beta inside the test only): company account + 6
  update pb_onboard.links set revoked_at = now() where company_id = 'd01a4a5f-312a-418f-9172-ea9aec9784b5' and used_at is null;
  update public.companies set plan = 'trial', trial_ends_at = now() + interval '20 days' where id = 'd01a4a5f-312a-418f-9172-ea9aec9784b5';
  out := out || ' | 13.trialUsedBefore=' || pb_billing.trial_seats_used('d01a4a5f-312a-418f-9172-ea9aec9784b5');
  reset role; perform set_config('request.jwt.claims', '{"sub":"e03416b7-6086-40a5-8d42-9267b846fc26","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_link_make('pipelayer', null); t5 := j->>'token'; out := out || ' make1=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  j := public.pb_onboard_link_make('pipelayer', null); out := out || ' make2=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  j := public.pb_onboard_links(); out := out || ' seats=' || (j->>'seats');
  reset role; perform set_config('request.jwt.claims', '{"role":"service_role"}', true); set local role service_role;
  j := public.pb_onboard_svc('claim', jsonb_build_object('token', t5)); out := out || ' claimLast=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  j := public.pb_onboard_svc('abandon', jsonb_build_object('link_id', j->>'link_id'));
  -- the beta ended (3 days after its end date): no links, and a link already out is refused when opened
  reset role; update public.companies set trial_ends_at = now() - interval '4 days' where id = 'd01a4a5f-312a-418f-9172-ea9aec9784b5';
  reset role; perform set_config('request.jwt.claims', '{"sub":"e03416b7-6086-40a5-8d42-9267b846fc26","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_link_make('pipelayer', null); out := out || ' betaEndedMake=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  reset role; perform set_config('request.jwt.claims', '{"role":"anon"}', true); set local role anon;
  j := public.pb_onboard_peek(t5, null); out := out || ' betaEndedPeek=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  reset role; perform set_config('request.jwt.claims', '{"role":"service_role"}', true); set local role service_role;
  j := public.pb_onboard_svc('claim', jsonb_build_object('token', t5)); out := out || ' betaEndedClaim=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  reset role; update pb_onboard.links set revoked_at = now() where company_id = 'd01a4a5f-312a-418f-9172-ea9aec9784b5' and used_at is null;
  update public.companies set plan = 'paid', trial_ends_at = null where id = 'd01a4a5f-312a-418f-9172-ea9aec9784b5';
  -- 14. paid company with a billing row: seats shown, never blocked by seats; read-only blocks
  insert into pb_billing.accounts (company_id, legal_name, billing_email, seats_paid, base_seats, base_cents, seat_cents, period_start, paid_through)
    values ('d01a4a5f-312a-418f-9172-ea9aec9784b5', 'Test Co', 'test@example.com', 5, 5, 9900, 1200, current_date - 10, current_date + 20);
  reset role; perform set_config('request.jwt.claims', '{"sub":"e03416b7-6086-40a5-8d42-9267b846fc26","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_links(); out := out || ' | 14.paidSeats=' || (j->>'seats');
  j := public.pb_onboard_link_make('pipelayer', null); out := out || ' paidMake=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  reset role; update pb_billing.accounts set state = 'read_only' where company_id = 'd01a4a5f-312a-418f-9172-ea9aec9784b5';
  reset role; perform set_config('request.jwt.claims', '{"sub":"e03416b7-6086-40a5-8d42-9267b846fc26","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_link_make('pipelayer', null); out := out || ' readOnlyMake=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  j := public.pb_onboard_links(); out := out || ' room=' || coalesce(j->>'room', 'null');
  reset role; delete from pb_billing.accounts where company_id = 'd01a4a5f-312a-418f-9172-ea9aec9784b5';
  update pb_onboard.links set revoked_at = now() where company_id = 'd01a4a5f-312a-418f-9172-ea9aec9784b5' and used_at is null;
  -- 15. at most 10 live links
  reset role; perform set_config('request.jwt.claims', '{"sub":"e03416b7-6086-40a5-8d42-9267b846fc26","role":"authenticated"}', true); set local role authenticated;
  i := 0; loop j := public.pb_onboard_link_make('pipelayer', null); exit when not (j->>'ok')::boolean or i > 12; i := i + 1; end loop;
  out := out || ' | 15.liveMade=' || i || ' then=' || (j->>'code');
  reset role; update pb_onboard.links set revoked_at = now() where company_id = 'd01a4a5f-312a-418f-9172-ea9aec9784b5' and used_at is null;
  -- 16. the office's switch: foreman links off stops new ones and the ones already out
  reset role; perform set_config('request.jwt.claims', '{"sub":"4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_link_make('pipelayer', null); t4 := j->>'token';
  reset role; perform set_config('request.jwt.claims', '{"sub":"e03416b7-6086-40a5-8d42-9267b846fc26","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_link_make('pipelayer', null); t5 := j->>'token';
  j := public.pb_onboard_settings_set(false); out := out || ' | 16.O.off=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  reset role; perform set_config('request.jwt.claims', '{"role":"anon"}', true); set local role anon;
  j := public.pb_onboard_peek(t4, null); out := out || ' foremansLinkNow=' || coalesce(j->>'code', 'ok');
  j := public.pb_onboard_peek(t5, null); out := out || ' officesLinkNow=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  reset role; perform set_config('request.jwt.claims', '{"sub":"4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e","role":"authenticated"}', true); set local role authenticated;
  begin j := public.pb_onboard_link_make('pipelayer', null); out := out || ' F.off=ALLOWED'; exception when others then out := out || ' F.off=' || sqlerrm; end;
  j := public.pb_onboard_links(); out := out || ' F.sees=' || (j->>'foreman_links');
  begin j := public.pb_onboard_settings_set(true); out := out || ' F.setting=' || coalesce(j->>'code', 'ok'); exception when others then out := out || ' F.setting=' || sqlerrm; end;
  begin perform public.pb_onboard_svc('claim', '{}'::jsonb); out := out || ' F.svc=ALLOWED'; exception when others then out := out || ' F.svc=' || sqlerrm; end;
  reset role; perform set_config('request.jwt.claims', '{"sub":"e03416b7-6086-40a5-8d42-9267b846fc26","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_settings_set(true);
  -- 17. lost phone: N1 (joined by link, on Ray's crew) lost his phone
  reset role; insert into auth.sessions (id, user_id, created_at) values (gen_random_uuid(), '9e9e9e9e-0000-4000-8000-0000000000a1', now()), (gen_random_uuid(), '9e9e9e9e-0000-4000-8000-0000000000a1', now());
  out := out || ' | 17.N1sessions=' || (select count(*) from auth.sessions s where s.user_id = '9e9e9e9e-0000-4000-8000-0000000000a1');
  reset role; perform set_config('request.jwt.claims', '{"sub":"4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_lost_phone('9e9e9e9e-0000-4000-8000-0000000000a1'); out := out || ' F.lost=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  reset role; perform set_config('request.jwt.claims', '{"sub":"e03416b7-6086-40a5-8d42-9267b846fc26","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_lost_phone('9e9e9e9e-0000-4000-8000-0000000000a2'); out := out || ' O.lostEmailAcct=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  j := public.pb_onboard_lost_phone('e4a0170b-1189-4bd5-86fe-e47e092ede3f'); out := out || ' O.lostPm=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  j := public.pb_onboard_lost_phone('9e9e9e9e-0000-4000-8000-0000000000a1'); t5 := j->>'token'; id5 := (j->>'id')::uuid;
  out := out || ' O.lost=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end || ' removed=' || (j->>'removed') || ' name=' || coalesce(j->>'removed_name', '-') || ' role=' || (j->>'role') || ' pair=' || coalesce(j->>'pair_name', '-') || ' seats=' || (j->>'seats_before') || '>' || (j->>'seats_after');
  reset role;
  out := out || ' N1member=' || exists (select 1 from public.company_members m where m.user_id = '9e9e9e9e-0000-4000-8000-0000000000a1')
    || ' N1sessions=' || (select count(*) from auth.sessions s where s.user_id = '9e9e9e9e-0000-4000-8000-0000000000a1')
    || ' N1crewLink=' || exists (select 1 from pb_prod.crew_links l where l.pipelayer_id = '9e9e9e9e-0000-4000-8000-0000000000a1' and l.ended_at is null)
    || ' audit=' || (select string_agg(a.outcome, ',' order by a.id) from pb_crew.audit a where a.target_user = '9e9e9e9e-0000-4000-8000-0000000000a1' and a.action = 'remove')
    || ' link=' || (select l.role || '/' || coalesce(l.label, '-') || '/' || (l.pair_foreman = '4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e') || '/' || (l.replaces_user = '9e9e9e9e-0000-4000-8000-0000000000a1') from pb_onboard.links l where l.id = id5);
  reset role; perform set_config('request.jwt.claims', '{"role":"service_role"}', true); set local role service_role;
  j := public.pb_onboard_svc('claim', jsonb_build_object('token', t5)); lid := (j->>'link_id')::uuid;
  j := public.pb_onboard_svc('join', jsonb_build_object('link_id', lid, 'user_id', '9e9e9e9e-0000-4000-8000-0000000000a3', 'name', 'Mike Rivera', 'legal', jsonb_build_object('terms', '1.0', 'privacy', '1.0', 'notice', '3', 'phone_at', now(), 'build', 'r17.05 test', 'ua', 'test')));
  out := out || ' newPhoneJoin=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end || ' paired=' || coalesce(j->>'paired_with', '-');
  reset role; perform set_config('request.jwt.claims', '{"sub":"e03416b7-6086-40a5-8d42-9267b846fc26","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_links(); out := out || ' listReplaces=' || coalesce((select x->>'replaces_name' from jsonb_array_elements(j->'links') x where x->>'id' = id5::text), '-');
  -- 18. the getting-started card's numbers
  j := public.pb_onboard_start(); out := out || ' | 18.start=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end || ' crew=' || (j->>'crew') || ' signedIn=' || (j->>'crew_signed_in') || ' linksWaiting=' || (j->>'links_waiting');
  reset role; perform set_config('request.jwt.claims', '{"sub":"4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e","role":"authenticated"}', true); set local role authenticated;
  j := public.pb_onboard_start(); out := out || ' F.start=' || case when (j->>'ok')::boolean then 'ok' else coalesce(j->>'code', 'null') end;
  reset role;
  out := out || ' | events=' || (select string_agg(a || ':' || n, ',' order by a) from (select action a, count(*) n from pb_onboard.events group by 1) e);
  raise exception 'RESULT: %', out;
end $obtest$;
