CREATE OR REPLACE FUNCTION public.pb_plans_uploaded(p_set uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_s pb_plans.sets; v_missing int; v_trial boolean;
begin
  select * into v_s from pb_plans.sets where id = p_set;
  if not found or v_s.created_by is distinct from auth.uid() then return jsonb_build_object('ok', false, 'code', 'pb:not_yours'); end if;
  select count(*) into v_missing from pb_plans.sheets where set_id = p_set and state = 'waiting';
  if v_missing > 0 then return jsonb_build_object('ok', false, 'code', 'pb:missing', 'missing', v_missing); end if;
  -- Nov 16: a beta company's sets wait, viewable, until it pays (pb_owner_company_set turns them to reading)
  -- billing Phase 0: also a paid company without the plan reading add-on (or read-only); Make Paid / Plan Reading On read them
  select not pb_billing.plan_reading_on(v_s.company_id) into v_trial;
  if v_trial then
    update pb_plans.sets set state = 'parked' where id = p_set and state = 'uploading';
    return jsonb_build_object('ok', true, 'parked', true);
  end if;
  update pb_plans.sets set state = 'reading' where id = p_set and state = 'uploading';
  perform pb_plans.kick();
  return jsonb_build_object('ok', true);
end $function$
