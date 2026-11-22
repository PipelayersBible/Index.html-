# Ask promotion package: confined space consolidation + 811 analysis-route fix (cs1, Nov 21 2026)

Live now (read on the server Nov 21, SELECT only): code slot `live` = `e661cb967ceb`, prompt row v8 (no change in this package),
library `b3e91f6c47d2` **3,243 rows, md5 of ord:lib:chunk `a9af05ee01c9f8d4be6054b27f48bfb8`**, shelf 50 (not touched).
Live table constraints (pg_constraint): pkey (version, ord), **CHECK (ord >= 0)**, chunk CHECK (object with id and text), lib CHECK (app / field / osha),
FK version -> kb_versions. Renumbering goes through ord + 1000000 (never negative). The local test copy carries all five constraints.

## What goes live (order 1 -> 2 -> 3)
| Step | Thing | Exact value |
|---|---|---|
| 1 | Precheck (SELECT only) | `20_precheck.sql` (md5 3cb89ac2...): expect rows 3243, max_ord 3242, kb_n 3243, all_md5 `a9af05ee01c9f8d4be6054b27f48bfb8`, touched_ok 21, new_ids_there 0. |
| 1b | Optional rolled-back live test | `21t_test_rollback.sql` (md5 da397b3c...): one DO block, runs the load body, checks 3240 / 131904c2..., runs the rollback body, checks 3243 / a9af05ee..., then raises. Expected result: `ERROR: CS ROLLBACK TEST OK: after load 3240 / 131904c2de6b687c14ff4d68ccaea531, after rollback 3243 / a9af05ee01c9f8d4be6054b27f48bfb8`. **Not run on live:** this job's attempt was cancelled by the permission prompt before anything ran (live checked after: 3243 / a9af05ee, unchanged). The lead should run `21t_live_compact_nc.sql` (42 KB, one SQL call; the same test with the old-row md5 guards precomputed and the rollback's old rows read from a temp snapshot taken inside the block) or the full `21t_test_rollback.sql` (91 KB). Both give `CS ROLLBACK TEST OK` on the local copy. |
| 2 | Library: one guarded transaction | `21_load.sql` (md5 18575f54...): deletes 9 retired cards, changes 12 rows in place, renumbers the survivors 0..3233 (same order, via ord + 1000000), adds 6 cards at 3234..3239 -> **3,240 rows, md5 `131904c2de6b687c14ff4d68ccaea531`**, kb_versions.n 3240, saved index dropped (rebuilt by the next cold start). Runs only on md5 a9af05ee...; a second run says "already applied". Then run `20_precheck.sql` again: rows 3240, all_md5 131904c2..., new_ids_there 6. |
| 3 | Ask build (slot `live`), right after step 2 | **`4776ad1c5afb9203d9e11e12eb57531da62ce666756078032723c639d349db24`**, `https://raw.githubusercontent.com/PipelayersBible/Index.html-/ca2e7dceb7a9bc231fbab0299ca4010a7f9a2b9c/data/ask/b-4776ad1c5afb.txt` (cs1-live: e661 source + `src_patch/apply_patch_cs.py`, **empty overlay**). Same code as ai-next `284a80efeee2`, which carries the library change as an in-memory overlay. |

Install step 3: `select net.http_get('<URL>');` then `select pb_ai.code_install('live', <req id>, '<sha256 above>', '<URL>');` (expect `installed live 4776ad1c5afb (...)`).
Prompt row: no change. Warm workers keep the old library until they cold-start.

**Order:** either order is safe. New build + old library: the confined space table cards are not found, so nothing is forced (behaves like e661 for confined space; the 811 route fix works on its own).
Old build + new library: nothing is forced, answers use the new cards through normal search. Library first, then build, is the tested combination.

**Rollback, each step on its own:** library -> `91_rollback.sql` (md5 7958cddb..., guarded: runs only on md5 131904c2...; restores 3,243 rows and md5 a9af05ee... exactly; tested);
build -> `e661cb967ceb` (`https://raw.githubusercontent.com/PipelayersBible/Index.html-/64a8a02c2fedd2dbd1662ca1b189e6f05b0bbc47/data/ask/b-e661cb967ceb.txt`,
sha256 `e661cb967ceb5d97910f3a7bc65ac3c9ef85e59ebe0b14481879a61e68a0b3dc`).

**Local test** (`tools/local_test.sh`, log `work/local_test.log`; Postgres 16 copy at /var/lib/postgresql/askmerge_pg port 55433, snapshot `cs_live_3243.dump`, md5 = the server's a9af05ee...,
with the live constraints added): precheck 3243 / a9af05ee / touched 21 / new 0; load -> 3240 / 131904c2, kb_versions 3240 {app 238, osha 278, field 2724}, saved index rows 0;
load again -> "already applied"; loaded rows = `work/after_rows.jsonl` row for row (what the free check and the ai-next overlay used); rollback -> 3243 / a9af05ee exactly,
kb_versions back to {app 238, osha 278, field 2727}; rollback again -> "already rolled back"; load refuses when a live row changed (nothing written); rollback refuses on a changed result.
`21t_test_rollback.sql` on the local copy: `CS ROLLBACK TEST OK ...`, copy unchanged afterwards (3243 / a9af05ee).

## Smoke after promotion (5 questions, about $0.15)
1. "What is the carbon monoxide limit for entering a manhole?" Fresno, CA (pipelayer) -> 25 ppm (8 CCR 5155), stricter than federal 50 ppm.
2. "Does Texas follow the federal confined space rule, or does it have its own?" San Antonio, TX -> federal 29 CFR 1926 Subpart AA.
3. "Which confined space rule do I cite on a Washington job?" Seattle, WA (office) -> chapter 296-809 WAC.
4. "Can the entry supervisor just initial the confined space permit?" Salem, OR -> signature required (OAR 437-002-0146).
5. "How long is my locate ticket good for?" Cleveland, OH, **office** level -> Ohio only (no set expiry / not confirmed), **no other state named** (the analysis-route fix).

## Results (ai-next `284a80efeee2`, same prompt row as live). Spend about **$3.01** of $10 (smoke $0.08, subset $0.27, state cases $2.66)
| Run | Result |
|---|---|
| `1121-cs-148sub`: the confined space subset of the 148 (cs1-cs5, ng2, ng3, nw18-nw21), 3 per batch | **11 / 11 pass** (`eval_score`), facts 11 / 11, 0 errors, 0 forbidden, avg 86 words (live `1121-lib8-148`, same ids: 80 words) |
| `1121-cs-state`: 51 x "does <state> follow federal?", 51 x "CO limit for a manhole", 6 state-specific, 5 office-level 811 rule questions | **112 / 113**; wrong state 0; "elsewhere / most states / other states" 0; median 61 words. Follow-federal 51 / 51 by the table; CO limit 50 / 51 (CA 25 ppm, every other state 50 ppm federal; the one miss is Indiana at 111 words, right answer); CA rescue at the site (1960(a)), CA test order, WA 1 year, OR signature, MI Part 35, MD federal by reference: all right |
| Office-level 811 (the Cleveland bug) | Cleveland, San Antonio, Colorado Springs, Savannah: were routed to MODE business analysis on live code (route test), now normal Ask: Ohio only, no other state named |

## APPLIED Nov 21 evening (lead)
- Rolled-back live test: before 3243/a9af05ee, after load 3240/131904c2, after rollback 3243/a9af05ee. Applied 21_load (md5 18575f54). Build live = 4776ad1c5afb.
- Smoke 5/5: Fresno CO 25 ppm (stricter than 50); Texas follows Subpart AA; Seattle cite 296-809 WAC; Salem entry supervisor must sign (OAR 437-002-0146); Cleveland office-level: Ohio only, teacher mode, no other state named.
- Rollback: 91_rollback.sql, then reinstall build e661cb967ceb.
