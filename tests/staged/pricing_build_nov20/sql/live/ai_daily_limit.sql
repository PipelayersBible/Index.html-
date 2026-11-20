-- Live text read Nov 20 2026 (md5 3f9aee6fc0b4f444e93184945f88bb49). To undo the pricing build's replacement, run this.
CREATE OR REPLACE FUNCTION public.ai_daily_limit(p_user uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* pb_sec S12 owner; Nov 16: company accounts 100 a day; trials go by ai_feature_limit; an ended beta with an individual plan: 10 */
  select case
    when exists (select 1 from pb_billing.company_of(p_user) x where x.plan = 'trial') then
      case when not exists (select 1 from pb_billing.company_of(p_user) x where x.expired) then 30
           when pb_billing.has_individual(p_user) then 10 else 0 end
    when exists (select 1 from public.company_members m join public.companies c on c.id = m.company_id
                 where m.user_id = p_user and c.status = 'active') then 100
    when exists (select 1 from public.companies o where o.owner_user_id = p_user and o.status = 'active') then 100
    when exists (select 1 from public.subscriptions s where s.user_id = p_user and s.tier = 'individual' and s.status = 'active') then 10
    else 0 end;
$function$;
