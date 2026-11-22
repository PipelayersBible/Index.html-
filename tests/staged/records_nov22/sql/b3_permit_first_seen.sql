-- records_nov22 B3: keep the open permit's "first seen by the server" proof when the permit closes.
-- Today pb_safety.drop_open_on_close (AFTER INSERT on pb_safety.permits, the first close-out backup) deletes the
-- pb_safety.open_permits row, and with it first_saved_at (when the server first had the open permit), saves (how many
-- times it was saved while open) and the last open snapshot's fingerprint. Those are copied onto the permit first.
-- open_clock_ahead_s: phone clock minus server clock at the last open save, when the snapshot carries phoneAt (app
-- patch b3 adds it; older snapshots leave it null). Undo: b3_permit_first_seen_undo.sql.
begin;
alter table pb_safety.permits
  add column if not exists open_first_saved_at timestamptz,
  add column if not exists open_last_saved_at timestamptz,
  add column if not exists open_saves integer,
  add column if not exists open_last_sha256 text,
  add column if not exists open_clock_ahead_s integer;
create or replace function pb_safety.drop_open_on_close() returns trigger language plpgsql security definer set search_path to '' as $f$
begin
  begin
    update pb_safety.permits p set open_first_saved_at = o.first_saved_at, open_last_saved_at = o.saved_at, open_saves = o.saves, open_last_sha256 = o.record_sha256,
        open_clock_ahead_s = case when coalesce(o.snapshot->>'phoneAt', '') ~ '^\d{4}-\d\d-\d\dT' then greatest(-31536000, least(31536000, round(extract(epoch from ((o.snapshot->>'phoneAt')::timestamptz - o.saved_at)))))::integer end
      from pb_safety.open_permits o
      where p.id = new.id and o.user_id = new.user_id and o.client_permit_id = new.client_permit_id; -- records_nov22 B3: kept before the open row goes
  exception when others then
    raise log 'pb_safety.drop_open_on_close: proof not copied (%)', sqlstate; perform pb_prod.note_error('pb_safety.drop_open_on_close: proof not copied (%)', sqlstate, sqlerrm);
  end;
  begin
    perform set_config('pb.allow_record_delete', 'on', true); -- B9's delete guard on open_permits lets only this through
    delete from pb_safety.open_permits where user_id = new.user_id and client_permit_id = new.client_permit_id;
    perform set_config('pb.allow_record_delete', '', true);
  exception when others then
    perform set_config('pb.allow_record_delete', '', true);
    raise log 'pb_safety.drop_open_on_close: skipped (%)', sqlstate; perform pb_prod.note_error('pb_safety.drop_open_on_close: skipped (%)', sqlstate, sqlerrm);
  end;
  return null;
end $f$;
commit;
-- The permit export (pb_reports_permit_versions) can then return open_first_saved_at / open_saves for the certificate
-- ("the server first received this open permit at ..."): app follow-up, not in this file.
