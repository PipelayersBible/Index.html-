-- undo records_nov22 B6
begin;
select pb_stage.patch_fn('public.pb_daily_submit(text,text,text,date,jsonb,text,text,timestamp with time zone,text,text,uuid,text,timestamp with time zone,boolean,uuid)'::regprocedure,
E'    perform set_config(\'pb_daily.office_filled_too\', \'on\', true); -- records_nov22 B6: his own is kept beside the office\'s\r\n',
E'    return jsonb_build_object(\'ok\', false, \'code\', \'pb:office_filled\'); -- the office already filled this day in for him\r\n');
select pb_stage.patch_fn('public.pb_daily_submit(text,text,text,date,jsonb,text,text,timestamp with time zone,text,text,uuid,text,timestamp with time zone,boolean,uuid)'::regprocedure,
E',\r\n    \'office_filled\', coalesce(current_setting(\'pb_daily.office_filled_too\', true), \'\') = \'on\');', E');');
commit;
