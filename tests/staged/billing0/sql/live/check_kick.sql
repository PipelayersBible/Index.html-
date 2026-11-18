CREATE OR REPLACE FUNCTION pb_backup.check_kick()
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
  if not pb_backup.check_due(now()) then return; end if;
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
