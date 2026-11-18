-- OPTIONAL: billing warnings in the operator's 10:00 UTC check email, WITHOUT changing the pb-backup edge function. NOT APPLIED. After 01.
-- How: pb-backup?check=1 emails whatever public.pb_backup_health() returns in 'problem' when 'alert' is true. This adds
-- pb_billing.alert_text() ("Acme Pipeline Inc is past due since Dec 18 and locks (read-only) on Dec 25 (3 days left); ...")
-- to that text, and lets check_kick call the check when billing has something to say. At most one email a day
-- (pb-backup's check idempotency key is per day; its budget is 3 backup emails a day).
-- CAVEAT (why it is optional): the email is pb-backup's backup email. Subject "Backup check: billing, not the backup ...",
-- body "the nightly backup needs a look", a "How to fix" line with backup steps, and the closing line "Nothing in the app is
-- affected; this is only the copy of the data" - which is wrong for billing. The billing text says the fix line does not
-- apply, but the wrapper is misleading. A company name containing "hop", "dump", "schema" or "upload" also changes which
-- backup fix line is shown. Proper wording needs a small pb-backup change (a 'billing' field in the check), not done here.
-- The in-app Billing due list shows the same companies with days left either way.
-- Changed existing functions (diffs in sql/diffs/): public.pb_backup_health, pb_backup.check_kick.

create or replace function public.pb_backup_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r pb_backup.runs%rowtype;
begin
  perform pb_crew.require_service();
  select * into r from pb_backup.runs b order by b.id desc limit 1;
  -- billing Phase 0: companies past due / just locked ride along in the operator's 10:00 UTC check (pb-backup unchanged)
  return jsonb_build_object('problem', nullif(concat_ws(' | ', pb_backup.health(now()), pb_billing.alert_text()), ''),
    'alert', pb_backup.check_due(now()) or pb_billing.alert_text() is not null,
    'pass_errors_24h', (select count(*) from pb_prod.pass_errors e where e.at > now() - interval '24 hours'),
    'last_run', case when r.id is null then null else jsonb_build_object('id', r.id, 'started_at', r.started_at, 'finished_at', r.finished_at,
      'status', r.status, 'files', r.files, 'bytes', r.bytes, 'error', r.error, 'alerted', r.alerted_at is not null) end);
end $function$
;

create or replace function pb_backup.check_kick()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
-- feat_server: the 10:00 UTC check. Calls pb-backup?check=1 (which emails the operator) only when something is wrong
-- and nobody was told yet. Its cron job is made by 61_after_pb_backup_v5.sql, AFTER pb-backup v5 is deployed (v4 would
-- read the call as a full backup and email the owners).
declare v_secret text;
begin
  if not (pb_backup.check_due(now()) or pb_billing.alert_text() is not null) then return; end if; -- billing Phase 0: or a company is past due / just locked
  begin
    execute 'select ds.decrypted_secret from vault.decrypted_secrets ds where ds.name = ''push_cron_secret'' limit 1' into v_secret;
    if v_secret is null or length(v_secret) < 16 then return; end if;
    execute 'select net.http_post(url := $1, body := ''{"check": true}''::jsonb, headers := $2, timeout_milliseconds := 30000)'
      using 'https://rogfassochneycezecxa.supabase.co/functions/v1/pb-backup?check=1',
            jsonb_build_object('Content-Type', 'application/json', 'x-pb-push-secret', v_secret);
  exception when others then
    raise log 'pb_backup.check_kick: call not made'; perform pb_prod.note_error('pb_backup.check_kick: call not made', sqlstate, sqlerrm);
  end;
end $function$
;
