# Ask library consolidation: trench / excavation and 811 (Nov 21, 2026)

Tommy approved (Nov 21): universal rules once, state exceptions only where a state differs; first two topics trench/excavation and 811.
Base: LIVE Ask build `d881cb695137` (source `library_load_nov20/work/b7/src10live`; the search code bundled from it is byte-identical to what the state-audit check used),
library `pb_ai.kb_chunks` `b3e91f6c47d2` **3,270 rows, md5 `eb05d565cacc0e0b64a848aa41a5496f`** (server, SELECT only, Nov 21) = `state_audit_nov21/ask_merge/work/after_rows.jsonl`, shelf 50 (not touched), prompt row v8 (live and @next identical, md5 c0aa8fed...).
Nothing was written to live library tables, slots or the live prompt row. Written on the server: code slot `next` (install), `pb_ai.eval_runs` / `eval_results` rows for my 3 runs.

## Counts
| | Before | After |
|---|---|---|
| Whole library | 3,270 rows, 2,802,464 chars | **3,243 rows, 2,787,157 chars** (-27 rows, -15,307 chars) |
| Trench state + table cards | 43 cards, 31,871 chars | **15 cards, 14,815 chars** (incl. the 2 new table cards) |
| 811 state + table cards | 138 cards, 133,214 chars | 139 cards, 134,867 chars (2 duplicate CA cards out, 3 table cards in) |
| Load | | delete 31, change 9 in place, add 4 |

Why 811 barely shrinks: there is no federal 811 wait, ticket life or tolerance zone, so **every state differs** and every state keeps its own card(s). The per-state cards are
already one card per sub-topic (overview / tickets / marks / damage / wait), and the overlap between a state's overview and its sub-cards is the "in short" answer that retrieval
relies on (the 6 "wait" cards were added by the state audit for exactly that). The only true duplicates were California's: `dig-ca-overview-1` (= ca-dig-alert-4216-1/-2/-4/-7) and
`ca-dig-alert-4216-9` (= dig-ca-penalties-1). What 811 gains is items 3 and 4 of the design: by-state tables and forcing.

## What changed
**Retired (31):**
- 24 one-state trench cards that all said "no state OSHA plan, federal 5 ft": `sp-<st>-trench-1` for AL AR CO DE DC FL GA ID KS LA MS MO MT NE NH ND OH OK PA RI SD TX WV WI -> `osha-pl-trench-states-1`.
- `sp-in-trench-1` (Indiana adopts federal) -> `osha-pl-trench-states-2`; `sp-wa-trench-other-1` -> `sp-wa-trench-1`; `ca-cal-osha-trench-and-confined-1` and `cal-1` (the same 341 permit) -> `sp-ca-trench-1`;
  `ca-cal-osha-trench-and-confined-2` (Title 8 structure, matches federal) -> `sp-ca-trench-other-1`.
- 811: `dig-ca-overview-1` (duplicate of the ca-dig-alert-4216 cards), `ca-dig-alert-4216-9` (merged into `dig-ca-penalties-2`).
**New (4):** `osha-pl-trench-states-1` (federal-OSHA states: 24 with no plan + 6 public-employee-only), `fed-811-wait-1`, `fed-811-ticketlife-1`, `fed-811-zone-1` (every state's group, from its own cards; not-confirmed ones listed as not confirmed).
**Replaced in place (6):** `plan-trench-depth-1` -> `osha-pl-trench-states-2` (21 plan states: adopt federal / differ / not checked IA VT WY); `sp-wa-trench-1` (+ 4 ft walkway guardrails, utilities, the same-as-federal cites);
`sp-ca-trench-1` (+ permit detail, exemptions, Greenbook 306-3.1); `sp-ca-trench-other-1` (+ Article 6 structure, 19.5% / 20% LFL); `sp-mn-trench-1` -> `sp-mn-confined-1` (its confined-space facts; trench -> table); `dig-ca-penalties-1` -> `dig-ca-penalties-2`.
**Edited in place (3, legacy cards):** `trench-safety-1` (national card no longer carries Washington's 4 ft; WA card does), `dig-basics-1` (dropped the app-table counts "28 / 13 states" that disagree with the tables), `sp-md-who-1` (said the MOSH excavation supplement was not read; `sp-md-trench-1` has it).
Exception cards kept as they were: WA (plan, slope), CA (`sp-ca-trench-dig-1`, `ca-cal-osha-trench-and-confined-7` daily-record practice), MI x2, MD, SC, OR; all 811 state cards except the 2 CA duplicates.
All 10 new / rewritten cards: lib_kb.py **0 errors, 0 warnings** (`cards/consolidate_report.txt`).

## No fact lost: `work/factmap.tsv` (166 facts), `work/factmap_hand.tsv` (13 by hand)
Every sentence of every retired / replaced / edited card -> the card that now holds it. 154 matched automatically (every number, section cite, $ amount and year of the sentence is in the destination card),
12 + 1 source cite checked by hand. Deliberately dropped: "the safety lead usually holds the permit" (practice), MN "reporting times not read" (stale: sp-mn-report-1 has them), the app-table counts in dig-basics-1 (replaced by the tables).
811 tables cross-checked against the state cards (`each state's group number appears in its own cards`): 51/51/51 states listed, 0 mismatches.

## Code (`src_patch/apply_patch_consol.py`, on the d881 source)
- state.ts `topicCards()`: when the question is on trench / excavation (`TRENCH_TOPIC`) or 811 (`DIG_TOPIC`) and the job state is known (not an emergency), add (1) the state's exception card for that topic if it has one
  and none of its cards made it (sp-<st>-trench-*; dig-<st>-* or ca-dig-alert-* for 811, never the locatable cards), (2) the table card that names the state (trench: -1 or -2; 811: zone / ticket life / wait by what is asked, wait by default).
  Added beside the general excerpts (never pushes them out), at most 2,600 chars; the exception card sorts with the own cards (so the strictest-rule order "own card, then best general card" still holds);
  a forced card counts as the state's own (no "library has no <state> rule" line when the table says what the state does); forced table cards do not count as "plain words" cards (PLAIN_MIN). Extends the lib8 own-plan forcing.
- kb.ts: the test-function overlay can remove chunks (`OVERLAY.remove`), so ai-next runs exactly the library the SQL produces. Live builds have an empty overlay.
- Deno (`work/t11`): **70 passed, 1 failed by design** (the old lib7 `kb_next` overlay test, failing the same way on d881); new `tests/consol_test.ts` (4 tests: TX -> federal table, WA -> exception + plan table, VA vs West Virginia, 811 table by question, excavator is not a trench question, emergencies / no state force nothing).

## Free retrieval check (`tools/retr_all.sh`, `tools/compare.py`; before = live code + live rows, after = patched code + new rows)
| | PLAIN_MIN 0 (live default) | PLAIN_MIN 2 |
|---|---|---|
| 700 existing core cases (676 library + every state-audit case file, deduped) | chunk 637 -> **642**, facts 672 -> **675**, **0 worse**, 8 better | chunk 651 -> 655, facts 679 -> 682, **0 worse**, 7 better |
| still found, lower rank (in the excerpts) | 3 (lib-us-dig-1 1->2, lib-mn-sp-5 0->2, lib-wa-tc-4 0->2) | same 3 |
| 127 existing text cases (all facts in excerpts) | 116 -> **117**, 0 worse | 117 -> 117, 0 worse |
| 204 new state cases (state's exception card or table card in the excerpts) | 113 -> **204 / 204**, facts 201 -> 204 | same |
| average excerpt size | 6,837 -> 7,118 chars (+4%) | 7,019 -> 7,311 |
Case-map note: retired ids are mapped to where their facts went (work/alias.json), and `sp-wa-trench-1` also counts `sp-wa-trench-slope-1` (the no-short-term-slope fact moved there; lib-wa-sp-7 finds it at rank 0).
Two fixes came from this check: "excavator" no longer counts as a trench question, and with PLAIN_MIN 2 a forced table no longer pushes out a plain card (lib-us-osha-14, -80); also "slope" no longer counts (sewer slope).

## Builds
- ai-next: **`3f9c941db076`** (commit 77e5151, `data/ask/b-3f9c941db076.txt`, sha256 3f9c941db0768b9c38a939719080cf6c9e42159a08fd328f0a2ba5ddc1543cac) = d881 + patch + overlay `consol1` (replace 9, add 4, remove 31; 24 KB). `installed next 3f9c941db076 (456636 chars)`. Before it: `688d8c4be86d`.
- live candidate: **`e661cb967ceb`** (commit 64a8a02, sha256 e661cb967ceb5d97910f3a7bc65ac3c9ef85e59ebe0b14481879a61e68a0b3dc, empty overlay). Not installed.

## Promotion package: `promotion/PROMOTION.md` (20 precheck, 21 load, 91 rollback, optional 22 eval cases), tested on the local copy (`work/local_test.log`).

RESULTS_PLACEHOLDER
