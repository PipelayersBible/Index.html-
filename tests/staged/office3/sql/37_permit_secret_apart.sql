-- office3 #37: the responder link's secret travels beside the closed permit record, not inside it.
-- New permits (closed by the patched app; their record carries "emSecretApart": true) are backed up WITHOUT
-- permit.emLink.s, so the record the server keeps, the phone's "Export record data" and the PDF fingerprint are the same
-- text and the same SHA-256. The secret only proves the link code belongs to this permit (pb_safety.em_register); it
-- comes as p_em_secret and is used for that and never stored.
-- Old records are untouched: their record still holds the secret (old app, or a record closed before this), they keep
-- uploading through the 3-argument pb_permit_backup and keep verifying against what was filed for them.
-- Open-permit snapshots (pb_permit_open_put) are unchanged: they still carry the secret so a link files as soon as the
-- permit is open. They are not records and nothing fingerprints them.
-- Apply BEFORE the app patch 07 ships (the patched app falls back to the 3-argument call while this is missing).

begin;

create or replace function public.pb_permit_backup(p_client_permit_id text, p_record jsonb, p_expect_uid uuid, p_em_secret text)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid := auth.uid(); v_link jsonb;
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  if p_client_permit_id is null or length(p_client_permit_id) not between 1 and 100 then raise exception 'pb:bad_id'; end if;
  if p_record is null or jsonb_typeof(p_record) <> 'object' then raise exception 'pb:bad_record'; end if;
  -- a record that says the secret is kept apart must not carry it (the point of the change)
  if coalesce(p_record->>'emSecretApart', '') = 'true' and jsonb_typeof(p_record->'permit') = 'object' and (p_record->'permit'->'emLink') ? 's' then
    raise exception 'pb:bad_record';
  end if;
  -- file the link with its secret first, so the version's own trigger (pb_safety.em_on_version) finds it filed
  if p_em_secret is not null and p_em_secret ~ '^[0-9abcdefghjkmnpqrstvwxyz]{26}$'
     and jsonb_typeof(p_record->'permit') = 'object' and jsonb_typeof(p_record->'permit'->'emLink') = 'object' then
    v_link := (p_record->'permit'->'emLink') || jsonb_build_object('s', p_em_secret);
    perform pb_safety.em_register(v_uid, p_client_permit_id, v_link);
  end if;
  return public.pb_permit_backup(p_client_permit_id, p_record, p_expect_uid);
end $function$;

revoke all on function public.pb_permit_backup(text, jsonb, uuid, text) from public, anon;
grant execute on function public.pb_permit_backup(text, jsonb, uuid, text) to authenticated;

commit;
