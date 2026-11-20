-- extra stand-ins for this change (shapes read from live Nov 20 2026)
alter table pb_plans.sheets add column if not exists read_at timestamptz;
create or replace function pb_prod.member_name_or_null(p_company uuid, p_user uuid) returns text language sql stable as $$ select null::text $$;
CREATE OR REPLACE FUNCTION public.pb_owner_plan_requests()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  return jsonb_build_object('ok', true, 'requests', (select coalesce(jsonb_agg(jsonb_build_object('user_id', r.user_id, 'kind', r.kind, 'at', r.created_at,
      'who', coalesce(pb_prod.member_name_or_null(r.company_id, r.user_id), (select u.email from auth.users u where u.id = r.user_id)),
      'email', (select u.email from auth.users u where u.id = r.user_id),
      'company', (select c.name from public.companies c where c.id = r.company_id)) order by r.created_at desc), '[]'::jsonb)
    from pb_billing.plan_requests r where r.done_at is null));
end $function$
;
