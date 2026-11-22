-- records_nov22 B6: the office filled in a day, then the foreman signs his own daily for that day (made offline, or he
-- didn't know). Today pb_daily_submit refuses his with pb:office_filled and the foreman's signed account of his own day
-- never reaches the company. Now both are kept: his goes in as his own report (foreman_uid = him); the office's stays
-- (for_foreman = him). The answer says office_filled: true so the phone can tell him the office had filled it in too.
-- (The function's text uses CRLF line ends, so the pieces are E'' strings.) Needs sql/_patchfn.sql.
-- APP follow-up: the office's daily list shows both for that day ("Foreman signed later"); Fill In warns the PM
-- "If Brandon signs his own later, both are kept." Undo: b6_daily_keep_both_undo.sql.
begin;
select pb_stage.patch_fn('public.pb_daily_submit(text,text,text,date,jsonb,text,text,timestamp with time zone,text,text,uuid,text,timestamp with time zone,boolean,uuid)'::regprocedure,
E'    return jsonb_build_object(\'ok\', false, \'code\', \'pb:office_filled\'); -- the office already filled this day in for him\r\n',
E'    perform set_config(\'pb_daily.office_filled_too\', \'on\', true); -- records_nov22 B6: his own is kept beside the office\'s\r\n');
select pb_stage.patch_fn('public.pb_daily_submit(text,text,text,date,jsonb,text,text,timestamp with time zone,text,text,uuid,text,timestamp with time zone,boolean,uuid)'::regprocedure,
E'\'sha_matches\', v_r.server_sha256 = v_r.snapshot_sha256, \'phone_clock_ahead_s\', v_r.phone_clock_ahead_s, \'events\', (select count(*) from pb_daily.events e where e.report_id = v_r.id));',
E'\'sha_matches\', v_r.server_sha256 = v_r.snapshot_sha256, \'phone_clock_ahead_s\', v_r.phone_clock_ahead_s, \'events\', (select count(*) from pb_daily.events e where e.report_id = v_r.id),\r\n    \'office_filled\', coalesce(current_setting(\'pb_daily.office_filled_too\', true), \'\') = \'on\');');
commit;
