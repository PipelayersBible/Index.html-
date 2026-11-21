-- 92_prompt_row_rollback.sql: put the live prompt row back to what it was before 02 (its first two elements, the stake-letters and prices appends).
update pb_ai.prompt_overrides l set text = r.t, note = l.note || ' | rolled back to the Nov 20 17:20 text'
  from (select 'EDITS' || jsonb_agg(e order by o)::text t from pb_ai.prompt_overrides p, jsonb_array_elements(substr(p.text,6)::jsonb) with ordinality x(e,o) where p.name='teacher_v2' and o <= 2) r
 where l.name = 'teacher_v2' and md5(r.t) = 'bbe7c4599587734e6727895da4f2e8d9';
-- Check: select md5(text) from pb_ai.prompt_overrides where name='teacher_v2';  -- expect bbe7c4599587734e6727895da4f2e8d9
