-- undo records_nov22 A9
begin;
select pb_stage.patch_fn('public.pb_prod_run_remove(uuid,text,uuid)'::regprocedure,
$o$
  if v_reason is null or length(v_reason) < 3 then raise exception 'pb:reason_required'; end if; -- records_nov22 A9$o$, '');
commit;
