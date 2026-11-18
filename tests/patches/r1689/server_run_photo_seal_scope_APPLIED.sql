-- NOT APPLIED, AND NEEDS AN OWNER DECISION (it changes who sees what inside one company).
-- Finding 4: a foreman who holds ANY open crew link to a pipelayer can read the photos and sealed
-- originals of ALL of that pipelayer's runs in the company (also runs made before the link, and runs
-- sent to another foreman), and either side can open a link on their own (pb_prod_crew_link_set).
-- The run-report RPCs use the narrower rule pb_prod.rr_can_open (the office, or the run's own foreman).
-- This makes the two storage checks use that same rule.
create or replace function pb_prod.can_view_run_photo(p_name text)
 returns boolean
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare a text[] := string_to_array(p_name, '/'); v_uid uuid := auth.uid();
begin
  if v_uid is null or array_length(a, 1) <> 4 or a[2] <> 'runs' then return false; end if;
  return exists (select 1 from pb_prod.run_records r
    where r.user_id::text = a[1] and regexp_replace(r.entry_id, '[^A-Za-z0-9_.-]', '_', 'g') = a[3] and r.removed_at is null
      and pb_prod.rr_can_open(v_uid, r.company_id, r.user_id, r.entry_id));
end $function$;

create or replace function pb_prod.can_view_run_seal(p_owner uuid, p_entry_safe text)
 returns boolean
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return false; end if;
  if v_uid = p_owner then return true; end if;
  return exists (select 1 from pb_prod.run_records r
    where r.user_id = p_owner and regexp_replace(r.entry_id, '[^A-Za-z0-9_.-]', '_', 'g') = p_entry_safe
      and pb_prod.rr_can_open(v_uid, r.company_id, r.user_id, r.entry_id));
end $function$;
-- Test before shipping: a foreman must still open the photos of a run sent to him (run_foreman / crewrun_for),
-- and the office every run of the company.
