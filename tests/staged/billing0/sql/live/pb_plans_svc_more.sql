CREATE OR REPLACE FUNCTION public.pb_plans_svc_more()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from pb_plans.sheets h join pb_plans.sets s on s.id = h.set_id where h.state = 'queued' and s.state in ('uploading','reading'))
      or exists (select 1 from pb_plans.issues where state = 'candidate')
$function$
