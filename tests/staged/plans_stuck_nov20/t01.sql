do $t$
declare n int; s1 text; s2 text; s3 text; more boolean; r jsonb;
begin
  more := public.pb_plans_svc_more();
  r := public.pb_plans_svc_take(0);  -- puts the two stale sheets back (tries<3 -> queued) and finishes sets with nothing open
  select state into s1 from pb_plans.sets where id = 'ad730739-823f-480f-8ec1-75e6bb3d8f15';
  select string_agg(h.state, ',' order by h.page) into s2 from pb_plans.sheets h where h.set_id = 'f138a487-7625-42ae-810a-32b38290ed74' and h.state <> 'done';
  select string_agg(h.state, ',' order by h.page) into s3 from pb_plans.sheets h where h.set_id = '62e671c1-ddd3-4b7e-bf18-5fb7495cba01' and h.state <> 'done';
  raise exception 'RESULT more_before=% take=% ad73=% f138_open=% 62e6_open=% removed_set=%', more, jsonb_array_length(r), s1, s2, s3,
    (select state from pb_plans.sets where id::text like '89243b57%');
end $t$;
