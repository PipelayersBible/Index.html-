-- One device per login (staged Nov 20 2026). Safe to run twice. Run as postgres, in one transaction.
-- What it adds (nothing existing is changed):
--   pb_auth.*                 tables: sessions_log (every sign-in and how it ended), devices, allow (exceptions), flags
--   trigger on auth.sessions  a new sign-in ends the login's other sessions (their refresh tokens go with them)
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
  end_reason   text,                 -- other_device | moved (Home Screen code) | ended (log out, lost phone, removed)
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

-- Exceptions: a login allowed on more than one device at once. Empty = everyone gets one.
create table if not exists pb_auth.allow (
  user_id uuid primary key references auth.users (id) on delete cascade,
  devices integer not null check (devices between 1 and 5),
  note    text,
  set_at  timestamptz not null default now()
);

create table if not exists pb_auth.flags (
  id       bigserial primary key,
  user_id  uuid not null references auth.users (id) on delete cascade,
  kind     text not null check (kind in ('minutes_apart', 'far_apart', 'back_and_forth')),
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

-- A sign-in finished: end the login's other sessions, keeping the newest N (N = 1 unless pb_auth.allow says more).
create or replace function pb_auth.take_over(p_session uuid, p_user uuid)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare v_allow integer; v_reason text; r record; n integer := 0;
begin
  select a.devices into v_allow from pb_auth.allow a where a.user_id = p_user;
  v_allow := coalesce(v_allow, 1);
  -- a Home Screen sign-in code used just now (crew-join "signin" stamps used_at before the session is made): the login moved
  v_reason := case when exists (select 1 from pb_onboard.links l where l.kind = 'handoff' and l.for_user = p_user
                                   and l.used_at > now() - interval '3 minutes') then 'moved' else 'other_device' end;
  for r in select s.id from auth.sessions s where s.user_id = p_user and s.id <> p_session
            order by s.created_at desc nulls last, s.id offset greatest(v_allow - 1, 0) loop
    insert into pb_auth.sessions_log as l (session_id, user_id, started_at, ended_at, end_reason, replaced_by)
    values (r.id, p_user, now(), now(), v_reason, p_session)
    on conflict (session_id) do update set ended_at = now(), end_reason = v_reason, replaced_by = p_session where l.ended_at is null;
    delete from auth.sessions s where s.id = r.id; -- its refresh tokens go with it
    n := n + 1;
  end loop;
  delete from pb_auth.sessions_log l where l.user_id = p_user and coalesce(l.ended_at, l.started_at) < now() - interval '120 days'
    and not exists (select 1 from auth.sessions s where s.id = l.session_id);
  return n;
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
-- request. A signed-in request whose session no longer exists is refused with the words every RPC already uses when
-- nobody is signed in (pb:signed_out), so the app keeps the work and tries later. No session id, the app's own key, the
-- service key: untouched. One primary-key read; no writes.
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
  if exists (select 1 from auth.sessions s where s.id = v_s::uuid) then return; end if;
  select l.end_reason into v_reason from pb_auth.sessions_log l where l.session_id = v_s::uuid;
  raise exception using errcode = 'PT401', message = 'pb:signed_out', detail = coalesce(v_reason, 'ended');
end $function$;
revoke all on function public.pb_session_gate() from public;
grant execute on function public.pb_session_gate() to public; -- every API role must be able to run it, or every request fails

-- The signed-out phone asks why. Only "another device took over" and "moved to the Home Screen app" are answered.
create or replace function public.pb_session_why(p_session uuid)
 returns jsonb language sql stable security definer set search_path to ''
as $function$
  select jsonb_build_object('ok', true, 'reason',
    (select l.end_reason from pb_auth.sessions_log l where l.session_id = p_session and l.ended_at is not null and l.end_reason in ('other_device', 'moved')))
$function$;
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
  insert into pb_auth.sessions_log as l (session_id, user_id, device_id, last_seen_at) values (v_sid, v_uid, p_device, now())
  on conflict (session_id) do update set device_id = excluded.device_id, last_seen_at = now() where l.user_id = v_uid;

  -- Sharing flags. Nothing is blocked; these are notes.
  -- The session this sign-in replaced, when it was on a different device (a Home Screen move is not counted).
  select l.session_id, l.last_seen_at, l.ended_at, d.kind, d.lat, d.lng, d.fix_at into prev
    from pb_auth.sessions_log l join pb_auth.devices d on d.user_id = l.user_id and d.device_id = l.device_id
   where l.user_id = v_uid and l.replaced_by = v_sid and l.end_reason = 'other_device' and l.device_id <> p_device
   order by l.ended_at desc limit 1;
  if found then
    -- in use on the other device within 15 minutes of this sign-in
    if prev.last_seen_at is not null and prev.ended_at - prev.last_seen_at <= interval '15 minutes' then
      insert into pb_auth.flags (user_id, kind, dedupe, at, kind_a, kind_b, minutes)
      values (v_uid, 'minutes_apart', prev.session_id::text, prev.ended_at, prev.kind, v_kind,
              greatest(0, floor(extract(epoch from (prev.ended_at - prev.last_seen_at)) / 60)::integer))
      on conflict (user_id, kind, dedupe) do nothing;
    end if;
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

-- One note per login per day (UTC), the strongest: far apart, then back and forth, then minutes apart. Last 30 days.
create or replace view pb_auth.strongest_flags as
  select distinct on (f.user_id, (f.at at time zone 'utc')::date) f.*
    from pb_auth.flags f where f.at > now() - interval '30 days'
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
