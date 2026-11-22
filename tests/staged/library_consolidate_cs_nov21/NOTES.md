# Ask library consolidation: confined space + 811 analysis-route fix (Nov 21, 2026) - finished

Tommy approved (Nov 21): confined space with the trench / 811 pattern. Base: LIVE build `e661cb967ceb` (source `library_consolidate_nov21/work/src_live`),
library `b3e91f6c47d2` **3,243 rows, md5 a9af05ee01c9f8d4be6054b27f48bfb8** (server SELECT, Nov 21), prompt row v8 (not touched), shelf 50 (not touched).
Live table constraints read with pg_constraint: pkey (version, ord), CHECK (ord >= 0), chunk CHECK, lib CHECK, FK to kb_versions. The local copy now carries all five
(snapshot `/var/lib/postgresql/askmerge_pg/cs_live_3243.dump`, md5 = live). Nothing was written to live library tables, slots or the prompt row.

## Counts
| | Before | After |
|---|---|---|
| Whole library | 3,243 rows, 2,787,157 chars | **3,240 rows, 2,784,895 chars** (-3 rows, -2,262 chars) |
| National confined space cards | 21 cards, 21,701 chars (12 osha-pl-cs + 7 field-numbers + 2 silica overview, overlapping) | **17 cards + 2 state tables = 19, 19,700 chars**: one per sub-topic, no state facts in them |
| State confined space cards | 8 cards, 6,855 chars (CA 4, WA, OR, MI, MN) | 7 cards, 6,415 chars (CA 3, WA, OR, MI, MN) |
| Load | | delete 9, change 12 in place, add 6 |

## What changed (cards/build_cards.py, cards/edits.json; lib_kb 0 errors, 0 warnings)
- **National, one card per sub-topic:** scope (+silica overview), definitions, first steps, program, employers, roles, training (as they were); **air limits** (new `osha-pl-cs-air-1`),
  **test order + monitoring + sewer early warning** (`-monitor-1`), **permit items** (`-permit-1`), **permit process + retention** (new `-permit-keep-1`), **retrieval / non-entry rescue**
  (new `-retrieval-1`), **rescue services** (`-rescue-1`), **alternate procedures** (`-altproc-1`), **reclassification** (new `-reclass-1`, from the 1203(f)-(g) text).
  Retired into them: `confined-space-field-numbers-1..6`, `confined-space-silica-1/-2` (kept: `-field-numbers-7` sewer practice card, `-silica-3`). Cal/OSHA cites left the national cards.
- **Tables:** `osha-pl-cs-states-1` (24 no-plan + 6 public-only states: federal Subpart AA), `osha-pl-cs-states-2` (21 plan states: uses federal 8 / taken as federal 4 / own rule CA WA OR / not checked IN KY SC IA VT WY).
- **CA:** `sp-ca-confined-1` (takes in `ca-cal-osha-trench-and-confined-4`, the same Article 37 summary); `sp-ca-confined-2026-1` rewritten from the **OAL-approved text** (read 2026-11-21:
  1952(a)(1)-(2) survey, (a)(4) testing, 1953(a)(3)(D) inerting, 1955(a)(12), **1960(a) "rescue services at the site ... immediately available"** - stricter than federal 1926.1211(a); filed 2025-11-04);
  `ca-cal-osha-trench-and-confined-3` -> `sp-ca-confined-air-1` (same ord; now a real CA card: CO 25 ppm / 200 ceiling, H2S 10/15/50).
- **WA:** + WAC 296-809-099 definitions (same 19.5 / 23.5 / 10% numbers; any physical hazard makes it permit-required; partial body entry needs a permit). **MI:** + Part 90 pointer for general industry.
- **MD (bug fixed):** `sp-md-trench-1` said "MOSH lists no Maryland supplement to the confined space in construction rule"; MOSH's own page (read 2026-11-21) lists one, and MOSH's adoption page says
  Subpart AA was adopted by reference effective Jan 2, 2017. Both MD cards now say that; the supplement's text is still not confirmed.
- **No fact lost:** `work/factmap.tsv` (129 facts, 116 automatic), `work/factmap_hand.tsv` (16 by hand; one boilerplate line dropped on purpose).

## Code (`src_patch/apply_patch_cs.py`, on the e661 source; diffs in src_patch/*.diff)
- A `state.ts`: confined space questions with a known job state (not emergencies) always carry the state's `sp-<st>-confined-*` card (if any) and the table card naming the state
  (same topicCards / FORCED_CHARS mechanism as trench / 811). Topic = confined space words, or a manhole / vault / wet well **with** an entry or air word, or O2 / LEL / H2S **with** an entry word
  (so "invert at the upstream manhole" and "air test on new sewer" are not forced).
- B `route.ts` - **the Cleveland bug:** at office level "How long is my locate ticket good for?" matched the business-analysis route (A_METRIC "ticket" + A_AGG "how long" + A_OWN "my").
  MODE business analysis drops BOTH the JOB STATE line and the v8 reply rule (the "never name another state / elsewhere" text), while the 811 table card listing every state was in the excerpts,
  so the model compared Ohio with California and Iowa. A_RULE now includes 811 rule words (good for, expire, valid, ticket life, tolerance zone, hand dig, positive response, wait before dig,
  law / rules / regulations ...): those questions stay normal Ask. Real analysis ("how many locate tickets did we call in last month", "compare our footage") still routes to analysis.
- C `ask.ts`: in analysis mode with a known state, one line: only that state's rule, never another state / "elsewhere". The normal path (stateLines + reply rule, strictest-rule wording) is untouched.
- Deno (`work/t12`): **75 passed, 1 failed by design** (the old kb_next overlay test, same as on e661); new `tests/cs_test.ts` (5 tests).

## Free retrieval check (before = live code + live rows; after = patched code + new rows; tools/retr_all.sh, compare.py)
| | PLAIN_MIN 0 (live) | PLAIN_MIN 2 |
|---|---|---|
| 700 existing core cases | chunk 635 -> 637, facts 675 -> 676, **0 worse** | chunk 648 -> 650, facts 682 -> 682, **0 worse** |
| still in excerpts, lower rank | lib-us-osha-58 2->4, lib-us-osha-94 5->6, lib-mi-sp-8 0->2, lib-ca-sp-sa-3 0->2 | same + lib-us-osha-47 5->6 |
| 204 trench / 811 state cases (consol1) | 204 / 204, 0 worse | same |
| 127 text cases | 117 -> 117, 0 worse | same |
| 113 new cases (cases_cs.jsonl) | state card or table in excerpts **16 -> 113** | same |
| avg excerpt size | +0.6% on existing cases | |

## Paid checks on ai-next `284a80efeee2` (overlay cs1). Spend **about $3.01** of $10
- `1121-cs-148sub` (11 confined space cases of the 148): **11 / 11**, 0 forbidden; avg 86 words (live 80).
- `1121-cs-state` (113): **112 / 113**, wrong state 0, "elsewhere / most states" 0, median 61 words. Follow-federal 51 / 51 (every state as its table line, not-checked states say so);
  CO limit: CA 25 ppm, all others 50 ppm (1 miss = Indiana 111 words, right answer). CA rescue at the site, CA test order, WA 1 year, OR signature (not initials), MI Part 35, MD by reference: right.
  Office-level 811 x5: no other state named (4 of them were analysis-routed on live code).
- Read by hand (about 40). Small things seen, not caused by this change: cs-ca-order cites 1926.1203(e)(2)(iii) (alternate procedures) for the federal test order instead of 1204(e)(3);
  ng2 says CA's H2S 10 ppm is "stricter than federal" (it is the same 8-hour number; the 15 / 50 ppm limits are the stricter part); an-mi-zone (not analysis-routed even on live) adds a federal OSHA line to an 811 answer.

## Builds (sealed, one commit each, pushed by release_from.sh)
- ai-next: **`284a80efeee2`** (commit 70ca54e, sha256 284a80efeee26ea599c244d96652a9659519c10610eb4a33d45b040ee6803177), **installed** (`installed next 284a80efeee2 (468744 chars)`; was 3f9c941db076).
- live candidate: **`4776ad1c5afb`** (commit ca2e7dc, sha256 4776ad1c5afb9203d9e11e12eb57531da62ce666756078032723c639d349db24, URL in PROMOTION.md, empty overlay). Not installed.

## Promotion package: promotion/PROMOTION.md (20 precheck, 21 load, 91 rollback, 21t rolled-back test), local test log work/local_test.log - all passed with the live constraints.
**Rolled-back live test: NOT done.** My one attempt (21t_live_compact_nc.sql) was cancelled by the permission prompt before anything ran; live checked after: 3243 / a9af05ee, kb_versions 3243. Run it before the load.

## Go / no-go: **GO**, after the lead runs the rolled-back live test (21t) and it says `CS ROLLBACK TEST OK`.

## On the server because of this job
code slot `next` = 284a80efeee2; eval runs `1121-cs-smoke`, `1121-cs-148sub`, `1121-cs-state` (collected). Nothing else written.

## DONE
