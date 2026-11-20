-- Undo billing_yearly_nov20: puts back the Nov 20 live text of the 3 replaced functions and removes pb_owner_sheets_read.
-- Keeps the plan_requests.billing_interval column (nullable, unused after undo). One migration.
drop function if exists public.pb_owner_sheets_read();
drop function if exists public.pb_owner_individual_on(uuid, text);
CREATE OR REPLACE FUNCTION public.pb_owner_individual_on(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  if exists (select 1 from public.subscriptions s where s.user_id = p_user) then
    update public.subscriptions set tier = 'individual', status = 'active', updated_at = now() where user_id = p_user;
  else
    insert into public.subscriptions (user_id, tier, status) values (p_user, 'individual', 'active');
  end if;
  update pb_billing.plan_requests set done_at = now() where user_id = p_user and kind = 'individual' and done_at is null;
  perform pb_billing.individual_open(p_user, 'month');  -- pricing Nov 20
  perform pb_audit.admin_note('individual_plan_on', null, p_user, null); -- r16.85
  return jsonb_build_object('ok', true);
end $function$
;
revoke all on function public.pb_owner_individual_on(uuid) from public;
do $a$ begin if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on function public.pb_owner_individual_on(uuid) from anon'; end if; end $a$;
grant execute on function public.pb_owner_individual_on(uuid) to authenticated;
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
CREATE OR REPLACE FUNCTION public.pb_plan_request(p_kind text DEFAULT 'individual'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_co uuid; v_kind text := case when p_kind = 'company' then 'company' else 'individual' end; v_n integer;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'code', 'pb:signed_out'); end if;
  select x.company_id into v_co from pb_billing.company_of(v_uid) x;
  insert into pb_billing.plan_requests (user_id, company_id, kind) values (v_uid, v_co, v_kind)
    on conflict (user_id, kind) do update set created_at = now(), done_at = null
      where pb_billing.plan_requests.done_at is not null;
  select count(*) into v_n from pb_support.messages m where m.user_id = v_uid and m.created_at > now() - interval '1 day';
  if v_n < 30 then
    insert into pb_support.messages (user_id, client_message_id, body, app_build, screen, kind, company_id)
      values (v_uid, 'plan-' || v_kind || '-' || to_char(now() at time zone 'utc', 'YYYYMMDD'),
              case when v_kind = 'company' then 'Asked for the company to start a paid plan (end of beta).' else 'Asked for an individual plan' || case when v_co is null then '.' else ' (end of beta).' end end
                || ' Price shown: $' || case when v_kind = 'company' then to_char(pb_billing.setting_int('base_cents', 9900) / 100.0, 'FM999990.00') || ' a month'
                     else to_char(pb_billing.setting_int('individual_cents', 1500) / 100.0, 'FM999990.00') || ' a month or $' || to_char(pb_billing.setting_int('individual_year_cents', 14400) / 100.0, 'FM999990.00') || ' a year' end || ', plus tax.',
              null, 'Beta ended', 'idea', v_co)
      on conflict (user_id, client_message_id) do nothing;
  end if;
  return jsonb_build_object('ok', true);
end $function$
;
notify pgrst, 'reload schema';
