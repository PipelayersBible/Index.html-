-- undo records_nov22 Phase B 01: drop the helper schema. RUN LAST, only after 99_undo_02 (it needs pb_stage.restore).
-- Plain SQL, DO-block safe. Refuses while a saved live text is still waiting to be restored.
do $u$ declare n bigint := 0; begin
  if to_regclass('pb_stage.fn_backup') is not null then execute 'select count(*) from pb_stage.fn_backup' into n; end if;
  if n > 0 then
    raise exception 'records undo 01: pb_stage.fn_backup still holds saved live text (run 99_undo_02.sql first). Nothing was dropped.';
  end if;
end $u$;
drop schema if exists pb_stage cascade;
