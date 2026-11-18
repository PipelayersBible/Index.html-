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
  return jsonb_build_object('problem', pb_backup.health(now()), 'alert', pb_backup.check_due(now()),
    'pass_errors_24h', (select count(*) from pb_prod.pass_errors e where e.at > now() - interval '24 hours'),
    'last_run', case when r.id is null then null else jsonb_build_object('id', r.id, 'started_at', r.started_at, 'finished_at', r.finished_at,
      'status', r.status, 'files', r.files, 'bytes', r.bytes, 'error', r.error, 'alerted', r.alerted_at is not null) end);
end $function$
