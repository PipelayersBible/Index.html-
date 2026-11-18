CREATE OR REPLACE FUNCTION pb_billing.beta_closed_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.company_id is not null and pb_billing.beta_closed(new.company_id) then raise exception 'pb:beta_ended'; end if;
  -- billing Phase 0: a paid company that is read-only (7 days past due, read-only, or canceled) is closed the same way.
  -- Same code on purpose: the app (r16.96) keeps only pb:beta_ended records waiting on the phone; any other code is a refusal.
  if new.company_id is not null and pb_billing.read_only(new.company_id) then raise exception 'pb:beta_ended'; end if;
  return new;
end $function$
