# Library load on the test slot + Ask rounds (library_load_nov20, Nov 20 2026)

**In short (for the lead):** the staged library is merged, checked for free, and running on `ai-next` only. Rounds are in progress.
Live Ask is untouched by this job: live build, live prompt row and live library rows are as the lead left them at 17:20 UTC.

| Round | Build on next | Fresh pass | Re-asked pass | Canaries (safety) | Style probes | Wrong state | Facts right | Median words | Within limit | Answer first | All pass | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `db4651475267` (lib1) | 10 / 45 (22%) | 2 / 35 | 12 / 15 (3 safety fails, all length only) | 0 / 5 | 0 | 95 / 100 | 107 | 30 | 87 | 24 | $2.14 |
| 2 | `27c248b21699` (lib3) | 38 / 45 (84%) | 28 / 35 | 15 / 15 | 3 / 5 | 0 | 92 | 57.5 | 95 | 92 | 84 | $2.01 |
| 3 | `8b29762d5d15` (lib4) | 58 / 66 (88%) | 8 / 14 | 15 / 15 | 2 / 5 | 0 | 93 | 57 | 96 | 89 | 83 | $1.89 |

"Re-asked" in round 1 = the 35 weakest in the free check (there were no earlier failures). Rounds 2 and 3 had fewer than 35 failures to re-ask, so the rest went to fresh cases.
Small runs: smoke question $0.07; 20-question wording trial before round 2 $0.37.

Budget: $34 cap for this job (lead, 17:20 UTC). **Spent so far: $6.48.**

### What each round showed and what I changed
**Round 1** (library + first reply rule "40 to 60 words, never over 90"). Facts were right (95 of 100, no wrong state): the library works. 70 of 76 failures were
length only: median 107 words. The wording was not followed, same as the other helper found. Also 11 offers on simple questions.
Changed: the reply rule became countable instead of a word target: "line 1 is one sentence and is the answer, then at most 2 lines of 15 words, then stop".
Tried on 20 of the same questions first ($0.37): average 122 words -> 72, facts unchanged. Also: federal-OSHA states no longer get a "the library has no <state>
rule" line (state.ts), shelf patch added to the build, reply rule and excerpt knobs made readable from the test prompt row so wording can change without a build.

**Round 2.** Median 57.5 words, 95 of 100 inside the limit, canaries 15 of 15, fresh 84%. Of the 16 failures: 5 were the case, not the answer ("wasn't
confirmed" did not match "not confirmed"; two musts asked for a side fact); 2 were retrieval (road-plate cover strength, sewer flooding: the right card was not
handed over); 3 dropped a second fact to stay short; 5 offers (3 not wanted by the case, 2 missing); a few were 3 to 7 words over.
Changed: case patterns (74), two card titles, one line in the reply rule ("if the excerpt says not confirmed, say so and who to ask").

**Round 3.** Fresh 88% (58 of 66), canaries 15 of 15, no wrong state, median 57. Of the 17 failures: 8 are the offer rule (5 offers the case did not want,
3 complex cases answered without one); 4 are 2 to 8 words over a 70-word limit; 2 are the case (hyphen in "head-injury"; "given a role" for "assigned");
3 are real: `lib-us-osha-33` (stacked trench boxes: the go/no-go safety net left an answer with no rule in it), `lib-us-mutcd-40` (flagger station:
gave the distance, not "on the shoulder"), `lib-us-osha-62` (road-plate strength again; 4 of 17 batches may have run on the previous build's warm workers).
Read by hand (10 random passes + every failure): the answers are short, lead with the number, name the state and the section. Three things the checks do
not catch: "Your competent person decides on site." tacked onto non-safety answers (49 of 100); a "<state>'s MUTCD edition is not confirmed" line on traffic
answers that did not ask about it (comes from the 39 unconfirmed state cards); and when the web search runs, its lead-in sentence and a stray "TYPE: safety"
show in the answer text (seen once, `lib-nv-tc-3`, round 2; not caused by this job).
The offers the model makes are on-point ("Want the minimum test times by diameter and depth?"); the mismatch is with which cases are labelled complex.

## Step 1: merge (done, free)
`python3 merge.py` then `python3 build_kb.py`. Output in `out/`, report in `out/MERGE_REPORT.txt`.
- **446 core chunks** (388 new rows + 58 that replace a live row in place), **47 shelf**, **7 held**. Library after load: 2,840 + 388 = **3,228** (cap 6,000).
  Core per state: most is Washington with 20 (cap 40). Federal: OSHA 73 / 500, MUTCD 37 / 200, other federal 26 / 150, standards 10 / 100, makers 5 / 50.
- `lib_kb.py`: 0 errors on every new chunk.
- **Copyright (Tommy, Nov 20): summaries only.** Every chunk outside the federal collections is `kind: summary`; the 40-word / one-quarter quote limits are
  now applied to every chunk whose source names a handbook, manual, guide, spec book or standard, whatever its license field says. 0 problems.
  One allowed exception, `dig-ga-tickets-1` (shelf): its quotes are Georgia's statute text. Not checked: the 2,840 chunks already live (Greenbook, AWWA; the rules file lists that for the lawyer).
- Held (7): `sp-ia-who-1`, `sp-vt-who-1`, `sp-wy-who-1`, `sp-in-who-1`, `sp-mi-confined-1`, `sp-ca-program-1`, `sp-wa-fall-1`. The 39 unconfirmed traffic state cards are loaded (each says what is not confirmed).
- Overlaps resolved:
  - Every `dig-<st>-overview-1` replaces the old `dig-<st>` card. The old card's trench line: 23 states are covered by `sp-` chunks; for the 24 states under
    federal OSHA with no `sp-` chunk I wrote one small card each, `sp-<st>-trench-1` (federal 5 ft; OSHA's State Plans list re-read Nov 20); IA, IN, VT, WY
    (plans not read, placeholders held) stay covered by the general card `plan-trench-depth-1`, which names them as not checked.
  - `sp-mi-trench-1`, `sp-or-confined-1`, `sp-wa-confined-1` replace `plan-mi-trench-1`, `plan-or-confined-1`, `plan-wa-confined-1`.
  - Washington follow-ups: `plan-wa-trench-1` dropped (the three `sp-wa-trench-*` cards say the same from the same sections); `plan-wa-trench-2`
    (Table N-1, no short-term Type A slope) kept as `sp-wa-trench-slope-1`.
  - Sign spacing: `mutcd-6b-signspacing-1` replaces `traffic-control-4` (ord 1984); the made-up mph bands are edited out of `quick-reference-6` (ord 1914) and `tc-2`.
  - Edition fixes: `test-3` (bac-T: 16 hours / two options, AWWA C651-14) and `quick-reference-3` (flush at 3.0 ft per second).
  - `std-tenstates-slope-1` replaces `ten-1`; `spec-wa-dot-*` replace `wa-1..3` (as staged). `plan-trench-depth-1` now names the plans lib_osha read.
- Cases: **680** in one pool (665 core, 15 shelf-only), ids unique and none taken on live; 6 ids renamed, 7 dropped because their only chunk is held.

## Step 2: free retrieval check (done, free)
Search code = the build on next (`tools/build_search.sh` copies it). Local library copy checked against the server by md5.

| | Chunk in the first search | Every must-fact in the excerpts | Either |
|---|---|---|---|
| Live library (before) | 16 of 665 | 437 | 440 (66%) |
| Merged library, first pass | 586 | 623 | 639 |
| Merged library + fixes below (after) | **614 (92%)** | **642** | **659 (99%)** |

The 127 existing eval questions: every fact in the excerpts 114 before, 117 after; none worse.

Fixes made for it (all on the test slot only):
- **The two emergency questions** (heat confusion, trench cave-in) now get first-aid chunks first: `first_aid-44`, `first_aid-16` for "confused and stumbling",
  `first_aid-13` first for "caved in on a guy". Cause: the search halves first-aid chunks unless it sees an injury word, and "confused", "stumbling",
  "caved in" were not on the list. Code change in the next build (`src_patch/apply_patch.py`, part 2).
- **Titles in crew language** (`fixes.py`, 80 titles, no number changed): every state's 811 overview now carries "wait before you dig, how long a ticket is
  good, hand-dig zone" (the new overviews had lost the words the old cards answered with; Arkansas ticket life was not found at all), "the fine for not calling
  811", "admitted to the hospital", "cover before equipment runs over new pipe".
- **Plain-language cards beside word-for-word OSHA text**: the ask_state build's optional switch is on (2) in the next build. +14 cases.

## Step 3: load, next only
- The library tables are shared (one active version, read by live). Nothing was written to them. The next build carries the 451 changed rows itself
  (`src_patch/kb_overlay.ts`, made by `tools/mk_overlay.py`) and lays them over the live rows in the worker's memory **only when the request came to `ai-next`**.
  The same code on the live function reads the live library as before (Deno test `tests/kb_next_test.ts`: live = 2,840 rows untouched; next = the merged 3,228 exactly).
- **Shelf: pending.** `ask_shelf_nov20` was still "in progress"; the 47 shelf chunks are not loaded and the 15 shelf-only cases stay out of rounds.
- Builds on next by this job: see the table. Each is a sealed file pushed by `release.sh`. Deno: 40 passed.
- Test prompt row `teacher_v2@next`: the live text + one edit, the concise LENGTH rule with the offer for complicated subjects. Live row not touched.
- Eval cases are inserted **inactive** in `pb_ai.eval_set` (cat `lib`), so nobody's full-set run picks them up; grading is local (`tools/grade.py`), no change to the eval tables.


## State at 17:55 UTC (saved on the lead's "usage nearly maxed" notice)
- **Round 4 is in flight** (run `1120-1752-ai-next-eb46`, 100 questions, about $2): 14 re-asked + 66 fresh + 15 canaries + 5 style probes, build `8b29762d5d15`
  with reply rule v5 (in the test prompt row). No further paid round will be started. To finish it if this file has no round 4 row:
  `select pb_ai.eval_collect('1120-1752-ai-next-eb46');` until "0 running, 0 queued", then save
  `select repeat('x',50000) pad, jsonb_agg(jsonb_build_object('id',id,'status',status,'usd',usd,'ms',ms,'text',text) order by id) results from pb_ai.eval_results where run = '1120-1752-ai-next-eb46'`
  to a file and run `python3 tools/grade.py 4 <file>` (cases are in `work/round4/cases.json`).

## What is on the server because of this job
| Thing | State |
|---|---|
| `pb_ai.code` slot `next` | `8b29762d5d1506aec5591ec184f087aef6491465ca543b4639029c1ae2ae1657` (lib4), `data/ask/b-8b29762d5d15.txt`, repo commit 599ddb3. Live slot untouched (`b7ad788e3a62`). |
| Builds pushed by `release.sh` (4 sealed files, 4 commits) | `db4651475267` lib1, `c33165dbaa3b` lib2, `27c248b21699` lib3, `8b29762d5d15` lib4 |
| `pb_ai.prompt_overrides` row `teacher_v2@next` | live row's two edits + the concise LENGTH paragraph + one extra element `{"reply_rule": ...}` (v5). Live row `teacher_v2` untouched. |
| `pb_ai.eval_set` | 312 library cases inserted **inactive** (cat `lib`, `libt`, `lib2`, `lib3`, `lib4`), empty must lists (graded locally). Safe to delete: `delete from pb_ai.eval_set where not active and cat like 'lib%'`. |
| Library tables (`kb_chunks`, `kb_versions`, `kb_index*`), `kb_shelf` | **nothing written.** The library rides inside the next build as an overlay. `pb_ai.kb_shelf` is still empty. |
| Eval tables' structure, edge functions, live anything | not touched |

## What the next build is (source: `src_patch/apply_patch.py` on top of the ask_state source + `ask_shelf_nov20/src_patch/apply_patch.py`)
`python3 ../ask_shelf_nov20/src_patch/apply_patch.py /home/claude/ask_v24/src work/src_shelf && python3 src_patch/apply_patch.py work/src_shelf work/src` reproduces it
(`/home/claude/ask_v24/src` itself was put back to the b7ad source after every release). Deno: 54 passed (38 + 14 shelf + 2 mine).
1. `kb.ts` + `kb_overlay.ts`: on `ai-next` only, 452 staged rows are laid over the live library in memory (3,228 chunks; log line `kb_overlay`, load about 1.5 to 2.5 s per cold start, no saved index).
2. `retrieval.ts`: emergencies in crew words count as injuries and put first-aid chunks first; four synonym groups (confused/confusion, hospital, fine/penalty, stumbling).
3. `ask.ts`: plain-language cards beside OSHA text on (2); the per-question reply rule (built-in v4; a `{"reply_rule"}` or `{"knobs": {"exChars", "verbatimMax"}}` element in the prompt row overrides it; knobs not tried yet).
4. `state.ts`: in a state under federal OSHA the federal rule is given as that state's rule, with no "the library lacks a <state> rule" line.
5. Shelf search patch (ask_shelf_nov20) is in the build. **Shelf rows are NOT loaded**: SQL can only reach the server typed through the SQL tool, and the 46 shelf
   chunks are 78 KB. `out/sql/merged_shelf_00.sql` is ready for the lead (lib_kb format, safe to run twice). Until then the shelf code is a no-op and the 12 shelf-only cases stay out of rounds.

**If this build is ever promoted as it is:** parts 2, 3, 4 and 5 would apply on live too; part 1 would not (live keeps reading the live library). The library itself goes live
with `out/sql/merged_core_00.sql` (+ `merged_core_precheck.sql`; 388 new rows, 59 replaced in place, 5 edited in place; NOT applied, not run even locally against Postgres) and then a build without the overlay.
