-- locate811 (Nov 20): a local stand-in for the live objects 01_locate_renew_history.sql touches, for a throw-away local
-- Postgres 16 only (never run on the live project). The locate table, its checks and indexes and the bodies of
-- pb_prod_locate_set (9 arguments), pb_prod_locates, pb_prod.locate_json, locates_json, locate_company, my_member,
-- managed_company, job_key, versions_locked and pb_audit.direct_write are copied from the live project
-- (pg_get_functiondef / pg_constraint, read-only, Nov 20 2026). member_name, locate_days and the job tables are small
-- stand-ins. Seed: the live company's ids (no personal data) plus a second company for the cross-company checks.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create role authenticator noinherit login;
grant anon, authenticated, service_role to authenticator;
create schema auth; create schema pb_prod; create schema pb_reports; create schema pb_mat; create schema pb_audit; create schema pb_billing;
grant usage on schema public, auth to anon, authenticated, service_role;
alter default privileges revoke execute on functions from public;
create function auth.uid() returns uuid language sql stable as $function$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
$function$;
grant execute on function auth.uid() to anon, authenticated, service_role;

create table public.companies (id uuid primary key, name text, owner_user_id uuid, status text not null default 'active', created_at timestamptz not null default now());
create table public.company_members (company_id uuid references public.companies(id), user_id uuid, role text check (role = any (array['foreman', 'pipelayer', 'pm'])), joined_at timestamptz, created_at timestamptz default now());
create table pb_reports.managers (company_id uuid, user_id uuid);
create table pb_prod.job_info (company_id uuid, job_key text, job_number text, project_name text, address text);
create table pb_prod.plans (company_id uuid, job_key text);
create table pb_prod.entries (company_id uuid, job_key text, user_id uuid, voided boolean default false, updated_at timestamptz default now());
create table pb_mat.materials (company_id uuid, job_key text);
create table pb_audit.admin_log (id bigint generated always as identity primary key, at timestamptz default now(), kind text, session_user_name text, request_role text, app_name text, tbl text, op text, row_id text, company_id uuid, user_id uuid, detail jsonb);
create function pb_billing.company_of(p uuid) returns table (company_id uuid) language sql stable as $$ select m.company_id from public.company_members m where m.user_id = p limit 1 $$;

CREATE OR REPLACE FUNCTION pb_prod.my_member(p_uid uuid)
 RETURNS TABLE(company_id uuid, role text, joined_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  select m.company_id, m.role, coalesce(m.joined_at, m.created_at) from public.company_members m join public.companies c on c.id = m.company_id
  where m.user_id = p_uid and c.status = 'active' order by m.created_at desc nulls last limit 1
$function$;
CREATE OR REPLACE FUNCTION pb_prod.managed_company(p_uid uuid)
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  select c.id from public.companies c
  where p_uid is not null and c.status = 'active'
    and (c.owner_user_id = p_uid
      or (exists (select 1 from pb_reports.managers mg where mg.company_id = c.id and mg.user_id = p_uid)
          and c.id = (select x.company_id from pb_prod.my_member(p_uid) x)))
  order by (c.id = (select x.company_id from pb_prod.my_member(p_uid) x)) desc nulls last, c.created_at desc
  limit 1
$function$;
CREATE OR REPLACE FUNCTION pb_prod.job_key(p text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO ''
AS $function$
  select left(lower(btrim(coalesce(p, ''))), 60)
$function$;
CREATE OR REPLACE FUNCTION pb_prod.locate_company(p_uid uuid, p_write boolean)
 RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
declare v uuid;
begin
  if p_uid is null then raise exception 'pb:signed_out'; end if;
  v := pb_prod.managed_company(p_uid);
  if v is not null then return v; end if;
  select x.company_id into v from pb_prod.my_member(p_uid) x where x.role in ('foreman', 'pm');
  if v is null then
    if exists (select 1 from pb_prod.my_member(p_uid)) then raise exception 'pb:foremen_only'; end if;
    raise exception 'pb:not_company_member';
  end if;
  return v;
end $function$;
-- stand-ins (the live ones read crew names and company settings)
create function pb_prod.member_name(p_company uuid, p_user uuid) returns text language sql stable security definer set search_path to '' as $$ select coalesce('user ' || left(p_user::text, 4), 'A foreman') $$;
create function pb_prod.locate_days(p_company uuid) returns integer language sql stable security definer set search_path to '' as $$ select 28 $$;
CREATE OR REPLACE FUNCTION pb_prod.versions_locked() RETURNS trigger LANGUAGE plpgsql SET search_path TO ''
AS $function$
begin raise exception 'pb:permanent'; end $function$;
CREATE OR REPLACE FUNCTION pb_audit.direct_write()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_role text; v_app text := coalesce(current_setting('application_name', true), ''); r jsonb; v_uid uuid; v_co uuid;
begin
  begin v_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'; exception when others then v_role := null; end;
  if session_user::text = 'authenticator' and v_role in ('authenticated', 'anon') then return null; end if; -- a signed-in app user (the normal path)
  if v_app like 'pg_cron%' then return null; end if; -- the app's own scheduled jobs (defined in its code)
  begin
    r := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
    begin v_uid := (r ->> 'user_id')::uuid; exception when others then v_uid := null; end;
    begin v_co := (r ->> 'company_id')::uuid; exception when others then v_co := null; end;
    if v_co is null and v_uid is not null then select c.company_id into v_co from pb_billing.company_of(v_uid) c; end if;
    insert into pb_audit.admin_log (kind, session_user_name, request_role, app_name, tbl, op, row_id, company_id, user_id, detail)
      values (case when session_user::text = 'authenticator' then 'service_write' else 'direct_write' end, session_user::text, v_role, left(v_app, 80),
              tg_table_schema || '.' || tg_table_name, tg_op, left(coalesce(r ->> 'id', r ->> 'entry_id', ''), 120), v_co, v_uid,
              case when tg_op = 'UPDATE' then jsonb_build_object('changed', (select jsonb_agg(k) from jsonb_object_keys(to_jsonb(new)) k where to_jsonb(new) -> k is distinct from to_jsonb(old) -> k)) else null end);
  exception when others then
    raise warning 'pb_audit.direct_write: %', sqlerrm; -- never block the write itself
  end;
  return null;
end $function$;

-- the live table (sql/36), as it is on Nov 20 2026
create table pb_prod.locates (
  id uuid not null primary key, company_id uuid not null references public.companies(id),
  job_key text not null check (length(job_key) >= 1 and length(job_key) <= 60), job_number text not null check (length(job_number) >= 1 and length(job_number) <= 60),
  ticket_no text not null check (length(ticket_no) >= 1 and length(ticket_no) <= 40), called_at date not null, expires_at date not null,
  note text check (note is null or length(note) <= 300), created_by uuid not null, created_at timestamptz not null default now(),
  updated_by uuid, updated_at timestamptz not null default now(), closed boolean not null default false, closed_at timestamptz, closed_by uuid,
  version integer not null default 1, constraint locates_check check (expires_at >= called_at));
create index locates_job_idx on pb_prod.locates (company_id, job_key, closed, expires_at);
create index locates_open_idx on pb_prod.locates (expires_at) where not closed;
alter table pb_prod.locates enable row level security;
create table pb_prod.locate_sends (locate_id uuid not null references pb_prod.locates(id), expires_at date not null, threshold integer not null, user_id uuid not null, outbox_id uuid, sent_at timestamptz not null default now(), primary key (locate_id, expires_at, threshold, user_id));

CREATE OR REPLACE FUNCTION pb_prod.locate_json(l pb_prod.locates)
 RETURNS jsonb LANGUAGE sql STABLE SET search_path TO ''
AS $function$
  select jsonb_build_object('id', l.id, 'job_key', l.job_key, 'job_number', l.job_number, 'ticket_no', l.ticket_no,
    'called_at', l.called_at, 'expires_at', l.expires_at, 'note', l.note, 'closed', l.closed, 'closed_at', l.closed_at,
    'created_at', l.created_at, 'updated_at', l.updated_at, 'version', l.version,
    'by_name', pb_prod.member_name(l.company_id, coalesce(l.updated_by, l.created_by)))
$function$;
CREATE OR REPLACE FUNCTION pb_prod.locates_json(p_company uuid, p_job_key text)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  select coalesce((select jsonb_agg(pb_prod.locate_json(l) order by l.closed, case when l.closed then null else l.expires_at end, l.closed_at desc nulls last, l.created_at desc)
    from (select * from pb_prod.locates x where x.company_id = p_company and x.job_key = p_job_key
          order by x.closed, case when x.closed then x.closed_at end desc nulls last, x.expires_at limit 60) l), '[]'::jsonb)
$function$;
CREATE OR REPLACE FUNCTION public.pb_prod_locates(p_job_number text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_key text := pb_prod.job_key(p_job_number);
begin
  v_company := pb_prod.locate_company(v_uid, false);
  if v_key = '' then raise exception 'pb:bad_job'; end if;
  return jsonb_build_object('ok', true, 'job_key', v_key, 'locate_days', pb_prod.locate_days(v_company), 'locates', pb_prod.locates_json(v_company, v_key), 'server_at', now(),
    'job', (select jsonb_build_object('job_number', i.job_number, 'project_name', i.project_name, 'address', i.address) from pb_prod.job_info i where i.company_id = v_company and i.job_key = v_key));
end $function$;
CREATE OR REPLACE FUNCTION public.pb_prod_locate_set(p_job_number text, p_id uuid, p_ticket_no text, p_called_at date, p_expires_at date, p_note text, p_closed boolean, p_expect_version integer, p_expect_uid uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_key text := pb_prod.job_key(p_job_number); v_job text := left(btrim(coalesce(p_job_number, '')), 60);
  cur pb_prod.locates; nw pb_prod.locates; v_no text; v_note text; v_n integer; v_closed boolean;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  v_company := pb_prod.locate_company(v_uid, true);
  if v_key = '' then raise exception 'pb:bad_job'; end if;
  if p_id is null then raise exception 'pb:bad_request'; end if;
  v_no := left(btrim(regexp_replace(coalesce(p_ticket_no, ''), '\s+', ' ', 'g')), 40);
  if v_no = '' then raise exception 'pb:bad_ticket_no'; end if;
  if p_called_at is null or p_expires_at is null or p_called_at < current_date - 3650 or p_called_at > current_date + 30
     or p_expires_at < p_called_at or p_expires_at > p_called_at + 365 then raise exception 'pb:bad_date'; end if;
  v_note := nullif(left(btrim(regexp_replace(coalesce(p_note, ''), '\s+', ' ', 'g')), 300), '');
  perform pg_advisory_xact_lock(hashtextextended('pb_loc|' || v_company::text || '|' || v_key, 0));
  select * into cur from pb_prod.locates l where l.id = p_id for update;
  if found then
    if cur.company_id <> v_company then raise exception 'pb:not_found'; end if;
    if cur.job_key <> v_key then raise exception 'pb:bad_job'; end if;
    v_closed := coalesce(p_closed, cur.closed);
    if not v_closed and cur.closed then -- a reopen counts against the open limit too
      select count(*) into v_n from pb_prod.locates l where l.company_id = v_company and l.job_key = v_key and not l.closed;
      if v_n >= 40 then raise exception 'pb:quota'; end if;
    end if;
    if p_expect_version is distinct from cur.version
       and (v_no, p_called_at, p_expires_at, v_note, v_closed) is distinct from (cur.ticket_no, cur.called_at, cur.expires_at, cur.note, cur.closed) then
      return jsonb_build_object('ok', false, 'stale', true, 'code', 'pb:stale', 'locate', pb_prod.locate_json(cur), 'locates', pb_prod.locates_json(v_company, v_key), 'server_at', now());
    end if;
    update pb_prod.locates set ticket_no = v_no, called_at = p_called_at, expires_at = p_expires_at, note = v_note, job_number = v_job,
        closed = v_closed, closed_at = case when v_closed and not cur.closed then now() when not v_closed then null else cur.closed_at end,
        closed_by = case when v_closed and not cur.closed then v_uid when not v_closed then null else cur.closed_by end,
        updated_by = v_uid, updated_at = now(), version = cur.version + 1
      where id = cur.id returning * into nw;
    if to_jsonb(nw) - '{version,updated_at,updated_by}'::text[] = to_jsonb(cur) - '{version,updated_at,updated_by}'::text[] then
      nw := cur; -- nothing changed: the row stays as it was (the update above is rolled back with the exception below)
      raise exception 'pb:no_change';
    end if;
  else
    select count(*) into v_n from pb_prod.locates l where l.company_id = v_company and l.created_at > now() - interval '1 day';
    if v_n >= 200 then raise exception 'pb:quota'; end if;
    select count(*) into v_n from pb_prod.locates l where l.company_id = v_company and l.job_key = v_key and not l.closed;
    if v_n >= 40 then raise exception 'pb:quota'; end if;
    if not exists (select 1 from pb_prod.job_info i where i.company_id = v_company and i.job_key = v_key)
       and not exists (select 1 from pb_prod.plans p where p.company_id = v_company and p.job_key = v_key)
       and not exists (select 1 from pb_prod.entries e where e.company_id = v_company and e.job_key = v_key)
       and not exists (select 1 from pb_mat.materials m where m.company_id = v_company and m.job_key = v_key) then raise exception 'pb:no_job'; end if;
    v_closed := coalesce(p_closed, false);
    insert into pb_prod.locates (id, company_id, job_key, job_number, ticket_no, called_at, expires_at, note, created_by, closed, closed_at, closed_by)
      values (p_id, v_company, v_key, v_job, v_no, p_called_at, p_expires_at, v_note, v_uid, v_closed, case when v_closed then now() end, case when v_closed then v_uid end)
      returning * into nw;
  end if;
  return jsonb_build_object('ok', true, 'locate', pb_prod.locate_json(nw), 'locates', pb_prod.locates_json(v_company, v_key), 'server_at', now());
exception when raise_exception then
  if sqlerrm = 'pb:no_change' then
    return jsonb_build_object('ok', true, 'same', true, 'locate', pb_prod.locate_json(cur), 'locates', pb_prod.locates_json(v_company, v_key), 'server_at', now());
  end if;
  raise;
end $function$;
grant execute on function public.pb_prod_locate_set(text, uuid, text, date, date, text, boolean, integer, uuid), public.pb_prod_locates(text) to authenticated, service_role;

-- seed: the live company (owner, foreman, PM, pipelayer), its two jobs, the one ticket on file, and a second company
insert into public.companies (id, name, owner_user_id) values ('d01a4a5f-312a-418f-9172-ea9aec9784b5', 'Co A', 'e03416b7-6086-40a5-8d42-9267b846fc26'), ('3e77aa35-ab38-4674-ae1d-dcd9917af903', 'Co B', 'bbbbbbbb-0000-4000-8000-000000000001');
insert into public.company_members (company_id, user_id, role) values
  ('d01a4a5f-312a-418f-9172-ea9aec9784b5', '4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e', 'foreman'), ('d01a4a5f-312a-418f-9172-ea9aec9784b5', 'aaaaaaaa-0000-4000-8000-000000000002', 'pm'),
  ('d01a4a5f-312a-418f-9172-ea9aec9784b5', 'aaaaaaaa-0000-4000-8000-000000000003', 'pipelayer'), ('3e77aa35-ab38-4674-ae1d-dcd9917af903', 'bbbbbbbb-0000-4000-8000-000000000004', 'foreman');
insert into pb_prod.job_info values ('d01a4a5f-312a-418f-9172-ea9aec9784b5', '26014', '26014', 'Main St Sewer', '100 Main St'), ('d01a4a5f-312a-418f-9172-ea9aec9784b5', '26043', '26043', null, null), ('3e77aa35-ab38-4674-ae1d-dcd9917af903', '26014', '26014', 'Other co job', null);
insert into pb_prod.locates (id, company_id, job_key, job_number, ticket_no, called_at, expires_at, created_by, created_at, updated_by, updated_at, version)
  values ('817898d2-222b-4e08-9571-e5a05a5f3b0a', 'd01a4a5f-312a-418f-9172-ea9aec9784b5', '26014', '26014', '81659831', '2026-11-04', '2026-11-05', 'e4a0170b-1189-4bd5-86fe-e47e092ede3f', '2026-10-28T18:44:08Z', 'e03416b7-6086-40a5-8d42-9267b846fc26', '2026-11-06T23:55:01Z', 2);
