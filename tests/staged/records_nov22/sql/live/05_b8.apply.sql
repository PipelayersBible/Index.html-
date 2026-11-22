-- records_nov22 Phase B, 05 (B8): a run's whole history for Export for Records. NEW function only; changes no table
-- and no existing function. Manager-only: the company account (owner) or a listed manager of the run's company
-- (pb_prod.managed_company, the same test the office screens use). Returns every stored version (server time, md5,
-- size), the run's events (sent back, approved, removed + reason, restored) and the office's setup changes.
-- Version records are full run records (photos are never in them; the app refuses data:image): the newest 40 versions
-- carry the record itself as long as they add up to 20 MB or less; older ones are listed with their md5 only.
-- Errors (raised, like the other run RPCs): pb:signed_out, pb:wrong_account, pb:not_found, pb:not_company_account.
-- r17.15 phones never call it. r17.16 (b8_export_versions.py) calls it from Export for Records and, on any error, says
-- so in the manifest and exports as before.
-- Independent of 01-04. Plain SQL, DO-block safe. Safe to run twice. Undo: 99_undo_05.sql.
create or replace function public.pb_prod_run_versions(p_run_id uuid, p_expect_uid uuid) returns jsonb
language plpgsql stable security definer set search_path to '' as $f$
declare v_uid uuid := auth.uid(); r pb_prod.run_records%rowtype;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  if p_run_id is null then raise exception 'pb:not_found'; end if;
  select * into r from pb_prod.run_records x where x.id = p_run_id;
  if not found then raise exception 'pb:not_found'; end if;
  if not coalesce(pb_prod.managed_company(v_uid) = r.company_id, false) then raise exception 'pb:not_company_account'; end if;
  return jsonb_build_object('ok', true, 'run_id', r.id, 'entry_id', r.entry_id, 'current_version', r.version, 'server_at', now(),
    'removed_at', r.removed_at, 'removed_reason', r.removed_reason,
    'versions', (select coalesce(jsonb_agg(jsonb_build_object('version', w.version, 'saved_at', w.saved_at, 'record_md5', w.record_md5, 'bytes', w.sz,
          'record', case when w.rn <= 40 and w.cum <= 20000000 then w.record end) order by w.version), '[]'::jsonb)
      from (select v.version, v.saved_at, v.record_md5, v.record, octet_length(v.record::text) as sz,
                   row_number() over (order by v.version desc) as rn,
                   sum(octet_length(v.record::text)) over (order by v.version desc rows between unbounded preceding and current row) as cum
              from pb_prod.run_record_versions v where v.run_record_id = r.id) w),
    'events', (select coalesce(jsonb_agg(jsonb_build_object('action', e.action, 'at', e.at, 'by', pb_prod.member_name_or_null(r.company_id, e.by_user), 'note', e.note)
          order by e.at, e.id), '[]'::jsonb)
      from pb_prod.run_record_events e where e.run_record_id = r.id),
    'setup', (select coalesce(jsonb_agg(jsonb_build_object('version', s.version, 'side', s.side, 'change', s.change, 'intended', s.intended, 'field', s.field,
          'at', s.at, 'by', pb_prod.member_name_or_null(r.company_id, s.by_user)) order by s.version, s.id), '[]'::jsonb)
      from pb_prod.run_setup_versions s where s.run_record_id = r.id));
end $f$;
revoke all on function public.pb_prod_run_versions(uuid, uuid) from public;
revoke all on function public.pb_prod_run_versions(uuid, uuid) from anon;
grant execute on function public.pb_prod_run_versions(uuid, uuid) to authenticated;
