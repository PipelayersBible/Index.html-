-- Open (in-progress) confined space permit backup. Keeps ONLY the latest snapshot of each open permit.
-- Separate from pb_safety.permits, so open permits never look closed and never trigger the "permit closed" notice.
begin;

create table if not exists pb_safety.open_permits (
  user_id uuid not null,
  client_permit_id text not null,
  company_id uuid,
  space text, jobsite text, job_number text,
  snapshot jsonb not null,
  record_sha256 text not null,
  bytes integer not null,
  saves integer not null default 1,
  first_saved_at timestamptz not null default now(),
  saved_at timestamptz not null default now(),
  primary key (user_id, client_permit_id),
  constraint open_permits_id_len check (length(client_permit_id) between 1 and 100)
);
alter table pb_safety.open_permits enable row level security;
revoke all on pb_safety.open_permits from public, anon, authenticated;

create or replace function public.pb_permit_open_put(p_client_permit_id text, p_snapshot jsonb, p_expect_uid uuid)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare v_uid uuid := auth.uid(); v_sha text; v_size integer; v_company uuid; v_old text; v_n integer;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  if p_client_permit_id is null or length(p_client_permit_id) not between 1 and 100 then raise exception 'pb:bad_id'; end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then raise exception 'pb:bad_record'; end if;
  v_size := pg_column_size(p_snapshot);
  if v_size > 2000000 then raise exception 'pb:too_big'; end if;
  if exists (select 1 from pb_safety.permits p where p.user_id = v_uid and p.client_permit_id = p_client_permit_id) then
    return jsonb_build_object('ok', true, 'closed', true); -- already closed and backed up: nothing to keep
  end if;
  v_sha := encode(sha256(convert_to(p_snapshot::text, 'UTF8')), 'hex');
  select o.record_sha256 into v_old from pb_safety.open_permits o where o.user_id = v_uid and o.client_permit_id = p_client_permit_id;
  if v_old = v_sha then return jsonb_build_object('ok', true, 'same', true); end if;
  delete from pb_safety.open_permits where user_id = v_uid and saved_at < now() - interval '30 days';
  select count(*) into v_n from pb_safety.open_permits where user_id = v_uid and client_permit_id <> p_client_permit_id;
  if v_n >= 25 then raise exception 'pb:quota'; end if;
  select m.company_id into v_company from public.company_members m where m.user_id = v_uid order by m.created_at desc nulls last limit 1;
  insert into pb_safety.open_permits (user_id, client_permit_id, company_id, space, jobsite, job_number, snapshot, record_sha256, bytes)
    values (v_uid, p_client_permit_id, v_company, left(p_snapshot->>'space', 300), left(p_snapshot->>'jobsite', 300), left(p_snapshot->>'jobNumber', 100), p_snapshot, v_sha, v_size)
  on conflict (user_id, client_permit_id) do update
    set snapshot = excluded.snapshot, record_sha256 = excluded.record_sha256, bytes = excluded.bytes, company_id = excluded.company_id,
        space = excluded.space, jobsite = excluded.jobsite, job_number = excluded.job_number, saves = pb_safety.open_permits.saves + 1, saved_at = now();
  return jsonb_build_object('ok', true, 'same', false);
end $fn$;

create or replace function public.pb_permit_open_mine()
returns table(client_permit_id text, space text, jobsite text, job_number text, first_saved_at timestamptz, saved_at timestamptz, snapshot jsonb)
language plpgsql security definer set search_path = '' as $fn$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  return query
    select o.client_permit_id, o.space, o.jobsite, o.job_number, o.first_saved_at, o.saved_at, o.snapshot
      from pb_safety.open_permits o
     where o.user_id = v_uid
       and not exists (select 1 from pb_safety.permits p where p.user_id = v_uid and p.client_permit_id = o.client_permit_id)
     order by o.saved_at desc limit 25;
end $fn$;

-- when the real (closed) backup arrives, the open snapshot is no longer needed
create or replace function pb_safety.drop_open_on_close()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  begin
    delete from pb_safety.open_permits where user_id = new.user_id and client_permit_id = new.client_permit_id;
  exception when others then
    raise log 'pb_safety.drop_open_on_close: skipped (%)', sqlstate;
  end;
  return null;
end $fn$;
drop trigger if exists pb_permit_drop_open on pb_safety.permits;
create trigger pb_permit_drop_open after insert on pb_safety.permits
  for each row execute function pb_safety.drop_open_on_close();

revoke all on function public.pb_permit_open_put(text, jsonb, uuid) from public, anon;
revoke all on function public.pb_permit_open_mine() from public, anon;
grant execute on function public.pb_permit_open_put(text, jsonb, uuid) to authenticated, service_role;
grant execute on function public.pb_permit_open_mine() to authenticated, service_role;

commit;
