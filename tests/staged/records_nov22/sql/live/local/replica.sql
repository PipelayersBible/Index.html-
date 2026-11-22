-- LOCAL ONLY (throwaway Postgres): enough of the live schema for the records Phase B blocks. Table DDL read from live
-- Nov 22 2026; the app RPCs the tests call and their helpers are the live text (line ends normalised); leaf helpers
-- that only send pushes / names are stubs.
do $r$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $r$;
alter default privileges revoke execute on functions from public;
create extension if not exists pgcrypto;
create schema auth; create schema pb_daily; create schema pb_prod; create schema pb_safety; create schema pb_tickets;
create schema pb_reports; create schema pb_audit; create schema pb_billing; create schema pb_crew; create schema pb_push; create schema pb_pm;
grant usage on schema public, auth, pb_daily, pb_prod, pb_safety, pb_tickets, pb_reports, pb_audit, pb_billing, pb_crew, pb_push, pb_pm to authenticated, anon;

create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $f$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
$f$;
grant execute on function auth.uid() to public;

create table public.companies (id uuid not null default gen_random_uuid(), name text not null, owner_user_id uuid not null, status text not null default 'inactive'::text, stripe_customer_id text, stripe_subscription_id text, current_period_end timestamp with time zone, created_at timestamp with time zone default now(), updated_at timestamp with time zone default now(), plan text not null default 'paid'::text, trial_ends_at timestamp with time zone);
create table public.company_members (id uuid not null default gen_random_uuid(), company_id uuid not null, user_id uuid not null, role text not null, created_at timestamp with time zone default now(), joined_at timestamp with time zone default now(), title text not null default 'project_manager'::text);
create table pb_reports.managers (company_id uuid not null, user_id uuid not null, added_at timestamp with time zone not null default now());
create table pb_daily.reports (id uuid not null default gen_random_uuid(), company_id uuid not null, job_key text not null, job_number text not null, jobsite text, work_date date not null, foreman_uid uuid, version integer not null default 1, supersedes uuid, amend_reason text, client_report_id text not null, snapshot jsonb not null, snapshot_sha256 text not null, server_sha256 text, signed_name text not null, signed_at timestamp with time zone not null, signed_tz text not null, signature_png_b64 text, received_at timestamp with time zone not null default now(), phone_clock_ahead_s integer, headcount integer, warnings jsonb, attach_allowed jsonb, for_foreman uuid);
create table pb_daily.events (id uuid not null default gen_random_uuid(), company_id uuid not null, job_key text not null, job_number text not null, report_id uuid not null, client_event_id text not null, work_date date not null, kind text not null, reason text not null, detail text, hours numeric(7,2) not null, crew_size integer, equipment jsonb not null default '[]'::jsonb, photo_count integer not null default 0, photos_signed jsonb not null default '[]'::jsonb, fp text not null default ''::text, same_as_prev boolean not null default false, changed_after_review boolean not null default false, review_rev integer not null default 0, created_by uuid not null, foreman_name text, status text not null default 'new'::text, reviewed_at timestamp with time zone, reviewed_by uuid, superseded_at timestamp with time zone, created_at timestamp with time zone not null default now());
create table pb_daily.event_photos (event_id uuid not null, n integer not null, company_id uuid not null, data_b64 text not null, sha256 text, client_sha256 text, taken_exif text, by_uid uuid, received_at timestamp with time zone not null default now());
create table pb_daily.report_photos (report_id uuid not null, n integer not null, company_id uuid not null, data_b64 text not null, sha256 text not null, client_sha256 text, taken_exif text, by_uid uuid, received_at timestamp with time zone not null default now());
create sequence pb_daily.event_reviews_id_seq;
create table pb_daily.event_reviews (id bigint not null default nextval('pb_daily.event_reviews_id_seq'::regclass), company_id uuid not null, event_id uuid not null, job_key text not null, work_date date not null, foreman_uid uuid not null, client_event_id text not null, from_status text not null, to_status text not null, by_uid uuid, note text, at timestamp with time zone not null default now());
create table pb_prod.talks_given (id uuid not null, company_id uuid not null, user_id uuid not null, job_key text not null, job_number text not null, talk_id text not null, title text not null, given_on date not null, given_at timestamp with time zone, attendees jsonb not null default '[]'::jsonb, voided boolean not null default false, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), version integer not null default 1);
create table pb_safety.open_permits (user_id uuid not null, client_permit_id text not null, company_id uuid, space text, jobsite text, job_number text, snapshot jsonb not null, record_sha256 text not null, bytes integer not null, saves integer not null default 1, first_saved_at timestamp with time zone not null default now(), saved_at timestamp with time zone not null default now());
create table pb_safety.permits (id uuid not null default gen_random_uuid(), user_id uuid not null, company_id uuid, client_permit_id text not null, space text, jobsite text, job_number text, closed_at timestamp with time zone, first_backed_up_at timestamp with time zone not null default now(), last_backed_up_at timestamp with time zone not null default now(), version_count integer not null default 0, bytes_total bigint not null default 0);
create table pb_safety.permit_versions (id bigint generated always as identity not null, permit_id uuid not null, version integer not null, record jsonb not null, record_sha256 text not null, received_at timestamp with time zone not null default now());
create table pb_tickets.tickets (id uuid not null default gen_random_uuid(), user_id uuid not null, company_id uuid, client_ticket_id text not null, type text not null, job_number text, jobsite text, cost_code text, cost_code_name text, use text, supplier text, ticket_no text, ticket_date date, yd3 numeric, mix text, hours numeric, record jsonb not null, has_photo boolean not null default false, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), version integer not null default 1);
create table pb_tickets.photos (ticket_id uuid not null, data_b64 text not null, created_at timestamp with time zone not null default now());
create table pb_tickets.ticket_versions (id bigint generated always as identity not null, ticket_id uuid not null, version integer not null, record jsonb not null, saved_at timestamp with time zone not null default now());
create table pb_tickets.cost_codes (company_id uuid not null, job_number text not null, code text not null, name text, updated_at timestamp with time zone not null default now());
create table pb_prod.run_records (id uuid not null default gen_random_uuid(), company_id uuid not null, user_id uuid not null, entry_id text not null, run_ref text, job_number text, job_key text, jobsite text, label text, locked_at timestamp with time zone, work_date date, ended boolean not null default false, ended_early boolean not null default false, distance_ft numeric, laid_ft numeric, photo_count integer not null default 0, record jsonb not null, record_md5 text not null, version integer not null default 1, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), ended_at timestamp with time zone, sent_at timestamp with time zone, sent_how text, reviewed_at timestamp with time zone, reviewed_by uuid, nudged_at timestamp with time zone, sent_back_at timestamp with time zone, sent_back_by uuid, sent_back_note text, removed_at timestamp with time zone, removed_by uuid, removed_reason text, setup_intended jsonb, setup_field jsonb, setup_version integer not null default 0, setup_intended_by uuid, setup_intended_at timestamp with time zone, setup_field_by uuid, setup_field_at timestamp with time zone, for_foreman uuid, for_foreman_at timestamp with time zone, corrected_at timestamp with time zone);
create table pb_prod.run_record_versions (id bigint generated always as identity not null, run_record_id uuid not null, version integer not null, record jsonb not null, record_md5 text not null, saved_at timestamp with time zone not null default now());
create table pb_prod.run_record_events (id bigint generated always as identity not null, run_record_id uuid not null, company_id uuid not null, action text not null, by_user uuid, note text, at timestamp with time zone not null default now());
create table pb_prod.run_setup_versions (id bigint generated always as identity not null, run_record_id uuid not null, company_id uuid not null, version integer not null, side text not null, change jsonb not null, intended jsonb, field jsonb, by_user uuid, at timestamp with time zone not null default now());
create table pb_prod.run_status (user_id uuid not null, session_ref text not null, company_id uuid not null, run_ref text, job_number text, work_date date, seq bigint not null default 0, ended boolean not null default false, status jsonb not null, for_foreman uuid, for_foreman_at timestamp with time zone);
create sequence pb_prod.pass_errors_id_seq;
create table pb_prod.pass_errors (id bigint not null default nextval('pb_prod.pass_errors_id_seq'::regclass), at timestamp with time zone not null default now(), place text not null, state text, message text, detail text);
create sequence pb_audit.admin_log_id_seq;
create table pb_audit.admin_log (id bigint not null default nextval('pb_audit.admin_log_id_seq'::regclass), at timestamp with time zone not null default clock_timestamp(), kind text not null, session_user_name text, request_role text, app_name text, tbl text, op text, row_id text, company_id uuid, user_id uuid, actor uuid, detail jsonb);
create table pb_prod.tz_names (name text primary key);
insert into pb_prod.tz_names select distinct name from pg_timezone_names;
alter table companies add constraint companies_pkey PRIMARY KEY (id);
alter table companies add constraint companies_plan_check CHECK ((plan = ANY (ARRAY['paid'::text, 'trial'::text])));
alter table companies add constraint companies_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'canceled'::text, 'past_due'::text])));
alter table company_members add constraint company_members_pkey PRIMARY KEY (id);
alter table company_members add constraint company_members_role_check CHECK ((role = ANY (ARRAY['foreman'::text, 'pipelayer'::text, 'pm'::text])));
alter table company_members add constraint company_members_user_id_key UNIQUE (user_id);
alter table pb_reports.managers add constraint managers_pkey PRIMARY KEY (company_id, user_id);
alter table pb_daily.reports add constraint reports_amend CHECK (((version = 1) OR ((supersedes IS NOT NULL) AND (length(btrim(COALESCE(amend_reason, ''::text))) > 0))));
alter table pb_daily.reports add constraint reports_company_id_job_key_work_date_foreman_uid_version_key UNIQUE (company_id, job_key, work_date, foreman_uid, version);
alter table pb_daily.reports add constraint reports_foreman_uid_client_report_id_key UNIQUE (foreman_uid, client_report_id);
alter table pb_daily.reports add constraint reports_pkey PRIMARY KEY (id);
alter table pb_daily.reports add constraint reports_snapshot_sha256_check CHECK ((snapshot_sha256 ~ '^[0-9a-f]{64}$'::text));
alter table pb_daily.events add constraint events_pkey PRIMARY KEY (id);
alter table pb_daily.events add constraint events_report_id_client_event_id_key UNIQUE (report_id, client_event_id);
alter table pb_daily.events add constraint events_status_check CHECK ((status = ANY (ARRAY['new'::text, 'reviewed'::text, 'tm_sent'::text])));
alter table pb_daily.event_photos add constraint event_photos_data_b64_check CHECK (((length(data_b64) >= 100) AND (length(data_b64) <= 1400000)));
alter table pb_daily.event_photos add constraint event_photos_pkey PRIMARY KEY (event_id, n);
alter table pb_daily.report_photos add constraint report_photos_pkey PRIMARY KEY (report_id, n);
alter table pb_daily.event_reviews add constraint event_reviews_pkey PRIMARY KEY (id);
alter table pb_prod.talks_given add constraint talks_given_pkey PRIMARY KEY (id);
alter table pb_safety.open_permits add constraint open_permits_pkey PRIMARY KEY (user_id, client_permit_id);
alter table pb_safety.permits add constraint permits_pkey PRIMARY KEY (id);
alter table pb_safety.permits add constraint permits_user_id_client_permit_id_key UNIQUE (user_id, client_permit_id);
alter table pb_safety.permit_versions add constraint permit_versions_permit_id_version_key UNIQUE (permit_id, version);
alter table pb_safety.permit_versions add constraint permit_versions_pkey PRIMARY KEY (id);
alter table pb_tickets.tickets add constraint tickets_pkey PRIMARY KEY (id);
alter table pb_tickets.tickets add constraint tickets_user_id_client_ticket_id_key UNIQUE (user_id, client_ticket_id);
alter table pb_tickets.photos add constraint photos_pkey PRIMARY KEY (ticket_id);
alter table pb_tickets.ticket_versions add constraint ticket_versions_pkey PRIMARY KEY (id);
alter table pb_tickets.ticket_versions add constraint ticket_versions_ticket_id_version_key UNIQUE (ticket_id, version);
alter table pb_tickets.cost_codes add constraint cost_codes_pkey PRIMARY KEY (company_id, job_number, code);
alter table pb_prod.run_records add constraint run_records_pkey PRIMARY KEY (id);
alter table pb_prod.run_records add constraint run_records_user_id_entry_id_key UNIQUE (user_id, entry_id);
alter table pb_prod.run_record_versions add constraint run_record_versions_pkey PRIMARY KEY (id);
alter table pb_prod.run_record_versions add constraint run_record_versions_run_record_id_version_key UNIQUE (run_record_id, version);
alter table pb_prod.run_record_events add constraint run_record_events_action_check CHECK ((action = ANY (ARRAY['approved'::text, 'sent_back'::text, 'removed'::text, 'restored'::text])));
alter table pb_prod.run_record_events add constraint run_record_events_pkey PRIMARY KEY (id);
alter table pb_prod.run_setup_versions add constraint run_setup_versions_pkey PRIMARY KEY (id);
alter table pb_prod.run_status add constraint run_status_pkey PRIMARY KEY (user_id, company_id, session_ref);
alter table pb_prod.pass_errors add constraint pass_errors_pkey PRIMARY KEY (id);
alter table pb_audit.admin_log add constraint admin_log_pkey PRIMARY KEY (id);
alter table company_members add constraint company_members_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
alter table pb_reports.managers add constraint managers_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
alter table pb_daily.reports add constraint reports_supersedes_fkey FOREIGN KEY (supersedes) REFERENCES pb_daily.reports(id);
alter table pb_daily.events add constraint events_report_id_fkey FOREIGN KEY (report_id) REFERENCES pb_daily.reports(id);
alter table pb_daily.event_photos add constraint event_photos_event_id_fkey FOREIGN KEY (event_id) REFERENCES pb_daily.events(id);
alter table pb_daily.report_photos add constraint report_photos_report_id_fkey FOREIGN KEY (report_id) REFERENCES pb_daily.reports(id) ON DELETE CASCADE;
alter table pb_daily.event_reviews add constraint event_reviews_event_id_fkey FOREIGN KEY (event_id) REFERENCES pb_daily.events(id);
alter table pb_prod.talks_given add constraint talks_given_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);
alter table pb_safety.permit_versions add constraint permit_versions_permit_id_fkey FOREIGN KEY (permit_id) REFERENCES pb_safety.permits(id);
alter table pb_tickets.photos add constraint photos_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES pb_tickets.tickets(id);
alter table pb_tickets.ticket_versions add constraint ticket_versions_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES pb_tickets.tickets(id);
alter table pb_prod.run_record_versions add constraint run_record_versions_run_record_id_fkey FOREIGN KEY (run_record_id) REFERENCES pb_prod.run_records(id);
alter table pb_prod.run_record_events add constraint run_record_events_run_record_id_fkey FOREIGN KEY (run_record_id) REFERENCES pb_prod.run_records(id);
alter table pb_prod.run_setup_versions add constraint run_setup_versions_run_record_id_fkey FOREIGN KEY (run_record_id) REFERENCES pb_prod.run_records(id);

-- ===== stubs (leaf helpers: names, pushes, billing) =====
create function pb_crew.display_name(p_company uuid, p_user uuid) returns text language sql stable as $f$ select null::text $f$;
create function pb_prod.member_name(p_company uuid, p_user uuid) returns text language sql stable as $f$ select 'Member ' || left(p_user::text, 4) $f$;
create function pb_prod.member_name_public(p_company uuid, p_user uuid) returns text language sql stable as $f$ select 'a crew member'::text $f$;
create function pb_prod.is_pipelayer_of(p_uid uuid, p_company uuid) returns boolean language sql stable as $f$ select false $f$;
create function pb_prod.rr_foreman(a uuid, b uuid, c uuid) returns uuid language sql stable as $f$ select null::uuid $f$;
create function pb_prod.run_pick(a uuid, b uuid, c text) returns uuid language sql stable as $f$ select null::uuid $f$;
create function pb_prod.rr_fixed_notify(a uuid) returns boolean language sql as $f$ select false $f$;
create function pb_push.kick() returns void language sql as $f$ select $f$;
create function pb_daily.events_push(p_report pb_daily.reports) returns integer language sql as $f$ select 0 $f$;
create function pb_billing.beta_closed(p uuid) returns boolean language sql stable as $f$ select false $f$;
create function pb_billing.read_only(p uuid) returns boolean language sql stable as $f$ select false $f$;
create function pb_billing.company_of(p uuid) returns table (company_id uuid) language sql stable as $f$ select m.company_id from public.company_members m where m.user_id = p $f$;
create function pb_safety.em_register(a uuid, b text, c jsonb) returns void language sql as $f$ select $f$;
create function pb_safety.closed_frozen() returns boolean language sql immutable set search_path to '' as $f$select false$f$;
create function pb_daily.extras_check(p_snap jsonb) returns text language sql immutable as $f$ select null::text $f$;
create function pb_daily.person(p_uid uuid) returns text language sql stable as $f$ select 'Person ' || left(p_uid::text, 4) $f$;
create function pb_billing.beta_closed_guard() returns trigger language plpgsql security definer set search_path to '' as $f$
begin
  if new.company_id is not null and pb_billing.beta_closed(new.company_id) then raise exception 'pb:beta_ended'; end if;
  if new.company_id is not null and pb_billing.read_only(new.company_id) then raise exception 'pb:beta_ended'; end if;
  return new;
end $f$;
create function pb_daily.reports_extras() returns trigger language plpgsql security definer set search_path to '' as $f$
begin new.warnings := null; new.attach_allowed := null; return new; end $f$;

-- ===== live text =====
CREATE FUNCTION pb_prod.my_member(p_uid uuid) RETURNS TABLE(company_id uuid, role text, joined_at timestamp with time zone) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select m.company_id, m.role, coalesce(m.joined_at, m.created_at) from public.company_members m join public.companies c on c.id = m.company_id
  where m.user_id = p_uid and c.status = 'active' order by m.created_at desc nulls last limit 1
$function$;
CREATE FUNCTION pb_prod.my_company(p_uid uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select x.company_id from pb_prod.my_member(p_uid) x
$function$;
CREATE FUNCTION pb_prod.managed_company(p_uid uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select c.id from public.companies c
  where p_uid is not null and c.status = 'active'
    and (c.owner_user_id = p_uid
      or (exists (select 1 from pb_reports.managers mg where mg.company_id = c.id and mg.user_id = p_uid)
          and c.id = (select x.company_id from pb_prod.my_member(p_uid) x)))
  order by (c.id = (select x.company_id from pb_prod.my_member(p_uid) x)) desc nulls last, c.created_at desc
  limit 1
$function$;
CREATE FUNCTION pb_reports.managed_company(p_uid uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select c.id from public.companies c
  where p_uid is not null and c.status = 'active'
    and (c.owner_user_id = p_uid
      or (exists (select 1 from pb_reports.managers m where m.company_id = c.id and m.user_id = p_uid)
          and c.id = (select cm.company_id from public.company_members cm where cm.user_id = p_uid order by cm.created_at desc nulls last limit 1)))
  order by (c.id = (select cm.company_id from public.company_members cm where cm.user_id = p_uid order by cm.created_at desc nulls last limit 1)) desc nulls last, c.created_at
  limit 1
$function$;
CREATE FUNCTION pb_prod.member_name_or_null(p_company uuid, p_user uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select case when p_user is not null then pb_prod.member_name(p_company, p_user) end
$function$;
CREATE FUNCTION pb_prod.talk_company(p_uid uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select coalesce(
    (select x.company_id from pb_prod.my_member(p_uid) x where p_uid is not null and x.role in ('foreman', 'pm', 'super', 'superintendent')),
    pb_reports.managed_company(p_uid))
$function$;
CREATE FUNCTION pb_prod.is_foreman_of(p_uid uuid, p_company uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select exists (select 1 from pb_prod.my_member(p_uid) x where x.company_id = p_company and x.role = 'foreman')
$function$;
CREATE FUNCTION pb_prod.job_key(p text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO '' AS $function$ select left(lower(btrim(coalesce(p, ''))), 60) $function$;
CREATE FUNCTION pb_daily.job_key(p text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO '' AS $function$ select left(lower(btrim(coalesce(p, ''))), 60) $function$;
CREATE FUNCTION pb_prod.tz_valid(p text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select p is not null and exists (select 1 from pb_prod.tz_names t where t.name = p)
$function$;
CREATE FUNCTION pb_daily.tz_ok(p text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$ select pb_prod.tz_valid(p) $function$;
CREATE FUNCTION pb_daily.is_manager(p_company uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select coalesce(p_company is not null and pb_prod.managed_company(auth.uid()) = p_company, false)
$function$;
CREATE FUNCTION pb_daily.is_foreman(p_company uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select p_company is not null and exists (select 1 from pb_prod.my_member(auth.uid()) x where x.role = 'foreman' and x.company_id = p_company)
$function$;
CREATE FUNCTION pb_daily.clock_slack() RETURNS interval LANGUAGE sql STABLE SET search_path TO '' AS $function$
  select interval '10 minutes' + make_interval(secs => least(86400, greatest(0, coalesce(nullif(current_setting('pb_daily.clock_ahead_s', true), '')::integer, 0))))
$function$;
CREATE FUNCTION pb_daily.refusal(p_err text, p_state text) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO '' AS $function$
  select jsonb_build_object('ok', false, 'code', case when p_err ~ '^pb:[a-z_]+$' then p_err when p_state like '23%' or p_state like '22%' then 'pb:bad_record' else 'pb:server' end,
    'detail', left(p_err, 200), 'sqlstate', p_state)
$function$;
CREATE FUNCTION pb_daily.event_fp(p_kind text, p_reason text, p_hours numeric, p_crew integer, p_detail text, p_equipment jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO '' AS $function$
  select md5(coalesce(p_kind, '') || '|' || coalesce(p_reason, '') || '|' || coalesce(round(p_hours, 2)::text, '') || '|' || coalesce(p_crew::text, '-') || '|' || coalesce(p_detail, '') || '|' || coalesce(p_equipment, '[]'::jsonb)::text)
$function$;
CREATE FUNCTION pb_daily.me(p_expect_uid uuid) RETURNS uuid LANGUAGE plpgsql STABLE SET search_path TO '' AS $function$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is not null and p_expect_uid <> v then raise exception 'pb:wrong_account'; end if;
  return v;
end $function$;
CREATE FUNCTION pb_daily.foreman_of() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select x.company_id from pb_prod.my_member(auth.uid()) x where x.role = 'foreman'
$function$;
CREATE FUNCTION pb_daily.managed() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$ select pb_prod.managed_company(auth.uid()) $function$;
CREATE FUNCTION pb_daily.office_filled(p_company uuid, p_job_key text, p_day date, p_for uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select exists (select 1 from pb_daily.reports x where x.company_id = p_company and x.job_key = p_job_key and x.work_date = p_day and x.for_foreman = p_for)
$function$;
CREATE FUNCTION pb_daily.permanent() RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $function$
begin raise exception 'pb:daily_history_is_permanent'; end $function$;
CREATE FUNCTION pb_prod.versions_locked() RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $function$
begin raise exception 'pb:permanent'; end $function$;
CREATE FUNCTION pb_prod.rr_permanent() RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $function$
begin raise exception 'pb:history_is_permanent'; end $function$;
CREATE FUNCTION pb_safety.permit_delete_guard() RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $function$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('pb.allow_permit_delete', true), '') = 'on' then return old; end if;
  raise exception 'pb:permit_records_are_permanent';
end $function$;
CREATE FUNCTION pb_prod.note_error(p_place text, p_state text, p_message text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
begin
  if (select count(*) from pb_prod.pass_errors e where e.at > now() - interval '1 day') >= 300 then return; end if;
  insert into pb_prod.pass_errors (place, state, message) values (left(coalesce(p_place, '?'), 120), left(p_state, 10), left(p_message, 500));
exception when others then null;
end $function$;
CREATE FUNCTION pb_audit.direct_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare v_role text; v_app text := coalesce(current_setting('application_name', true), ''); r jsonb; v_uid uuid; v_co uuid;
begin
  begin v_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'; exception when others then v_role := null; end;
  if session_user::text = 'authenticator' and v_role in ('authenticated', 'anon') then return null; end if;
  if v_app like 'pg_cron%' then return null; end if;
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
    raise warning 'pb_audit.direct_write: %', sqlerrm;
  end;
  return null;
end $function$;
CREATE FUNCTION pb_safety.drop_open_on_close() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
begin
  begin
    delete from pb_safety.open_permits where user_id = new.user_id and client_permit_id = new.client_permit_id;
  exception when others then
    raise log 'pb_safety.drop_open_on_close: skipped (%)', sqlstate; perform pb_prod.note_error('pb_safety.drop_open_on_close: skipped (%)', sqlstate, sqlerrm);
  end;
  return null;
end $function$;
CREATE FUNCTION pb_prod.talk_json(t pb_prod.talks_given) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select jsonb_build_object('id', t.id, 'job_number', t.job_number, 'job_key', t.job_key, 'talk_id', t.talk_id, 'title', t.title,
    'given_on', t.given_on, 'given_at', t.given_at, 'attendees', t.attendees, 'voided', t.voided, 'updated_at', t.updated_at,
    'version', t.version, 'by_name', pb_prod.member_name(t.company_id, t.user_id))
$function$;
CREATE FUNCTION pb_prod.pick_of(p_text text, p_company uuid, p_pipelayer uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select case when p_text = 'none' and pb_prod.is_pipelayer_of(p_pipelayer, p_company) then '00000000-0000-0000-0000-000000000000'::uuid
              when p_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and p_text::uuid is distinct from p_pipelayer
                   and pb_prod.is_pipelayer_of(p_pipelayer, p_company) and pb_prod.is_foreman_of(p_text::uuid, p_company) then p_text::uuid end
$function$;
CREATE FUNCTION pb_prod.run_foreman(p_company uuid, p_pipelayer uuid, p_session_ref text) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select case when pb_prod.is_pipelayer_of(p_pipelayer, p_company) then pb_prod.rr_foreman(p_company, p_pipelayer, pb_prod.run_pick(p_company, p_pipelayer, p_session_ref)) end
$function$;
CREATE FUNCTION pb_prod.rr_fix_for(p_record jsonb) RETURNS timestamp with time zone LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path TO '' AS $function$
begin return nullif(p_record->>'rrFixFor', '')::timestamptz; exception when others then return null; end $function$;
CREATE FUNCTION pb_tickets.my_company(p_uid uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  select x.company_id from (
    select m.company_id, 1 as pri, m.created_at as at from public.company_members m join public.companies c on c.id = m.company_id
      where m.user_id = p_uid and c.status = 'active'
    union all
    select c.id, 2 as pri, c.created_at as at from public.companies c
      where c.owner_user_id = p_uid and c.status = 'active'
  ) x
  order by x.pri, x.at desc nulls last
  limit 1
$function$;
CREATE FUNCTION pb_daily.event_history(e pb_daily.events) RETURNS jsonb LANGUAGE sql STABLE SET search_path TO '' AS $function$
  select coalesce(jsonb_agg(jsonb_build_object('from', h.from_status, 'to', h.to_status, 'at', h.at, 'note', h.note,
           'by', case when h.by_uid is null then null when h.by_uid = e.created_by and h.note is not null then coalesce(e.foreman_name, 'the foreman') else coalesce(pb_daily.person(h.by_uid), 'a manager') end) order by h.at, h.id), '[]'::jsonb)
  from pb_daily.event_reviews h where h.company_id = e.company_id and h.job_key = e.job_key and h.work_date = e.work_date and h.foreman_uid = e.created_by and h.client_event_id = e.client_event_id
$function$;
CREATE FUNCTION pb_daily.event_json(e pb_daily.events) RETURNS jsonb LANGUAGE sql STABLE SET search_path TO '' AS $function$
  select jsonb_build_object('id', e.id, 'status', e.status, 'rev', e.review_rev, 'history', pb_daily.event_history(e))
$function$;

CREATE FUNCTION pb_daily.reports_stamp() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare v_prev pb_daily.reports%rowtype;
begin
  if not (pb_daily.is_foreman(new.company_id)
          or (pb_daily.is_manager(new.company_id) and new.for_foreman is not null and pb_prod.is_foreman_of(new.for_foreman, new.company_id))) then
    raise exception 'pb:not_foreman';
  end if;
  new.foreman_uid := auth.uid(); new.received_at := now(); new.job_key := pb_daily.job_key(new.job_number);
  if new.job_key = '' then raise exception 'pb:no_job'; end if;
  if new.work_date > (now() at time zone 'utc')::date + 1 then raise exception 'pb:future_date'; end if;
  if new.work_date < (now() at time zone 'utc')::date - 400 then raise exception 'pb:bad_date'; end if;
  if new.signed_at > now() + pb_daily.clock_slack() then raise exception 'pb:future_time'; end if;
  if not pb_daily.tz_ok(new.signed_tz) then raise exception 'pb:bad_tz'; end if;
  perform pg_advisory_xact_lock(hashtext('pb_daily:' || new.company_id::text || ':' || new.job_key || ':' || new.work_date::text || ':' || new.foreman_uid::text));
  select * into v_prev from pb_daily.reports r where r.company_id = new.company_id and r.job_key = new.job_key and r.work_date = new.work_date and r.foreman_uid = new.foreman_uid order by r.version desc limit 1;
  if found then
    if new.supersedes is distinct from v_prev.id then raise exception 'pb:report_exists'; end if;
    if length(btrim(coalesce(new.amend_reason, ''))) = 0 then raise exception 'pb:amend_reason'; end if;
    new.version := v_prev.version + 1;
  else
    if new.supersedes is not null then raise exception 'pb:bad_supersedes'; end if;
    new.version := 1; new.amend_reason := null;
  end if;
  new.server_sha256 := encode(sha256(convert_to(new.snapshot::text, 'UTF8')), 'hex');
  return new;
end $function$;

CREATE FUNCTION pb_daily.events_store(p_report pb_daily.reports) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare e jsonb; o bigint; v_n integer := 0; v_kind text; v_reason text; v_hours numeric; v_crew integer; v_cid text; v_prev pb_daily.events%rowtype; v_eq jsonb; v_ph jsonb; v_new uuid;
  v_detail text; v_fp text; v_same boolean; v_seen text[] := '{}'; k integer;
  v_list jsonb := case when jsonb_typeof(p_report.snapshot->'events') = 'array' then p_report.snapshot->'events' else '[]'::jsonb end;
begin
  if p_report.supersedes is not null then
    update pb_daily.events set superseded_at = now() where report_id = p_report.supersedes and superseded_at is null;
  end if;
  for e, o in select x, t.o from jsonb_array_elements(v_list) with ordinality t(x, o) where jsonb_typeof(x) = 'object' and t.o <= 40 loop
    v_kind := case when e->>'kind' in ('delay', 'standby', 'extra') then e->>'kind' else 'delay' end;
    v_reason := case when e->>'reason' in ('weather', 'utility', 'inspector', 'materials', 'design', 'owner_extra', 'equipment') then e->>'reason'
                      when btrim(coalesce(e->>'detail', '')) ~* '^equipment down\M' then 'equipment' else 'other' end;
    begin v_hours := least(999, greatest(0, round(coalesce((e->>'hours')::numeric, 0), 2))); exception when others then v_hours := 0; end;
    begin v_crew := case when e->>'crew_size' is null then null else least(999, greatest(0, round((e->>'crew_size')::numeric)::integer)) end; exception when others then v_crew := null; end;
    v_detail := nullif(left(btrim(coalesce(e->>'detail', '')), 2000), '');
    v_cid := left(coalesce(nullif(btrim(e->>'cid'), ''), 'ev' || o::text), 90);
    if v_cid = any (v_seen) then k := 2; while (v_cid || '#' || k) = any (v_seen) loop k := k + 1; end loop; v_cid := v_cid || '#' || k; end if;
    v_seen := v_seen || v_cid;
    v_eq := case when jsonb_typeof(e->'equipment') = 'array' then (select coalesce(jsonb_agg(jsonb_build_object('key', left(q->>'key', 60), 'name', left(coalesce(q->>'name', ''), 120), 'unit_no', left(q->>'unit_no', 40)) order by t.o), '[]'::jsonb)
                                                                       from jsonb_array_elements(e->'equipment') with ordinality t(q, o) where jsonb_typeof(q) = 'object' and t.o <= 40) else '[]'::jsonb end;
    v_ph := case when jsonb_typeof(e->'photos') = 'array' then (select coalesce(jsonb_agg(case when jsonb_typeof(ph) = 'object' and ph->>'sha' is not null then to_jsonb(left(ph->>'sha', 64)) else 'null'::jsonb end order by t.o), '[]'::jsonb)
                                                                    from jsonb_array_elements(e->'photos') with ordinality t(ph, o) where t.o <= 6) else '[]'::jsonb end;
    v_fp := pb_daily.event_fp(v_kind, v_reason, v_hours, v_crew, v_detail, v_eq);
    v_prev := null;
    if p_report.supersedes is not null then
      select * into v_prev from pb_daily.events x where x.report_id = p_report.supersedes and x.client_event_id = v_cid;
    end if;
    v_same := v_prev.id is not null and v_prev.fp = v_fp;
    insert into pb_daily.events (company_id, job_key, job_number, report_id, client_event_id, work_date, kind, reason, detail, hours, crew_size, equipment, photo_count, photos_signed, fp, same_as_prev,
                                 changed_after_review, review_rev, created_by, foreman_name, status, reviewed_at, reviewed_by)
      values (p_report.company_id, p_report.job_key, p_report.job_number, p_report.id, v_cid, p_report.work_date, v_kind, v_reason, v_detail, v_hours, v_crew, v_eq, jsonb_array_length(v_ph), v_ph, v_fp, v_same,
              case when v_same then v_prev.changed_after_review else coalesce(v_prev.status, 'new') <> 'new' end, coalesce(v_prev.review_rev, 0) + case when v_same or v_prev.id is null then 0 else 1 end,
              p_report.foreman_uid, left(p_report.signed_name, 120),
              case when v_same then v_prev.status else 'new' end, case when v_same then v_prev.reviewed_at end, case when v_same then v_prev.reviewed_by end)
      returning id into v_new;
    v_n := v_n + 1;
    if v_prev.id is not null and not v_same and v_prev.status <> 'new' then
      insert into pb_daily.event_reviews (company_id, event_id, job_key, work_date, foreman_uid, client_event_id, from_status, to_status, by_uid, note)
        values (p_report.company_id, v_new, p_report.job_key, p_report.work_date, p_report.foreman_uid, v_cid, v_prev.status, 'new', p_report.foreman_uid, 'Changed by the foreman in an amendment');
    end if;
    if v_prev.id is not null and jsonb_array_length(v_ph) > 0 then
      insert into pb_daily.event_photos (event_id, n, company_id, data_b64, sha256, client_sha256, taken_exif, by_uid, received_at)
        select v_new, s.n::integer, p.company_id, p.data_b64, p.sha256, p.client_sha256, p.taken_exif, p.by_uid, p.received_at
          from jsonb_array_elements_text(v_ph) with ordinality s(sha, n)
          join lateral (select * from pb_daily.event_photos p0 where p0.event_id = v_prev.id and (p0.client_sha256 = s.sha or p0.sha256 = s.sha) order by p0.n limit 1) p on true
        on conflict (event_id, n) do nothing;
    end if;
  end loop;
  return v_n;
exception when others then
  raise log 'pb_daily.events_store: refused (% %)', sqlstate, sqlerrm;
  raise exception 'pb:bad_events' using detail = left(sqlerrm, 200);
end $function$;
CREATE FUNCTION pb_daily.events_on_report() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
begin
  if pb_daily.events_store(new) > 0 or new.supersedes is not null then perform pb_daily.events_push(new); end if;
  return null;
end $function$;

CREATE FUNCTION public.pb_daily_submit(p_client_report_id text, p_job_number text, p_jobsite text, p_work_date date, p_snapshot jsonb, p_sha256 text, p_signed_name text, p_signed_at timestamp with time zone, p_signed_tz text, p_signature_b64 text, p_supersedes uuid, p_amend_reason text, p_sent_at timestamp with time zone, p_clock_ok boolean, p_expect_uid uuid)
 RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $function$
declare v_uid uuid := pb_daily.me(p_expect_uid); v_c uuid := pb_daily.foreman_of(); v_r pb_daily.reports%rowtype; v_prev pb_daily.reports%rowtype;
  v_ahead integer := case when p_sent_at is null then null else round(extract(epoch from (p_sent_at - now())))::integer end; v_today date := (now() at time zone 'utc')::date;
  v_head integer; v_for uuid := null;
begin
  select * into v_r from pb_daily.reports r where r.foreman_uid = v_uid and r.client_report_id = p_client_report_id;
  if found then return jsonb_build_object('ok', true, 'again', true, 'id', v_r.id, 'version', v_r.version, 'received_at', v_r.received_at, 'server_sha256', v_r.server_sha256, 'sha_matches', v_r.server_sha256 = v_r.snapshot_sha256); end if;
  if v_c is null then
    return jsonb_build_object('ok', false, 'code', 'pb:not_foreman'); -- (office-fill branch left out of the local copy)
  elsif p_supersedes is null and pb_daily.office_filled(v_c, pb_daily.job_key(p_job_number), p_work_date, v_uid) then
    return jsonb_build_object('ok', false, 'code', 'pb:office_filled');
  end if;
  if pb_daily.job_key(p_job_number) = '' then return jsonb_build_object('ok', false, 'code', 'pb:no_job'); end if;
  if p_work_date is null or p_work_date > v_today + 1 then return jsonb_build_object('ok', false, 'code', 'pb:future_date', 'server_at', now()); end if;
  if p_work_date < v_today - 400 then return jsonb_build_object('ok', false, 'code', 'pb:bad_date'); end if;
  if length(btrim(coalesce(p_signed_name, ''))) < 2 then return jsonb_build_object('ok', false, 'code', 'pb:need_signature'); end if;
  if p_signed_at is null or not pb_daily.tz_ok(btrim(coalesce(p_signed_tz, ''))) then return jsonb_build_object('ok', false, 'code', 'pb:bad_tz'); end if;
  if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then return jsonb_build_object('ok', false, 'code', 'pb:bad_record'); end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' or pg_column_size(p_snapshot) > 400000 then return jsonb_build_object('ok', false, 'code', 'pb:too_big'); end if;
  select * into v_prev from pb_daily.reports r where r.company_id = v_c and r.job_key = pb_daily.job_key(p_job_number) and r.work_date = p_work_date and r.foreman_uid = v_uid
  order by r.version desc limit 1;
  if found and p_supersedes is null then return jsonb_build_object('ok', false, 'code', 'pb:report_exists', 'id', v_prev.id, 'version', v_prev.version); end if;
  if found and p_supersedes <> v_prev.id then return jsonb_build_object('ok', false, 'code', 'pb:not_latest', 'id', v_prev.id, 'version', v_prev.version); end if;
  if not found and p_supersedes is not null then return jsonb_build_object('ok', false, 'code', 'pb:bad_supersedes'); end if;
  if p_supersedes is not null and length(btrim(coalesce(p_amend_reason, ''))) = 0 then return jsonb_build_object('ok', false, 'code', 'pb:amend_reason'); end if;
  v_head := case when jsonb_typeof(p_snapshot->'crew_today'->'people') = 'array' then least(999, jsonb_array_length(p_snapshot->'crew_today'->'people')) else null end;
  begin
    insert into pb_daily.reports (company_id, job_key, job_number, jobsite, work_date, foreman_uid, supersedes, amend_reason, client_report_id, snapshot, snapshot_sha256,
      signed_name, signed_at, signed_tz, signature_png_b64, phone_clock_ahead_s, headcount, for_foreman)
    values (v_c, pb_daily.job_key(p_job_number), left(btrim(p_job_number), 60), nullif(left(btrim(coalesce(p_jobsite, '')), 200), ''), p_work_date, v_uid, p_supersedes,
      nullif(left(btrim(coalesce(p_amend_reason, '')), 1000), ''), p_client_report_id, p_snapshot, p_sha256, left(btrim(p_signed_name), 120), p_signed_at, left(btrim(p_signed_tz), 64), p_signature_b64,
      case when coalesce(p_clock_ok, false) or abs(coalesce(v_ahead, 0)) > 120 then least(31536000, greatest(-31536000, v_ahead)) else null end, v_head, v_for)
    returning * into v_r;
  exception when others then perform set_config('pb_daily.clock_ahead_s', '', true); return pb_daily.refusal(sqlerrm, sqlstate); end;
  perform set_config('pb_daily.clock_ahead_s', '', true);
  return jsonb_build_object('ok', true, 'id', v_r.id, 'version', v_r.version, 'received_at', v_r.received_at, 'server_sha256', v_r.server_sha256,
    'sha_matches', v_r.server_sha256 = v_r.snapshot_sha256, 'phone_clock_ahead_s', v_r.phone_clock_ahead_s, 'events', (select count(*) from pb_daily.events e where e.report_id = v_r.id));
end $function$;

CREATE FUNCTION public.pb_daily_event_review(p_id uuid, p_status text, p_expect_uid uuid, p_expect_status text DEFAULT NULL::text, p_expect_rev integer DEFAULT NULL::integer)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare v_uid uuid := pb_daily.me(p_expect_uid); v_c uuid := pb_daily.managed(); e pb_daily.events%rowtype; c pb_daily.events%rowtype; v_from uuid; v_old text;
begin
  if v_c is null then return jsonb_build_object('ok', false, 'code', 'pb:not_company_account'); end if;
  if p_status is null or p_status not in ('new', 'reviewed', 'tm_sent') then return jsonb_build_object('ok', false, 'code', 'pb:bad_status'); end if;
  select * into e from pb_daily.events x where x.id = p_id and x.company_id = v_c for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:not_found'); end if;
  if e.superseded_at is not null then
    select * into c from pb_daily.events x where x.company_id = e.company_id and x.job_key = e.job_key and x.work_date = e.work_date and x.created_by = e.created_by
      and x.client_event_id = e.client_event_id and x.superseded_at is null order by x.created_at desc limit 1 for update;
    if not found then return jsonb_build_object('ok', false, 'code', 'pb:superseded', 'removed', true, 'id', e.id); end if;
    if c.fp <> e.fp then return jsonb_build_object('ok', false, 'code', 'pb:superseded', 'changed', true, 'id', e.id, 'current', pb_daily.event_json(c)); end if;
    v_from := e.id; e := c;
  end if;
  if e.status = p_status then return jsonb_build_object('ok', true, 'again', true, 'id', e.id, 'moved_from', v_from, 'status', e.status, 'rev', e.review_rev, 'reviewed_at', e.reviewed_at,
    'reviewed_by', case when e.reviewed_by is null then null else coalesce(pb_daily.person(e.reviewed_by), 'a manager') end); end if;
  if (p_expect_status is not null and p_expect_status <> e.status) or (p_expect_rev is not null and p_expect_rev <> e.review_rev) then
    return jsonb_build_object('ok', false, 'code', 'pb:changed', 'id', e.id, 'moved_from', v_from, 'status', e.status, 'rev', e.review_rev, 'reviewed_at', e.reviewed_at,
      'reviewed_by', case when e.reviewed_by is null then null else coalesce(pb_daily.person(e.reviewed_by), 'a manager') end, 'history', pb_daily.event_history(e));
  end if;
  v_old := e.status;
  update pb_daily.events set status = p_status, reviewed_at = case when p_status = 'new' then null else now() end, reviewed_by = case when p_status = 'new' then null else v_uid end,
      review_rev = review_rev + 1, changed_after_review = case when p_status = 'new' then changed_after_review else false end
    where id = e.id returning * into e;
  insert into pb_daily.event_reviews (company_id, event_id, job_key, work_date, foreman_uid, client_event_id, from_status, to_status, by_uid)
    values (e.company_id, e.id, e.job_key, e.work_date, e.created_by, e.client_event_id, v_old, p_status, v_uid);
  return jsonb_build_object('ok', true, 'id', e.id, 'moved_from', v_from, 'status', e.status, 'rev', e.review_rev, 'reviewed_at', e.reviewed_at,
    'reviewed_by', case when e.reviewed_by is null then null else coalesce(pb_daily.person(e.reviewed_by), 'a manager') end, 'history', pb_daily.event_history(e));
end $function$;

CREATE FUNCTION public.pb_daily_event_photo_put(p_client_report_id text, p_client_event_id text, p_n integer, p_b64 text, p_sha256 text, p_taken_exif text, p_expect_uid uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare v_uid uuid := pb_daily.me(p_expect_uid); e pb_daily.events%rowtype; v_sha text; v_recv timestamptz; v_want text;
begin
  select e0.* into e from pb_daily.events e0 join pb_daily.reports r on r.id = e0.report_id
    where r.foreman_uid = v_uid and r.client_report_id = p_client_report_id and e0.client_event_id = p_client_event_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:not_found'); end if;
  if not coalesce(pb_daily.is_foreman(e.company_id), false) then return jsonb_build_object('ok', false, 'code', 'pb:not_foreman'); end if;
  if e.superseded_at is not null then return jsonb_build_object('ok', false, 'code', 'pb:superseded'); end if;
  v_want := case when p_n between 1 and 6 then e.photos_signed->>(p_n - 1) end;
  if v_want is null then return jsonb_build_object('ok', false, 'code', 'pb:photo_not_signed'); end if;
  select p.sha256, p.received_at into v_sha, v_recv from pb_daily.event_photos p where p.event_id = e.id and p.n = p_n;
  if found then return jsonb_build_object('ok', true, 'again', true, 'sha256', v_sha, 'matches', p_sha256 is null or v_sha = p_sha256, 'received_at', v_recv); end if;
  if p_b64 is null or length(p_b64) < 100 or length(p_b64) > 1400000 or p_b64 !~ '^[A-Za-z0-9+/=]+$' then return jsonb_build_object('ok', false, 'code', 'pb:bad_photo'); end if;
  begin v_sha := encode(sha256(decode(p_b64, 'base64')), 'hex'); exception when others then return jsonb_build_object('ok', false, 'code', 'pb:bad_photo'); end;
  if v_sha <> v_want then return jsonb_build_object('ok', false, 'code', 'pb:photo_not_signed'); end if;
  insert into pb_daily.event_photos (event_id, n, company_id, data_b64, sha256, client_sha256, taken_exif, by_uid)
    values (e.id, p_n, e.company_id, p_b64, v_sha, case when p_sha256 ~ '^[0-9a-f]{64}$' then p_sha256 else null end, left(p_taken_exif, 40), v_uid)
    on conflict (event_id, n) do nothing;
  return jsonb_build_object('ok', true, 'sha256', v_sha, 'matches', p_sha256 is null or p_sha256 = v_sha, 'received_at', now());
exception when others then return pb_daily.refusal(sqlerrm, sqlstate);
end $function$;

CREATE FUNCTION public.pb_daily_report_photo_put(p_client_report_id text, p_n integer, p_b64 text, p_sha256 text, p_taken_exif text, p_expect_uid uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare v_uid uuid := pb_daily.me(p_expect_uid); rep pb_daily.reports%rowtype; v_want text; v_sha text; v_recv timestamptz; v_old record;
begin
  select r.* into rep from pb_daily.reports r where r.foreman_uid = v_uid and r.client_report_id = p_client_report_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:not_found'); end if;
  if not coalesce(pb_daily.is_foreman(rep.company_id), false) then return jsonb_build_object('ok', false, 'code', 'pb:not_foreman'); end if;
  if exists (select 1 from pb_daily.reports r2 where r2.supersedes = rep.id) then return jsonb_build_object('ok', false, 'code', 'pb:superseded'); end if;
  v_want := case when p_n between 1 and 12 and jsonb_typeof(rep.snapshot->'photos') = 'array' and jsonb_typeof(rep.snapshot->'photos'->(p_n - 1)) = 'object'
                 then rep.snapshot->'photos'->(p_n - 1)->>'sha' end;
  if v_want is null or v_want !~ '^[0-9a-f]{64}$' then return jsonb_build_object('ok', false, 'code', 'pb:photo_not_signed'); end if;
  select p.sha256, p.received_at into v_sha, v_recv from pb_daily.report_photos p where p.report_id = rep.id and p.n = p_n;
  if found then return jsonb_build_object('ok', true, 'again', true, 'sha256', v_sha, 'matches', p_sha256 is null or v_sha = p_sha256, 'received_at', v_recv); end if;
  if p_b64 is null then
    with recursive ch(id, sup, depth) as (select rep.id, rep.supersedes, 0 union all select r.id, r.supersedes, ch.depth + 1 from pb_daily.reports r join ch on r.id = ch.sup where ch.depth < 50)
    select p.data_b64, p.taken_exif into v_old from pb_daily.report_photos p where p.report_id in (select ch.id from ch where ch.id <> rep.id) and p.sha256 = v_want limit 1;
    if v_old is null then return jsonb_build_object('ok', false, 'code', 'pb:need_photo'); end if;
    insert into pb_daily.report_photos (report_id, n, company_id, data_b64, sha256, client_sha256, taken_exif, by_uid) values (rep.id, p_n, rep.company_id, v_old.data_b64, v_want, null, v_old.taken_exif, v_uid) on conflict (report_id, n) do nothing;
    return jsonb_build_object('ok', true, 'copied', true, 'sha256', v_want, 'matches', true, 'received_at', now());
  end if;
  if length(p_b64) < 100 or length(p_b64) > 1400000 or p_b64 !~ '^[A-Za-z0-9+/=]+$' then return jsonb_build_object('ok', false, 'code', 'pb:bad_photo'); end if;
  begin v_sha := encode(sha256(decode(p_b64, 'base64')), 'hex'); exception when others then return jsonb_build_object('ok', false, 'code', 'pb:bad_photo'); end;
  if v_sha <> v_want then return jsonb_build_object('ok', false, 'code', 'pb:photo_not_signed'); end if;
  insert into pb_daily.report_photos (report_id, n, company_id, data_b64, sha256, client_sha256, taken_exif, by_uid)
    values (rep.id, p_n, rep.company_id, p_b64, v_sha, case when p_sha256 ~ '^[0-9a-f]{64}$' then p_sha256 end, left(p_taken_exif, 40), v_uid)
    on conflict (report_id, n) do nothing;
  return jsonb_build_object('ok', true, 'sha256', v_sha, 'matches', p_sha256 is null or p_sha256 = v_sha, 'received_at', now());
exception when others then return pb_daily.refusal(sqlerrm, sqlstate);
end $function$;

CREATE FUNCTION public.pb_talk_give(p_id uuid, p_job_number text, p_talk_id text, p_title text, p_given_on date, p_given_at timestamp with time zone, p_attendees jsonb, p_voided boolean, p_expect_uid uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare v_uid uuid := auth.uid(); v_co uuid; v_key text := pb_prod.job_key(p_job_number); v_job text := left(btrim(coalesce(p_job_number, '')), 60);
  v_title text; v_att jsonb := '[]'::jsonb; e jsonb; v_name text; v_seen text[] := '{}'; v_n integer; cur pb_prod.talks_given; nw pb_prod.talks_given;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  v_co := pb_prod.talk_company(v_uid);
  if v_co is null then raise exception 'pb:foremen_only'; end if;
  if p_id is null then raise exception 'pb:bad_request'; end if;
  if v_key = '' then raise exception 'pb:bad_job'; end if;
  if p_talk_id is null or p_talk_id !~ '^TT-[0-9]{3}$' then raise exception 'pb:bad_talk'; end if;
  v_title := left(btrim(regexp_replace(coalesce(p_title, ''), '\s+', ' ', 'g')), 120);
  if v_title = '' then raise exception 'pb:bad_talk'; end if;
  if p_given_on is null or p_given_on > current_date + 1 or p_given_on < current_date - 3650 then raise exception 'pb:bad_date'; end if;
  if p_given_at is not null and p_given_at > now() + interval '1 day' then raise exception 'pb:bad_date'; end if;
  if p_attendees is not null and jsonb_typeof(p_attendees) = 'array' then
    for e in select x from jsonb_array_elements(p_attendees) x limit 200 loop
      if jsonb_typeof(e) <> 'object' then continue; end if;
      v_name := left(btrim(regexp_replace(coalesce(e->>'name', ''), '\s+', ' ', 'g')), 80);
      if v_name = '' or lower(v_name) = any (v_seen) then continue; end if;
      v_seen := v_seen || lower(v_name);
      v_att := v_att || jsonb_build_array(jsonb_build_object('name', v_name, 'user_id',
        case when coalesce(e->>'user_id', '') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then e->>'user_id' end));
      exit when jsonb_array_length(v_att) >= 60;
    end loop;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('pb_talk|' || v_uid::text, 0));
  select * into cur from pb_prod.talks_given t where t.id = p_id for update;
  if found then
    if cur.user_id <> v_uid or cur.company_id <> v_co then raise exception 'pb:not_found'; end if;
    if p_given_on <> cur.given_on and p_given_on < current_date - 400 then raise exception 'pb:bad_date'; end if;
    if (cur.job_number, cur.talk_id, cur.title, cur.given_on, cur.given_at, cur.attendees, cur.voided)
       is not distinct from (v_job, p_talk_id, v_title, p_given_on, p_given_at, v_att, coalesce(p_voided, false)) then
      return jsonb_build_object('ok', true, 'same', true, 'talk', pb_prod.talk_json(cur), 'server_at', now());
    end if;
    update pb_prod.talks_given set job_key = v_key, job_number = v_job, talk_id = p_talk_id, title = v_title, given_on = p_given_on,
        given_at = p_given_at, attendees = v_att, voided = coalesce(p_voided, false), updated_at = now(), version = cur.version + 1
      where id = cur.id returning * into nw;
  else
    if p_given_on < current_date - 400 then raise exception 'pb:bad_date'; end if;
    select count(*) into v_n from pb_prod.talks_given t where t.user_id = v_uid and t.created_at > now() - interval '1 day';
    if v_n >= 50 then raise exception 'pb:quota'; end if;
    insert into pb_prod.talks_given (id, company_id, user_id, job_key, job_number, talk_id, title, given_on, given_at, attendees, voided)
      values (p_id, v_co, v_uid, v_key, v_job, p_talk_id, v_title, p_given_on, p_given_at, v_att, coalesce(p_voided, false))
      returning * into nw;
  end if;
  return jsonb_build_object('ok', true, 'talk', pb_prod.talk_json(nw), 'server_at', now());
end $function$;

CREATE FUNCTION public.pb_permit_open_put(p_client_permit_id text, p_snapshot jsonb, p_expect_uid uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare v_uid uuid := auth.uid(); v_sha text; v_size integer; v_company uuid; v_old text; v_n integer;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  if p_client_permit_id is null or length(p_client_permit_id) not between 1 and 100 then raise exception 'pb:bad_id'; end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then raise exception 'pb:bad_record'; end if;
  v_size := pg_column_size(p_snapshot);
  if v_size > 2000000 then raise exception 'pb:too_big'; end if;
  if exists (select 1 from pb_safety.permits p where p.user_id = v_uid and p.client_permit_id = p_client_permit_id) then
    return jsonb_build_object('ok', true, 'closed', true);
  end if;
  v_sha := encode(sha256(convert_to(p_snapshot::text, 'UTF8')), 'hex');
  select o.record_sha256 into v_old from pb_safety.open_permits o where o.user_id = v_uid and o.client_permit_id = p_client_permit_id;
  if v_old = v_sha then return jsonb_build_object('ok', true, 'same', true); end if;
  select count(*) into v_n from pb_safety.open_permits where user_id = v_uid and client_permit_id <> p_client_permit_id and saved_at > now() - interval '30 days';
  if v_n >= 25 then raise exception 'pb:quota'; end if;
  select m.company_id into v_company from public.company_members m where m.user_id = v_uid order by m.created_at desc nulls last limit 1;
  insert into pb_safety.open_permits (user_id, client_permit_id, company_id, space, jobsite, job_number, snapshot, record_sha256, bytes)
    values (v_uid, p_client_permit_id, v_company, left(p_snapshot->>'space', 300), left(p_snapshot->>'jobsite', 300), left(p_snapshot->>'jobNumber', 100), p_snapshot, v_sha, v_size)
  on conflict (user_id, client_permit_id) do update
    set snapshot = excluded.snapshot, record_sha256 = excluded.record_sha256, bytes = excluded.bytes, company_id = excluded.company_id,
        space = excluded.space, jobsite = excluded.jobsite, job_number = excluded.job_number, saves = pb_safety.open_permits.saves + 1, saved_at = now();
  return jsonb_build_object('ok', true, 'same', false);
end $function$;

CREATE FUNCTION public.pb_permit_backup(p_client_permit_id text, p_record jsonb, p_expect_uid uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare
  v_uid uuid := auth.uid(); v_company uuid; v_permit pb_safety.permits%rowtype; v_sha text; v_last text; v_closed timestamptz; v_size integer; v_new_today integer; v_bytes bigint;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  if p_client_permit_id is null or length(p_client_permit_id) not between 1 and 100 then raise exception 'pb:bad_id'; end if;
  if p_record is null or jsonb_typeof(p_record) <> 'object' or coalesce(p_record->>'kind', '') <> 'confined' then raise exception 'pb:bad_record'; end if;
  v_size := pg_column_size(p_record);
  if v_size > 2000000 then raise exception 'pb:too_big'; end if;
  v_sha := encode(sha256(convert_to(p_record::text, 'UTF8')), 'hex');
  begin v_closed := (p_record->>'lockTime')::timestamptz; exception when others then v_closed := null; end;
  select * into v_permit from pb_safety.permits where user_id = v_uid and client_permit_id = p_client_permit_id;
  if not found then
    select count(*) into v_new_today from pb_safety.permits where user_id = v_uid and first_backed_up_at > now() - interval '1 day';
    if v_new_today >= 300 then raise exception 'pb:quota'; end if;
    select m.company_id into v_company from public.company_members m
      where m.user_id = v_uid and (m.created_at is null or m.created_at <= coalesce(v_closed, now()))
      order by m.created_at desc nulls last limit 1;
    insert into pb_safety.permits (user_id, company_id, client_permit_id, space, jobsite, job_number, closed_at)
      values (v_uid, v_company, p_client_permit_id, left(p_record->>'space', 300), left(p_record->>'jobsite', 300), left(p_record->>'jobNumber', 100), v_closed)
      on conflict (user_id, client_permit_id) do nothing;
  end if;
  select * into v_permit from pb_safety.permits where user_id = v_uid and client_permit_id = p_client_permit_id for update;
  select pv.record_sha256 into v_last from pb_safety.permit_versions pv where pv.permit_id = v_permit.id order by pv.version desc limit 1;
  if v_last = v_sha then
    return jsonb_build_object('ok', true, 'same', true, 'version', v_permit.version_count);
  end if;
  if v_permit.company_id is not null
     and not exists (select 1 from public.company_members m where m.user_id = v_uid and m.company_id = v_permit.company_id)
     and not exists (select 1 from public.companies c where c.id = v_permit.company_id and c.owner_user_id = v_uid) then
    raise exception 'pb:not_company_member';
  end if;
  if v_permit.closed_at is not null and v_last is not null and pb_safety.closed_frozen() then
    raise exception 'pb:permit_closed';
  end if;
  if v_permit.version_count >= 500 then raise exception 'pb:too_many_versions'; end if;
  select coalesce(sum(p.bytes_total), 0) into v_bytes from pb_safety.permits p where p.user_id = v_uid;
  if v_bytes + v_size > 200000000 then raise exception 'pb:quota'; end if;
  insert into pb_safety.permit_versions (permit_id, version, record, record_sha256)
    values (v_permit.id, v_permit.version_count + 1, p_record, v_sha);
  update pb_safety.permits set version_count = v_permit.version_count + 1, last_backed_up_at = now(), bytes_total = bytes_total + v_size,
    space = left(p_record->>'space', 300), jobsite = left(p_record->>'jobsite', 300), job_number = left(p_record->>'jobNumber', 100),
    closed_at = coalesce(closed_at, v_closed)
    where id = v_permit.id;
  return jsonb_build_object('ok', true, 'same', false, 'version', v_permit.version_count + 1);
end $function$;
CREATE FUNCTION public.pb_permit_backup(p_client_permit_id text, p_record jsonb, p_expect_uid uuid, p_em_secret text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare v_uid uuid := auth.uid(); v_link jsonb;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  if p_client_permit_id is null or length(p_client_permit_id) not between 1 and 100 then raise exception 'pb:bad_id'; end if;
  if p_record is null or jsonb_typeof(p_record) <> 'object' then raise exception 'pb:bad_record'; end if;
  if coalesce(p_record->>'emSecretApart', '') = 'true' and jsonb_typeof(p_record->'permit') = 'object' and (p_record->'permit'->'emLink') ? 's' then
    raise exception 'pb:bad_record';
  end if;
  if p_em_secret is not null and p_em_secret ~ '^[0-9abcdefghjkmnpqrstvwxyz]{26}$'
     and jsonb_typeof(p_record->'permit') = 'object' and jsonb_typeof(p_record->'permit'->'emLink') = 'object' then
    v_link := (p_record->'permit'->'emLink') || jsonb_build_object('s', p_em_secret);
    perform pb_safety.em_register(v_uid, p_client_permit_id, v_link);
  end if;
  return public.pb_permit_backup(p_client_permit_id, p_record, p_expect_uid);
end $function$;

CREATE FUNCTION public.pb_ticket_save(p_client_ticket_id text, p_record jsonb, p_photo_b64 text, p_expect_uid uuid, p_expect_company uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_t pb_tickets.tickets%rowtype; v_id uuid; v_type text := p_record->>'type';
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  if p_record is null or jsonb_typeof(p_record) <> 'object' or v_type is null or v_type not in ('concrete', 'material', 'sub') then raise exception 'pb:bad_record'; end if;
  if p_photo_b64 is not null and (length(p_photo_b64) > 600000 or p_photo_b64 !~ '^[A-Za-z0-9+/=]+$') then raise exception 'pb:bad_photo'; end if;
  v_company := pb_tickets.my_company(v_uid);
  if v_company is null then raise exception 'pb:not_company_member'; end if;
  select * into v_t from pb_tickets.tickets t where t.user_id = v_uid and t.client_ticket_id = p_client_ticket_id for update;
  if not found then
    insert into pb_tickets.tickets (user_id, company_id, client_ticket_id, type, job_number, record)
      values (v_uid, v_company, p_client_ticket_id, v_type, p_record->>'jobNumber', p_record) on conflict (user_id, client_ticket_id) do nothing returning id into v_id;
    insert into pb_tickets.ticket_versions (ticket_id, version, record) values (v_id, 1, p_record) on conflict do nothing;
  else
    v_id := v_t.id;
  end if;
  if p_photo_b64 is not null then
    insert into pb_tickets.photos (ticket_id, data_b64) values (v_id, p_photo_b64) on conflict (ticket_id) do nothing;
    update pb_tickets.tickets set has_photo = true where id = v_id;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'version', (select version from pb_tickets.tickets where id = v_id));
end $function$;
CREATE FUNCTION public.pb_ticket_save(p_client_ticket_id text, p_record jsonb, p_photo_b64 text, p_expect_uid uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
begin return public.pb_ticket_save(p_client_ticket_id, p_record, p_photo_b64, p_expect_uid, pb_tickets.my_company(auth.uid())); end $function$;

CREATE FUNCTION public.pb_prod_run_record_put(p_entry_id text, p_record jsonb, p_expect_uid uuid, p_access_company uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_md5 text; v_for uuid; v_for_at timestamptz; v_old pb_prod.run_records%rowtype; v_n integer; v_id uuid;
  v_lock timestamptz; v_end timestamptz; v_send boolean := false; v_job text; v_label text; v_photos integer := 0; v_ended boolean; v_early boolean; v_dist numeric; v_laid numeric; v_date date;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  v_company := pb_prod.my_company(v_uid);
  if v_company is null then raise exception 'pb:not_company_member'; end if;
  if p_access_company is null or p_access_company is distinct from v_company then raise exception 'pb:company_changed'; end if;
  if p_entry_id is null or p_entry_id !~ '^[A-Za-z0-9_.:-]{1,60}$' then raise exception 'pb:bad_record'; end if;
  if p_record is null or jsonb_typeof(p_record) <> 'object' or coalesce(p_record->>'kind', '') <> 'run' then raise exception 'pb:bad_record'; end if;
  if pg_column_size(p_record) > 2500000 then raise exception 'pb:too_big'; end if;
  if position('data:image/' in p_record::text) > 0 then raise exception 'pb:photo_data'; end if;
  if coalesce(p_record->>'id', '') <> p_entry_id then raise exception 'pb:bad_record'; end if;
  v_md5 := md5(p_record::text);
  v_for := pb_prod.pick_of(p_record -> 'pbOffice' ->> 'foremanId', v_company, v_uid);
  if v_for is null then select s.for_foreman, s.for_foreman_at into v_for, v_for_at from pb_prod.run_status s where s.user_id = v_uid and s.company_id = v_company and s.session_ref = p_entry_id; end if;
  select * into v_old from pb_prod.run_records r where r.user_id = v_uid and r.entry_id = p_entry_id;
  if found and v_old.record_md5 = v_md5 and v_old.company_id = v_company then return jsonb_build_object('ok', true, 'same', true, 'version', v_old.version, 'sent_at', v_old.sent_at, 'sent_how', v_old.sent_how,
    'foreman_id', pb_prod.run_foreman(v_company, v_uid, p_entry_id), 'foreman_name', pb_prod.member_name_or_null(v_company, pb_prod.run_foreman(v_company, v_uid, p_entry_id))); end if;
  if found and v_old.company_id <> v_company then raise exception 'pb:company_changed'; end if;
  select count(*) into v_n from pb_prod.run_record_versions x join pb_prod.run_records r on r.id = x.run_record_id where r.user_id = v_uid and x.saved_at > now() - interval '1 day';
  if v_n >= 600 then raise exception 'pb:quota'; end if;
  begin v_lock := (p_record->>'lockTime')::timestamptz; exception when others then v_lock := null; end;
  v_job := left(btrim(coalesce(p_record->>'jobNumber', '')), 60);
  v_label := left(coalesce(p_record->>'startLabel', '') || ' to ' || coalesce(p_record->>'endLabel', ''), 300);
  v_ended := coalesce(nullif(p_record->>'completed', '')::boolean, false) or coalesce(nullif(p_record->>'incomplete', '')::boolean, false);
  v_early := coalesce(nullif(p_record->>'incomplete', '')::boolean, false);
  insert into pb_prod.run_records as r (company_id, user_id, entry_id, run_ref, job_number, job_key, jobsite, label, locked_at, work_date, ended, ended_early, distance_ft, laid_ft, photo_count, record, record_md5, version, ended_at, sent_at, sent_how, for_foreman, for_foreman_at)
  values (v_company, v_uid, p_entry_id, left(p_record->>'clientRunId', 100), nullif(v_job, ''), nullif(left(lower(v_job), 60), ''), left(p_record->>'jobsite', 200), v_label, v_lock,
    coalesce(v_date, (v_lock at time zone 'America/Los_Angeles')::date), v_ended, v_early, v_dist, v_laid, v_photos, p_record, v_md5, 1,
    case when v_ended then coalesce(v_end, now()) end, case when v_send and v_ended then now() end, case when v_send and v_ended then 'pipelayer' end, v_for, case when v_for is not null then coalesce(v_for_at, now()) end)
  on conflict (user_id, entry_id) do update set run_ref = excluded.run_ref, label = excluded.label, locked_at = excluded.locked_at, record = excluded.record, record_md5 = excluded.record_md5,
    version = r.version + 1, updated_at = now()
  returning r.id, r.version into v_id, v_n;
  insert into pb_prod.run_record_versions (run_record_id, version, record, record_md5) values (v_id, v_n, p_record, v_md5);
  return jsonb_build_object('ok', true, 'same', false, 'version', v_n, 'foreman_id', pb_prod.run_foreman(v_company, v_uid, p_entry_id), 'sent_at', (select x.sent_at from pb_prod.run_records x where x.id = v_id));
end $function$;

-- triggers as on live (the ones that matter here)
create trigger daily_reports_events after insert on pb_daily.reports for each row execute function pb_daily.events_on_report();
create trigger daily_reports_extras before insert on pb_daily.reports for each row execute function pb_daily.reports_extras();
create trigger daily_reports_permanent before update on pb_daily.reports for each row execute function pb_daily.permanent();
create trigger daily_reports_stamp before insert on pb_daily.reports for each row execute function pb_daily.reports_stamp();
create trigger pb_beta_closed before insert on pb_daily.reports for each row execute function pb_billing.beta_closed_guard();
create trigger zz_pb_audit after insert or delete or update on pb_daily.reports for each row execute function pb_audit.direct_write();
create trigger pb_permit_drop_open after insert on pb_safety.permits for each row execute function pb_safety.drop_open_on_close();
create trigger permits_no_remove before delete on pb_safety.permits for each row execute function pb_safety.permit_delete_guard();
create trigger zz_pb_audit after insert or delete or update on pb_safety.permits for each row execute function pb_audit.direct_write();
create trigger pb_beta_closed before insert on pb_prod.run_records for each row execute function pb_billing.beta_closed_guard();
create trigger zz_pb_audit after insert or delete or update on pb_prod.run_records for each row execute function pb_audit.direct_write();
create trigger run_record_versions_permanent before update on pb_prod.run_record_versions for each row execute function pb_prod.rr_permanent();
create trigger run_record_events_permanent before update on pb_prod.run_record_events for each row execute function pb_prod.rr_permanent();
create trigger run_setup_versions_permanent before update on pb_prod.run_setup_versions for each row execute function pb_prod.rr_permanent();
create trigger pb_beta_closed before insert on pb_tickets.tickets for each row execute function pb_billing.beta_closed_guard();

-- the app's access (what the live app relies on): RPCs executable by authenticated; daily reports via RLS (invoker submit)
do $g$ declare r record; begin
  for r in select p.oid::regprocedure as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname in ('public', 'pb_daily', 'pb_prod', 'pb_safety', 'pb_tickets', 'pb_reports', 'pb_billing', 'pb_crew', 'pb_push', 'pb_audit') and p.prokind = 'f' loop
    execute format('grant execute on function %s to authenticated', r.f);
  end loop;
end $g$;
grant select, insert on pb_daily.reports to authenticated;
grant select on pb_daily.events, pb_daily.event_photos to authenticated;
alter table pb_daily.reports enable row level security;
create policy daily_reports_add on pb_daily.reports for insert with check ((foreman_uid = auth.uid()) and (pb_daily.is_foreman(company_id) or (pb_daily.is_manager(company_id) and (for_foreman is not null) and pb_prod.is_foreman_of(for_foreman, company_id))));
create policy daily_reports_read on pb_daily.reports for select using (pb_daily.is_manager(company_id) or ((foreman_uid = auth.uid()) and pb_daily.is_foreman(company_id)));
