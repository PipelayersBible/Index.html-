-- records_nov22 A9: deleting a crew run needs a reason (pb:reason_required). APPLY ONLY AFTER the app build that sends one
-- (r17.15 candidate, patch a9) is live: older phones send p_reason = null and would be refused.
-- Needs sql/_patchfn.sql first. Undo: a9_run_remove_reason_undo.sql.
begin;
select pb_stage.patch_fn('public.pb_prod_run_remove(uuid,text,uuid)'::regprocedure,
$o$  if v_r.removed_at is not null then return jsonb_build_object('ok', true, 'again', true); end if;$o$,
$n$  if v_r.removed_at is not null then return jsonb_build_object('ok', true, 'again', true); end if;
  if v_reason is null or length(v_reason) < 3 then raise exception 'pb:reason_required'; end if; -- records_nov22 A9$n$);
commit;

-- TEST (rolled back; run as a signed-in foreman/office test user in the SQL editor with request.jwt.claims set, or skip):
-- do $t$ begin
--   perform set_config('request.jwt.claims', json_build_object('sub', '<office uid>', 'role', 'authenticated')::text, true);
--   begin perform public.pb_prod_run_remove('<run_records.id>', null, '<office uid>'); raise exception 'RESULT: FAIL accepted an empty reason';
--   exception when others then if sqlerrm <> 'pb:reason_required' then raise; end if; end;
--   raise exception 'RESULT: PASS empty reason refused (rolled back)';
-- end $t$;
