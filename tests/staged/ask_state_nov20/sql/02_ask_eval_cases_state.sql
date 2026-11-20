-- 02_ask_eval_cases_state.sql (ask_state_nov20, 2026-11-20): 10 Ask eval questions for "always state-aware". NOT APPLIED.
-- Needs the ask_state build on the slot being tested: where = 'none' means a job with NO state (older builds read it as a place name).
-- Same columns as 03_ask_eval_cases_nationwide.sql; skipped if the ids exist. Expect: insert 10.
insert into pb_ai.eval_set (id, cat, q, "where", level, must, mustnot, maxwords, active) values
 -- no state known: one short question, and no state's number given as theirs
 ('sa1', 'state', 'How long is my 811 ticket good for?', 'none', 'pipelayer', $j$["which state"]$j$::jsonb, $j$["28 days", "14 working days", "is good for \\d+ (calendar|working|business) days"]$j$::jsonb, 120, true),
 ('sa2', 'state', 'Do I have to give the guys a lunch break?', 'none', 'foreman', $j$["which state"]$j$::jsonb, $j$["after 5 hours", "fifth hour"]$j$::jsonb, 120, true),
 -- no state known, but the answer is the same everywhere: just answer, never ask
 ('sa3', 'state', 'What is SDR 35?', 'none', 'pipelayer', $j$["35", "sewer|gravity"]$j$::jsonb, $j$["which state"]$j$::jsonb, 170, true),
 ('sa4', 'state', 'The trench just caved in on a guy what do we do', 'none', 'pipelayer', $j$["911"]$j$::jsonb, $j$["which state"]$j$::jsonb, 220, true),
 ('sa5', 'state', 'How far apart do ladders have to be in a trench?', 'none', 'pipelayer', $j$["25 ?(ft|feet)"]$j$::jsonb, $j$["which state"]$j$::jsonb, 170, true),
 -- a state is known: questions that do not change by state do not drag it in
 ('sa6', 'state', 'What''s the fall over 250 feet at 0.5% slope?', 'Houston, TX', 'pipelayer', $j$["1\\.25"]$j$::jsonb, $j$["Texas", "which state"]$j$::jsonb, 120, true),
 -- West Virginia is not Virginia (and the other way round)
 ('sa7', 'state', 'Do I have to give the guys a lunch break?', 'Charleston, WV', 'foreman', $j$["West Virginia", "20.minute|20 minutes", "6 (or more )?(consecutive )?hours"]$j$::jsonb, $j$["which state"]$j$::jsonb, 190, true),
 ('sa8', 'state', 'Do I have to give the guys a lunch break?', 'Richmond, VA', 'foreman', $j$["Virginia", "no (state )?(law|requirement)|not require|federal"]$j$::jsonb, $j$["West Virginia", "20.minute meal", "which state"]$j$::jsonb, 190, true),
 -- the question names another state's 811 center: answer for that one
 ('sa9', 'state', 'How long is a MISS DIG ticket good for?', 'Columbus, OH', 'pipelayer', $j$["21 days"]$j$::jsonb, $j$["which state"]$j$::jsonb, 170, true),
 -- a state plan the library has nothing on yet: say so, give federal, name who to check with (no made-up state rule)
 ('sa10', 'state', 'At what depth is a trench box required?', 'Louisville, KY', 'pipelayer', $j$["5 ?(ft|feet|foot)", "Kentucky"]$j$::jsonb, $j$["which state", "is safe"]$j$::jsonb, 190, true)
on conflict (id) do nothing;
