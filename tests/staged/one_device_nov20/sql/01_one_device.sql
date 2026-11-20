-- One device per login (staged Nov 20 2026). Safe to run twice. Run as postgres, in one transaction.
-- What it adds (nothing existing is changed):
--   (reads pb_onboard.links, pb_safety.open_permits / permits, auth.mfa_factors; writes none of them)
--   pb_auth.*                 tables: sessions_log (every sign-in and how it ended), devices, allow (exceptions), flags
--   trigger on auth.sessions  a new sign-in is REFUSED while the login is in use on another device (checked in during the
--                             last 15 minutes, or a confined space permit open); otherwise it ends the idle session(s)
--   public.pb_session_gate()  the API's pre-request check: a request from an ended session is refused (02 turns it on)
--   public.pb_session_why()   the signed-out phone asks why (so it can say it once)
--   public.pb_device_seen()   the app's check-in: device id, kind, last GPS fix if it has one; records sharing flags
--   public.pb_share_notes()   the quiet notes for a company account; public.pb_owner_share_notes() for the app owner
-- 02_gate_on.sql turns the gate on. 99_undo.sql takes all of it out.

create schema if not exists pb_auth;
revoke all on schema pb_auth from public;
revoke all on schema pb_auth from anon, authenticated;

create table if not exists pb_auth.sessions_log (
  session_id   uuid primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  started_at   timestamptz not null default now(),
  device_id    text,                 -- from the app's check-in
  last_seen_at timestamptz,          -- last check-in
  ended_at     timestamptz,
  end_reason   text,                 -- other_device | moved (Home Screen code) | in_use (this sign-in was refused) | ended (log out, lost phone, removed)
  replaced_by  uuid
);
create index if not exists sessions_log_user on pb_auth.sessions_log (user_id, started_at desc);
create index if not exists sessions_log_replaced on pb_auth.sessions_log (replaced_by) where replaced_by is not null;

create table if not exists pb_auth.devices (
  user_id    uuid not null references auth.users (id) on delete cascade,
  device_id  text not null,
  kind       text not null default 'phone' check (kind in ('phone', 'tablet', 'computer')),
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  lat        numeric(5, 2),          -- last fix, rounded to about 0.7 mile; only what the app already had
  lng        numeric(6, 2),
  fix_at     timestamptz,
  build      text,
  primary key (user_id, device_id)
);

-- Exceptions: a login allowed on more (or fewer) devices at once than pb_auth.allowed() gives it by rule.
create table if not exists pb_auth.allow (
  user_id uuid primary key references auth.users (id) on delete cascade,
  devices integer not null check (devices between 1 and 5),
  note    text,
  set_at  timestamptz not null default now()
);

create table if not exists pb_auth.flags (
  id       bigserial primary key,
  user_id  uuid not null references auth.users (id) on delete cascade,
  kind     text not null check (kind in ('minutes_apart', 'far_apart', 'back_and_forth', 'tried_in_use')),
  dedupe   text not null,
  at       timestamptz not null default now(),
  kind_a   text, kind_b text,        -- the two devices: phone | tablet | computer
  miles    integer,
  minutes  integer,
  n        integer not null default 1,
  unique (user_id, kind, dedupe)
);
create index if not exists flags_at on pb_auth.flags (at desc);

alter table pb_auth.sessions_log enable row level security;
alter table pb_auth.devices enable row level security;
alter table pb_auth.allow enable row level security;
alter table pb_auth.flags enable row level security;
revoke all on all tables in schema pb_auth from public, anon, authenticated;

-- Sessions that exist today get a row, so a later sign-in can say why they ended.
insert into pb_auth.sessions_log (session_id, user_id, started_at)
select s.id, s.user_id, coalesce(s.created_at, now()) from auth.sessions s
on conflict (session_id) do nothing;

-- How many devices a login may be on at once: its row in pb_auth.allow, else 2 for a company account (the owner login)
-- and for the app owner, else 1.
create or replace function pb_auth.allowed(p_user uuid)
 returns integer language sql stable security definer set search_path to ''
as $function$
  select coalesce((select a.devices from pb_auth.allow a where a.user_id = p_user),
    case when exists (select 1 from public.companies c where c.owner_user_id = p_user)
           or exists (select 1 from pb_support.admins a where a.user_id = p_user) then 2 else 1 end)
$function$;

-- A sign-in finished. Returns 'ok' (it is the login's session now; idle ones over the limit were ended) or 'in_use'
-- (REFUSED: the login is in use on another device; this session is marked and the gate refuses its requests).
--   in use = that device checked in during the last 15 minutes (the app checks in every 5 minutes while open), or the
--            login has a confined space permit open (saved in the last 2 hours, not closed) on a signed-in device.
--   A device idle longer (lost, dead, left at home) is taken over, so nobody is locked out for more than 15 minutes
--   (2 hours after the last save of an open permit). Lost Phone and Log Out end the sessions, so there is no wait at all.
--   A Home Screen sign-in code always moves the session (reason 'moved').
create or replace function pb_auth.take_over(p_session uuid, p_user uuid)
 returns text language plpgsql security definer set search_path to ''
as $function$
declare v_allow integer := pb_auth.allowed(p_user); v_reason text; v_mfa boolean; v_need integer; r record;
begin
  v_mfa := exists (select 1 from auth.mfa_factors f where f.user_id = p_user and f.status = 'verified');
  -- sign-ins refused earlier are cleared away (their rows could not be removed while they were being made)
  delete from auth.sessions s using pb_auth.sessions_log l where s.user_id = p_user and s.id <> p_session and l.session_id = s.id and l.end_reason = 'in_use';
  -- old rows go (120 days)
  delete from pb_auth.sessions_log l where l.user_id = p_user and coalesce(l.ended_at, l.started_at) < now() - interval '120 days'
    and not exists (select 1 from auth.sessions s where s.id = l.session_id);
  delete from pb_auth.devices d where d.user_id = p_user and d.last_seen < now() - interval '120 days';
  -- a Home Screen sign-in code used just now (crew-join "signin" stamps used_at before the session is made): the login moved
  v_reason := case when exists (select 1 from pb_onboard.links l where l.kind = 'handoff' and l.for_user = p_user
                                   and l.used_at > now() - interval '3 minutes') then 'moved' else 'other_device' end;
  -- the login's other finished sessions (with two-step login, one still waiting for its code never took the login)
  select count(*) into v_need from auth.sessions s where s.user_id = p_user and s.id <> p_session and (not v_mfa or s.aal = 'aal2');
  if v_reason = 'moved' and v_need > 0 then v_need := greatest(v_need - (v_allow - 1), 1); -- the page that made the code always goes
  else v_need := v_need - (v_allow - 1); end if;
  if v_need <= 0 then return 'ok'; end if;
  if v_reason = 'other_device' and (
       exists (select 1 from (select coalesce(l.last_seen_at, l.started_at, s.created_at) as act
                                from auth.sessions s left join pb_auth.sessions_log l on l.session_id = s.id
                               where s.user_id = p_user and s.id <> p_session and (not v_mfa or s.aal = 'aal2')
                               order by 1 asc nulls first limit v_need) x where x.act > now() - interval '15 minutes')
    or exists (select 1 from pb_safety.open_permits o where o.user_id = p_user and o.saved_at > now() - interval '2 hours'
                  and not exists (select 1 from pb_safety.permits p where p.user_id = o.user_id and p.client_permit_id = o.client_permit_id))) then
    insert into pb_auth.sessions_log as l (session_id, user_id, started_at, ended_at, end_reason) values (p_session, p_user, now(), now(), 'in_use')
    on conflict (session_id) do update set ended_at = now(), end_reason = 'in_use';
    insert into pb_auth.flags as f (user_id, kind, dedupe, at) values (p_user, 'tried_in_use', to_char(now() at time zone 'utc', 'YYYY-MM-DD'), now())
    on conflict (user_id, kind, dedupe) do update set n = f.n + 1, at = excluded.at;
    return 'in_use';
  end if;
  -- end the idle ones over the limit: the longest idle first (after a Home Screen code: the one used last, the page that made it)
  for r in select s.id from auth.sessions s left join pb_auth.sessions_log l on l.session_id = s.id
            where s.user_id = p_user and s.id <> p_session and (not v_mfa or s.aal = 'aal2')
            order by case when v_reason = 'moved' then -extract(epoch from coalesce(l.last_seen_at, l.started_at, s.created_at))
                          else extract(epoch from coalesce(l.last_seen_at, l.started_at, s.created_at)) end asc nulls first, s.id limit v_need loop
    insert into pb_auth.sessions_log as l (session_id, user_id, started_at, ended_at, end_reason, replaced_by)
    values (r.id, p_user, now(), now(), v_reason, p_session)
    on conflict (session_id) do update set ended_at = now(), end_reason = v_reason, replaced_by = p_session where l.ended_at is null;
    delete from auth.sessions s where s.id = r.id; -- its refresh tokens go with it
  end loop;
  return 'ok';
end $function$;

-- auth.sessions triggers. Whatever goes wrong in here, the sign-in itself goes ahead.
create or replace function pb_auth.session_started()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  begin
    if tg_op = 'INSERT' then
      insert into pb_auth.sessions_log (session_id, user_id, started_at) values (new.id, new.user_id, coalesce(new.created_at, now()))
      on conflict (session_id) do nothing;
      -- two-step login: the password alone doesn't take the login over; the code does (the UPDATE below)
      if new.aal is distinct from 'aal2' and exists (select 1 from auth.mfa_factors f where f.user_id = new.user_id and f.status = 'verified') then
        return new;
      end if;
      perform pb_auth.take_over(new.id, new.user_id);
    elsif new.aal = 'aal2' and old.aal is distinct from 'aal2' then
      perform pb_auth.take_over(new.id, new.user_id);
    end if;
  exception when others then
    raise warning 'pb_auth.session_started: %', sqlerrm;
  end;
  return new;
end $function$;

create or replace function pb_auth.session_ended()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  begin
    update pb_auth.sessions_log l set ended_at = now(), end_reason = coalesce(l.end_reason, 'ended') where l.session_id = old.id and l.ended_at is null;
  exception when others then
    raise warning 'pb_auth.session_ended: %', sqlerrm;
  end;
  return old;
end $function$;

drop trigger if exists pb_one_device_ins on auth.sessions;
create trigger pb_one_device_ins after insert on auth.sessions for each row execute function pb_auth.session_started();
drop trigger if exists pb_one_device_aal on auth.sessions;
create trigger pb_one_device_aal after update of aal on auth.sessions for each row execute function pb_auth.session_started();
drop trigger if exists pb_one_device_del on auth.sessions;
create trigger pb_one_device_del after delete on auth.sessions for each row execute function pb_auth.session_ended();

-- The API's pre-request check (PostgREST db-pre-request; 02_gate_on.sql turns it on). It runs before every RPC and table
-- request. A signed-in request whose session no longer exists, or whose sign-in was refused (in_use), is refused with the words every RPC already uses when
-- nobody is signed in (pb:signed_out), so the app keeps the work and tries later. No session id, the app's own key, the
-- service key: untouched. Two primary-key reads; no writes.
create or replace function public.pb_session_gate()
 returns void language plpgsql security definer set search_path to ''
as $function$
declare v_txt text := current_setting('request.jwt.claims', true); v_claims jsonb; v_s text; v_reason text;
begin
  if v_txt is null or v_txt = '' or left(v_txt, 1) <> '{' then return; end if;
  v_claims := v_txt::jsonb;
  if v_claims->>'role' is distinct from 'authenticated' then return; end if;
  v_s := v_claims->>'session_id';
  if v_s is null or v_s !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return; end if;
  select l.end_reason into v_reason from pb_auth.sessions_log l where l.session_id = v_s::uuid;
  if v_reason is distinct from 'in_use' and exists (select 1 from auth.sessions s where s.id = v_s::uuid) then return; end if;
  raise exception using errcode = 'PT401', message = 'pb:signed_out', detail = coalesce(v_reason, 'ended');
end $function$;
revoke all on function public.pb_session_gate() from public;
grant execute on function public.pb_session_gate() to public; -- every API role must be able to run it, or every request fails

-- The signed-out phone asks why. Answered: another device took over, moved to the Home Screen app, or refused because
-- the login is in use (that refused session is removed here; nothing else can be removed through this).
create or replace function public.pb_session_why(p_session uuid)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_reason text;
begin
  select l.end_reason into v_reason from pb_auth.sessions_log l where l.session_id = p_session and l.ended_at is not null and l.end_reason in ('other_device', 'moved', 'in_use');
  if v_reason = 'in_use' then delete from auth.sessions s where s.id = p_session; end if;
  return jsonb_build_object('ok', true, 'reason', v_reason);
end $function$;
revoke all on function public.pb_session_why(uuid) from public;
grant execute on function public.pb_session_why(uuid) to anon, authenticated;

create or replace function pb_auth.miles(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
 returns integer language sql immutable set search_path to ''
as $function$
  select round(3959 * 2 * asin(least(1, sqrt(power(sin(radians((lat2 - lat1)::float8) / 2), 2)
    + cos(radians(lat1::float8)) * cos(radians(lat2::float8)) * power(sin(radians((lng2 - lng1)::float8) / 2), 2)))))::integer
$function$;

-- The app's check-in (after sign-in, on opening, when signal comes back, every few minutes while in use).
create or replace function public.pb_device_seen(p_device text, p_kind text default null, p_lat double precision default null,
    p_lng double precision default null, p_fix_at timestamptz default null, p_build text default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_s text := auth.jwt()->>'session_id'; v_sid uuid; v_kind text; v_fix timestamptz;
  v_lat numeric(5, 2); v_lng numeric(6, 2); prev record; v_miles integer; v_n integer;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_device is null or p_device !~ '^[A-Za-z0-9_-]{8,64}$' then return jsonb_build_object('ok', false, 'code', 'pb:bad_device'); end if;
  v_kind := case when p_kind in ('phone', 'tablet', 'computer') then p_kind else 'phone' end;
  if p_lat between -90 and 90 and p_lng between -180 and 180 and p_fix_at between now() - interval '60 minutes' and now() + interval '5 minutes' then
    v_fix := p_fix_at; v_lat := round(p_lat::numeric, 2); v_lng := round(p_lng::numeric, 2);
  end if;
  insert into pb_auth.devices as d (user_id, device_id, kind, lat, lng, fix_at, build)
  values (v_uid, p_device, v_kind, v_lat, v_lng, v_fix, left(p_build, 60))
  on conflict (user_id, device_id) do update set last_seen = now(), kind = excluded.kind, build = excluded.build,
    lat = case when excluded.fix_at is not null then excluded.lat else d.lat end,
    lng = case when excluded.fix_at is not null then excluded.lng else d.lng end,
    fix_at = coalesce(excluded.fix_at, d.fix_at);
  if v_s is null or v_s !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return jsonb_build_object('ok', true); end if;
  v_sid := v_s::uuid;
  delete from auth.sessions s using pb_auth.sessions_log l where s.user_id = v_uid and s.id <> v_sid and l.session_id = s.id and l.end_reason = 'in_use'; -- refused sign-ins left behind
  insert into pb_auth.sessions_log as l (session_id, user_id, device_id, last_seen_at) values (v_sid, v_uid, p_device, now())
  on conflict (session_id) do update set device_id = excluded.device_id, last_seen_at = now() where l.user_id = v_uid;

  -- Sharing flags. Nothing is blocked; these are notes.
  -- The session this sign-in replaced, when it was on a different device (a Home Screen move is not counted).
  -- (A second device within minutes is no longer a takeover: it is refused, and recorded as tried_in_use by take_over.)
  select l.session_id, l.last_seen_at, l.ended_at, d.kind, d.lat, d.lng, d.fix_at into prev
    from pb_auth.sessions_log l join pb_auth.devices d on d.user_id = l.user_id and d.device_id = l.device_id
   where l.user_id = v_uid and l.replaced_by = v_sid and l.end_reason = 'other_device' and l.device_id <> p_device
   order by l.ended_at desc limit 1;
  if found then
    -- the two devices' GPS fixes, within the same hour, 10 miles or more apart
    if v_fix is not null and prev.fix_at is not null and abs(extract(epoch from (v_fix - prev.fix_at))) <= 3600 then
      v_miles := pb_auth.miles(prev.lat, prev.lng, v_lat, v_lng);
      if v_miles >= 10 then
        insert into pb_auth.flags (user_id, kind, dedupe, at, kind_a, kind_b, miles, minutes)
        values (v_uid, 'far_apart', prev.session_id::text, greatest(v_fix, prev.fix_at), prev.kind, v_kind, v_miles,
                round(abs(extract(epoch from (v_fix - prev.fix_at))) / 60)::integer)
        on conflict (user_id, kind, dedupe) do nothing;
      end if;
    end if;
  end if;
  -- back and forth: this device was signed out by another one in the last 24 hours and is back
  if exists (select 1 from pb_auth.sessions_log l where l.user_id = v_uid and l.device_id = p_device and l.session_id <> v_sid
               and l.end_reason = 'other_device' and l.ended_at > now() - interval '24 hours') then
    select count(*) into v_n from pb_auth.sessions_log l join pb_auth.sessions_log r on r.session_id = l.replaced_by
     where l.user_id = v_uid and l.end_reason = 'other_device' and l.ended_at > now() - interval '24 hours'
       and l.device_id is not null and r.device_id is not null and r.device_id <> l.device_id;
    if v_n >= 2 then
      insert into pb_auth.flags as f (user_id, kind, dedupe, at, kind_a, kind_b, n)
      values (v_uid, 'back_and_forth', to_char(now() at time zone 'utc', 'YYYY-MM-DD'), now(), v_kind,
              (select d.kind from pb_auth.sessions_log l join pb_auth.devices d on d.user_id = l.user_id and d.device_id = l.device_id
                where l.user_id = v_uid and l.replaced_by = v_sid and l.device_id <> p_device order by l.ended_at desc limit 1), v_n)
      on conflict (user_id, kind, dedupe) do update set n = excluded.n, at = excluded.at, kind_b = coalesce(excluded.kind_b, f.kind_b);
    end if;
  end if;
  return jsonb_build_object('ok', true);
end $function$;
revoke all on function public.pb_device_seen(text, text, double precision, double precision, timestamptz, text) from public;
grant execute on function public.pb_device_seen(text, text, double precision, double precision, timestamptz, text) to authenticated;

-- One note per login per day (UTC), the strongest: far apart, then back and forth. Last 30 days.
create or replace view pb_auth.strongest_flags as
  select distinct on (f.user_id, (f.at at time zone 'utc')::date) f.*
    from pb_auth.flags f where f.at > now() - interval '30 days' and f.kind in ('far_apart', 'back_and_forth') -- the others are recorded, not shown
   order by f.user_id, (f.at at time zone 'utc')::date, case f.kind when 'far_apart' then 1 when 'back_and_forth' then 2 else 3 end, f.at desc;
revoke all on pb_auth.strongest_flags from public, anon, authenticated;

-- The company account's quiet notes (owner and managers): the last 30 days, their own people only.
create or replace function public.pb_share_notes()
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_co uuid; v_owner uuid;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  v_co := pb_prod.managed_company(v_uid);
  if v_co is null then return jsonb_build_object('ok', false, 'code', 'pb:not_company_account'); end if;
  select c.owner_user_id into v_owner from public.companies c where c.id = v_co;
  return jsonb_build_object('ok', true, 'notes', coalesce((
    select jsonb_agg(x.j order by x.at desc) from (
      select f.at, jsonb_build_object('who', case when f.user_id = v_owner then 'The company account' else coalesce(pb_crew.display_name(v_co, f.user_id), 'A crew member') end,
               'kind', f.kind, 'at', f.at, 'a', f.kind_a, 'b', f.kind_b, 'miles', f.miles, 'minutes', f.minutes, 'n', f.n) as j
        from pb_auth.strongest_flags f
       where (f.user_id = v_owner or exists (select 1 from public.company_members m where m.company_id = v_co and m.user_id = f.user_id))
       order by f.at desc limit 20) x), '[]'::jsonb));
end $function$;
revoke all on function public.pb_share_notes() from public;
grant execute on function public.pb_share_notes() to authenticated;

-- The app owner's notes: every login, the last 30 days.
create or replace function public.pb_owner_share_notes()
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  return jsonb_build_object('ok', true, 'notes', coalesce((
    select jsonb_agg(x.j order by x.at desc) from (
      select f.at, jsonb_build_object(
               'who', coalesce(case when c.owner_user_id = f.user_id then 'The company account' else pb_crew.display_name(c.id, f.user_id) end, u.email, 'A login'),
               'company', c.name, 'kind', f.kind, 'at', f.at, 'a', f.kind_a, 'b', f.kind_b, 'miles', f.miles, 'minutes', f.minutes, 'n', f.n) as j
        from pb_auth.strongest_flags f
        left join auth.users u on u.id = f.user_id
        left join lateral (select c0.id, c0.name, c0.owner_user_id from public.companies c0
                            where c0.owner_user_id = f.user_id or c0.id = (select m.company_id from public.company_members m where m.user_id = f.user_id limit 1)
                            order by (c0.owner_user_id = f.user_id) desc limit 1) c on true
       order by f.at desc limit 50) x), '[]'::jsonb));
end $function$;
revoke all on function public.pb_owner_share_notes() from public;
grant execute on function public.pb_owner_share_notes() to authenticated;
