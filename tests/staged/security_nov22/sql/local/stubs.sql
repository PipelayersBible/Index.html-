-- Local stand-ins for a throwaway Postgres 16 (shapes read from live Nov 21 2026). Never the live project.
-- Loaded after ../../one_device_nov20/sql/local/stubs.sql (auth schema, roles, companies, pb_safety ...), before
-- ../../one_device_nov20/sql/01_one_device.sql (pb_auth as live) and our migrations.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter table public.companies alter column status set default 'active';
alter table public.company_members add column if not exists created_at timestamptz default now();
alter table public.company_members add column if not exists joined_at timestamptz default now();
-- (live keeps UNIQUE (user_id) on company_members: one company per person; the tests respect it)

-- pb_prod membership helpers, exactly as live
create or replace function pb_prod.my_member(p_uid uuid) returns table(company_id uuid, role text, joined_at timestamptz)
language sql stable security definer set search_path to '' as $$
  select m.company_id, m.role, coalesce(m.joined_at, m.created_at) from public.company_members m join public.companies c on c.id = m.company_id
  where m.user_id = p_uid and c.status = 'active' order by m.created_at desc nulls last limit 1 $$;
create or replace function pb_prod.my_company(p_uid uuid) returns uuid language sql stable security definer set search_path to '' as $$
  select x.company_id from pb_prod.my_member(p_uid) x $$;
create or replace function pb_prod.managed_company(p_uid uuid) returns uuid language sql stable security definer set search_path to '' as $$
  select c.id from public.companies c
  where p_uid is not null and c.status = 'active'
    and (c.owner_user_id = p_uid
      or (exists (select 1 from pb_reports.managers mg where mg.company_id = c.id and mg.user_id = p_uid)
          and c.id = (select x.company_id from pb_prod.my_member(p_uid) x)))
  order by (c.id = (select x.company_id from pb_prod.my_member(p_uid) x)) desc nulls last, c.created_at desc
  limit 1 $$;

-- permits (live columns)
drop table if exists pb_safety.permits;
create table pb_safety.permits (id uuid primary key default gen_random_uuid(), user_id uuid not null, company_id uuid, client_permit_id text not null,
  space text, jobsite text, job_number text, closed_at timestamptz, first_backed_up_at timestamptz not null default now(),
  last_backed_up_at timestamptz not null default now(), version_count int4 not null default 0, bytes_total int8 not null default 0, unique (user_id, client_permit_id));
create table pb_safety.permit_versions (id bigserial primary key, permit_id uuid not null, version int4 not null, record jsonb not null, record_sha256 text not null, received_at timestamptz not null default now());
create function public.pb_permit_backup(p_client_permit_id text, p_record jsonb, p_expect_uid uuid) returns jsonb language plpgsql security definer set search_path to '' as $$ begin return null; end $$;

-- run records and seals
create table pb_prod.run_records (id uuid primary key default gen_random_uuid(), company_id uuid not null, user_id uuid not null, entry_id text not null,
  record jsonb not null default '{}', record_md5 text not null default '', unique (user_id, entry_id));
create table pb_prod.run_seals (id uuid primary key default gen_random_uuid(), user_id uuid not null, company_id uuid, entry_id text not null, version int4 not null,
  path text not null, sha256 text not null, bytes int4 not null, seal_key text, app_build text, made_at timestamptz, sealed_at timestamptz not null default now());
create schema if not exists storage;
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner_id text, metadata jsonb);
create function public.pb_run_seal_add(p_entry_id text, p_path text, p_sha256 text, p_bytes integer, p_key text, p_made_at timestamp with time zone, p_build text)
  returns jsonb language plpgsql security definer set search_path to '' as $$ begin return null; end $$;

-- documents
create schema pb_docs;
create table pb_docs.documents (id uuid primary key default gen_random_uuid(), scope text not null default 'private', owner_company uuid, owner_user uuid,
  state text not null default 'uploading', title text not null default 't', public_title text, job_keys text[] not null default '{}', pages int4, bytes int8,
  mime text not null default 'application/pdf', sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'), shareable boolean not null default false, removed_at timestamptz,
  constraint docs_owner check (((scope = 'shared') and (owner_company is null) and (owner_user is null) and (public_title is not null)) or ((scope = 'private') and ((owner_company is not null) <> (owner_user is not null)))));
create table pb_docs.provenance (doc_id uuid primary key, company_id uuid, user_id uuid not null, sha256 text not null default 'x', user_choice text);
create table pb_docs.pages (doc_id uuid, n int, text text, source text, primary key (doc_id, n));
create function pb_docs.purge(p_doc uuid) returns void language sql as $$ update pb_docs.documents set state = 'removed', removed_at = now() where id = p_doc $$;
create function pb_docs.owner_key(p_company uuid, p_user uuid) returns text language sql immutable as $$ select coalesce(p_company::text, 'u:' || p_user::text) $$;
create function pb_docs.lock(p_key text) returns void language sql as $$ select $$;
create function pb_docs.lock_sha(p_sha text) returns void language sql as $$ select $$;
create function pb_docs.apply_scope(p_doc uuid, p_scope text) returns void language sql as $$ update pb_docs.documents set scope = p_scope where id = p_doc $$;
create function pb_docs.take_share(p_key text, p_user uuid, p_doc uuid, p_how text) returns text language sql as $$ select 'ok' $$;
create function pb_docs.limits_for(p_company uuid) returns jsonb language sql as $$ select '{"bytes_total": 100000000}'::jsonb $$;
create function pb_docs.chars_cap(p_bytes bigint, p_lim jsonb) returns bigint language sql as $$ select 1000000::bigint $$;
create function pb_docs.stored_bytes(p_key text) returns bigint language sql as $$ select 0::bigint $$;
create function pb_docs.can_manage(p_doc uuid) returns boolean language sql stable security definer set search_path to '' as $$ select false $$;
create function public.pb_docs_remove(p_doc uuid) returns jsonb language plpgsql security definer set search_path to '' as $$ begin return null; end $$;
create function public.pb_docs_set_scope(p_doc uuid, p_scope text) returns jsonb language plpgsql security definer set search_path to '' as $$ begin return null; end $$;
create function public.pb_docs_put_pages(p_doc uuid, p_pages jsonb) returns jsonb language plpgsql security definer set search_path to '' as $$ begin return null; end $$;
-- as live: these call pb_docs.can_manage
create function public.pb_docs_can_manage(p_doc uuid) returns boolean language sql stable security definer set search_path to '' as $$
  select pb_docs.can_manage(p_doc) and exists (select 1 from pb_docs.documents d where d.id = p_doc and d.state <> 'removed') $$;
create function public.pb_docs_set_jobs(p_doc uuid, p_jobs text[]) returns jsonb language plpgsql security definer set search_path to '' as $$
begin
  update pb_docs.documents d set job_keys = coalesce((select array_agg(distinct lower(j)) from unnest(p_jobs[1:20]) j where j <> ''), '{}')
  where d.id = p_doc and d.scope = 'private' and d.state <> 'removed' and d.owner_company is not null and pb_docs.can_manage(d.id);
  return jsonb_build_object('ok', found);
end $$;

-- plan sets
create schema pb_plans; create schema pb_ai;
create table pb_plans.sets (id uuid primary key default gen_random_uuid(), company_id uuid, owner_user uuid, created_by uuid not null, job_key text not null default 'j',
  job_number text not null default 'J', title text not null default 't', pages int4 not null default 1, sha256 text not null default 'x', state text not null default 'uploading', removed_at timestamptz);
create function pb_ai.ctx(out uid uuid, out company_id uuid, out level text, out company_name text) returns record language plpgsql stable security definer set search_path to '' as $$
declare v_m uuid; v_c uuid; v_role text;
begin
  uid := auth.uid();
  if uid is null then raise exception 'pb:signed_out'; end if;
  v_m := pb_prod.managed_company(uid);
  select x.company_id, x.role into v_c, v_role from pb_prod.my_member(uid) x;
  if v_m is not null then company_id := v_m; level := 'office';
  elsif v_c is not null then company_id := v_c; level := case when v_role = 'foreman' then 'foreman' else 'pipelayer' end;
  else company_id := null; level := 'individual'; end if;
  select c.name into company_name from public.companies c where c.id = company_id;
end $$;
create function public.pb_plans_remove(p_set uuid) returns jsonb language plpgsql security definer set search_path to '' as $$ begin return null; end $$;
create function pb_plans.can_upload_to(p_name text) returns boolean language sql stable security definer set search_path to '' as $$ select false $$;

-- onboarding (live shapes)
alter table pb_onboard.links add column if not exists revoked_at timestamptz;
alter table pb_onboard.links add column if not exists company_id uuid;
create table pb_onboard.misses (at timestamptz default now(), kind text);
create index misses_at_idx on pb_onboard.misses (at);
create function pb_onboard.clean_code(p text) returns text language sql immutable set search_path to '' as $$ select nullif(upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')), '') $$;
create function pb_onboard.hash(p_token text) returns bytea language sql immutable set search_path to '' as $$ select extensions.digest(convert_to(coalesce(p_token, ''), 'UTF8'), 'sha256') $$;
create function pb_onboard.braked() returns boolean language sql stable security definer set search_path to '' as $$
  select (select count(*) from pb_onboard.misses m where m.at > now() - interval '10 minutes') >= 30 $$;
create function pb_onboard.miss(p_kind text) returns void language sql security definer set search_path to '' as $$
  delete from pb_onboard.misses where at < now() - interval '1 day';
  insert into pb_onboard.misses (kind) values (left(p_kind, 20)); $$;
create function pb_onboard.find(p_token text, p_code text, p_kind text) returns uuid language plpgsql security definer set search_path to '' as $$
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
end $$;
