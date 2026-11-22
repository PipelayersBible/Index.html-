-- LOCAL ONLY (scratch Postgres 16): the pieces of the live schema the staged B migrations touch, read Nov 21 (columns,
-- keys, existing triggers' functions). Stubs for auth.uid() and helper functions. Never run this on the live server.
create role anon; create role authenticated;
create schema auth; create schema pb_safety; create schema pb_prod; create schema pb_daily; create schema pb_tickets; create schema pb_audit;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create table public.companies (id uuid primary key);
create table public.company_members (id uuid primary key default gen_random_uuid(), company_id uuid, user_id uuid, role text, title text, created_at timestamptz default now(), joined_at timestamptz);
create table pb_audit.admin_log (id bigserial primary key, tbl text, op text, at timestamptz default now());
create function pb_audit.direct_write() returns trigger language plpgsql as $$ begin insert into pb_audit.admin_log (tbl, op) values (tg_table_schema || '.' || tg_table_name, tg_op); return null; end $$;
create function pb_prod.note_error(a text, b text, c text) returns void language sql as $$ select null::void $$;
create function pb_daily.permanent() returns trigger language plpgsql as $$ begin raise exception 'pb:daily_history_is_permanent'; end $$;
create function pb_prod.versions_locked() returns trigger language plpgsql as $$ begin raise exception 'pb:permanent'; end $$;
create function pb_prod.managed_company(u uuid) returns uuid language sql stable as $$ select nullif(current_setting('test.managed', true), '')::uuid $$;
create function pb_prod.member_name_or_null(c uuid, u uuid) returns text language sql stable as $$ select 'Name ' || left(u::text, 4) $$;
create table pb_safety.permits (id uuid primary key default gen_random_uuid(), user_id uuid not null, company_id uuid, client_permit_id text not null, space text, jobsite text, job_number text, closed_at timestamptz,
  first_backed_up_at timestamptz not null default now(), last_backed_up_at timestamptz not null default now(), version_count integer not null default 0, bytes_total bigint not null default 0, unique (user_id, client_permit_id));
create table pb_safety.open_permits (user_id uuid not null, client_permit_id text not null, company_id uuid, space text, jobsite text, job_number text, snapshot jsonb not null, record_sha256 text not null, bytes integer not null,
  saves integer not null default 1, first_saved_at timestamptz not null default now(), saved_at timestamptz not null default now(), primary key (user_id, client_permit_id));
create function pb_safety.drop_open_on_close() returns trigger language plpgsql security definer set search_path to '' as $f$
begin begin delete from pb_safety.open_permits where user_id = new.user_id and client_permit_id = new.client_permit_id; exception when others then raise log 'skipped'; end; return null; end $f$;
create trigger pb_permit_drop_open after insert on pb_safety.permits for each row execute function pb_safety.drop_open_on_close();
create table pb_daily.reports (id uuid primary key default gen_random_uuid(), company_id uuid);
create table pb_daily.events (id uuid primary key default gen_random_uuid(), company_id uuid not null, job_key text not null, job_number text not null, report_id uuid not null references pb_daily.reports(id), client_event_id text not null,
  work_date date not null, kind text not null, reason text not null, detail text, hours numeric(7,2) not null, crew_size integer, equipment jsonb not null default '[]', photo_count integer not null default 0, photos_signed jsonb not null default '[]',
  fp text not null default '', same_as_prev boolean not null default false, changed_after_review boolean not null default false, review_rev integer not null default 0, created_by uuid not null, foreman_name text, status text not null default 'new',
  reviewed_at timestamptz, reviewed_by uuid, superseded_at timestamptz, created_at timestamptz not null default now(), unique (report_id, client_event_id));
create table pb_daily.event_photos (event_id uuid not null references pb_daily.events(id), n integer not null, company_id uuid not null, data_b64 text not null, sha256 text, client_sha256 text, taken_exif text, by_uid uuid, received_at timestamptz not null default now());
create table pb_daily.report_photos (report_id uuid not null, n integer not null, company_id uuid not null, data_b64 text not null, sha256 text not null, client_sha256 text, taken_exif text, by_uid uuid, received_at timestamptz not null default now(),
  constraint report_photos_report_id_fkey foreign key (report_id) references pb_daily.reports(id) on delete cascade);
create table pb_daily.event_reviews (id bigserial primary key, company_id uuid not null, event_id uuid not null references pb_daily.events(id), job_key text not null, work_date date not null, foreman_uid uuid not null, client_event_id text not null,
  from_status text not null, to_status text not null, by_uid uuid, note text, at timestamptz not null default now());
create table pb_prod.talks_given (id uuid primary key, company_id uuid not null references public.companies(id), user_id uuid not null, job_key text not null, job_number text not null, talk_id text not null, title text not null, given_on date not null,
  given_at timestamptz, attendees jsonb not null default '[]', voided boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1);
create table pb_tickets.tickets (id uuid primary key default gen_random_uuid());
create table pb_tickets.photos (ticket_id uuid not null references pb_tickets.tickets(id), data_b64 text not null, created_at timestamptz not null default now());
create table pb_prod.run_records (id uuid primary key default gen_random_uuid(), company_id uuid not null, user_id uuid not null, entry_id text not null, version integer not null default 1);
create table pb_prod.run_record_versions (id bigserial primary key, run_record_id uuid not null, version integer not null, record jsonb not null, record_md5 text not null, saved_at timestamptz not null default now());
create table pb_prod.run_record_events (id bigserial primary key, run_record_id uuid not null, company_id uuid not null, action text not null, by_user uuid, note text, at timestamptz not null default now());
create table pb_prod.run_setup_versions (id bigserial primary key, run_record_id uuid not null, company_id uuid not null, version integer not null, side text not null, change jsonb not null, intended jsonb, field jsonb, by_user uuid, at timestamptz not null default now());
-- a stand-in for the RPC patched by _patchfn (same lines as the live one around the piece)
create function public.pb_prod_run_remove(p_id uuid, p_reason text, p_expect_uid uuid) returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid := auth.uid(); v_r pb_prod.run_records%rowtype; v_reason text := nullif(left(btrim(coalesce(p_reason, '')), 300), '');
begin
  select * into v_r from pb_prod.run_records r where r.id = p_id;
  if not found then raise exception 'pb:not_found'; end if;
  if false then return jsonb_build_object('ok', true, 'again', true); end if;
  return jsonb_build_object('ok', true, 'reason', v_reason);
end $function$;
