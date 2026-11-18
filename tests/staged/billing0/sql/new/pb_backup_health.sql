CREATE OR REPLACE FUNCTION public.pb_backup_health()
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
