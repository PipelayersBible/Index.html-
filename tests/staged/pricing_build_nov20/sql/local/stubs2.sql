-- Extra local stand-ins for the pricing build (shapes and bodies from live, read Nov 20 2026). Loaded after base/.
create schema storage; create schema pb_docs;
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner_id text, created_at timestamptz default now(), metadata jsonb);
create table pb_billing.ai_cost (day date, user_id uuid, feature text, n integer, usd numeric, primary key (day, user_id, feature));
create table pb_support.messages (id bigserial primary key, user_id uuid, client_message_id text, body text, app_build text, screen text, kind text, company_id uuid, created_at timestamptz default now(), unique (user_id, client_message_id));
create function pb_prod.my_company(p uuid) returns uuid language sql stable as $$ select m.company_id from public.company_members m where m.user_id = p $$;
CREATE OR REPLACE FUNCTION public.ai_cost_add(p_user uuid, p_feature text, p_usd numeric)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  insert into pb_billing.ai_cost (day, user_id, feature, n, usd)
  values ((now() at time zone 'utc')::date, p_user, left(coalesce(p_feature, '?'), 40), 1, greatest(0, least(coalesce(p_usd, 0), 50)))
  on conflict (day, user_id, feature) do update set n = pb_billing.ai_cost.n + 1, usd = pb_billing.ai_cost.usd + excluded.usd
$function$
;
CREATE OR REPLACE FUNCTION public.ai_refund(p_user uuid, p_feature text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.ai_usage set count = greatest(count - 1, 0)
  where user_id = p_user and day = (now() at time zone 'utc')::date and feature = p_feature;
$function$
;
CREATE OR REPLACE FUNCTION public.pb_storage_put_ok(p_bucket text, p_cap integer, p_need_company boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select auth.uid() is not null
     and (not p_need_company or pb_prod.my_company(auth.uid()) is not null)
     and (select count(*) from storage.objects o
           where o.bucket_id = p_bucket and o.owner_id = auth.uid()::text
             and o.created_at > now() - interval '1 day') < p_cap
$function$
;
CREATE OR REPLACE FUNCTION pb_plans.limits()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select jsonb_build_object('sheets_month', 1500, 'usd_month', 300, 'sets_day', 20, 'pages_set', 400)
$function$
;
CREATE OR REPLACE FUNCTION pb_docs.limits(p_kind text)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when p_kind = 'individual' then '{"bytes_total": 52428800, "file_bytes": 26214400, "file_pages": 200, "ai_pages_month": 100, "uploads_day": 10, "shares_day_owner": 3, "shares_day_user": 3, "chars_doc_max": 1000000, "share_max_pages": 120, "check_usd_month": 5}'::jsonb
              else '{"bytes_total": 1073741824, "file_bytes": 52428800, "file_pages": 1500, "ai_pages_month": 1500, "uploads_day": 30, "shares_day_owner": 20, "shares_day_user": 10, "chars_doc_max": 6000000, "share_max_pages": 120, "check_usd_month": 20}'::jsonb end
$function$
;
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
  perform pb_audit.admin_note('individual_plan_on', null, p_user, null); -- r16.85
  return jsonb_build_object('ok', true);
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
              case when v_kind = 'company' then 'Asked for the company to start a paid plan (end of beta).' else 'Asked for an individual plan (end of beta).' end,
              null, 'Beta ended', 'idea', v_co)
      on conflict (user_id, client_message_id) do nothing;
  end if;
  return jsonb_build_object('ok', true);
end $function$
;
-- pb_plans_begin: a SHORT stand-in (the live one needs pb_docs / pb_prod helpers). It keeps the live lines the patch and
-- the limits touch: the anchor line, the month's dollars and sheets, the day's sets.
CREATE OR REPLACE FUNCTION public.pb_plans_begin(p_job text, p_title text, p_pages integer, p_sha256 text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_key text := p_job;
  v_id uuid; v_lim jsonb := pb_plans.limits(); v_usd numeric; v_sheets int; v_day int;
begin
  v_company := (select x.company_id from pb_billing.company_of(v_uid) x);
  if v_company is null then return jsonb_build_object('ok', false, 'code', 'pb:not_allowed', 'message', 'Plan sets are for company accounts.'); end if;
  if v_key = '' then return jsonb_build_object('ok', false, 'code', 'pb:no_job', 'message', 'Pick the job first.'); end if;
  if p_pages is null or p_pages < 1 or p_pages > (v_lim->>'pages_set')::int then return jsonb_build_object('ok', false, 'code', 'pb:too_many_pages', 'message', 'Plan sets up to ' || (v_lim->>'pages_set') || ' sheets. Split it.'); end if;
  select coalesce(sum(s.usd), 0), coalesce(sum(s.pages), 0) into v_usd, v_sheets from pb_plans.sets s
    where s.company_id = v_company and s.created_at >= date_trunc('month', now());
  if v_usd >= (v_lim->>'usd_month')::numeric then return jsonb_build_object('ok', false, 'code', 'pb:cost_cap', 'message', 'This month''s plan reading budget is used up.'); end if;
  if v_sheets + p_pages > (v_lim->>'sheets_month')::int then
    return jsonb_build_object('ok', false, 'code', 'pb:sheets_month', 'message', 'That''s over this month''s ' || (v_lim->>'sheets_month') || ' plan sheets (' || greatest(0, (v_lim->>'sheets_month')::int - v_sheets) || ' left).');
  end if;
  select count(*) into v_day from pb_plans.sets s where s.company_id = v_company and s.created_at > now() - interval '1 day';
  if v_day >= (v_lim->>'sets_day')::int then return jsonb_build_object('ok', false, 'code', 'pb:rate', 'message', 'That''s today''s plan set limit. Try again tomorrow.'); end if;
  insert into pb_plans.sets (company_id, owner_user, created_by, job_key, job_number, title, pages, sha256)
    values (v_company, null, v_uid, v_key, left(btrim(p_job), 60), left(btrim(coalesce(nullif(p_title, ''), 'Plans')), 200), p_pages, p_sha256)
    returning id into v_id;
  return jsonb_build_object('ok', true, 'set_id', v_id);
end $function$
;
