-- fittings_live #01 (Nov 20 2026): the phone's live run status keeps today's fittings ("fit"). STAGED, not applied.
-- What changes: pb_prod.clean_status (the whitelist every live status passes through in pb_prod_run_status_put)
-- keeps one more field, "fit", strictly checked by the new helper pb_prod.whole (whole JSON numbers, capped).
-- Nothing else: the status is stored whole in pb_prod.run_status.status and pb_prod.live_row hands that whole
-- status to the company board (pb_prod_company_live) and the foreman's crew board (pb_prod_crew_live), so both
-- reads return "fit" with no change of their own (02_test.sql proves it).
-- Same owner, language, volatility and search_path as today (clean_status is a plain STABLE sql function, not
-- SECURITY DEFINER: it is only ever called from the SECURITY DEFINER pb_prod_run_status_put; no grants, as today).
-- The clean_status text keeps the live function's Windows line ends, so 99_undo.sql returns it byte for byte.
begin;
CREATE OR REPLACE FUNCTION pb_prod.whole(p jsonb, p_max integer)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare v numeric;
begin
  if p is null or jsonb_typeof(p) <> 'number' then return null; end if; -- a JSON number only: no text, no true/false
  begin v := (p #>> '{}')::numeric; exception when others then return null; end;
  if v is null or v = 'NaN'::numeric or v < 0 or v > p_max or v <> trunc(v) then return null; end if;
  return v::integer;
end $function$;
revoke all on function pb_prod.whole(jsonb, integer) from public, anon, authenticated;
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
             where x.i <= 8 and jsonb_typeof(x.e) = 'object' and pb_prod.num(x.e->'ft', 100000) is not null),
    -- fittings_live (Nov 20 2026): this session's fittings laid so far, for the office's Today table.
    -- n = laid, of = on the run this session; tw / b / s / o = tees and wyes, bends, structures, other.
    -- Whole JSON numbers 0 to 500 only. No n: no fit at all. of below n: dropped. Types not adding up to n: dropped.
    'fit', (select case when f.n is null then null else jsonb_build_object('n', f.n, 'of', case when f.o_f >= f.n then f.o_f end,
                'tw', case when f.typed then f.tw end, 'b', case when f.typed then f.b end, 's', case when f.typed then f.s end, 'o', case when f.typed then f.o end) end
            from (select g.*, (g.tw is not null or g.b is not null or g.s is not null or g.o is not null)
                           and coalesce(g.tw, 0) + coalesce(g.b, 0) + coalesce(g.s, 0) + coalesce(g.o, 0) = g.n as typed
                  from (select pb_prod.whole(p->'fit'->'n', 500) as n, pb_prod.whole(p->'fit'->'of', 500) as o_f, pb_prod.whole(p->'fit'->'tw', 500) as tw,
                               pb_prod.whole(p->'fit'->'b', 500) as b, pb_prod.whole(p->'fit'->'s', 500) as s, pb_prod.whole(p->'fit'->'o', 500) as o
                        where jsonb_typeof(p->'fit') = 'object') g) f)))
$function$;
commit;
