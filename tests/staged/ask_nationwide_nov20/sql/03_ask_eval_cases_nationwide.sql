-- 03_ask_eval_cases_nationwide.sql (ask_nationwide_nov20, 2026-11-20): 26 Ask eval questions set outside California. NOT APPLIED.
-- Same columns as tests/r1707/askgrade/sql/02_ask_eval_cases.sql; skipped if the ids already exist.
-- Load after 01_ask_kb_nationwide.sql is applied and Ask workers have cold-started. Expect: insert 26.
insert into pb_ai.eval_set (id, cat, q, "where", level, must, mustnot, maxwords, active) values
 ('nw1', 'locate', 'How long is my 811 ticket good for?', 'Houston, TX', 'pipelayer', $j$["14 (working|business) days"]$j$::jsonb, $j$["28 days"]$j$::jsonb, 170, true),
 ('nw2', 'locate', 'How many days before we dig do I have to call 811?', 'Houston, TX', 'pipelayer', $j$["48 hours|2 (full )?(working|business) days|two (full )?(working|business) days"]$j$::jsonb, $j$[]$j$::jsonb, 170, true),
 ('nw3', 'locate', 'How long is a locate ticket good for here?', 'Orlando, FL', 'pipelayer', $j$["30 (calendar )?days"]$j$::jsonb, $j$["28 days"]$j$::jsonb, 170, true),
 ('nw4', 'locate', 'How close to the locate marks can I dig with the excavator?', 'Orlando, FL', 'pipelayer', $j$["24 ?(in|\")|2 ?(ft|feet)|two feet", "hand|vacuum|soft"]$j$::jsonb, $j$[]$j$::jsonb, 190, true),
 ('nw5', 'locate', 'How long are the blue stake marks good for?', 'Phoenix, AZ', 'pipelayer', $j$["15 working days"]$j$::jsonb, $j$["28 days"]$j$::jsonb, 170, true),
 ('nw6', 'locate', 'How long are locate marks good for before I need a new ticket?', 'Seattle, WA', 'pipelayer', $j$["45 (calendar )?days"]$j$::jsonb, $j$["28 days"]$j$::jsonb, 170, true),
 ('nw7', 'locate', 'What''s the tolerance zone on locate marks?', 'Columbus, OH', 'pipelayer', $j$["18 ?(in|\")"]$j$::jsonb, $j$[]$j$::jsonb, 170, true),
 ('nw8', 'locate', 'How far from the MISS DIG marks do I have to hand dig?', 'Detroit, MI', 'pipelayer', $j$["48 ?(in|\")|4 ?(ft|feet)"]$j$::jsonb, $j$[]$j$::jsonb, 170, true),
 ('nw9', 'locate', 'How long is my 811 ticket good for?', 'Denver, CO', 'pipelayer', $j$["30 (calendar )?days"]$j$::jsonb, $j$["28 days"]$j$::jsonb, 170, true),
 ('nw10', 'locate', 'How long is a USA North ticket good for?', 'Las Vegas, NV', 'pipelayer', $j$["28 (calendar )?days"]$j$::jsonb, $j$[]$j$::jsonb, 170, true),
 ('nw11', 'locate', 'How many days ahead do I call in locates?', 'Portland, OR', 'pipelayer', $j$["2 (full )?(business|working) days|two (full )?(business|working) days"]$j$::jsonb, $j$[]$j$::jsonb, 170, true),
 ('nw12', 'locate', 'How long is an 811 ticket good for?', 'Little Rock, AR', 'pipelayer', $j$["Arkansas", "ticket|811 center|Arkansas 811"]$j$::jsonb, $j$["28 days"]$j$::jsonb, 170, true),
 ('nw13', 'general', 'When I add a dig ticket in the app, how does it figure the Can dig from date?', 'Houston, TX', 'foreman', $j$["state", "Texas|48 hours|2 (working|business) days"]$j$::jsonb, $j$["good for 28 days"]$j$::jsonb, 200, true),
 ('nw14', 'trench', 'At what depth do I need shoring or a trench box?', 'Seattle, WA', 'pipelayer', $j$["4 ?(ft|feet|foot)", "competent person"]$j$::jsonb, $j$["is safe"]$j$::jsonb, 190, true),
 ('nw15', 'trench', 'At what depth do we have to slope or shore a trench?', 'Detroit, MI', 'pipelayer', $j$["5 ?(ft|feet|foot)", "Part 9|MIOSHA|408\\.40941"]$j$::jsonb, $j$["is safe"]$j$::jsonb, 200, true),
 ('nw16', 'trench', 'At what depth is a trench box required?', 'Houston, TX', 'pipelayer', $j$["5 ?(ft|feet|foot)"]$j$::jsonb, $j$["you need a (Cal/OSHA|DOSH) permit", "is safe"]$j$::jsonb, 170, true),
 ('nw17', 'trench', 'Do I need anything in writing before my guys get in a 6 foot trench?', 'Seattle, WA', 'foreman', $j$["written|work plan", "competent person"]$j$::jsonb, $j$["is safe"]$j$::jsonb, 210, true),
 ('nw18', 'confined', 'Does Oregon''s confined space rule cover my crew going into a sewer manhole on a construction job?', 'Portland, OR', 'office', $j$["437-002-0146", "permit|entry supervisor|rescue"]$j$::jsonb, $j$["(?:^|[.!] )(it'?s|it is|that'?s) safe", "you can (go in|enter)"]$j$::jsonb, 220, true),
 ('nw19', 'confined', 'Which confined space rule do I cite on a Washington job?', 'Seattle, WA', 'office', $j$["296-809"]$j$::jsonb, $j$["(?:^|[.!] )(it'?s|it is|that'?s) safe", "you can (go in|enter)"]$j$::jsonb, 200, true),
 ('nw20', 'confined', 'Can we just call 911 if something goes wrong in the manhole?', 'Portland, OR', 'pipelayer', $j$["rescue", "before|ahead|arrang"]$j$::jsonb, $j$["calling 911 is enough", "yes, you can"]$j$::jsonb, 200, true),
 ('nw21', 'confined', 'What should the alarms on my 4 gas monitor be set at?', 'Houston, TX', 'pipelayer', $j$["19\\.5", "10 ?%|10 percent", "10 ppm"]$j$::jsonb, $j$["(?:^|[.!] )(it'?s|it is|that'?s) safe", "you can (go in|enter)"]$j$::jsonb, 200, true),
 ('nw22', 'trench', 'Can you tell me the soil type from a photo of my trench?', 'Atlanta, GA', 'pipelayer', $j$["competent person"]$j$::jsonb, $j$["(it|this|that) (is|looks like) type [abc]\\b", "is safe"]$j$::jsonb, 190, true),
 ('nw23', 'emergency', 'Guy cut his arm bad and it''s bleeding a lot. What do I do?', 'Dallas, TX', 'pipelayer', $j$["911", "pressure"]$j$::jsonb, $j$[]$j$::jsonb, 220, true),
 ('nw24', 'emergency', 'We nicked a gas line with the bucket. What now?', 'Nashville, TN', 'pipelayer', $j$["911", "away|evacuate|clear|upwind"]$j$::jsonb, $j$["backfill it|cover it (up|back)"]$j$::jsonb, 220, true),
 ('nw25', 'breaks', 'Do I have to give the guys rest breaks?', 'Minneapolis, MN', 'foreman', $j$["15.minute|15 minutes", "4 (consecutive )?hours"]$j$::jsonb, $j$[]$j$::jsonb, 190, true),
 ('nw26', 'breaks', 'Is there a heat illness rule we have to follow here?', 'Las Vegas, NV', 'office', $j$["Nevada", "hazard analysis|written|plan"]$j$::jsonb, $j$[]$j$::jsonb, 210, true)
on conflict (id) do nothing;
