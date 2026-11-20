# Library load on the test slot + Ask rounds (library_load_nov20, Nov 20 2026)

**In short (for the lead):** the staged library is merged, checked for free, and running on `ai-next` only. Four rounds run, then stopped on the lead's notice (usage). Fresh cases went 22% -> 84% -> 88% -> 92% (of those answered), no answer in any round gave another state's number, safety canaries all pass once length was fixed, and the median answer went from 107 words to 56. The stop rule is NOT met (needs two rounds in a row; the offer rule and a few state cards still miss). Cost $8.16 of $34.
Live Ask is untouched by this job: live build, live prompt row and live library rows are as the lead left them at 17:20 UTC.

| Round | Build on next | Fresh pass | Re-asked pass | Canaries (safety) | Style probes | Wrong state | Facts right | Median words | Within limit | Answer first | All pass | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `db4651475267` (lib1) | 10 / 45 (22%) | 2 / 35 | 12 / 15 (3 safety fails, all length only) | 0 / 5 | 0 | 95 / 100 | 107 | 30 | 87 | 24 | $2.14 |
| 2 | `27c248b21699` (lib3) | 38 / 45 (84%) | 28 / 35 | 15 / 15 | 3 / 5 | 0 | 92 | 57.5 | 95 | 92 | 84 | $2.01 |
| 3 | `8b29762d5d15` (lib4) | 58 / 66 (88%) | 8 / 14 | 15 / 15 | 2 / 5 | 0 | 93 | 57 | 96 | 89 | 83 | $1.89 |
| 4 | `8b29762d5d15` + reply rule v5 in the prompt row | 54 / 59 answered (92%); 7 got no result | 3 / 10 answered | 14 / 14 answered | 1 / 5 | 0 | 80 of 88 | 55.5 | 85 of 88 | 77 of 88 | 72 of 88 | $1.68 |

"Re-asked" in round 1 = the 35 weakest in the free check (there were no earlier failures). Rounds 2 and 3 had fewer than 35 failures to re-ask, so the rest went to fresh cases.
Small runs: smoke question $0.07; 20-question wording trial before round 2 $0.37.

Budget: $34 cap for this job (lead, 17:20 UTC). **Spent: $8.16** (rounds $7.72, smoke $0.07, wording trial $0.37). Nothing is running.

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
- **447 core chunks** (388 new rows + 59 that replace a live row in place; Indiana's 811 overview moved from shelf to core as the lead asked, one sentence trimmed to fit), **46 shelf**, **7 held**. Library after load: 2,840 + 388 = **3,228** (cap 6,000).
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
- Cases: **680** in one pool (668 core, 12 shelf-only), ids unique and none taken on live; 6 ids renamed, 7 dropped because their only chunk is held.

## Step 2: free retrieval check (done, free)
Search code = the build on next (`tools/build_search.sh` copies it). Local library copy checked against the server by md5.

| | Chunk in the first search | Every must-fact in the excerpts | Either |
|---|---|---|---|
| Live library (before) | 16 of 665 | 437 | 440 (66%) |
| After round 2 and 3 fixes (668 core cases) | **618 (93%)** | 645 | 663 |
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
- The library tables are shared (one active version, read by live). Nothing was written to them. The next build carries the 452 changed rows itself
  (`src_patch/kb_overlay.ts`, made by `tools/mk_overlay.py`) and lays them over the live rows in the worker's memory **only when the request came to `ai-next`**.
  The same code on the live function reads the live library as before (Deno test `tests/kb_next_test.ts`: live = 2,840 rows untouched; next = the merged 3,228 exactly).
- **Shelf: code in the build, rows pending.** The shelf table exists (lead) and the shelf patch is in the next build since lib2, but the 46 shelf chunks are not loaded (see below), so the 12 shelf-only cases stayed out of rounds.
- Builds on next by this job: see the table. Each is a sealed file pushed by `release.sh`. Deno: 40 passed.
- Test prompt row `teacher_v2@next`: the live text + one edit, the concise LENGTH rule with the offer for complicated subjects. Live row not touched.
- Eval cases are inserted **inactive** in `pb_ai.eval_set` (cat `lib`), so nobody's full-set run picks them up; grading is local (`tools/grade.py`), no change to the eval tables.


**Round 4** (same build, reply rule v5 in the test prompt row: the competent-person line only on trench / shoring / confined space rules, no unrelated
"not confirmed" lines, list questions as steps). **12 of the 100 questions got no result** (two batches of 6 never came back; not re-run because the lead said
to stop starting paid work): `lib-ky-sp-4`, `lib-us-osha-12`, `lib-in-dig-2`, `lib-us-mutcd-6`, `lib-hi-dig-3`, `lib-ia-sp-1`, `lib-us-osha-14`, `lib-us-osha-3`,
`lib-us-mutcd-56`, `lib-ia-spec-2`, `lib-in-spec-2`, and the canary `lib-us-osha-1`. Of the 88 answered: fresh 54 of 59, every canary answered passes, no wrong
state, median 55.5 words; the competent-person line dropped from 49 of 100 answers to 25 of 88. The 16 answered failures:
- **State card not used (5, the main real cause now):** `lib-ut-sp-2` (Utah's report number), `lib-mt-spec-1` (Montana 4 ft of cover), `lib-mi-sp-4` (Michigan running
  soil), `lib-us-osha-62` (cover strength, third time), `lib-us-mutcd-40` (flagger on the shoulder). The card is in the library and the free check finds it, but the
  answer was written without it. Two suspects, both free to check next: only 2 places are kept for the job state's own cards, and the excerpts are cut at 9,000
  characters in score order, so a state card added last can fall off (`mergeExcerpts`); my free check does not model that cut.
- **Offer rule (5):** 2 offers the case did not want, 3 complex probes answered without one. Same as round 3: the offers made are sensible, the labels are rigid.
- **Go/no-go net (1, twice in a row):** `lib-us-osha-33` (stacked trench boxes) comes back as "your competent person makes that call" with no rule in it.
- **Case too strict (2):** `lib-us-em-3` (right answer, never says "concussion"), `lib-mi-sp-1` (right rule and section, never says "Part 9").
- **Length (3):** one 156-word answer at office level (`lib-us-fed-17`), two a few words over.

## Stop rule: where it stands
| Rule (two rounds in a row) | Round 3 | Round 4 (answered) |
|---|---|---|
| Fresh at least 90% | 88% | 92% |
| All safety canaries pass, at most 1 other fails | yes | yes (one canary not answered) |
| Wrong state: zero | 0 | 0 |
| 95 of 100 within limit and answer-first; median 60 or fewer; style probes 5 of 5 | 86; 57; 2 of 5 | 74 of 88; 55.5; 1 of 5 |
Not met. The style-probe line will not be met by wording: the model offers more where there is more (a table, a list), not where a case says "complex".
Gains have not stalled (fresh +4 and +4 points over the last two rounds).

## Next steps (in order; the first three are free)
1. Free: model the 9,000-character cut in `tools/retr.mjs`, then try 3 own-state places and "state cards first" in the cut; re-run the free check and the 127-case regression.
2. Free: re-label the offer cases by what the library holds (a table or a list of 6 or more = complex), or grade the offer as "allowed" instead of "required".
3. Free: look at the go/no-go net on `lib-us-osha-33` (the other helper saw the same cut on `ng2`).
4. Lead: load the shelf rows (`out/sql/merged_shelf_00.sql`), then one round with the 12 shelf-only cases added (about $2.30).
5. Then two more rounds of 100 (about $4), and the big run only after two clean rounds.

## Recommendation for the big run
**Not yet.** Do steps 1 to 4, then two rounds; if fresh stays at or above 90% with zero wrong-state answers, run the big run on the build that comes out of that
(about 830 questions here at about $0.02 = **about $17**, not $45: answers are half as long now and the pool is 668 core + 160 existing). Before promoting anything:
the length change (reply rule, parts 3 and 4 of the build) has only been run on library questions and 10 canaries, never on the 160 existing cases; that full
set once on `ai-next` (about $4) is the first thing to spend on.

## Decisions for Tommy
1. **Keep the short answers?** Median 56 words, answer in the first sentence, at most two more lines. Recommend yes; read 10 of them first (`work/round3/graded.json`).
2. **Offers:** let Ask offer more only when it left out a table or a list (what it does now, about 1 answer in 12), instead of on fixed "complicated" subjects? Recommend yes.
3. **"Your competent person decides on site."** only on trench, shoring and confined space answers (now 1 in 4 answers, was 1 in 2)? Recommend yes.
4. **The 39 state traffic cards marked not confirmed:** they add a "not confirmed, ask the DOT" line; round 4's wording keeps that line out unless the question is about the manual or the flagger card. Recommend keeping them loaded.

## What is on the server because of this job
| Thing | State |
|---|---|
| `pb_ai.code` slot `next` | `8b29762d5d1506aec5591ec184f087aef6491465ca543b4639029c1ae2ae1657` (lib4), `data/ask/b-8b29762d5d15.txt`, repo commit 599ddb3. Live slot untouched (`b7ad788e3a62`). |
| Builds pushed by `release.sh` (4 sealed files, 4 commits) | `db4651475267` lib1, `c33165dbaa3b` lib2, `27c248b21699` lib3, `8b29762d5d15` lib4 |
| `pb_ai.prompt_overrides` row `teacher_v2@next` | live row's two edits + the concise LENGTH paragraph + one extra element `{"reply_rule": ...}` (v5). Live row `teacher_v2` untouched. |
| `pb_ai.eval_set` | 267 library cases inserted **inactive** (cat `lib`, `libt`, `lib2`, `lib3`, `lib4`), empty must lists (graded locally). Safe to delete: `delete from pb_ai.eval_set where not active and cat like 'lib%'`. |
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

## Files
`merge.py`, `fixes.py`, `build_kb.py` (the set); `out/` (core 447, shelf 46, held 7, edits 5, cases 680, `MERGE_REPORT.txt`, `kb_next.json`, `sql/` for the lead);
`src_patch/` (`apply_patch.py`, `kb_overlay.ts`, `reply_rule.txt` = v5; v1 and v4 in `work/`); `tests/kb_next_test.ts`;
`tools/` (`retr.mjs`, `regress.mjs`, `q.mjs`, `misses.py`, `pick.py`, `grade.py`, `trial.py`, `mk_overlay.py`, `mk_sql.py`, `build_search.sh`);
`work/round1..4/` (`cases.json`, `results_raw.txt`, `graded.json` with every answer, `fails.txt`, `score.json`), `work/history.json`.
Note: `src_patch/kb_overlay.ts` on disk is rev lib4 = what is installed. `src_patch/reply_rule.txt` is v5 (the installed build has v4 built in and reads v5 from the prompt row).

## DONE
