# Ask promotion package: trench + 811 consolidation (consol1, Nov 21 2026)

Live now (read on the server Nov 21, SELECT only): code slot `live` = `d881cb695137`, prompt row `teacher_v2` md5 `c0aa8fed6c3f15584aa9db8abea0a864` (v8, same as `teacher_v2@next`),
library `b3e91f6c47d2` **3,270 rows, md5 of ord:lib:chunk `eb05d565cacc0e0b64a848aa41a5496f`**, shelf 50 (md5 `f9472660...`, not touched). Nothing here has been applied to live.

## What goes live (order 1 -> 2 -> 3)
| Step | Thing | Exact value |
|---|---|---|
| 1 | Precheck (SELECT only) | `20_precheck.sql`: expect rows 3270, max_ord 3269, kb_n 3270, all_md5 `eb05d565cacc0e0b64a848aa41a5496f`, touched_ok 40, new_ids_there 0. (Same check run on the server Nov 21 in compact form: rows 3270, all_md5 eb05d565..., the 40 touched rows' md5 `4bb65b05...` = the local copy's, new ids 0.) |
| 2 | Library: one guarded transaction | `21_load.sql`: deletes 31 retired cards, changes 9 rows in place, renumbers the survivors 0..3238 (same order, no gap), adds 4 cards at 3239..3242 -> **3,243 rows, md5 `a9af05ee01c9f8d4be6054b27f48bfb8`**, kb_versions.n 3243, saved index dropped (rebuilt once by the next cold start, about 2 s). Runs only on md5 eb05d565...; a second run says "already applied". Run `20_precheck.sql` again: rows 3243, all_md5 a9af05ee..., new_ids_there 4. |
| 3 | Ask build (slot `live`), right after step 2 | **`e661cb967ceb5d97910f3a7bc65ac3c9ef85e59ebe0b14481879a61e68a0b3dc`**, `https://raw.githubusercontent.com/PipelayersBible/Index.html-/64a8a02c2fedd2dbd1662ca1b189e6f05b0bbc47/data/ask/b-e661cb967ceb.txt` (consol1-live: d881 source + `src_patch/apply_patch_consol.py`, **empty overlay**). Same code as ai-next `3f9c941db076`, which carries the library change as an in-memory overlay. |

Install step 3: `select net.http_get('<URL>');` then `select pb_ai.code_install('live', <req id>, '<sha256 above>', '<URL>');` (expect `installed live e661cb967ceb (...)`).
Prompt row: **no change.** Warm workers keep the old library until they cold-start.

**Order matters a little:** the new build with the OLD library still works (the forced table cards are simply not found, so it behaves like d881). The OLD build with the NEW library also works
(it just never forces the table cards). So either order is safe; library first, then build, is the tested combination.

**Rollback, each step on its own:** library -> `91_rollback.sql` (guarded: runs only on md5 a9af05ee...; restores 3,270 rows and md5 eb05d565... exactly; tested); build -> `d881cb695137`
(`https://raw.githubusercontent.com/PipelayersBible/Index.html-/0458f4b39a1111dacfddfc355a51bc8b23290e17/data/ask/b-d881cb695137.txt`, sha256 `d881cb6951377365a4edb2986ea289b20b22fe45f13e905f62b1afab1ca0828e`).

**Local test** (`tools/local_test.sh`, log `work/local_test.log`; Postgres 16 copy at /var/lib/postgresql/askmerge_pg, snapshot `consol_live_3270.dump`, md5 = the server's eb05d565...):
precheck 3270 / eb05d565 / touched 40 / new 0; load -> 3243, md5 a9af05ee, kb_versions 3243 {app 238, osha 278, field 2727}, saved index rows 0; load again -> "already applied";
**loaded rows = `work/after_rows.jsonl` row for row** (the rows the free check and the ai-next overlay used); rollback -> **3270 | eb05d565cacc0e0b64a848aa41a5496f exactly**, kb_versions back to
3270 {app 238, osha 278, field 2754}; rollback again -> "already rolled back"; load refuses when any live row changed (nothing written); rollback refuses on a changed result.

Smoke after promotion (about $0.40 cold): "At what depth does a trench need a trench box?" in Spokane WA (4 ft, stricter than federal), San Antonio TX (federal 5 ft), Fresno CA (5 ft + Cal/OSHA permit);
"How long is my locate ticket good for?" in Cleveland OH (no expiry given, not confirmed).

## Results
### Paid checks on ai-next `3f9c941db076` (same prompt row as live). Spend **$7.98** of $10 (reply bodies: smoke $0.36, subset $1.38, state cases $6.24)
| Run | Result | Before (live code) |
|---|---|---|
| `1121-consol-148sub`: the trench + 811 subset of the 148 (50 cases: lo1-7, loc5-6, ng1, ng4, nw1-17, nw22, sa1, sa4, sa5, sa9, sa10, tr1-14, eq5, em1), 3 per batch | **50 / 50 pass** on the server's patterns (`eval_score`), facts 50 / 50, 0 errors, 0 forbidden, avg 63 words | `1121-lib8-148`, same 50 ids: 50 / 50, avg 67 words |
| `1121-consol-state`: 204 new state cases (51 x trench follow / trench number / 811 follow / 811 ticket life), 3 per batch | **189 / 204 by pattern; wrong state 0; over 110 words 0; median 53 words.** Number questions **102 / 102** (trench depth 51/51: WA 4 ft, every other state 5 ft; ticket life 51/51 incl. "no set expiry" NY/OH/AK/RI/WI and "not confirmed" MO/MT/NE/PA/WV) | not run (the before-library has no table cards) |
| The 15 pattern misses, read by hand | **all case pattern, answer right**: 5 x 811 "follow federal" give the right wait in other words (IL "2 days", AR "two (2) ... full working days", CT "two full days", NY "two but not more than ten working days", PA "three nor more than ten business days") and say no federal wait; 10 x trench "follow federal" correctly say the state follows federal Subpart P with no state rule (NV names its plan; IA, WY say not in the library, check the state plan) but do not repeat the 5 ft number the question did not ask for | |
Read by hand besides the misses (about 25): WA 4 ft "stricter than federal 5 ft"; KY / CA plans named; CA adds the Cal/OSHA permit; TX "48 hours ... no federal rule sets the wait (49 CFR 196 only)"; GA 2 business days from 7 AM; NY no expiry; MI Part 9; IN "plan same as federal".
Observations (not caused by this change, both also possible on live): (1) AR and IL 811 answers open with the raw statute quote on its own line; (2) nw15 (Detroit) now says MIOSHA's "more than 5 ft" is "a little less strict than federal ... follow that" (the strictest-rule wording; on live d881 the same question listed both rules without that line).

### Go / no-go: **GO** (library 21 -> build e661cb967ceb, smoke 4 questions)
- Free check: 0 worse of 700 + 127 existing, 204 / 204 state cases retrieve the state card or table; paid: the 50 existing trench / 811 cases hold 50 / 50, state number questions 102 / 102, wrong state 0, every pattern miss read by hand is a right answer.
- No fact lost (fact map, 166 facts, 13 hand-checked); lib_kb 0 errors; promotion SQL tested on the local copy (load, re-run, rollback to md5 eb05d565... exactly, both guards).
- Honest limits: 811 shrinks by almost nothing (every state has its own law); every trench / 811 answer now carries one more ~1.1 KB table card (+4% excerpt size); the table cards list all states, so a wrong-state slip is possible in principle (0 seen in 254 answers).

