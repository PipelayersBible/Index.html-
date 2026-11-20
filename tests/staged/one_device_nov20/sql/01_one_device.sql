-- One device per login (staged Nov 20 2026). Safe to run twice. Run as postgres, in one transaction.
-- What it adds (nothing existing is changed):
--   (reads pb_onboard.links, pb_safety.open_permits / permits, auth.mfa_factors; writes none of them)
--   pb_auth.*                 tables: sessions_log (every sign-in and how it ended), devices, allow (exceptions), flags
--   THE RULE: a login may stay signed in on 2 devices, and only ONE of them may be in use at a time.
--     in use = that device's app checked in during the last 5 minutes (it checks in every 90 seconds while on screen),
--              or it holds the login while a confined space permit is open (saved in the last 2 hours, not closed).
--   trigger on auth.sessions  a new sign-in is REFUSED while the login is in use elsewhere (in_use) or already signed in
--                             on 2 devices (full); a Home Screen sign-in code replaces the page that made it (moved)
--   public.pb_session_gate()  the API's pre-request check (02 turns it on): requests from an ended or refused session,
--                             and from the device that is not the one in use (locked), are refused with pb:signed_out
--   public.pb_device_seen()   the app's check-in: takes or keeps the login for this device, or answers "locked";
--                             device id, kind, last GPS fix if it has one; records sharing flags
--   public.pb_session_why()   a signed-out device asks why (so it can say it once)
--   public.pb_session_take_slot()  a sign-in refused as "full" signs one of the two other devices out and takes its place
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
  end_reason   text,                 -- other_device (signed out from another device) | moved (Home Screen code) | ended (log out, lost phone, removed)
                                     -- | in_use, full (this sign-in was refused; the session row is cleared within 10 minutes)
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

-- Exceptions: a login allowed to stay signed in on more (or fewer) devices than 2. Still one in use at a time.
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

-- Which of a login's devices has it right now. One row per login; it is the row every check-in locks.
create table if not exists pb_auth.holder (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  session_id uuid,
  device_id  text,
  last_at    timestamptz
);

alter table pb_auth.sessions_log enable row level security;
alter table pb_auth.devices enable row level security;
alter table pb_auth.allow enable row level security;
alter table pb_auth.flags enable row level security;
alter table pb_auth.holder enable row level security;
revoke all on all tables in schema pb_auth from public, anon, authenticated;

-- Sessions that exist today get a row, so a later sign-in can say why they ended.
insert into pb_auth.sessions_log (session_id, user_id, started_at)
select s.id, s.user_id, coalesce(s.created_at, now()) from auth.sessions s
on conflict (session_id) do nothing;

-- How many devices a login may stay signed in on: 2, unless pb_auth.allow says otherwise.
create or replace function pb_auth.allowed(p_user uuid)
 returns integer language sql stable security definer set search_path to ''
as $function$
  select coalesce((select a.devices from pb_auth.allow a where a.user_id = p_user), 2)
$function$;

-- A confined space permit open right now: saved to the server in the last 2 hours and not closed.
create or replace function pb_auth.permit_open(p_user uuid)
 returns boolean language sql stable security definer set search_path to ''
as $function$
  select exists (select 1 from pb_safety.open_permits o where o.user_id = p_user and o.saved_at > now() - interval '2 hours'
                   and not exists (select 1 from pb_safety.permits p where p.user_id = o.user_id and p.client_permit_id = o.client_permit_id))
$function$;

-- The session that has the login in use right now (other than p_except), or null.
create or replace function pb_auth.in_use_by(p_user uuid, p_except uuid)
 returns uuid language sql stable security definer set search_path to ''
as $function$
  select h.session_id from pb_auth.holder h
   where h.user_id = p_user and h.session_id is distinct from p_except
     and exists (select 1 from auth.sessions s where s.id = h.session_id)
     and (h.last_at > now() - interval '5 minutes' or pb_auth.permit_open(p_user))
$function$;

-- A login's signed-in devices other than p_except (finished sign-ins that were not refused), most recently used first.
-- (With two-step login, a session still waiting for its code is not one of them.)
create or replace function pb_auth.slots(p_user uuid, p_except uuid)
 returns table (session_id uuid, kind text, act timestamptz) language sql stable security definer set search_path to ''
as $function$
  select s.id, coalesce(d.kind, 'phone'), coalesce(l.last_seen_at, l.started_at, s.created_at)
    from auth.sessions s
    left join pb_auth.sessions_log l on l.session_id = s.id
    left join pb_auth.devices d on d.user_id = s.user_id and d.device_id = l.device_id
   where s.user_id = p_user and s.id is distinct from p_except
     and coalesce(l.end_reason, '') not in ('in_use', 'full')
     and (s.aal = 'aal2' or not exists (select 1 from auth.mfa_factors f where f.user_id = p_user and f.status = 'verified'))
   order by 3 desc nulls last, s.id
$function$;

-- A sign-in finished. Returns 'ok', or why it is REFUSED: 'in_use' (the login is in use on another device right now) or
-- 'full' (already signed in on 2 devices). A refused session is marked; the gate refuses its requests; its row is cleared
-- within 10 minutes. Nobody is signed out by a sign-in, except by a Home Screen code: that replaces the page that made
-- it, so Safari and the Home Screen app on one iPhone use one of the two places, not both.
create or replace function pb_auth.take_over(p_session uuid, p_user uuid)
 returns text language plpgsql security definer set search_path to ''
as $function$
declare v_other uuid; v_why text;
begin
  -- refused sign-ins left behind, and old rows (120 days)
  delete from auth.sessions s using pb_auth.sessions_log l where s.user_id = p_user and s.id <> p_session and l.session_id = s.id
    and l.end_reason in ('in_use', 'full') and l.ended_at < now() - interval '10 minutes';
  delete from pb_auth.sessions_log l where l.user_id = p_user and coalesce(l.ended_at, l.started_at) < now() - interval '120 days'
    and not exists (select 1 from auth.sessions s where s.id = l.session_id);
  delete from pb_auth.devices d where d.user_id = p_user and d.last_seen < now() - interval '120 days';
  -- a Home Screen sign-in code used just now (crew-join "signin" stamps used_at before the session is made)
  if exists (select 1 from pb_onboard.links l where l.kind = 'handoff' and l.for_user = p_user and l.used_at > now() - interval '3 minutes') then
    v_other := coalesce(pb_auth.in_use_by(p_user, p_session), (select x.session_id from pb_auth.slots(p_user, p_session) x limit 1)); -- the page that made it
    if v_other is not null then
      insert into pb_auth.sessions_log as l (session_id, user_id, started_at, ended_at, end_reason, replaced_by) values (v_other, p_user, now(), now(), 'moved', p_session)
      on conflict (session_id) do update set ended_at = now(), end_reason = 'moved', replaced_by = p_session where l.ended_at is null;
      delete from auth.sessions s where s.id = v_other; -- its refresh tokens go with it
      update pb_auth.holder h set session_id = p_session, device_id = null, last_at = now() where h.user_id = p_user and h.session_id = v_other;
    end if;
    return 'ok';
  end if;
  v_why := case when pb_auth.in_use_by(p_user, p_session) is not null then 'in_use'
                when (select count(*) from pb_auth.slots(p_user, p_session)) >= pb_auth.allowed(p_user) then 'full' end;
  if v_why is null then return 'ok'; end if;
  insert into pb_auth.sessions_log as l (session_id, user_id, started_at, ended_at, end_reason) values (p_session, p_user, now(), now(), v_why)
  on conflict (session_id) do update set ended_at = now(), end_reason = v_why;
  if v_why = 'in_use' then
    insert into pb_auth.flags as f (user_id, kind, dedupe, at) values (p_user, 'tried_in_use', to_char(now() at time zone 'utc', 'YYYY-MM-DD'), now())
    on conflict (user_id, kind, dedupe) do update set n = f.n + 1, at = excluded.at;
  end if;
  return v_why;
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
-- request and refuses, with the words every RPC already uses when nobody is signed in (pb:signed_out, so the app keeps
-- the work and tries later), a signed-in request
--   whose session no longer exists or whose sign-in was refused      detail: other_device | moved | ended | in_use | full
--   from the device that is not the one in use right now             detail: locked, hint: <other device kind>|<seconds until it counts as idle>|<1 if a permit holds it>
-- No session id, the app's own key, the service key: untouched. Three primary-key reads at most; no writes.
create or replace function public.pb_session_gate()
 returns void language plpgsql security definer set search_path to ''
as $function$
declare v_txt text := current_setting('request.jwt.claims', true); v_claims jsonb; v_s text; v_sid uuid; v_uid uuid; v_reason text; h record; v_kind text;
begin
  if v_txt is null or v_txt = '' or left(v_txt, 1) <> '{' then return; end if;
  v_claims := v_txt::jsonb;
  if v_claims->>'role' is distinct from 'authenticated' then return; end if;
  v_s := v_claims->>'session_id';
  if v_s is null or v_s !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return; end if;
  v_sid := v_s::uuid;
  select l.end_reason into v_reason from pb_auth.sessions_log l where l.session_id = v_sid;
  if not exists (select 1 from auth.sessions s where s.id = v_sid) then
    raise exception using errcode = 'PT401', message = 'pb:signed_out', detail = coalesce(v_reason, 'ended');
  end if;
  if v_reason = 'in_use' then raise exception using errcode = 'PT401', message = 'pb:signed_out', detail = 'in_use'; end if;
  v_s := v_claims->>'sub';
  if v_s is null or v_s !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return; end if;
  v_uid := v_s::uuid;
  if v_reason = 'full' then
    raise exception using errcode = 'PT401', message = 'pb:signed_out', detail = 'full',
      hint = coalesce((select string_agg(x.kind || '|' || floor(extract(epoch from x.act))::bigint, ',') from pb_auth.slots(v_uid, v_sid) x), '');
  end if;
  select hh.session_id, hh.device_id, hh.last_at into h from pb_auth.holder hh where hh.user_id = v_uid;
  if not found or h.session_id is null or h.session_id = v_sid then return; end if;
  if not exists (select 1 from auth.sessions s where s.id = h.session_id) then return; end if;
  if h.last_at > now() - interval '5 minutes' then
    select d.kind into v_kind from pb_auth.devices d where d.user_id = v_uid and d.device_id = h.device_id;
    raise exception using errcode = 'PT401', message = 'pb:signed_out', detail = 'locked',
      hint = coalesce(v_kind, 'phone') || '|' || greatest(1, ceil(extract(epoch from (h.last_at + interval '5 minutes' - now())))::integer) || '|0';
  elsif pb_auth.permit_open(v_uid) then
    select d.kind into v_kind from pb_auth.devices d where d.user_id = v_uid and d.device_id = h.device_id;
    raise exception using errcode = 'PT401', message = 'pb:signed_out', detail = 'locked', hint = coalesce(v_kind, 'phone') || '|0|1';
  end if;
end $function$;
revoke all on function public.pb_session_gate() from public;
grant execute on function public.pb_session_gate() to public; -- every API role must be able to run it, or every request fails

-- A signed-out device asks why. Answered: signed out from another device, moved to the Home Screen app, or refused
-- (in_use, full). A refused session is removed here; nothing else can be removed through this.
create or replace function public.pb_session_why(p_session uuid)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_reason text;
begin
  select l.end_reason into v_reason from pb_auth.sessions_log l where l.session_id = p_session and l.ended_at is not null and l.end_reason in ('other_device', 'moved', 'in_use', 'full');
  if v_reason in ('in_use', 'full') then delete from auth.sessions s where s.id = p_session; end if;
  return jsonb_build_object('ok', true, 'reason', v_reason);
end $function$;
revoke all on function public.pb_session_why(uuid) from public;
grant execute on function public.pb_session_why(uuid) to anon, authenticated;

-- A sign-in refused as "full" (already on 2 devices) signs one of them out and takes its place. Called with the app's
-- own key and the refused session's id, which only the device that just signed in with the right password has.
-- p_pick: 1 = the device used last, 2 = the one before (the order the refusal listed them in). Not while the login is in use.
create or replace function public.pb_session_take_slot(p_session uuid, p_pick integer default 2)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_user uuid; v_other uuid;
begin
  select l.user_id into v_user from pb_auth.sessions_log l where l.session_id = p_session and l.end_reason = 'full'
     and exists (select 1 from auth.sessions s where s.id = p_session);
  if v_user is null then return jsonb_build_object('ok', false, 'code', 'pb:not_found'); end if;
  perform 1 from pb_auth.holder h where h.user_id = v_user for update;
  if pb_auth.in_use_by(v_user, p_session) is not null then return jsonb_build_object('ok', false, 'code', 'pb:in_use'); end if;
  if (select count(*) from pb_auth.slots(v_user, p_session)) >= pb_auth.allowed(v_user) then
    select x.session_id into v_other from pb_auth.slots(v_user, p_session) x offset greatest(coalesce(p_pick, 2), 1) - 1 limit 1;
    if v_other is null then select x.session_id into v_other from pb_auth.slots(v_user, p_session) x order by x.act asc nulls first limit 1; end if;
    insert into pb_auth.sessions_log as l (session_id, user_id, started_at, ended_at, end_reason, replaced_by) values (v_other, v_user, now(), now(), 'other_device', p_session)
    on conflict (session_id) do update set ended_at = now(), end_reason = 'other_device', replaced_by = p_session where l.ended_at is null;
    delete from auth.sessions s where s.id = v_other; -- its refresh tokens go with it
  end if;
  update pb_auth.sessions_log l set ended_at = null, end_reason = null where l.session_id = p_session;
  return jsonb_build_object('ok', true);
end $function$;
revoke all on function public.pb_session_take_slot(uuid, integer) from public;
grant execute on function public.pb_session_take_slot(uuid, integer) to anon, authenticated;

create or replace function pb_auth.miles(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
 returns integer language sql immutable set search_path to ''
as $function$
  select round(3959 * 2 * asin(least(1, sqrt(power(sin(radians((lat2 - lat1)::float8) / 2), 2)
    + cos(radians(lat1::float8)) * cos(radians(lat2::float8)) * power(sin(radians((lng2 - lng1)::float8) / 2), 2)))))::integer
$function$;

-- Far apart: two devices of one login with GPS fixes 10 miles or more apart, too far to have been driven in the time
-- between the fixes (over 90 mph; fixes within 3 hours of each other). One person with a phone and a tablet never trips it.
create or replace function pb_auth.note_far(p_user uuid, p_dedupe text, p_kind_a text, p_lat_a numeric, p_lng_a numeric, p_fix_a timestamptz,
    p_kind_b text, p_lat_b numeric, p_lng_b numeric, p_fix_b timestamptz)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare v_miles integer; v_hours float8;
begin
  if p_fix_a is null or p_fix_b is null or p_lat_a is null or p_lat_b is null then return; end if;
  v_hours := abs(extract(epoch from (p_fix_b - p_fix_a))) / 3600.0;
  if v_hours > 3 then return; end if;
  v_miles := pb_auth.miles(p_lat_a, p_lng_a, p_lat_b, p_lng_b);
  if v_miles >= 10 and v_miles / greatest(v_hours, 1 / 60.0) > 90 then
    insert into pb_auth.flags (user_id, kind, dedupe, at, kind_a, kind_b, miles, minutes)
    values (p_user, 'far_apart', p_dedupe, greatest(p_fix_a, p_fix_b), p_kind_a, p_kind_b, v_miles, round(v_hours * 60)::integer)
    on conflict (user_id, kind, dedupe) do nothing;
  end if;
end $function$;

-- The app's check-in (after sign-in, on opening, when signal comes back, every 90 seconds while on screen).
-- Answers state 'active' (this device has the login; it keeps it while it keeps checking in) or 'locked' (the other
-- device has it: other = its kind, wait_s = seconds until it counts as idle, permit = an open permit holds it).
create or replace function public.pb_device_seen(p_device text, p_kind text default null, p_lat double precision default null,
    p_lng double precision default null, p_fix_at timestamptz default null, p_build text default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_uid uuid := auth.uid(); v_s text := auth.jwt()->>'session_id'; v_sid uuid; v_kind text; v_fix timestamptz;
  v_lat numeric(5, 2); v_lng numeric(6, 2); h record; prev record; pd record; v_n integer; v_permit boolean;
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
  if v_s is null or v_s !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return jsonb_build_object('ok', true, 'state', 'active'); end if;
  v_sid := v_s::uuid;
  if exists (select 1 from pb_auth.sessions_log l where l.session_id = v_sid and l.end_reason in ('in_use', 'full')) then raise exception 'pb:signed_out'; end if;
  -- one check-in per login at a time
  insert into pb_auth.holder (user_id) values (v_uid) on conflict (user_id) do nothing;
  select hh.session_id, hh.device_id, hh.last_at into h from pb_auth.holder hh where hh.user_id = v_uid for update;
  if h.session_id is not null and h.session_id <> v_sid and exists (select 1 from auth.sessions s where s.id = h.session_id) then
    v_permit := not (h.last_at > now() - interval '5 minutes') and pb_auth.permit_open(v_uid);
    if h.last_at > now() - interval '5 minutes' or v_permit then -- the other device has the login
      insert into pb_auth.sessions_log as l (session_id, user_id, device_id) values (v_sid, v_uid, p_device)
      on conflict (session_id) do update set device_id = excluded.device_id where l.user_id = v_uid;
      return jsonb_build_object('ok', true, 'state', 'locked', 'permit', v_permit,
        'other', coalesce((select d.kind from pb_auth.devices d where d.user_id = v_uid and d.device_id = h.device_id), 'phone'),
        'wait_s', case when v_permit then 0 else greatest(1, ceil(extract(epoch from (h.last_at + interval '5 minutes' - now())))::integer) end);
    end if;
  end if;
  -- this device has the login now
  update pb_auth.holder hh set session_id = v_sid, device_id = p_device, last_at = now() where hh.user_id = v_uid;
  insert into pb_auth.sessions_log as l (session_id, user_id, device_id, last_seen_at) values (v_sid, v_uid, p_device, now())
  on conflict (session_id) do update set device_id = excluded.device_id, last_seen_at = now() where l.user_id = v_uid;
  delete from auth.sessions s using pb_auth.sessions_log l where s.user_id = v_uid and s.id <> v_sid and l.session_id = s.id
    and l.end_reason in ('in_use', 'full') and l.ended_at < now() - interval '10 minutes'; -- refused sign-ins left behind

  -- Sharing flags. Nothing is blocked by these; they are notes.
  -- (1) the login just changed hands between its two signed-in devices
  if h.session_id is not null and h.session_id <> v_sid and h.device_id is not null and h.device_id <> p_device then
    select d.kind, d.lat, d.lng, d.fix_at into pd from pb_auth.devices d where d.user_id = v_uid and d.device_id = h.device_id;
    if found then perform pb_auth.note_far(v_uid, h.session_id::text || ':' || v_sid::text || ':' || to_char(now() at time zone 'utc', 'YYYY-MM-DD'), pd.kind, pd.lat, pd.lng, pd.fix_at, v_kind, v_lat, v_lng, v_fix); end if;
  end if;
  -- (2) this sign-in signed another device out (the "already on 2 devices" choice); a Home Screen move is not counted
  select l.session_id, d.kind, d.lat, d.lng, d.fix_at into prev
    from pb_auth.sessions_log l join pb_auth.devices d on d.user_id = l.user_id and d.device_id = l.device_id
   where l.user_id = v_uid and l.replaced_by = v_sid and l.end_reason = 'other_device' and l.device_id <> p_device
   order by l.ended_at desc limit 1;
  if found then perform pb_auth.note_far(v_uid, prev.session_id::text, prev.kind, prev.lat, prev.lng, prev.fix_at, v_kind, v_lat, v_lng, v_fix); end if;
  -- back and forth: this device was signed out by another one in the last 24 hours and is back
  if exists (select 1 from pb_auth.sessions_log l where l.user_id = v_uid and l.device_id = p_device and l.session_id <> v_sid
               and l.end_reason = 'other_device' and l.ended_at > now() - interval '24 hours') then
    select count(*) into v_n from pb_auth.sessions_log l join pb_auth.sessions_log r on r.session_id = l.replaced_by
     where l.user_id = v_uid and l.end_reason = 'other_device' and l.ended_at > now() - interval '24 hours'
       and l.device_id is not null and r.device_id is not null and r.device_id <> l.device_id;
    if v_n >= 2 then
      insert into pb_auth.flags as f (user_id, kind, dedupe, at, kind_a, kind_b, n)
      values (v_uid, 'back_and_forth', to_char(now() at time zone 'utc', 'YYYY-MM-DD'), now(), v_kind, prev.kind, v_n)
      on conflict (user_id, kind, dedupe) do update set n = excluded.n, at = excluded.at, kind_b = coalesce(excluded.kind_b, f.kind_b);
    end if;
  end if;
  return jsonb_build_object('ok', true, 'state', 'active');
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
