-- messaging_nov22 undo 03: puts back the exact live text of public.pb_offsite_todo(integer) saved by 03_offsite.sql.
begin;
do $u$ declare d text; begin
  select b.def into d from pb_msg.fn_backup b where b.sig = 'public.pb_offsite_todo(integer)';
  if d is null then raise notice 'nothing to undo (03 was not applied)'; return; end if;
  execute d;
  delete from pb_msg.fn_backup where sig = 'public.pb_offsite_todo(integer)';
end $u$;
commit;
