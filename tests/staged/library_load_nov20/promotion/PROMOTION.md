# Ask promotion package: lib8 (Nov 20 evening, fifth helper), on top of live 8b7042f9dfee + library 3,236 rows + prompt row v7d

Live now: code slot `live` = `8b7042f9dfee`, prompt row `teacher_v2` md5 `9968a8d39e4919bb8230f417bcadff5f` (reply rule v7d), library `b3e91f6c47d2` 3,236 rows
(md5 of ord:lib:chunk `2eb90812f57dd0636f6bb1b0b2de263d`, read Nov 20), shelf 47. Nothing in the lib8 section has been applied to live.

## lib8: what goes live (order 1 -> 2 -> 3)
| Step | Thing | Exact value |
|---|---|---|
| 1 | Library: 1 card edited in place (`osha-loi-trench-stacking-1`, ord 2971) | `07_lib8_precheck.sql` (SELECT; expect text_md5 `050fee8ec65b86586cddbdf5241cf210`, rows 3236) then `07_lib8_card.sql` (guarded; drops the saved index, rebuilt once ~2 s). After: text_md5 `4ece7bdce9e350fe3d09da62dfbbff48`. |
| 2 | Ask build (slot `live`) | **`d881cb6951377365a4edb2986ea289b20b22fe45f13e905f62b1afab1ca0828e`** (lib8b-live), `https://raw.githubusercontent.com/PipelayersBible/Index.html-/0458f4b39a1111dacfddfc355a51bc8b23290e17/data/ask/b-d881cb695137.txt` (empty overlay; same code as ai-next `688d8c4be86d`) |
| 3 | Prompt row `teacher_v2` | `08_prompt_row_v8.sql` (first select must say `next_has_v8 = true, live_unchanged = true`); after: md5 `c0aa8fed6c3f15584aa9db8abea0a864` |

Install step 2: `select net.http_get('<URL>');` then `select pb_ai.code_install('live', <req id>, '<sha256 above>', '<URL>');` (expect `installed live d881cb695137 (...)`).
Smoke (about $0.45 with a cold cache): sa10 (Louisville: "Kentucky's OSHA plan ... 5 ft"), st7-03 (Salt Lake City hospitalization: Utah 8 hours), lib-us-osha-33 (stacked boxes: "No ..."), tr12 (Type C 10 ft: 15 ft back), tr14 (20 ft: engineer).

**Rollback, each step on its own:** build -> `8b7042f9dfee` (URL `https://raw.githubusercontent.com/PipelayersBible/Index.html-/e5ae1f18eda2021b3ddbfacd124d992afe6b9029/data/ask/b-8b7042f9dfee.txt`, sha256 `8b7042f9dfeecc10ec4d2d4143a8ca2cdb0a504fbe629369bf3154ffe58ac391`);
row -> `98_prompt_row_v8_rollback.sql` (checked on the server, read-only: it rebuilds md5 `9968a8d3...` exactly); card -> `97_lib8_card_rollback.sql` (tested on the local copy: library md5 back to `2eb90812...`).

**What lib8 changes** (details in ROUNDS.md "Fifth helper"): own-plan states named (sa10; IN/IA/VT/WY get the "state plan can be stricter" line), web-search answers keep their first line and lose the
"I'll check the web ... TYPE:" text, a quote word for word from a card is not replaced by "[quote removed ...]", stacked-box card rewritten, reply rule v8 (shorter; no "elsewhere / common" numbers).
The code parts also apply without the card (step 1 is only the stacked-box answer).

## lib8 test results (Tommy's $10; $8.15 spent by the reply bodies; failed 546 attempts may add a little)
| Check | lib8 / lib8b | Before (lib7e/f, same cases) | Bar |
|---|---|---|---|
| 148 existing (`1121-lib8-148`, $5.43) | **146 / 148** by the server's patterns; facts 147 / 148; 0 errors | 140 / 148 (live b7ad 117) | all 148: 2 left |
| The 2 misses, read by hand | `cut3` length only (159 / 140 words, content right); `ph02` photo read 3.82 for a 3.83 stake (live and lib7e misread it the same way) | | |
| The fixed items, read by hand | sa10 names Kentucky's plan; sw1's web answer leads with 0.40%; lib-sc-sp-1 has no "[quote removed]"; lib-us-osha-33 says "No ... the bottom box is rated for full depth"; lib-mi-dig-2 gives no other places' numbers; 0 / 148 answers contain "TYPE:" or "I'll check the web" | 2 real misses (sa10, sw1) | met |
| Strictest 12 (`1121-lib8-fu1`) | 11 / 12 on lib8. The miss: Utah's 8-hour reporting card was not retrieved (live code too). Fixed in lib8b and asked twice more: **"Utah requires ... within 8 hours ... stricter than federal OSHA's 24 hours"** | 12 / 12 on lib7 (the card got there by luck) | met on lib8b |
| Follow-through, 27 two-turn cases (`fu1` + `fu2`, $1.20 including the 12) | **27 / 27 stay on the topic, none restart; 25 / 27 give the offered part cleanly** (fu7-04 opens with a go/no-go line; fu7-10 offers items the excerpts do not have) | 27 / 27, 25 delivered (lib7) | met |
| Check round on lib8b (`1121-lib8b-r11`, 49 questions, $0.83): 22 never-sent big-run cases, 14 own-plan trench cases, 10 long ones, 3 new | read by hand: facts right on all 49; **all 14 own-plan states name their plan**; Indiana gets "Indiana's plan can be stricter"; wrong state 0; the 10 long ones drop from a median of 101 words to 76; 3 are still over 100 (AC pipe, dewatering, vacuum-test steps) | | |
| Length | median **65** words (148) and 66 (round), down from 74 and 69 | | ~56: **not met** (closer) |
| Safety line | on 59 of 148 answers (36 on lib7e) | | |

**Go / no-go: GO** for lib8b in this order: card (07), then build d881cb695137, then the prompt row (08), with the 5-question smoke. Every step has a tested rollback: 07/97 on the local copy (its md5 matches the server's), 98 checked read-only on the server, and the build goes back to 8b7042f9dfee.
Not perfect: 2 of the 148 miss by pattern (one length, one photo read); the median is 65 words, not ~56; how-to answers still run past 100 words; and the 20 queued + 8 parked old eval rows were not deleted (the lead needs to do it; the statement is in ROUNDS.md).
**NO-GO only if** the bar is literally "all 148 pass".

## Cost plan for later rounds (today's actual rates on ai-next, warm cache)
- 148 existing: **about $5.50** (photos and how-tos cost more; photo cases fail with 546 in 3-question batches, so run them one per row).
- One round of 100 library questions: **about $2 to $3** ($0.017 to $0.03 each; a cold start adds about $0.10 a question for the first few).
- Follow-through 27 (two turns) + strictest 12: **about $1.20**.
- All three together: **about $9 to $10**. Today's lib8 runs: smoke 0.69 + 148 5.43 + follow-through 1.20 + check round 0.83 = **$8.15**.

---
# Earlier package (lib7f / lib7g), APPLIED Nov 20 evening; kept for the record
# Ask promotion package: lib7f / lib7g (Nov 21), built on live 4a5c84ce8242

Live today: code slot `live` = `4a5c84ce8242`, prompt row `teacher_v2` md5 `bbe7c4599587734e6727895da4f2e8d9`, library version `b3e91f6c47d2` with 2,840 rows
(md5 of all rows `6d20fceeb4976ce1f304c75338fd89d3`), `pb_ai.kb_shelf` empty. Nothing in this package has been applied to live.

## What goes live
| Step | Thing | Exact value |
|---|---|---|
| 1 | Library rows (`pb_ai.kb_chunks`, version b3e91f6c47d2) | `03_library_precheck.sql` (SELECT only) then `04_library_core.sql`: +396 chunks, 69 replaced in place -> 3,236 rows. This is exactly the lib7g overlay `ai-next` runs on (465 rows, checked row for row). |
| 2 | Shelf rows (`pb_ai.kb_shelf`), optional | `05_library_shelf.sql` (47 chunks, 10 states). The shelf code is in the build and does nothing while the table is empty. |
| 3 | Ask build (code slot `live`) | **`8b7042f9dfeecc10ec4d2d4143a8ca2cdb0a504fbe629369bf3154ffe58ac391`** (lib7f-live), `https://raw.githubusercontent.com/PipelayersBible/Index.html-/e5ae1f18eda2021b3ddbfacd124d992afe6b9029/data/ask/b-8b7042f9dfee.txt` |
| 4 | Prompt row `teacher_v2` | the text of `teacher_v2@next` (5 elements: the 2 live appends + LENGTH + reply rule **v7d** + `{"knobs": {"exChars": 10000}}`) via `02_prompt_row_promote.sql` |

**Why two builds.** `9418e997119c` (lib7g, on `ai-next` now; same code as `62dd8ef92316` lib7f, which ran the 148 check, the check run and the big run, plus one card edit in the overlay) = `8b7042f9dfee` + the library overlay inside the file (1.35 MB sealed vs 0.42 MB). The overlay only ever
switches on for `ai-next`; on `live` both builds run the same code and read the library tables. The big file is what made `ai-next` reply 503 "Ask is updating" when many new workers
started at once (cold start, Running notes); live should not carry it. `8b7042f9dfee` differs from the tested build in one file only: `kb_overlay.ts` is empty (rev ""), which turns the overlay
off. Deno: 61 passed; the one failure is the test that expects the overlay on `ai-next` (by design). It has not answered a question yet: smoke it (step 3 below).
The 10,000-character excerpt is built in (default 1e4 in ask.ts); the `exChars` knob in the row says the same and can stay.

**Order: library first (step 1), then build + row (3, 4).** The new code's state-first excerpts and the follow-up search expect the new cards (Appendix D tables, the flagger / short-duration cards,
the 811 overviews); without step 1 live gets the code on today's 2,840-row library, which no round has tested.

## Steps and checks
1. **Library**: run `03_library_precheck.sql` (SELECT only). Expect `already_there = 10` (the 10 cards edited in place keep their id), `to_replace_found = 69`, `rows = 2840`, `max_ord = 2839`,
   and `ids_same = true, texts_same = true, rows_2840 = true`. Then `04_library_core.sql` (one transaction; it raises on an ord gap, a duplicate id or a wrong n). After:
   `select n from pb_ai.kb_versions where active` = **3236**; the saved search index is dropped and workers rebuild it on the next cold start (about 1.5 to 2.5 s once).
   Tested Nov 21 on a local Postgres 16 copy of the live rows (md5 equal to the server's): see `tools/local_sql_test.sh` and ROUNDS.md "Promotion SQL". Safe to run twice.
2. Optional: `05_library_shelf.sql` (tested twice locally: 47 rows).
3. **Build**: `select net.http_get('<URL above>');` then `select pb_ai.code_install('live', <req id>, '8b7042f9dfeecc10ec4d2d4143a8ca2cdb0a504fbe629369bf3154ffe58ac391', '<URL above>');`
   (expect `installed live 8b7042f9dfee (...)`). Smoke, about $0.15: `pb_ai.eval_post('ai', ...)` with tr12 (Type C 10 ft: "at least 15 ft back"), st7-11 (Oakland: 5 ft + Cal/OSHA permit),
   lib-us-mutcd-55 ("up to 1 hour, 6N.01") and one web question (sw1); the reply's `prompt.build` shows the new stamp and `kb_version` shows `b3e91f6c47d2` (no "+lib7g").
4. **Prompt row**: run `02_prompt_row_promote.sql`; its first select must say `next_has_v7d = true, live_unchanged = true`.

## Rollback (each step on its own)
- Build: `pb_ai.code_install('live', <req of a fresh http_get of the 4a5c URL>, '4a5c84ce824227f0447551840b4864d166def577edd08965e8d895b7dc64195a',
  'https://raw.githubusercontent.com/PipelayersBible/Index.html-/57230c81f66a233ca88da3695ae03f883aa1093b/data/ask/b-4a5c84ce8242.txt')`; one step further back: b7ad788e3a62 (commit 9c575fe).
- Prompt row: `92_prompt_row_rollback.sql` (rebuilds the Nov 20 17:20 text from the row's own first two elements; guarded by md5 bbe7c4599587734e6727895da4f2e8d9).
- Library: `94_library_rollback.sql` (generated by tools/mk_rollback.py: puts the 69 rows changed in place back by ord, deletes ords >= 2840, fixes the row count, drops the index; raises unless 2,840 rows). Tested locally:
  the rows come back to md5 `6d20fceeb4976ce1f304c75338fd89d3` exactly.
- Shelf: `delete from pb_ai.kb_shelf;` (empty today).
- Test cases: `delete from pb_ai.eval_set where not active and cat like 'lib%';` (inactive library cases only).

## Not in this package (decisions / later)
- `06_eval_pattern_fixes.sql`: 4 must-patterns and 1 forbidden pattern (tr11) of the existing eval set were wrong, not the answers; each is documented in ROUNDS.md. Apply only if you want the
  server grader to agree with the hand-read.
- Web-search answers: the text clean-up fails on some (a dropped first line, or the model's "I'll check the web ... TYPE: general" left in). Live code, not this job; see ROUNDS.md.

## Go / no-go (numbers from ROUNDS.md, fourth helper)
| Check | Result | Tommy's bar |
|---|---|---|
| The 148 existing cases (lib7e, same code as lib7f/g minus reply-rule v7d) | **140 / 148** by the server's patterns (live b7ad: 117); by hand: 4 length-only (1 to 35 words over), 1 photo misread (live does the same), 2 real: `sa10` names no state, `sw1` web clean-up | all 148: **not met** (7 left, 2 real) |
| Round 9 fresh (80) | 74 / 80 (92%), facts 100 / 100, wrong state 0, safety canaries 15 / 15 | |
| Big partial (219 core cases not asked on lib7) | 175 / 219 by the grader, **facts 212 / 219 (97%)**, wrong state 0; 26 length-only; by hand 6 real fact problems (1 fixed in lib7g) | |
| Strictest rule | st7: 6 / 6 right after v7d (WA 4 ft stricter, CA CO 25 ppm, CA permit added, GA federal wage, Seattle wage); no 811 / state-spec answer compared with federal after v7d | met |
| 20 ft = registered PE | every 20-ft answer read names the engineer (tr14 exactly 20 ft: engineer, 3 builds running) | met |
| Follow-ups deliver the offered part | 27 / 27 continue the topic; the 2 old misses (Appendix D table, box checklist) now deliver on lib7e | met |
| Answer first, ~56-word median | answer first 96 / 100 (r9); median 64 words before the closing lines, 69 with them | close, not met |
| "Your competent person decides on site." on safety answers | 54 / 60 (r9), 112 / 126 (big) | mostly |

**Recommendation: GO for steps 1 to 4 (library, then lib7f-live build, then the row), with the smoke in step 3.** It is clearly better than live on every measured line (148: 140 vs 117;
no wrong-state answers in 400+ library questions; shorter; strictest-rule and 20 ft rules in place), and every step has a tested rollback. Not perfect: about 1 in 8 answers is a few words long, a web-search
answer can lose its first line (live has the same code), and `lib-us-osha-33` (stacked boxes) still reads muddled. **NO-GO if** the lead wants "all 148 pass" literally before promotion: 7 do not by the
patterns (5 by hand are length or the photo).

## For Tommy to get
1. **OSHA Subpart P Appendix C (timber shoring) Tables C-1.1 to C-2.3, a clean copy**: OSHA's own PDF of 29 CFR 1926 Subpart P, or the Federal Register final rule of Oct 31, 1989 (54 FR 45894)
   with the tables. The only text copy found had columns that could not be lined up, so no timber sizes are in Ask (a wrong timber size is a safety risk).
2. **Cal/OSHA 8 CCR 341 (excavation permits)**, current text from dir.ca.gov/title8: Ask now says "Cal/OSHA permit for trenches 5 ft or deeper that a person enters" with "details not confirmed".
3. **MUTCD 11th Edition Section 6F.03 / 6K cone band widths** (Ask could not give the 6 in and 4 in bands for a 28 in cone), and the STOP/SLOW paddle size (6D.02).
4. **AWWA C651-23** (current edition; the library uses C651-14 for flushing 3.0 ft/s and bac-T 16 h). Also ASTM F1417 and D2321 (most asked spec numbers not sourced free).
5. **The 39 state DOT traffic manuals marked "not confirmed"** (first NV, UT, NY, NJ, IL, MI, NC): one call to each DOT traffic office.
6. **Kentucky and the other own-plan states' trench rule pages** (KY OSH 803 KAR 2, IOSHA, VOSHA, Wyoming OSHA, Iowa 875 IAC), so Ask can name the state plan as the source.
7. Phone calls only a person can make (from the 811 helper): Oregon ticket life 30 or 45 days; does a renewal print a new number in TX, FL, OK, CT, ME; Ohio ticket expiry; Montana 811 rules.

## APPLIED Nov 20 evening (lead)
- Precheck: already_there 10, to_replace_found 69, rows 2840, ids_same/texts_same true.
- 04 core applied -> kb_versions n = 3236, rows 3236. 05 shelf applied -> 47 rows.
- Build: live = 8b7042f9dfee (installed 420084 chars). Prompt row teacher_v2 = teacher_v2@next (v7d), md5 equal.
- Live smoke (4 questions, about $0.09), build 1121-0043 slot live, all HTTP 200 and right:
  Type C 10 ft = 15 ft back; Oakland 6 ft = Cal/OSHA permit + protective system; short duration = up to 1 hour (6N.01);
  20 ft Type B = registered professional engineer (App. F). Competent-person line on all four.
- Rollback order if needed: build 4a5c (URL above), 92_prompt_row_rollback.sql, 94_library_rollback.sql, delete from pb_ai.kb_shelf.

## lib8 APPLIED Nov 20 ~7:05 PM (lead)
- 07 card applied (text_md5 now 4ece7bdc...). Build live = d881cb695137. Prompt row = v8 (md5 c0aa8fed...).
- Live smoke (4, build 1121-0305): Louisville names Kentucky's plan, 5 ft; Salt Lake City injury = Utah 8 hours (stricter than 24);
  stacked boxes = manufacturer's data, bottom box rated full depth; 20 ft Type B = engineer, not 1:1.
- Old eval rows (20 queued in 1121-lib7e-148, 8 parked in 1121-lib7f-big, 4 queued in 1120-lib7-fu2) NOT deleted: the delete needs a
  confirmation the session can't give. Harmless as long as nobody pumps/collects those runs.
