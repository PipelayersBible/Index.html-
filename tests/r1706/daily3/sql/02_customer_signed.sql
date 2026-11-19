-- daily3 #49: the office's Delays & extra work list (pb_daily_events_list, and every other reader of pb_daily.event_json)
-- says who signed an Extra work entry. Read from the signed report's own snapshot (events[].cust_sig, kept as the
-- foreman's phone sent it and covered by the report's fingerprint): name, title, time, zone and the two SHA-256s. The
-- drawn signature itself stays in the snapshot (pb_daily_get / the daily PDF). No new column, no change to
-- pb_daily.events_store. customer_signed is null when the entry has no signature; amended_after_signature is true when
-- the entry keeps earlier signed versions (prior[]).
-- Not applied. Same body as live (r17.04) plus the two keys at the end.

create or replace function pb_daily.event_json(e pb_daily.events)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select jsonb_build_object(
      'id', e.id, 'job_key', e.job_key, 'job_number', e.job_number, 'jobsite', (select r.jobsite from pb_daily.reports r where r.id = e.report_id), 'report_id', e.report_id, 'client_event_id', e.client_event_id,
      'work_date', e.work_date, 'kind', e.kind, 'reason', e.reason, 'detail', e.detail, 'hours', e.hours, 'crew_size', e.crew_size, 'equipment', e.equipment, 'photo_count', e.photo_count,
      'foreman', coalesce(nullif(btrim(coalesce(pb_crew.display_name(e.company_id, e.created_by), '')), ''), e.foreman_name, pb_daily.person(e.created_by)), 'status', e.status, 'rev', e.review_rev, 'reviewed_at', e.reviewed_at,
      'reviewed_by', case when e.reviewed_by is null then null else coalesce(pb_daily.person(e.reviewed_by), 'a manager') end, 'changed_after_review', e.changed_after_review,
      'history', pb_daily.event_history(e), 'created_at', e.created_at)
    || coalesce((select jsonb_build_object(
          'customer_signed', case when jsonb_typeof(x.v->'cust_sig') = 'object' and length(btrim(coalesce(x.v->'cust_sig'->>'name', ''))) > 0 then jsonb_build_object(
              'name', left(x.v->'cust_sig'->>'name', 120), 'title', left(x.v->'cust_sig'->>'title', 120), 'at', left(x.v->'cust_sig'->>'at', 40), 'tz', left(x.v->'cust_sig'->>'tz', 64),
              'png_sha256', left(x.v->'cust_sig'->>'png_sha', 64), 'entry_sha256', left(x.v->'cust_sig'->>'entry_sha', 64)) end,
          'amended_after_signature', case when jsonb_typeof(x.v->'prior') = 'array' then jsonb_array_length(x.v->'prior') > 0 else false end)
        from pb_daily.reports r, jsonb_array_elements(case when jsonb_typeof(r.snapshot->'events') = 'array' then r.snapshot->'events' else '[]'::jsonb end) x(v)
       where r.id = e.report_id and x.v->>'cid' = split_part(e.client_event_id, '#', 1)
       limit 1), jsonb_build_object('customer_signed', null::jsonb, 'amended_after_signature', false))
$function$;
-- event_json keeps its live grants (owner only; it is called by SECURITY DEFINER readers). create or replace keeps them.
