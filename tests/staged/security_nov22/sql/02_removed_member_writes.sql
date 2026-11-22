-- security_nov22 02 (review finding 2, MEDIUM): a removed crew member can no longer add versions to the company's records.
-- Before:
--   public.pb_permit_backup(text, jsonb, uuid) (the 4-argument one the app calls ends here too) found the permit by
--   (user, client id) only, so someone removed from the company kept adding versions to a permit filed under it; and
--   closed_at = coalesce(new lockTime, closed_at) let any later version move a permit's close time.
--   public.pb_run_seal_add() filed a new sealed run PDF for any run record of the caller, whatever company they are in now.
-- After:
--   permit backup: a permit filed under a company takes new versions only from someone still in that company (a member
--   row for it, or its owner; company status is not checked, so a closed or unpaid company never blocks a crew's permit
--   backups). Refused: 'pb:not_company_member' (the app keeps the permit on the phone and tries again later; nothing is
--   lost). Personal permits (no company) are unchanged. A re-send of the exact version already filed still answers
--   ok/same, so a removed member's queue clears. closed_at, once set, never moves.
--   OPTION (default OFF): pb_safety.closed_frozen() = true refuses any new, different version once a permit is closed
--   ('pb:permit_closed'). Turn on only with 02b_freeze_closed_on.sql, and only after the app words that code (see NOTES).
--   seal add: the run record's company must be the caller's company now (pb_prod.my_company, like
--   pb_prod_run_record_put). Refused: 'pb:not_company_member'.
-- Run as postgres, in one transaction (the whole file). Safe to run twice. Undo: undo/99_undo_02.sql.

select pb_sec.guard('nov22_02', 'public.pb_permit_backup(text,jsonb,uuid)', '20eacb984a31e485eb21f3d8075d4923');
select pb_sec.guard('nov22_02', 'public.pb_run_seal_add(text,text,text,integer,text,timestamp with time zone,text)', 'dcb126dc18d5aba070a8991742f8d5f4');

-- the freeze switch (decision for Tommy). false = as today: a closed permit still takes later versions.
-- Created only if missing, so running this file again never turns a freeze back off.
do $d$ begin
  if to_regprocedure('pb_safety.closed_frozen()') is null then
    execute $x$create function pb_safety.closed_frozen() returns boolean language sql immutable set search_path = '' as 'select false'$x$;
    execute 'revoke all on function pb_safety.closed_frozen() from public';
    execute 'revoke all on function pb_safety.closed_frozen() from anon, authenticated';
  end if;
end $d$;

CREATE OR REPLACE FUNCTION public.pb_permit_backup(p_client_permit_id text, p_record jsonb, p_expect_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  v_permit pb_safety.permits%rowtype;
  v_sha text;
  v_last text;
  v_closed timestamptz;
  v_size integer;
  v_new_today integer;
  v_bytes bigint;
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
  -- security_nov22 02: a company's permit takes new versions only from someone still in that company (member or owner)
  if v_permit.company_id is not null
     and not exists (select 1 from public.company_members m where m.user_id = v_uid and m.company_id = v_permit.company_id)
     and not exists (select 1 from public.companies c where c.id = v_permit.company_id and c.owner_user_id = v_uid) then
    raise exception 'pb:not_company_member';
  end if;
  -- security_nov22 02 (option, off unless pb_safety.closed_frozen() says true): a closed permit takes no new versions
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
    closed_at = coalesce(closed_at, v_closed) -- security_nov22 02: once set, the close time never moves (was coalesce(v_closed, closed_at))
    where id = v_permit.id;
  return jsonb_build_object('ok', true, 'same', false, 'version', v_permit.version_count + 1);
end $function$;

CREATE OR REPLACE FUNCTION public.pb_run_seal_add(p_entry_id text, p_path text, p_sha256 text, p_bytes integer, p_key text, p_made_at timestamp with time zone, p_build text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_safe text; v_size bigint; v_have pb_prod.run_seals; v_n int;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  v_safe := regexp_replace(coalesce(p_entry_id, ''), '[^A-Za-z0-9_.-]', '_', 'g');
  if p_path is null or p_path !~ ('^' || v_uid::text || '/runs/' || replace(v_safe, '.', '\.') || '/[0-9]{8}T[0-9]{6}-' || left(coalesce(p_sha256, ''), 16) || '\.pdf$') then raise exception 'pb:bad_path'; end if;
  if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'pb:bad_sha'; end if;
  select r.company_id into v_company from pb_prod.run_records r where r.user_id = v_uid and r.entry_id = p_entry_id;
  if not found then raise exception 'pb:no_run'; end if;
  select (o.metadata->>'size')::bigint into v_size from storage.objects o where o.bucket_id = 'run-seals' and o.name = p_path and o.owner_id = v_uid::text;
  if not found then raise exception 'pb:no_file'; end if;
  if v_size is distinct from p_bytes::bigint then raise exception 'pb:size_mismatch'; end if;
  select * into v_have from pb_prod.run_seals s where s.path = p_path;
  if found then return jsonb_build_object('ok', true, 'version', v_have.version, 'sealed_at', v_have.sealed_at, 'again', true); end if;
  -- security_nov22 02: a new seal only while the caller is still in the run record's company (as pb_prod_run_record_put);
  -- one already filed still answers 'again' above, so a removed member's queue clears
  if v_company is distinct from pb_prod.my_company(v_uid) then raise exception 'pb:not_company_member'; end if;
  select count(*) into v_n from pb_prod.run_seals s where s.user_id = v_uid and s.entry_id = p_entry_id;
  if v_n >= 50 then raise exception 'pb:too_many'; end if;
  insert into pb_prod.run_seals (user_id, company_id, entry_id, version, path, sha256, bytes, seal_key, app_build, made_at)
  values (v_uid, v_company, p_entry_id, v_n + 1, p_path, p_sha256, p_bytes, left(p_key, 80), left(p_build, 60), p_made_at)
  returning * into v_have;
  return jsonb_build_object('ok', true, 'version', v_have.version, 'sealed_at', v_have.sealed_at);
end $function$;
