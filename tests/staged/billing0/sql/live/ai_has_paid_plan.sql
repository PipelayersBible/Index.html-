CREATE OR REPLACE FUNCTION public.ai_has_paid_plan(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* pb_sec S12 owner; Nov 16: an ended trial has no AI */
  select exists (select 1 from public.subscriptions s where s.user_id = p_user and s.tier = 'individual' and s.status = 'active')
      or exists (select 1 from pb_billing.company_of(p_user) x where not x.expired);
$function$
