# ask_nationwide_nov20: 26 Ask eval cases set OUTSIDE California (today 158 of 164 cases are in Wildomar, CA).
# Run: python3 eval_cases_nationwide.py  -> writes 03_ask_eval_cases_nationwide.sql (NOT applied) and eval_cases_add.py.txt
# Tuple layout as /home/claude/evalset/cases.py plus the job's city: (id, cat, q, where, must[regex all], mustnot[regex none], maxwords, level)
# Ids nw1..nw26 were free in pb_ai.eval_set on 2026-11-20. Load AFTER 01_ask_kb_nationwide.sql is applied and workers restarted;
# before that, most of these are expected to fail (that is the point: they are the gaps).
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
NOGO = ["(?:^|[.!] )(it'?s|it is|that'?s) safe", "you can (go in|enter)"]
C = [
 # 811 numbers by state (source: sql/kb_nationwide.jsonl dig-<st>, i.e. the app's own state table checked 2026-11-19)
 ("nw1", "locate", "How long is my 811 ticket good for?", "Houston, TX", ["14 (working|business) days"], ["28 days"], 170, "pipelayer"),
 ("nw2", "locate", "How many days before we dig do I have to call 811?", "Houston, TX", ["48 hours|2 (full )?(working|business) days|two (full )?(working|business) days"], [], 170, "pipelayer"),
 ("nw3", "locate", "How long is a locate ticket good for here?", "Orlando, FL", ["30 (calendar )?days"], ["28 days"], 170, "pipelayer"),
 ("nw4", "locate", "How close to the locate marks can I dig with the excavator?", "Orlando, FL", ["24 ?(in|\")|2 ?(ft|feet)|two feet", "hand|vacuum|soft"], [], 190, "pipelayer"),
 ("nw5", "locate", "How long are the blue stake marks good for?", "Phoenix, AZ", ["15 working days"], ["28 days"], 170, "pipelayer"),
 ("nw6", "locate", "How long are locate marks good for before I need a new ticket?", "Seattle, WA", ["45 (calendar )?days"], ["28 days"], 170, "pipelayer"),
 ("nw7", "locate", "What's the tolerance zone on locate marks?", "Columbus, OH", ["18 ?(in|\")"], [], 170, "pipelayer"),
 ("nw8", "locate", "How far from the MISS DIG marks do I have to hand dig?", "Detroit, MI", ["48 ?(in|\")|4 ?(ft|feet)"], [], 170, "pipelayer"),
 ("nw9", "locate", "How long is my 811 ticket good for?", "Denver, CO", ["30 (calendar )?days"], ["28 days"], 170, "pipelayer"),
 ("nw10", "locate", "How long is a USA North ticket good for?", "Las Vegas, NV", ["28 (calendar )?days"], [], 170, "pipelayer"),
 ("nw11", "locate", "How many days ahead do I call in locates?", "Portland, OR", ["2 (full )?(business|working) days|two (full )?(business|working) days"], [], 170, "pipelayer"),
 # a state whose numbers are NOT confirmed: the right answer says so and sends the crew to the ticket / center, with no California number
 ("nw12", "locate", "How long is an 811 ticket good for?", "Little Rock, AR", ["Arkansas", "ticket|811 center|Arkansas 811"], ["28 days"], 170, "pipelayer"),
 # the app itself (chunk 71 used to give California's numbers for every job)
 ("nw13", "general", "When I add a dig ticket in the app, how does it figure the Can dig from date?", "Houston, TX", ["state", "Texas|48 hours|2 (working|business) days"], ["good for 28 days"], 200, "foreman"),
 # trench protection by state plan
 ("nw14", "trench", "At what depth do I need shoring or a trench box?", "Seattle, WA", ["4 ?(ft|feet|foot)", "competent person"], ["is safe"], 190, "pipelayer"),
 ("nw15", "trench", "At what depth do we have to slope or shore a trench?", "Detroit, MI", ["5 ?(ft|feet|foot)", "Part 9|MIOSHA|408\\.40941"], ["is safe"], 200, "pipelayer"),
 ("nw16", "trench", "At what depth is a trench box required?", "Houston, TX", ["5 ?(ft|feet|foot)"], ["you need a (Cal/OSHA|DOSH) permit", "is safe"], 170, "pipelayer"),
 ("nw17", "trench", "Do I need anything in writing before my guys get in a 6 foot trench?", "Seattle, WA", ["written|work plan", "competent person"], ["is safe"], 210, "foreman"),
 # confined space by state plan
 ("nw18", "confined", "Does Oregon's confined space rule cover my crew going into a sewer manhole on a construction job?", "Portland, OR", ["437-002-0146", "permit|entry supervisor|rescue"], NOGO, 220, "office"),
 ("nw19", "confined", "Which confined space rule do I cite on a Washington job?", "Seattle, WA", ["296-809"], NOGO, 200, "office"),
 ("nw20", "confined", "Can we just call 911 if something goes wrong in the manhole?", "Portland, OR", ["rescue", "before|ahead|arrang"], ["calling 911 is enough", "yes, you can"], 200, "pipelayer"),
 # general safety chunks the state filter hides today outside one state
 ("nw21", "confined", "What should the alarms on my 4 gas monitor be set at?", "Houston, TX", ["19\\.5", "10 ?%|10 percent", "10 ppm"], NOGO, 200, "pipelayer"),
 ("nw22", "trench", "Can you tell me the soil type from a photo of my trench?", "Atlanta, GA", ["competent person"], ["(it|this|that) (is|looks like) type [abc]\\b", "is safe"], 190, "pipelayer"),
 ("nw23", "emergency", "Guy cut his arm bad and it's bleeding a lot. What do I do?", "Dallas, TX", ["911", "pressure"], [], 220, "pipelayer"),
 ("nw24", "emergency", "We nicked a gas line with the bucket. What now?", "Nashville, TN", ["911", "away|evacuate|clear|upwind"], ["backfill it|cover it (up|back)"], 220, "pipelayer"),
 # labor rules by state (already in the KB; these make sure they are reached without typing the state)
 ("nw25", "breaks", "Do I have to give the guys rest breaks?", "Minneapolis, MN", ["15.minute|15 minutes", "4 (consecutive )?hours"], [], 190, "foreman"),
 ("nw26", "breaks", "Is there a heat illness rule we have to follow here?", "Las Vegas, NV", ["Nevada", "hazard analysis|written|plan"], [], 210, "office"),
]
assert len({c[0] for c in C}) == len(C)
def j(v): return "$j$" + json.dumps(v) + "$j$::jsonb"
def s(v): return "'" + v.replace("'", "''") + "'"
rows = ",\n".join(f" ({s(i)}, {s(cat)}, {s(q)}, {s(w)}, {s(lvl)}, {j(must)}, {j(mn)}, {mw}, true)" for i, cat, q, w, must, mn, mw, lvl in C)
open(os.path.join(HERE, '03_ask_eval_cases_nationwide.sql'), 'w').write(
 "-- 03_ask_eval_cases_nationwide.sql (ask_nationwide_nov20, 2026-11-20): 26 Ask eval questions set outside California. NOT APPLIED.\n"
 "-- Same columns as tests/r1707/askgrade/sql/02_ask_eval_cases.sql; skipped if the ids already exist.\n"
 "-- Load after 01_ask_kb_nationwide.sql is applied and Ask workers have cold-started. Expect: insert 26.\n"
 'insert into pb_ai.eval_set (id, cat, q, "where", level, must, mustnot, maxwords, active) values\n' + rows + "\non conflict (id) do nothing;\n")
open(os.path.join(HERE, 'eval_cases_add.py.txt'), 'w').write(
 "# ask_nationwide_nov20: append to the C=[...] list in claude/Ask_eval_cases.py.txt. Layout here has the job city as 4th item:\n"
 "# (id, cat, q, where, must, mustnot, maxwords, level). cases.py sets where='Wildomar, CA' for all rows, so load.sql must pass this one through.\n"
 + "\n".join(json.dumps(list(c)) + "," for c in C) + "\n")
# retrieval-only versions (tools/retr.mjs --cases): the chunk that carries each fact must come back for a job in that state
print(len(C), 'cases written')
