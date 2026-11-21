-- 06_eval_pattern_fixes.sql: widen 4 must-patterns of the existing eval set (the case was wrong, the answer right; read by hand, see ROUNDS.md).
-- Each new pattern keeps the old one as an alternative, so nothing that passed can fail. Guarded: changes a row only if the old pattern is still there.
-- ct4: "1-1/2 hours" is 90 minutes. nw12: Arkansas says "notice" for the 811 ticket. ph08: "doesn't know what kind of utility" = unknown. brk1: "2 unpaid 30-minute duty-free meals" has 30 characters between.
begin;
update pb_ai.eval_set set must = (select jsonb_agg(case when x = to_jsonb('90 ?min|1\.5 ?h'::text) then to_jsonb('90 ?min|1\.5 ?h|1[- ]1/2 ?h|one and a half hours?'::text) else x end) from jsonb_array_elements(must) x) where id = 'ct4' and must @> jsonb_build_array('90 ?min|1\.5 ?h'::text);
update pb_ai.eval_set set must = (select jsonb_agg(case when x = to_jsonb('ticket|811 center|Arkansas 811'::text) then to_jsonb('ticket|811 center|Arkansas 811|notice|notif'::text) else x end) from jsonb_array_elements(must) x) where id = 'nw12' and must @> jsonb_build_array('ticket|811 center|Arkansas 811'::text);
update pb_ai.eval_set set must = (select jsonb_agg(case when x = to_jsonb('unknown|unidentified'::text) then to_jsonb('unknown|unidentified|doesn.t know|don.t know|not (yet )?(known|identified)|unmarked'::text) else x end) from jsonb_array_elements(must) x) where id = 'ph08' and must @> jsonb_build_array('unknown|unidentified'::text);
update pb_ai.eval_set set must = (select jsonb_agg(case when x = to_jsonb('2 [^.]{0,25}meal|two [^.]{0,25}meal|second meal|second 30|2nd meal'::text) then to_jsonb('2 [^.]{0,35}meal|two [^.]{0,35}meal|second meal|second 30|2nd meal'::text) else x end) from jsonb_array_elements(must) x) where id = 'brk1' and must @> jsonb_build_array('2 [^.]{0,25}meal|two [^.]{0,25}meal|second meal|second 30|2nd meal'::text);
select id, must from pb_ai.eval_set where id in ('ct4','nw12','ph08','brk1');
commit;
