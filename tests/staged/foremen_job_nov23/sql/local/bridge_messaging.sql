-- bridge for with_messaging.sh: the live pieces foremen 01 needs that messaging's local stubs do not have (texts from live_defs.json)
create table if not exists pb_pm.audit (id bigint generated always as identity primary key, at timestamptz not null default now(), company_id uuid not null, actor uuid not null,
  action text not null, job_key text, old_value jsonb, new_value jsonb, outcome text not null, code text,
  constraint audit_action_check check (action = any (array['job_pms'::text, 'settings'::text])), constraint audit_code_check check (length(code) <= 80),
  constraint audit_outcome_check check (outcome = any (array['ok'::text, 'refused'::text])));
alter table pb_pm.audit enable row level security;
drop table if exists pb_pm.job_foremen;   -- messaging's stand-in; foremen 01 makes the real one
CREATE OR REPLACE FUNCTION pb_prod.is_foreman_of(p_uid uuid, p_company uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from pb_prod.my_member(p_uid) x where x.company_id = p_company and x.role = 'foreman')
$function$
;
CREATE OR REPLACE FUNCTION pb_pm.is_pm(p_user uuid, p_company uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p_user is not null and p_company is not null
     and exists (select 1 from public.company_members m where m.user_id = p_user and m.company_id = p_company and m.role = 'pm')
     and pb_prod.managed_company(p_user) is not distinct from p_company
$function$
;
CREATE OR REPLACE FUNCTION pb_pm.permanent()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  raise exception 'pb:pm_history_is_permanent';
end $function$
;
