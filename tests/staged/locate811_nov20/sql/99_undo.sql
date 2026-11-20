-- locate811 #99: UNDO of 01 (only if Renew / History must be switched off again). STAGED, not applied.
-- Puts the two live function bodies back exactly as they were on Nov 20 2026 (so tickets come without "renewals" and
-- "log_n" and the app hides Renew and History again), and removes the renewal call, the history read and the trigger.
-- It KEEPS the two new columns and pb_prod.locate_log with everything recorded so far (history is permanent; a
-- renewed ticket keeps its expiry). Applying 01 again later is not possible as written (the columns and table exist):
-- re-apply only its function and trigger statements.
begin;
drop trigger if exists locates_zz_log on pb_prod.locates;
drop function if exists public.pb_prod_locate_log(text, uuid);
drop function if exists public.pb_prod_locate_set(text, uuid, text, date, date, text, boolean, integer, uuid, date);
CREATE OR REPLACE FUNCTION pb_prod.locate_json(l pb_prod.locates)
 RETURNS jsonb LANGUAGE sql STABLE SET search_path TO ''
AS $function$
  select jsonb_build_object('id', l.id, 'job_key', l.job_key, 'job_number', l.job_number, 'ticket_no', l.ticket_no,
    'called_at', l.called_at, 'expires_at', l.expires_at, 'note', l.note, 'closed', l.closed, 'closed_at', l.closed_at,
    'created_at', l.created_at, 'updated_at', l.updated_at, 'version', l.version,
    'by_name', pb_prod.member_name(l.company_id, coalesce(l.updated_by, l.created_by)))
$function$;
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
revoke all on function public.pb_prod_locate_set(text, uuid, text, date, date, text, boolean, integer, uuid) from public, anon;
grant execute on function public.pb_prod_locate_set(text, uuid, text, date, date, text, boolean, integer, uuid) to authenticated, service_role;
commit;
