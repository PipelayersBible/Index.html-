-- hunt_nov19 SERVER 01 (NOT APPLIED: the hunter is read-only on the server; the lead / Tommy applies it).
-- Six service-only functions were created without EXECUTE for service_role, so the scheduled edge functions that call
-- them (with the service key, through /rest/v1/rpc) get 403 every time and treat that as "nothing to do":
--   pb-seal-check    -> pb_seal_check_todo / pb_seal_check_put   (server re-check + outside time-stamp of sealed originals)
--                    -> pb_photo_check_todo / pb_photo_check_put (server re-check of each run photo's fingerprint)
--   weather-alerts   -> pb_wx_due / pb_wx_finish                 (the evening / morning weather alerts)
-- Their sibling functions (pb_audit_day_todo/put, pb_offsite_todo/put/run, pb_push_svc_*) have the grant and work.
-- Each function still checks pb_push.is_service() inside, so the grant opens nothing to signed-in users or anon.
grant execute on function public.pb_seal_check_todo(integer) to service_role;
grant execute on function public.pb_seal_check_put(uuid, text, integer, jsonb) to service_role;
grant execute on function public.pb_photo_check_todo(integer) to service_role;
grant execute on function public.pb_photo_check_put(text, text, integer, timestamp with time zone) to service_role;
grant execute on function public.pb_wx_due(timestamp with time zone) to service_role;
grant execute on function public.pb_wx_finish(uuid, text, date, jsonb) to service_role;
-- After applying: within 10 minutes pb_prod.run_seal_checks and pb_prod.run_photo_checks get their first rows
-- (the cron pb-seal-check runs every 10 minutes while anything waits); the weather alerts run at their next due time.
