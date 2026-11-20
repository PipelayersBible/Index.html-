-- 02_ask_eval_cases_followups.sql (ask_followups_nov20, 2026-11-20): 5 Ask eval questions for the Washington trench chunks. NOT APPLIED.
-- Same columns as 03_ask_eval_cases_nationwide.sql; skipped if the ids exist. Load after 01_ask_kb_followups.sql. Expect: INSERT 0 5.
insert into pb_ai.eval_set (id, cat, q, "where", level, must, mustnot, maxwords, active) values
 ('wa1', 'trench', 'At what depth do I need shoring or a trench box?', 'Seattle, WA', 'pipelayer', $j$["4 ?(ft|feet|foot)", "296-155|Washington"]$j$::jsonb, $j$["is safe"]$j$::jsonb, 190, true),
 ('wa2', 'trench', 'Do I need a written plan before my guys get in a 6 foot trench?', 'Spokane, WA', 'foreman', $j$["written", "work plan|trench plan", "competent person"]$j$::jsonb, $j$["no written plan is (needed|required) (for|in) (a|this) 6"]$j$::jsonb, 200, true),
 ('wa3', 'trench', 'Type A soil and the trench is only open a few hours. Can I slope it at half to one?', 'Tacoma, WA', 'foreman', $j$["3/4|0\\.75|three.quarter", "Washington|296-155|Table N-1"]$j$::jsonb, $j$["yes,? (you can|1/2)", "is safe"]$j$::jsonb, 200, true),
 ('wa4', 'trench', 'Can the competent person leave the site while the crew is laying pipe in the trench?', 'Seattle, WA', 'foreman', $j$["on (the )?(job ?)?site|remain|stay", "competent person"]$j$::jsonb, $j$["is safe"]$j$::jsonb, 190, true),
 ('wa5', 'trench', 'Type A soil and the trench is only open a few hours. Can I slope it at half to one?', 'Houston, TX', 'foreman', $j$["1/2|half", "12 ?(ft|feet|foot)", "24 hours|short.term"]$j$::jsonb, $j$["Washington", "Table N-1", "is safe"]$j$::jsonb, 200, true)
on conflict (id) do nothing;
