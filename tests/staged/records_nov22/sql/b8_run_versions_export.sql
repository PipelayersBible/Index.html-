-- records_nov22 B8: a run's whole history for Export for Records. Manager-only (the company account / a listed manager
-- of that company). Returns every stored version (with the server time and md5), the run's events (sent, sent back,
-- approved, removed + reason ...) and the office's setup changes. Version records are full run records (each up to
-- ~2.5 MB): at most the 40 newest versions carry the record itself; older ones are listed with their md5.
-- APP follow-up: Export for Records adds versions/run-v<N>.json + history.json; the office PDF gets "Changes after the run"
-- (pbRrPdfDoc / pbRrExport). Undo: drop function public.pb_prod_run_versions(uuid, uuid);
begin;
create or replace function public.pb_prod_run_versions(p_run_id uuid, p_expect_uid uuid) returns jsonb
language plpgsql stable security definer set search_path to '' as $f$
declare v_uid uuid := auth.uid(); r pb_prod.run_records%rowtype; v_max integer;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  select * into r from pb_prod.run_records x where x.id = p_run_id;
  if not found then raise exception 'pb:not_found'; end if;
  if not coalesce(pb_prod.managed_company(v_uid) = r.company_id, false) then raise exception 'pb:not_company_account'; end if;
  select max(v.version) into v_max from pb_prod.run_record_versions v where v.run_record_id = r.id;
  return jsonb_build_object('ok', true, 'run_id', r.id, 'entry_id', r.entry_id, 'current_version', r.version, 'server_at', now(),
    'versions', (select coalesce(jsonb_agg(jsonb_build_object('version', v.version, 'saved_at', v.saved_at, 'record_md5', v.record_md5,
        'record', case when v.version > coalesce(v_max, 0) - 40 then v.record end) order by v.version), '[]'::jsonb)
      from pb_prod.run_record_versions v where v.run_record_id = r.id),
    'events', (select coalesce(jsonb_agg(jsonb_build_object('action', e.action, 'at', e.at, 'by', pb_prod.member_name_or_null(r.company_id, e.by_user), 'note', e.note) order by e.at, e.id), '[]'::jsonb)
      from pb_prod.run_record_events e where e.run_record_id = r.id),
    'setup', (select coalesce(jsonb_agg(jsonb_build_object('version', s.version, 'side', s.side, 'change', s.change, 'intended', s.intended, 'field', s.field, 'at', s.at,
        'by', pb_prod.member_name_or_null(r.company_id, s.by_user)) order by s.version, s.id), '[]'::jsonb)
      from pb_prod.run_setup_versions s where s.run_record_id = r.id));
end $f$;
revoke all on function public.pb_prod_run_versions(uuid, uuid) from public, anon;
grant execute on function public.pb_prod_run_versions(uuid, uuid) to authenticated;
commit;
