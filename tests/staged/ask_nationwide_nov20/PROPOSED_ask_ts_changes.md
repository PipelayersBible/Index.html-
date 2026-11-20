# Proposed Ask code changes (not built, not applied) — /home/claude/ask_v24/src/ask.ts

Three small changes. Each was simulated with `tools/retr.mjs`, `tools/filter_sim2.mjs` and `tools/overdrop.mjs`.

## 1. Put the job's state in the first library search (line 517)
Today: `search(index, intent?.search ? q + " " + intent.search : q, {...})`. The job's state is known (`jobState`,
line 302) but is not in the search words, and the intent step does not see it either.
Proposed: when the question names no state, add the state's name:
`const stq = jobState && US_STATES[jobState] && !Object.values(US_STATES).some((n) => new RegExp("\\b" + n + "\\b", "i").test(q)) ? " " + US_STATES[jobState] : "";`
then search `q + stq + (intent?.search ? " " + intent.search : "")`.
Effect in the local check: 17 of 22 → 19 of 22 with the staged chunks (three 811 questions that do not name the state now find the state chunk; one Colorado trench-depth case got worse, so run the full eval before shipping); "do we get a lunch break" on a Texas job
finds the Texas chunk first time (today all 6 first hits are other states and are thrown away).

## 2. State filter: read title + topic, not source + first 300 characters (line 529)
Today: `otherStateOnly(title + source + text.slice(0, 300), jobState, q)`. A general chunk that merely cites one state's
manual is thrown away in the other 49 states (159 chunks; list: `node tools/overdrop.mjs`, `LIST=1` for every row).
Proposed: `otherStateOnly(`${h.title || ""} ${h.topic || ""}`, jobState, q)`.
Before shipping it: apply `sql/02_ask_kb_topic_tags_OPTIONAL.sql` (15 California-only chunks name California only in
their source line today). `node tools/filter_sim2.mjs TX` lists what changes: 186 chunks come back; the 31 it flags
were read one by one: the 15 tagged ones are California-only, the rest are general.
Also in `otherStateOnly`: "Virginia" matches inside "West Virginia", so West Virginia chunks pass on Virginia jobs.
Test `(?<!West )\bVirginia\b` for VA.

## 3. Prompt: state OSHA plans other than California (prompts_v2.ts line with "Cal/OSHA (Title 8) where the job is in California")
The teacher prompt tells the model to give the federal rule and, in California, the Cal/OSHA rule. Add: "In any other
state with its own OSHA plan (AK AZ HI IN IA KY MD MI MN NV NM NC OR SC TN UT VT VA WA WY), search the library for that
state's rule (search_knowledge with the state name) and give it next to the federal one; if the library has nothing for
that state, say the state plan may be stricter and name the state agency." Reason: for a rule question the six first
hits are all federal text (the OSHA library is weighted 1.6x), so the Michigan and Washington chunks are only found
when the model searches again.
