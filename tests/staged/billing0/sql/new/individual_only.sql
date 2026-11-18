CREATE OR REPLACE FUNCTION pb_billing.individual_only(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select pb_billing.has_individual(p_user) and not exists (select 1 from pb_billing.company_of(p_user) x where not x.expired and not pb_billing.read_only(x.company_id)) -- billing Phase 0
$function$
