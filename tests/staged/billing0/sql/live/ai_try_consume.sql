CREATE OR REPLACE FUNCTION public.ai_try_consume(p_user uuid, p_feature text, p_limit integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare used integer; lim integer; t record; cused integer; today date := (now() at time zone 'utc')::date; L jsonb; mused integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  -- Nov 16: trial companies: each feature has its own daily limit, plus one cap for the whole company
  select * into t from pb_billing.company_of(p_user) x where x.plan = 'trial' and not (x.expired and pb_billing.has_individual(p_user));
  if found then
    if t.expired then return -1; end if;
    lim := case when p_feature = 'gonogo_q' then p_limit else public.ai_feature_limit(p_user, p_feature) end;
    if coalesce(lim, 0) <= 0 then return -1; end if;
    if p_feature <> 'gonogo_q' then
      select coalesce(sum(u.count), 0) into cused from public.ai_usage u
        where u.day = today and u.feature <> 'gonogo_q'
          and u.user_id in (select m.user_id from public.company_members m where m.company_id = t.company_id
                            union select c.owner_user_id from public.companies c where c.id = t.company_id);
      if cused >= (pb_billing.trial_limits()->>'company_day')::int then return -1; end if;
    end if;
    select coalesce(sum(count), 0) into used from public.ai_usage where user_id = p_user and day = today and feature = p_feature;
    if used >= lim then return -1; end if;
    insert into public.ai_usage (user_id, day, feature, count) values (p_user, today, p_feature, 1)
    on conflict (user_id, day, feature) do update set count = public.ai_usage.count + 1;
    if lim <= p_limit then return used + 1; end if;
    return least(p_limit - case when used + 1 < lim then 1 else 0 end, ceil((used + 1)::numeric * p_limit / lim)::integer);
  end if;
  -- Nov 17 (owner): individual plan: stake 15 a day, Ask 5 a day (teacher + analysis), others 3 a day, 200 a month in all
  if p_feature <> 'gonogo_q' and pb_billing.individual_only(p_user) then
    L := pb_billing.individual_limits();
    select coalesce(sum(count), 0) into mused from public.ai_usage where user_id = p_user and feature <> 'gonogo_q'
      and day >= date_trunc('month', today)::date and day <= today;
    if mused >= (L->>'month')::int then return -1; end if;
    if p_feature = 'stake' then lim := (L->>'stake')::int;
      select coalesce(sum(count), 0) into used from public.ai_usage where user_id = p_user and day = today and feature = 'stake';
    elsif p_feature in ('teacher', 'analysis') then lim := (L->>'ask')::int;
      select coalesce(sum(count), 0) into used from public.ai_usage where user_id = p_user and day = today and feature in ('teacher', 'analysis');
    elsif p_feature = 'plans_strong' then return -1; -- plan reading is for company accounts
    else lim := (L->>'other')::int;
      select coalesce(sum(count), 0) into used from public.ai_usage where user_id = p_user and day = today and feature = p_feature;
    end if;
    if used >= lim then return -1; end if;
    insert into public.ai_usage (user_id, day, feature, count) values (p_user, today, p_feature, 1)
    on conflict (user_id, day, feature) do update set count = public.ai_usage.count + 1;
    if lim <= p_limit then return used + 1; end if;
    return least(p_limit - case when used + 1 < lim then 1 else 0 end, ceil((used + 1)::numeric * p_limit / lim)::integer);
  end if;
  if p_feature in ('ticket', 'analysis', 'gonogo_q', 'plans_strong') then  -- own allowances (owner, Oct 18: tickets; Ask v2: analysis, question-side classifier checks; v22: Opus plan reads)
    select coalesce(sum(count), 0) into used from public.ai_usage where user_id = p_user and day = today and feature = p_feature;
    if used >= p_limit then return -1; end if;
    insert into public.ai_usage (user_id, day, feature, count) values (p_user, today, p_feature, 1)
    on conflict (user_id, day, feature) do update set count = public.ai_usage.count + 1;
    return used + 1;
  end if;
  select coalesce(sum(count), 0) into used from public.ai_usage where user_id = p_user and day = today and feature not in ('ticket', 'analysis', 'gonogo_q', 'plans_strong');
  lim := greatest(p_limit, coalesce(public.ai_daily_limit(p_user), 0));
  if used >= lim then return -1; end if;
  insert into public.ai_usage (user_id, day, feature, count) values (p_user, today, p_feature, 1)
  on conflict (user_id, day, feature) do update set count = public.ai_usage.count + 1;
  if lim <= p_limit then return used + 1; end if;
  return least(p_limit - case when used + 1 < lim then 1 else 0 end, ceil((used + 1)::numeric * p_limit / lim)::integer);
end $function$
