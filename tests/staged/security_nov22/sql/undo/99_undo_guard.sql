-- Last, only after every undo above that you need (each restore deletes its own backup rows): removes schema pb_sec.
-- Refuses while any backup is still kept (a migration that has not been undone).
do $d$ begin
  if exists (select 1 from pb_sec.fn_backup) then raise exception 'pb_sec.fn_backup still holds backups: run the matching 99_undo_0N.sql first (or keep pb_sec).'; end if;
end $d$;
drop schema pb_sec cascade;
