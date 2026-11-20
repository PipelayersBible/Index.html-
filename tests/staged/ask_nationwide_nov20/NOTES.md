# Ask, nationwide rules (ask_nationwide_nov20, Nov 20 2026)

Read-only work. Nothing was written to the server, deployed, committed or pushed. Everything here is staged.

**In one line:** Ask's library is strong on federal OSHA, California and (for labor law) all 50 states, but for a job
outside California it has no 811 numbers for 48 states, almost no state-OSHA-plan rules, and a state filter that
hides 159 general chunks (including bleeding first aid and the trench quick reference) on most jobs.

## What I looked at
- Live library `pb_ai.kb_chunks`, version `b3e91f6c47d2`, 2,784 rows (app 238, field 2,268, OSHA text 278).
  Local copy: `work/kb_live.json` (the Nov 18 dump plus the edits applied since; every edited row checked against
  live md5 prefixes today).
- Live Ask code: `/home/claude/ask_v24/src` (build b4ad91749f6f): first search at `ask.ts:517`, state filter at
  `ask.ts:181-196` and `:529`, the model's own second search `tools.ts:779` (not state filtered).
- Eval set `pb_ai.eval_set`: 164 rows. **158 are set in Wildomar, CA**; 6 in other states (brk2, brk3, dw3, tc3-5).
- The app's own state table (live since r17.06): `tests/r1706/staterules/data/state_rules.json`, 51 rows, checked
  Nov 19 2026.

## 1. Coverage map (what the library has today)

"Named" = a chunk that names the state and carries that state's rule, not "check your state".

| Topic | Federal | States covered today | Missing | Staged here |
|---|---|---|---|---|
| Trench / shoring | Full: Subpart P text + plain chunks | CA, WA (4 ft, June 2026 work plan) | The other 19 plan states | MI (own rule, Part 9); one chunk listing AZ, NV, NM, OR, UT as adopting federal |
| Confined space | Full: Subpart AA + 1910.146 text | CA (Title 8 1950-1962) | The other 20 plan states | OR, WA |
| 811 wait, ticket life, tolerance | n/a (state law) | CA in depth; Iowa numbers used as examples | 48 states + DC: the state rows say "check the current rules" | **51 chunks** (wait confirmed for 43, ticket life 38, tolerance 35; AR, LA, MT have none confirmed and say so) |
| Lockout before entry | Yes (added Nov 19) | CA (3314, 1953) | Other plan states not checked | - |
| Heat illness | Status of federal rule + guidance | **All 50 + DC** have a line (checked Nov 5) | - | VA line updated (2026 law) |
| Traffic control | MUTCD 11th ed. numbers | CA MUTCD named only | State MUTCD supplements, state flagger card rules | - |
| Silica | Table 1 text + plain chunks | CA mention | Plan-state differences not checked | - |
| Fall protection | **Thin**: only trench crossings, covers and guardrails (1926.501/502 in plain words); no Subpart M text | none | Federal Subpart M text; all state rules | - |
| Competent person | Yes | CA, WA (on site) | Others | MI (ongoing inspection) |
| Digging near utilities | Pothole, hand dig, damage steps | CA | State tolerance numbers | In the 51 chunks |
| Water / sewer specs | AWWA, Ten States | All 50 + DC name their spec books; depth for CA, WA, OR, UT, IA, AZ (MAG), NV (Clark), KC metro | Separation numbers for most states | - |
| Meal / rest breaks, overtime, pay | FLSA, Davis-Bacon | **All 50 + DC**, 5 chunks each (checked Nov 5) | - | - |

Target was federal + 22 plans + 811 for 50 states. After this batch: 811 is covered for all 51 (honestly marked
where not confirmed); state plans are covered for CA, WA, MI and partly OR, and named as "adopts federal" for AZ,
NV, NM, UT. Thirteen plans are still unread for trench rules: AK, HI, IN, IA, KY, MD, MN, NC, SC, TN, VT, VA, WY.

Tool: `python3 tools/coverage.py`.

## 2. Wrong, outdated or California-only answers (ranked by what a crew would feel)

**F1. Ask tells every state the California 811 numbers when asked about the app.** App chunk 71
(`app-howto-locates-1`) says "Can dig from (2 working days after the call…) and Start work by (14 days after the
call); a ticket is good for 28 days (Settings › Company: 'A new dig ticket is good for (days)')". Since r17.06 the app
uses the job's state, and that setting is gone. The chunk names no state, so it is kept on every job.
Reproduce: `node tools/retr.mjs "how long is my 811 ticket good for" TX` → chunk 71 is the top hit and the only
one with numbers. Texas is 14 working days (RRC rule; https://www.texas811.org/faq for the 2 business days).
Chunk 235 has the same stale setting. Both edits are staged.

**F2. The state filter hides 159 general chunks on most jobs.** It drops a chunk when the title, the *source line*
or the first 300 characters name another state. So a general chunk that cites one state's manual disappears in
the other 49. Checked one by one with the live filter code (`node tools/overdrop.mjs`, `LIST=1` for every row):
- Bleeding first aid (699-701, "Stop the Bleed") is hidden outside Florida (source cites a Florida DOH card).
  `node tools/retr.mjs "how do I stop bad bleeding from a cut on the arm" TX` → the 3 best hits are dropped.
- The trench quick reference (1912) is hidden in 48 states **since the Nov 18 edit** that added "Washington
  requires it at 4 ft… California…" inside the first 300 characters.
- 4-gas monitor alarm points (1511) hidden outside California; "Can Ask classify soil from a photo? No" and 11
  more soil chunks (2157-2177) hidden outside Washington (source says "as adopted in WAC…"); the six general 811
  chunks (2010-2016) and the locate quick reference (1913) hidden outside Iowa; "yellow plastic pipe = gas, stop"
  (331) hidden outside California; water/sewer separation (1920, 1926, 1927) hidden outside Virginia.
- Also: "Virginia" matches inside "West Virginia", so West Virginia chunks pass on Virginia jobs (checked).
Staged: source/first-line edits for 25 of these chunks (the safety ones). The other ~130 need the code change in
`PROPOSED_ask_ts_changes.md` (filter on title + topic).

**F3. Ask and the app disagree outside California.** The app has had per-state 811 rules since r17.06; the library
never got them. All 50 state rows say "notice time, ticket life and tolerance zone are set by <state> law, so check
the current rules." Staged: 51 chunks built from the app's own table, so Ask and the Rules screen say the same thing.

**F4. The first search does not know the job's state.** `ask.ts:517` searches the question words only. Example:
`node tools/retr.mjs "do we get a lunch break" TX` → all 6 hits are California, Nebraska or multi-state chunks and
all 6 are thrown away. The model can search again by itself and did find the Texas chunk in the Nov 16 eval run
(brk2), so answers are not necessarily wrong, but it costs a second search and is not guaranteed. Proposed: add the
state name to the first search.

**F5. The eval cannot catch any of this.** 158 of 164 cases are in Wildomar, CA. Staged: 26 cases in 13 other states.

**F6. Outdated: Virginia heat.** Chunk 637 says "No state heat standard". Still true in force, but a 2026 law
(Va. Code 40.1-44.2, 2026 Acts cc. 731, 732) now requires the Safety and Health Codes Board to adopt heat illness
rules. https://law.lis.virginia.gov/vacode/title40.1/chapter3/section40.1-44.2/ (read Nov 20). Edit staged.

**F7. Michigan is not "federal 5 ft".** MIOSHA has its own excavation rule, Part 9: "The side of an excavation more
than 5 feet deep shall be sloped as prescribed in table 1, unless supported…" (R 408.40941, eff. 1/3/2024),
https://www.law.cornell.edu/regulations/michigan/Mich-Admin-Code-R-408-40941 . Table 1 is Michigan's own angle
table. I could not read the table values (image in both sources), so the staged chunk says "read Table 1" and gives
no angles. **Not checked:** whether the app's Trench Sloping result (federal Appendix B) matches Michigan's Table 1.
The app's state table row for MI says "we have not checked whether this plan is stricter".

**Checked and found right:** the list of state plans in chunk 409 (https://www.osha.gov/stateplans); federal heat rule
"not final" (a Sept 2026 status report says a supplemental proposal is targeted for Dec 2026:
https://insights.lockton.com/workers-comp-trends-to-watch/sept-2026/heat-regulation-accelerates-at-state-level-federal-rulemaking-remains-uncertain);
Nevada heat (more than 10 employees), New Mexico heat (still proposed); Oregon confined space numbers; Texas and
Florida 811 numbers in the app table (https://www.texas811.org/faq , https://sunshine811.com/excavator-instructions).

**Seen but not verified (secondary source only):** Kentucky HB 398 (2025) is reported to stop Kentucky enforcing
standards stricter than federal (J. J. Keller state comparison, July 2025). Worth a check before writing KY chunks.

## 3. What is drafted (all in `sql/`, none applied)

| File | What |
|---|---|
| `kb_nationwide.py` | The loader source, same layout as `kb_lockout_trench20.py`. Re-run it to regenerate everything. |
| `kb_nationwide.jsonl` | 56 new field chunks (rebuild source). |
| `01_ask_kb_nationwide.sql` | Insert 56 chunks + 34 guarded edits to 28 existing chunks + row count + index-blob reset. |
| `01_ask_kb_nationwide_test.sql` | Same statements in a DO block that checks and rolls back. **Not run** (it writes inside a transaction; server is read-only for me). |
| `00_readonly_precheck.sql` | SELECT only. **Run today on live: 34 of 34 old phrases found, new ids free, max ord 2783.** |
| `02_ask_kb_topic_tags_OPTIONAL.sql` | 15 topic tags, only needed with the filter code change. |
| `03_ask_eval_cases_nationwide.sql`, `eval_cases_add.py.txt`, `eval_cases_nationwide.py` | 26 eval cases nw1-nw26. |

New chunks (ids):
- `dig-al` … `dig-wy`, `dig-dc` (51): wait, latest start, ticket life, renewal, tolerance zone, white lining,
  emergency, trench protection line, each with the row's own statute / center URLs and "checked 2026-11-19". Where a
  value is not confirmed the chunk says so and sends the crew to the ticket and the center. No number was invented.
- `dig-basics-1`: what is the same everywhere and what changes by state; names no state up front.
- `plan-mi-trench-1` (Michigan Part 9), `plan-or-confined-1` (OAR 437-002-0146), `plan-wa-confined-1`
  (WAC 296-809-100), `plan-trench-depth-1` (which plans are checked, which are not). Sources read Nov 20:
  https://www.law.cornell.edu/regulations/oregon/Or-Admin-Code-SS-437-002-0146 ,
  https://www.law.cornell.edu/regulations/washington/WAC-296-809-100 .
- Every new chunk is checked by the generator against the live filter rule: its first lines name only its own state.

Edits to existing chunks: 71 and 235 (stale app text), 637 (Virginia), and 25 chunks un-hidden (1912, 1913, 1511,
331, 699-701, 2010, 2012-2016, 2157-2177 soil set). Wording changes are minimal; the generator confirms none of them
is filtered afterwards.

## 4. Eval

**Run locally, no AI calls:** `tools/run_retrieval.sh` (2 seconds). It uses the live build's own search code and the
live filter over the local KB copy, on 22 questions in 13 states (`tools/cases_retrieval.json`).

| | Pass |
|---|---|
| Live library today | 3 of 22 |
| With the staged chunks and edits | 17 of 22 |
| Same + job state added to the first search (proposed code) | 19 of 22 |

Still failing after everything: a Michigan trench-depth question (the six first hits are all federal text, which is
weighted 1.6x for rule questions; the model has to search again) and a Washington "how long are marks good for".
Adding the state name also made one Colorado trench case worse, so that change needs the full eval, not just mine.
This check covers the first search only; it does not judge the written answer.

**For the lead, the real eval (costs about 2 cents a question):**
1. Run `01_ask_kb_nationwide_test.sql`; expect `RESULT: PASS …`. Then `01_ask_kb_nationwide.sql`.
2. Wait for Ask workers to cold-start (or redeploy `ai-next`), then load `03_ask_eval_cases_nationwide.sql`.
3. `select pb_ai.eval_start('ai-next','nationwide', array['nw1',…,'nw26'])`, `eval_collect(run)` until done,
   `eval_score(run)`. About $0.55. Then the full set once (about $3.80) to confirm nothing in California moved.
4. `eval_cases_add.py.txt` carries the city as a 4th item; `cases.py` / `load.sql` currently hard-code Wildomar, CA.

## 5. What remains
- Thirteen state plans unread for trench rules; twenty for confined space; lockout, silica, fall protection and
  traffic-control differences by state not started. Fall protection has no federal text in the library at all.
- Michigan Table 1 values, and whether the Trench Sloping calculator is right for Michigan.
- 811: 8 states without a confirmed wait, 13 without a ticket life, 16 without a tolerance zone (same gaps as the
  app's table; fill both together).
- About 130 general chunks stay hidden outside one state until the filter is changed.
- The app table's MI row and the yearly re-check (2027-11-19) should also re-generate these chunks:
  `python3 sql/kb_nationwide.py` reads the table directly.
- Labor-law chunks (255 of them, checked Nov 5) were not re-verified here beyond the heat lines.

## Decisions for Tommy (5)
1. **Apply the 811 batch now?** Recommend yes: 51 state chunks straight from the table the app already shows, plus
   the fix to chunk 71. Without it Ask can give a Texas crew California's 28 days.
2. **Change the state filter in code, or keep patching chunks?** Recommend the code change (title + topic only, see
   `PROPOSED_ask_ts_changes.md`) after the 25 safety chunks staged here go in. The patch-the-chunk way already broke
   once (the Nov 18 edit hid the trench quick reference in 48 states).
3. **Add the job's state to the first search?** Recommend yes, but only after a full eval run, because it changed
   one Colorado trench result in my check.
4. **Michigan.** Recommend a short follow-up to read Part 9 Table 1 and, until then, a note on the Trench Sloping
   result for Michigan jobs like the Washington one ("Michigan uses its own Part 9 table").
5. **How far to go on state plans.** Recommend doing trench and confined space for the 13 unread plans next (one
   chunk each, rule text read and linked), then fall protection. Lockout, silica and traffic can wait: most plans
   adopt the federal text there.

## DONE
