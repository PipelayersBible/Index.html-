-- records_nov22 Phase B, 02 (B3): keep the open permit's "first seen by the server" proof when the permit closes.
-- Before: pb_safety.drop_open_on_close (AFTER INSERT on pb_safety.permits = the first close-out backup) deletes the
-- pb_safety.open_permits row, and with it first_saved_at (when the server first had the open permit), saves (how many
-- times it was saved while open) and the last open snapshot's fingerprint.
-- After: those are copied onto the permit first (5 new nullable columns), then the open row is dropped as before.
-- open_clock_ahead_s = phone clock minus server clock at the last open save, only when the open snapshot carries phoneAt
-- (r17.16 app part b3_open_phoneat.py adds it; r17.15 phones don't, so it stays null for them). A bad phoneAt never
-- stops the rest being copied, and nothing here can make a close-out backup fail (each step has its own exception
-- handler, like the live function).
-- The delete is wrapped in pb.allow_record_delete = 'on' (transaction-local, reset right after) so 03 B9's no-delete
-- guard on open_permits lets only this through. Before 03 is applied the setting is simply unused.
-- Needs 01. Plain SQL, DO-block safe. Safe to run twice. Undo: 99_undo_02.sql (exact live text back from pb_stage).
do $g$ begin
  perform pb_stage.guard('records_b3', 'pb_safety.drop_open_on_close()', '06bf4e0e338276c9d73f8a5e6a0879d3');
end $g$;

alter table pb_safety.permits
  add column if not exists open_first_saved_at timestamptz,
  add column if not exists open_last_saved_at timestamptz,
  add column if not exists open_saves integer,
  add column if not exists open_last_sha256 text,
  add column if not exists open_clock_ahead_s integer;

create or replace function pb_safety.drop_open_on_close() returns trigger
language plpgsql security definer set search_path to '' as $f$
declare o pb_safety.open_permits%rowtype; v_ahead integer;
begin
  -- records_nov22 B3: keep the open permit's proof on the permit before the open row goes
  begin
    select * into o from pb_safety.open_permits x where x.user_id = new.user_id and x.client_permit_id = new.client_permit_id;
    if found then
      begin
        if coalesce(o.snapshot->>'phoneAt', '') ~ '^\d{4}-\d\d-\d\dT\d\d:\d\d' then
          v_ahead := greatest(-31536000, least(31536000, round(extract(epoch from ((o.snapshot->>'phoneAt')::timestamptz - o.saved_at)))))::integer;
        end if;
      exception when others then v_ahead := null;
      end;
      update pb_safety.permits p
         set open_first_saved_at = o.first_saved_at, open_last_saved_at = o.saved_at, open_saves = o.saves,
             open_last_sha256 = o.record_sha256, open_clock_ahead_s = v_ahead
       where p.id = new.id;
    end if;
  exception when others then
    raise log 'pb_safety.drop_open_on_close: proof not copied (%)', sqlstate; perform pb_prod.note_error('pb_safety.drop_open_on_close: proof not copied (%)', sqlstate, sqlerrm);
  end;
  begin
    perform set_config('pb.allow_record_delete', 'on', true); -- records_nov22 B9: the open_permits no-delete guard lets only this through
    delete from pb_safety.open_permits where user_id = new.user_id and client_permit_id = new.client_permit_id;
    perform set_config('pb.allow_record_delete', '', true);
  exception when others then
    perform set_config('pb.allow_record_delete', '', true);
    raise log 'pb_safety.drop_open_on_close: skipped (%)', sqlstate; perform pb_prod.note_error('pb_safety.drop_open_on_close: skipped (%)', sqlstate, sqlerrm);
  end;
  return null;
end $f$;
