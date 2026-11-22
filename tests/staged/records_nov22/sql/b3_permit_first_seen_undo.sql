-- undo records_nov22 B3 (the copied columns are kept: dropping them would lose proof already copied)
begin;
create or replace function pb_safety.drop_open_on_close() returns trigger language plpgsql security definer set search_path to '' as $f$
begin
  begin
    delete from pb_safety.open_permits where user_id = new.user_id and client_permit_id = new.client_permit_id;
  exception when others then
    raise log 'pb_safety.drop_open_on_close: skipped (%)', sqlstate; perform pb_prod.note_error('pb_safety.drop_open_on_close: skipped (%)', sqlstate, sqlerrm);
  end;
  return null;
end $f$;
commit;
