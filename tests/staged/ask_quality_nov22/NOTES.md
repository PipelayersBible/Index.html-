# Ask quality pass + independent safety review fixes (Nov 21-22, 2026) - finished

Tommy (Nov 21): "Look for more ways to streamline the ask process too ... right now I ONLY care about quality." Coordinator (mid-task): the 10 safety review items first.
Base (server SELECT, Nov 21 evening): live build `4776ad1c5afb`, library `b3e91f6c47d2` 3,240 rows md5 `a9e67ec6527df46b665cbc03bdb6ca6c`, shelf 50,
prompt rows `teacher_v2` = `teacher_v2@next` md5 c0aa8fed... (reply rule v8). Nothing was written to live library tables, the live slot or the live prompt row.
Package: `promotion/PROMOTION.md`. Source patch: `src_patch/apply_patch_q.py` (+ `emergency.ts`, `reply_rule_v9.txt`, `q_all.diff`) on `work/src_base` (= live 4776 source).
Running log of the work: `work/NOTES_running_log.md`.

## Safety review items (coordinator, top priority)
| # | Item | Done | Evidence |
|---|---|---|---|
| 1 | Instant emergency answer missed real phrasings | **Fixed, server + app.** New `emergency.ts` (pasted identically into the app): 38 / 38 reviewer phrasings fire (gas, power, cave-in wording, medical, heat, traffic, confined space alarms, "haven't heard from him in the vault", Spanish); 0 false positives on 21 "about" questions (H2S alarm set point, signs of heat stroke, power line clearance, crushed rock, "not leaking"); on all 1,163 eval questions it fires on 11, all real emergencies (was 2). "Emergency? Call 911." added to the app's no-plan / limit / no-signal / timeout / busy / unavailable / network / dropped messages. | `work/em/run.mjs`, Deno `quality_test.ts`, `app_patch/t_emergency_app.js` (20 checks, every inline script parses) |
| 2 | Only one script | **4 scripts, EN + ES:** space (stay out, 911, EMERGENCY button, cave-in edge), open (911, CPR/AED, cool now, bleeding pressure + tourniquet, don't move a fall/crush, meet the ambulance; the line that fits moves up), gas (out and upwind, no sparks, leave the hole open, 911 then the gas company/operator), power (stay in the cab, jump feet together only if on fire, shuffle, everyone back, 911 + power company). Report-deadline and "says he's fine, can he go back to work" questions stay with Ask. | app: `app_patch/p_emergency_app.py` on `_src` r17.14 e85bf91 (exact-once; diff `p_emergency_app.diff`). Not shipped. |
| 3 | A state name anywhere replaced the job state | **Fixed** (state.ts): street / road names, "from Texas", "company in Utah", plates are not states; with a job state known, a state named in passing stays second and the job state leads; "in Oregon / Oregon's rule / does Oregon" still switches; 811 center names still count. | Deno; paid: Oregon Ave, from Texas, Nevada Street, company in Utah -> job state kept (4 / 4) |
| 4 | No state known: trench / confined / air / reporting gave federal-only, no "which state?" | **Fixed** (DEPENDS_SAFETY, only when no state is known; protection/depth words, so ladders stay state-free) + the no-state line says the federal rule is the minimum and some states are stricter. | paid q3: trench box -> minimum + "Which state is the job in?"; ladders -> no question (eval sa5) |
| 5 | guardAnswer failed open | **Fail safe** (gonogo.ts): when the checker errors or times out, verdict sentences ("readings are within limits, so you can go in", "you don't need a box", "safe to enter") become the competent-person line by word match, then the safety line; rule sentences stay. | Deno |
| 6 | WA CO 35 ppm missing | New `sp-wa-confined-air-1` (WAC 296-841-20025 Table 3: CO 35 ppm TWA8, 200 ppm 5-min STEL, 1,500 ceiling; H2S 10 / 15; scope 296-841-100 = any workplace with exposure; read 2026-11-21); `sp-wa-confined-1` no longer says "air numbers match federal"; cs table line. **Eval case cs-wa-co expected 50 ppm: wrong, fixed to 35.** | paid: Spokane / Seattle CO 35, Tacoma H2S 15 STEL |
| 7 | Power line hit -> crane rules; gas strike card CA-only | New national cards `osha-pl-powerline-contact-1` (1926.1408(g)(1)(i)-(iii); jump-and-shuffle marked as common training) and `fed-phmsa-gas-strike-1` (49 CFR 196.107 report even a nick, 196.109 911 on a release, crew steps). | paid q-pow-2, q-gas-1 |
| 8 | CA "went to the ER" | `sp-ca-report-1`: 8 CCR 330(h) definition (read 2026-11-21; old "not confirmed" gone) + ER wording; `osha-pl-report-8-24-1` ER wording. | paid Fresno / Dallas ER right |
| 9 | 30 checks/day | No change (fine now that #5 fails safe). | |
| 10 | MO / WV ticket life | MO 21 calendar days from the start date (RSMo 319.025, 2025 SB 133 truly-agreed text; revisor shows 319.026 eff. 2025-08-28); WV 15 business days + 2 ft zone (WV811 2026 training quoting the statute; the statute site would not open, so "not confirmed in the statute text"). Tables updated. | paid MO, WV x2 |
| + | Monday -> Thursday | Added to WA FL CO KY OR KS WY AR CA NV NY OH IL NM; AZ checked on Arizona 811's page ("two full working days" for locators) and added. **Not added: UT** (card: "48 hours, business days only" = Monday 10 AM -> Wednesday 10 AM) and **NE** (2 full business days is "the app's table", not confirmed). | paid 15 / 15 Thursday |
| + | Reviewer's 13 live questions | **Not available to me** (Project doc not readable here). Test lists built from the message's phrasings (`work/em/pos.txt`, `neg.txt`, `work/cases/check_q3.jsonl`). | |

## Step 1 library (tools/build_lib.py; lib_kb 0 errors, 5 warnings = agency pages without section numbers, as on the existing NV/SC cards)
- **3,240 -> 3,247 rows** (30 edited in place, 10 new, 3 retired). `cards/changed.jsonl` = every new / changed chunk.
- Injury reporting, national + state + table: `osha-pl-report-states-1` (federal 8/24; plan states with the same times; HI / OR extras; stricter AK, CA, UT, WA) + 6 state cards with agency phones (AZ, IN, NC, NM, TN, VT; agency pages read 2026-11-21). Code forces state card + table on reporting questions (S10).
- California heat: `cal-2`, `emp-ca-safety-1`, `emp-ca-safety-2` retired into `sp-ca-heat-1/-2` (+ "10-minute cool-down every 2 hours at 95 F is agriculture only", crew-word titles).
- **Contradictions / stale lines fixed:** (1) sp-wa-confined-1 "air numbers match federal" vs WAC 296-841 CO 35; (2) cs-wa-co eval expectation 50 ppm; (3) sp-nv-who-1 and (4) sp-sc-trench-1 "reporting not read" vs their report cards; (5) sp-tn-who-1, (6) sp-nc-who-1 "reporting times not read" (now read); (7) sp-mn-confined-1 stray "heat rule not read"; (8) sp-ca-report-1 "serious not confirmed"; (9) dig-mo / (10) dig-wv ticket life "not confirmed" (now sourced); MO / WV in the 811 tables.
- Old citations: the TT-031/033 "1926.200-203" issue is app talk text; in the library only `mutcd-osha-subpartg-1` names 1926.202/203, correctly as removed. 2009 MUTCD lines are adoption status (right). No dead-URL sweep.
- Near-duplicates (`tools/dups.py`, 440 pairs): left are templated state families that differ only in the state (6 public-only "who" cards, 5 Dig Safe cards, 51 emp-state-xx-2) and CA heat (done). Heat, flagger, separation, wage, locatable and survey families: no contradiction found between emp-* (Nov 5) and sp-* (Nov 20).
- Proposed, not done: **EPA construction stormwater by state** (answers lead with EPA's CGP in Colorado, which runs its own permit: dw3, q-off-1) and a heat-rules-by-state table.

## Step 2 routing and search (Deno work/tq: **83 passed, 1 failed by design** = old kb_next overlay test, same as live)
- S5 **office routing:** office users' rule/spec questions ("how much cover do we need", "how long do we keep SWPPP reports", "how many times can I renew my ticket", "AC pipe before we notify EPA") went to MODE business analysis (no job-state line, no reply rule). Knowledge-word gate: 24 office knowledge questions 11 misrouted -> 0; 22 analysis questions as on live. 7 eval questions would be misrouted for an office user, incl. lib-us-fed-17/-18 which ARE office cases (the 181-word AC pipe answer was analysis mode).
- S6 photo routing: stake / paint / ticket photos with "station", "invert", "IE", "cut" no longer go to the plan reader.
- S7 tokens: "L/O", "O/S", "C/L" kept as one token (L/O -> sym-4 rank 0); tab data, positive response, re-mark, hold-down. ("the box" -> trench box dropped: leaked into bench ranking.)

## Step 3 answers read by hand (~180) -> fixes
| Pattern (examples) | Fix |
|---|---|
| Raw statute quote as line 1, broken over two lines (AR / IL / DE waits; loc6) | S8 glue of run-on text blocks + v9 "own words, never a quotation". q3: AR / IL clean. |
| Prompt words leaking: "Line 1:" (tie4), "(excerpts 2, 6)" (tie5), "the library has no Iowa rule" (12), "Don't borrow another state's number" | S8 cleanLeaks + state line wording + v9 WORDS. 148: library/excerpt words 4 -> 0, "Line 1" 1 -> 0. |
| Citation slips: "35 ppm (federal OSHA/NIOSH)", 1910.146 on a construction vault | v9 exact sources. q3 TX alarms: OSHA 50, NIOSH 35. |
| Two numbers without saying which (Detroit) | v9. q3: "federal OSHA's 5 ft ... is stricter". |
| Side facts; plan-name filler on 811 / gas answers | v9. |
| How-tos 128-164 words | v9 5 steps / 90 words + offer. 148: cut3 159->128, tie4 150->123, tie6 148->123, web2 164->106; cs4 164->186, eq4 107->119 longer. Median 64 (target ~56 not met). |
| "typical / often" numbers | v9; the numbers come from cards (left). |

## Step 4 eval set and grader fixes
New: `work/cases/cases_q.jsonl` (47), `cases_report51.jsonl` (51), `check_q3.jsonl` (24), `work/route_cases.json` (46 office questions), `work/em/pos.txt` / `neg.txt`.
Inactive insert SQL (not applied): `sql/40_eval_cases_inactive.sql` (98). Narrow patterns (answers right): lib-tn/ky/ar/hi/in/la-dig ticket life (statute writes "fifteen (15)"; `cases_existing_fixed.jsonl`), ct4 ("1 1/2 hours"), nw24 forbidden 'backfill it' matched "do not ... backfill it"; cs-wa-co was a wrong expectation.

## Scoreboard (free retrieval check: work/s_b_final*.json vs s_a_final*.json)
| Set | Before (live code + rows) | After (q3 code + 3,247 rows) |
|---|---|---|
| 700 existing core, PLAIN_MIN 2 | chunk 650, facts 682 | **651, 682** (worse: lib-nj-dig-3 chunk only; that question now gets the instant gas script) |
| same, PLAIN_MIN 0 | 637, 676 | 637, **677** (worse: lib-nj-dig-3, lib-us-dig-4 chunk only, facts still in) |
| same, widened grader patterns | - | facts 688 / 700 |
| 204 trench/811; 113 confined (cs-wa-co fixed); 7 cs-states; 127 text | 204 / 113 / 7 / 117 | same, 0 worse |
| 51 state reporting | chunk 45 | **51** |
| 47 new quality cases | chunk 24, facts 25 | **46, 47** |
| office questions -> business analysis (700 + 24) | 7 + 11 | **0 + 0** |
| instant emergency on 38 reviewer phrasings | 3 | **38** (0 false positives / 21) |

Paid (ai-next, **$7.96 of $20**): smoke 8 / 8; the 148: 143 / 148 on q1 -> **147 / 148 effective** after q2/q3 re-asks (lib8 146 / 148; the 1 left is sw1, web-search variance), median 64 words; new cases 43 / 45 on q1, both issues fixed; q3 check 24 / 24. No reason to spend more for this package.

## Builds
- ai-next: q1 `3e97a11a1b81` -> q3 **`9c38a478964d`** (commit 7be48e1, overlay q3 = replace 30, add 10, remove 3; overlay == after rows) **installed**.
- live candidate: **`1b8514750e72`** (commit 7d5209a, empty overlay). Not installed. (q1-live dd28a2a0e01b, q2-live 4c51620587fa superseded.)
- `teacher_v2@next` reply_rule = v9 (row md5 0dcefa8e..., rule md5 1726f24c...); rollback sql/39.

## Decisions for Tommy / the lead
1. Promote library 21 (after 21t) -> build 1b8514750e72 -> prompt row v9, smoke 6. Recommend: yes.
2. App emergency patch with the next app release (same text as server; covers no-plan / no-signal phones). Recommend: yes.
3. Utah / Nebraska Monday wording: check against the app's 811 table first. Recommend: hold Thursday wording for those two.
4. Next library pass: EPA stormwater by state, then heat table. Recommend: stormwater first.
5. Send the reviewer's 13 questions to add verbatim.

## On the server because of this job
code slot `next` = 9c38a478964d (was 284a80efeee2); `teacher_v2@next` reply rule v9; eval runs `1122-q-smoke`, `1122-q-148`, `1122-q-new`, `1122-q3-check` (collected, none queued).
Library tables, live slot, live row, shelf, eval_set: nothing written. Local private Postgres 16 at /var/lib/postgresql/aq_pg (port 55481), stopped (start with pg_ctl to re-run tools/local_test.sh).
Repo: 6 sealed build files, one commit each (0738c6a, b5a7b3c, e6e6cd0, 51c6d69, 7be48e1, 7d5209a).

## DONE
