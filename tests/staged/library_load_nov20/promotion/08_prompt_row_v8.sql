-- 08_prompt_row_v8.sql (lib8): copy teacher_v2@next (reply rule v8) to the live row teacher_v2. Run AFTER build d881cb695137 is on live.
-- Live row today (Nov 20 evening) = teacher_v2@next before lib8: md5 9968a8d39e4919bb8230f417bcadff5f (reply rule v7d e0687cba...).
select (select md5(e->>'reply_rule') from pb_ai.prompt_overrides p, jsonb_array_elements(substr(p.text,6)::jsonb) e where p.name='teacher_v2@next' and e ? 'reply_rule') = '21f9a08cdf5f8a67be0c11e3cb8d4161' as next_has_v8,
       (select md5(text) from pb_ai.prompt_overrides where name = 'teacher_v2') = '9968a8d39e4919bb8230f417bcadff5f' as live_unchanged;
-- Promote (both true):
update pb_ai.prompt_overrides l set text = n.text, note = l.note || ' | lib8: promoted from teacher_v2@next with Ask build d881cb695137 (reply rule v8: shorter, no elsewhere/common comparisons)'
  from pb_ai.prompt_overrides n where l.name = 'teacher_v2' and n.name = 'teacher_v2@next' and md5(l.text) = '9968a8d39e4919bb8230f417bcadff5f';
-- Check: select md5(text) = 'c0aa8fed6c3f15584aa9db8abea0a864' from pb_ai.prompt_overrides where name='teacher_v2';
