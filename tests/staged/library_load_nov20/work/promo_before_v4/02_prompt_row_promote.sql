-- 02_prompt_row_promote.sql: copy the test prompt row (teacher_v2@next) to the live row (teacher_v2). Run AFTER the build is on live.
-- The live row today = the first two elements of @next exactly (md5 bbe7c4599587734e6727895da4f2e8d9, checked Nov 20 by rebuilding it from @next).
-- Precheck: the @next row still carries reply rule v7c (md5 below = src_patch/reply_rule.txt) and the live row is unchanged since Nov 20 17:20.
select (select md5(e->>'reply_rule') from pb_ai.prompt_overrides p, jsonb_array_elements(substr(p.text,6)::jsonb) e where p.name='teacher_v2@next' and e ? 'reply_rule') = '8f15b056e6af17964b77a85456b10a18' as next_has_v7c,
       (select md5(text) from pb_ai.prompt_overrides where name = 'teacher_v2') = 'bbe7c4599587734e6727895da4f2e8d9' as live_unchanged;
-- Promote (both checks above must be true):
update pb_ai.prompt_overrides l set text = n.text, note = l.note || ' | Nov 20 evening: promoted from teacher_v2@next with Ask build lib7 (strictest rule, 20 ft engineer, follow-up delivers the offered table; reply rule v7c)'
  from pb_ai.prompt_overrides n where l.name = 'teacher_v2' and n.name = 'teacher_v2@next'
   and md5(l.text) = 'bbe7c4599587734e6727895da4f2e8d9';
-- Check: select md5(text) = (select md5(text) from pb_ai.prompt_overrides where name='teacher_v2@next') from pb_ai.prompt_overrides where name='teacher_v2';
