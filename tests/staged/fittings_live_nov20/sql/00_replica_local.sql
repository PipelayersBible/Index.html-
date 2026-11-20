-- fittings_live (Nov 20): a local stand-in for the live objects 01_live_fittings.sql touches, for a throw-away local
-- Postgres only (never run on the live project). Copied from the live project (pg_get_functiondef, read-only,
-- Nov 20 2026): pb_prod.num, short_text, phone_ms, live_row, public.pb_prod_run_status_put, pb_prod_company_live, and
-- clean_status (loaded from _live_clean_status_nov20.sql after this file). The run_status columns are the live ones.
-- my_company, managed_company, today, member_name(_or_null), linked_foreman, session_entry, counts and the entries /
-- items tables are small stand-ins. Seed: one made-up company (owner, a foreman, a pipelayer). No real data.
do $r$ begin if not exists (select 1 from pg_roles where rolname = 'anon') then
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
end if; end $r$;
create schema auth; create schema pb_prod;
grant usage on schema public, auth to anon, authenticated, service_role;
alter default privileges revoke execute on functions from public;
create function auth.uid() returns uuid language sql stable as $function$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
$function$;
grant execute on function auth.uid() to anon, authenticated, service_role;
create table public.companies (id uuid primary key, name text, owner_user_id uuid, status text not null default 'active');
create table public.company_members (company_id uuid, user_id uuid, role text, name text, created_at timestamptz default now());
create table pb_prod.run_status (user_id uuid not null, session_ref text not null check (length(session_ref) between 1 and 60), company_id uuid not null,
  run_ref text check (length(run_ref) <= 100), job_number text check (length(job_number) <= 60), work_date date, seq bigint not null default 0, ended boolean not null default false,
  status jsonb not null check (jsonb_typeof(status) = 'object' and pg_column_size(status) <= 4000), phone_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  ended_at timestamptz, tz text, run_end_at timestamptz, end_late boolean not null default false, end_entered_at timestamptz, end_reported_at timestamptz, end_station text, end_ft numeric,
  end_refused text, end_ask_at timestamptz, end_ask_state text, for_foreman uuid, for_foreman_at timestamptz, primary key (user_id, company_id, session_ref));
create table pb_prod.entries (id uuid primary key default gen_random_uuid(), company_id uuid, user_id uuid, kind text, role text, crew_state text, created_at timestamptz default now(),
  covers_user uuid, covers_session_ref text, voided boolean default false, version integer default 1, updated_at timestamptz default now(), record jsonb default '{}');
create table pb_prod.items (entry_id uuid, category_key text, qty numeric, unit text);
-- stand-ins
create function pb_prod.my_company(p_uid uuid) returns uuid language sql stable security definer set search_path to '' as $$ select m.company_id from public.company_members m where m.user_id = p_uid limit 1 $$;
create function pb_prod.managed_company(p_uid uuid) returns uuid language sql stable security definer set search_path to '' as $$ select c.id from public.companies c where c.owner_user_id = p_uid and c.status = 'active' limit 1 $$;
create function pb_prod.today(p_today date) returns date language sql stable set search_path to '' as $$ select coalesce(p_today, (now() at time zone 'utc')::date) $$;
create function pb_prod.member_name(p_company uuid, p_user uuid) returns text language sql stable security definer set search_path to '' as $$ select coalesce((select m.name from public.company_members m where m.company_id = p_company and m.user_id = p_user limit 1), 'Crew member') $$;
create function pb_prod.member_name_or_null(p_company uuid, p_user uuid) returns text language sql stable security definer set search_path to '' as $$ select m.name from public.company_members m where m.company_id = p_company and m.user_id = p_user limit 1 $$;
create function pb_prod.linked_foreman(p_pipelayer uuid, p_company uuid) returns uuid language sql stable security definer set search_path to '' as $$ select m.user_id from public.company_members m where m.company_id = p_company and m.role = 'foreman' and m.user_id <> p_pipelayer limit 1 $$;
create function pb_prod.session_entry(p_company uuid, p_pipelayer uuid, p_session text) returns pb_prod.entries language sql stable security definer set search_path to '' as $$ select e from pb_prod.entries e where false $$;
create function pb_prod.counts(p_company uuid, p_user uuid, p_kind text, p_role text, p_crew_state text, p_created_at timestamptz) returns boolean language sql stable set search_path to '' as $$ select true $$;
-- live copies
CREATE OR REPLACE FUNCTION pb_prod.num(p jsonb, p_max numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare v numeric;
begin
  if p is null or jsonb_typeof(p) not in ('number', 'string') then return null; end if;
  begin v := nullif(replace(btrim(p #>> '{}'), ',', ''), '')::numeric; exception when others then return null; end;
  if v is null or v = 'NaN'::numeric or v < 0 or v > p_max then return null; end if;
  return v;
end $function$;
CREATE OR REPLACE FUNCTION pb_prod.phone_ms(p jsonb)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare v numeric; t timestamptz;
begin
  if p is null or jsonb_typeof(p) <> 'number' then return null; end if;
  v := (p #>> '{}')::numeric;
  if v is null or v < 0 or v > 99999999999999 then return null; end if;
  t := to_timestamp(v / 1000);
  if t < now() - interval '400 days' or t > now() + interval '1 day' then return null; end if;
  return t;
end $function$;
CREATE OR REPLACE FUNCTION pb_prod.short_text(p jsonb, p_max integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when p is not null and jsonb_typeof(p) = 'string' then nullif(left(btrim(p #>> '{}'), p_max), '') end
$function$;
CREATE OR REPLACE FUNCTION pb_prod.live_row(r pb_prod.run_status, p_foreman uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object('session_ref', r.session_ref, 'run_ref', r.run_ref, 'job_number', r.job_number, 'work_date', r.work_date, 'ended', r.ended,
    'status', r.status, 'updated_at', r.updated_at, 'phone_at', r.phone_at,
    'mine', (select jsonb_build_object('id', f.id, 'version', f.version, 'updated_at', f.updated_at, 'office', f.record ? 'officeEditBy' /* r1557 integrity */,
        'items', coalesce((select jsonb_agg(jsonb_build_object('key', i.category_key, 'qty', i.qty, 'unit', i.unit) order by i.category_key) from pb_prod.items i where i.entry_id = f.id and i.qty is not null), '[]'::jsonb))
      from pb_prod.entries f where p_foreman is not null and f.user_id = p_foreman and f.covers_user = r.user_id and f.covers_session_ref = r.session_ref and f.company_id = r.company_id and not f.voided limit 1),
    'theirs', (select case when e.crew_state = 'covered' then 'covered' when e.crew_state = 'claimed' then 'claimed'
        when pb_prod.counts(e.company_id, e.user_id, e.kind, e.role, e.crew_state, e.created_at) then 'counted' else 'held' end
      from pb_prod.entries e where e.id = (pb_prod.session_entry(r.company_id, r.user_id, r.session_ref)).id))
$function$;
CREATE OR REPLACE FUNCTION public.pb_prod_company_live(p_today date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_today date := pb_prod.today(p_today);
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  v_company := pb_prod.managed_company(v_uid);
  if v_company is null then raise exception 'pb:not_company_account'; end if;
  return jsonb_build_object('server_at', now(), 'today', v_today,
    'people', coalesce((select jsonb_agg(jsonb_build_object('id', p.user_id, 'name', pb_prod.member_name(v_company, p.user_id), 'role', p.role,
        'foreman', pb_prod.member_name_or_null(v_company, pb_prod.linked_foreman(p.user_id, v_company)),
        'runs', coalesce((select jsonb_agg(pb_prod.live_row(x.r, null) order by (x.r).updated_at desc)
          from (select r from pb_prod.run_status r where r.user_id = p.user_id and r.company_id = v_company
                  and (r.work_date = v_today or (not r.ended and r.updated_at > now() - interval '18 hours'))
                order by r.updated_at desc limit 12) x), '[]'::jsonb))
      order by lower(pb_prod.member_name(v_company, p.user_id)))
      from (select m.user_id, m.role from public.company_members m
            where m.company_id = v_company and pb_prod.my_company(m.user_id) = v_company
              and exists (select 1 from pb_prod.run_status r where r.user_id = m.user_id and r.company_id = v_company
                            and (r.work_date = v_today or (not r.ended and r.updated_at > now() - interval '18 hours')))
            limit 300) p), '[]'::jsonb));
end $function$;
CREATE OR REPLACE FUNCTION public.pb_prod_run_status_put(p_status jsonb, p_expect_uid uuid, p_access_company uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_s jsonb; v_ref text; v_seq bigint; v_n integer; v_date date; v_done boolean;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  v_company := pb_prod.my_company(v_uid);
  if v_company is null then raise exception 'pb:not_company_member'; end if;
  if p_access_company is null or p_access_company is distinct from v_company then raise exception 'pb:company_changed'; end if; -- queued under another company: the phone discards it
  if p_status is null or jsonb_typeof(p_status) <> 'object' or pg_column_size(p_status) > 6000 then raise exception 'pb:bad_status'; end if;
  v_ref := pb_prod.short_text(p_status->'sessionRef', 60);
  if v_ref is null or v_ref !~ '^[A-Za-z0-9_.:-]{1,60}$' then raise exception 'pb:bad_status'; end if;
  begin v_seq := (p_status->>'seq')::bigint; exception when others then v_seq := null; end;
  if v_seq is null or v_seq < 1 then raise exception 'pb:bad_status'; end if;
  v_s := pb_prod.clean_status(p_status);
  begin v_date := nullif(v_s->>'workDate', '')::date; exception when others then v_date := null; end;
  if v_date is not null and (v_date < (now() at time zone 'utc')::date - 400 or v_date > (now() at time zone 'utc')::date + 2) then v_date := null; end if;
  if not exists (select 1 from pb_prod.run_status r where r.user_id = v_uid and r.company_id = v_company and r.session_ref = v_ref) then
    select count(*) into v_n from pb_prod.run_status r where r.user_id = v_uid and r.created_at > now() - interval '1 day';
    if v_n >= 300 then raise exception 'pb:quota'; end if;
  end if;
  insert into pb_prod.run_status as r (user_id, session_ref, company_id, run_ref, job_number, work_date, seq, ended, status, phone_at)
    values (v_uid, v_ref, v_company, v_s->>'runRef', v_s->>'jobNumber', v_date, v_seq, coalesce((v_s->>'ended')::boolean, false), v_s, (v_s->>'phoneAt')::timestamptz)
    on conflict (user_id, company_id, session_ref) do update set run_ref = excluded.run_ref, job_number = excluded.job_number,
      work_date = excluded.work_date, seq = excluded.seq, ended = excluded.ended, status = excluded.status, phone_at = excluded.phone_at, updated_at = now()
      where r.seq < excluded.seq -- a late, older status never overwrites a newer one
    returning true into v_done;
  return jsonb_build_object('ok', true, 'stale', v_done is null, 'server_at', now());
end $function$;
grant execute on function public.pb_prod_company_live(date), public.pb_prod_run_status_put(jsonb, uuid, uuid) to authenticated, service_role;
insert into public.companies values ('dddddddd-0000-4000-8000-000000000001', 'Stand-in Underground', 'dddddddd-0000-4000-8000-0000000000a0');
insert into public.company_members (company_id, user_id, role, name) values
  ('dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-0000000000f1', 'foreman', 'Foreman One'),
  ('dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-0000000000b1', 'pipelayer', 'Pipelayer One');
