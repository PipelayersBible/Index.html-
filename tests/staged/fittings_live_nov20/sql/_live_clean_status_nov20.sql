CREATE OR REPLACE FUNCTION pb_prod.clean_status(p jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select jsonb_strip_nulls(jsonb_build_object(
    'sessionRef', pb_prod.short_text(p->'sessionRef', 60),
    'runRef', pb_prod.short_text(p->'runRef', 100),
    'jobNumber', pb_prod.short_text(p->'jobNumber', 60),
    'jobsite', pb_prod.short_text(p->'jobsite', 120),
    'label', pb_prod.short_text(p->'label', 120),
    'workDate', pb_prod.short_text(p->'workDate', 10),
    'totalFt', pb_prod.num(p->'totalFt', 100000),
    'laidFt', pb_prod.num(p->'laidFt', 100000),
    'laidToFt', pb_prod.num(p->'laidToFt', 100000),
    'laidToStation', pb_prod.short_text(p->'laidToStation', 30),
    'lastLaidAt', pb_prod.phone_ms(p->'lastLaidAt'),
    'rowsTotal', pb_prod.num(p->'rowsTotal', 100000),
    'rowsLaid', pb_prod.num(p->'rowsLaid', 100000),
    'startedAt', pb_prod.phone_ms(p->'startedAt'),
    'ended', case when jsonb_typeof(p->'ended') = 'boolean' then (p->>'ended')::boolean end,
    'endedAt', pb_prod.phone_ms(p->'endedAt'),
    'phoneAt', pb_prod.phone_ms(p->'phoneAt'),
    -- batch 17 END
    'endLate', case when jsonb_typeof(p->'endLate') = 'boolean' then (p->>'endLate')::boolean end,
    'endEnteredAt', pb_prod.phone_ms(p->'endEnteredAt'),
    'endStation', pb_prod.short_text(p->'endStation', 30),
    'endFt', pb_prod.num(p->'endFt', 100000),
    'endVia', case when p->>'endVia' in ('next_day', 'push') then p->>'endVia' end,
    'tz', case when jsonb_typeof(p->'tz') = 'string' and p->>'tz' ~ '^[A-Za-z0-9_+/-]{1,64}$' then p->>'tz' end,
    -- batch 29 ROLES: this session's feet to the entered end (the phone's own pre-fill), for the foreman's entry
    'endSessFt', pb_prod.num(p->'endSessFt', 100000),
    'foremanId', case when p->>'foremanId' = 'none' or p->>'foremanId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p->>'foremanId' end, /* r15.48 access: the foreman picked on Run Setup */
    -- r16.06 Live now: pipe type and this session's feet per pipe size
    'pipeType', pb_prod.short_text(p->'pipeType', 60),
    'pipe', (select jsonb_agg(jsonb_build_object('in', pb_prod.num(x.e->'in', 200), 'ft', pb_prod.num(x.e->'ft', 100000)) order by x.i)
             from jsonb_array_elements(case when jsonb_typeof(p->'pipe') = 'array' then p->'pipe' else '[]'::jsonb end) with ordinality x(e, i)
             where x.i <= 8 and jsonb_typeof(x.e) = 'object' and pb_prod.num(x.e->'ft', 100000) is not null)))
$function$;
