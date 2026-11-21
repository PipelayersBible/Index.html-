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

---
# Second helper (Nov 20, from 18:00 UTC): lib5, round 5 on

**Tommy's decisions changed at 10:08 (coordinator) and replace decisions 2 to 4 above:** (1) short answers only if the answer is in the first sentence, checked strictly;
(2) complicated topics (multi-step procedures, slope / bench / shoring choices, permit steps, traffic setups, anything with a table) END WITH AN OFFER, and a "yes / more /
go on" reply must CONTINUE where it stopped (no repeat, no restart); (3) "Your competent person decides on site." on ANY safety-related answer (liability), one short line
at the end; (4) the 39 unconfirmed traffic cards stay as they are (another helper is looking for the manuals).

## Free fixes (step a)
**Why state cards were not used: two causes, both confirmed free.**
1. The 9,000-character cut. `stateSearch` adds the job state's cards after the general ones, then sorts everything by score, and `mergeExcerpts` keeps excerpts in that
   order until 9,000 characters. The state cards score lowest, so they are the ones that fall off. Modelled in `tools/cut.mjs`: with the lib4 search **15 of 668 cases lose
   their card to the cut, 12 of them state cards** (`lib-ca-sp-7`, `lib-wa-sp-7/8/9/15`, `lib-or-sp-4`, `lib-mi-sp-6/7`, `lib-nv-sp-1/4`, `lib-va-tc-2`, `lib-wa-fup-2`).
2. The intent keywords. The build searches with the question PLUS 6 to 15 keywords from the intent step. Those pull verbatim federal OSHA text far up. Tried with
   plausible keywords (`tools/intent_try.mjs`): Michigan's running-soil card (`sp-mi-trench-2`) fails the "near the best hit" test and drops out entirely; Utah's 8-hour /
   (801) 530-6901 card comes 6th, after four 1904.39 sections (the answer gave the federal 1-800 number, round 4). The two-place limit was not the cause.
   **Fix (build lib5, `src_patch/apply_patch.py` part 7):** the job state's own cards are picked on the question's own words (the intent words only for a short follow-up
   like "yes"), and they go FIRST in the excerpts (not in an emergency: first aid stays first). Excerpt budget 9,000 -> 10,000 characters (at 9,000, putting state cards
   first pushed one general table off, `tr11`). Free check after: 668 cases, 618 have the chunk in the search, **0 lost to the cut (was 15)**; with intent keywords the UT,
   MI (both), MT cards are excerpt 1. Existing 127 eval questions, every fact in the excerpts after the cut: lib4 113, lib5 117; **none worse** (better: lo7, nw15, nw17, nw26).
   Deno: 54 passed.
- **Stacked trench boxes (`lib-us-osha-33`), confirmed:** the answer guard (gonogo.ts) took line 1 ("No, ...", read as calling a box adequate) and put "Your competent person
  or entry supervisor makes that call on site." in its place, leaving no rule. The reply rule told the model to start with "the yes or no". Fix in reply rule v6: on trench
  protection / boxes / sloping / shoring / confined space, line 1 says what the rule requires ("OSHA requires ..."), never that their setup is fine or not needed.
- **Reply rule v6** (`src_patch/reply_rule.txt`, built in to lib5 and in the test prompt row; v5 kept in `work/reply_rule_v5.txt`): Tommy's 10:08 rules: safety line on any
  safety answer (not on an emergency: the steps end with calling 911), offer on complicated topics, and a FOLLOW-UP paragraph (on "yes / more / go on" give the offered part,
  pick up where it stopped, no repeat, up to 200 words / 10 steps, numbering continues).
- How follow-ups work (read in the source): the app sends up to 8 earlier turns (`body.history`, each answer cut to 3,000 characters for the last two); they go into the
  question as "EARLIER IN THIS CONVERSATION", the intent step sees them (so "yes" searches the earlier topic) and the base prompt already says a short follow-up finishes what
  was offered. The eval runner passes `history` too, but `eval_start` does not read it from `eval_set`, so 2-turn cases go through `pb_ai.eval_post('ai-next', <cases with history>)` directly.

**Installed on `ai-next` only:** build `40d00759e67d` (lib5; commit ec25df6, `data/ask/b-40d00759e67d.txt`, made with `tools/release_from.sh work/src5`, which does not touch
`/home/claude/ask_v24/src`). Test prompt row `teacher_v2@next`: reply rule v6 + `{"knobs": {"exChars": 10000}}`. Live slot (`b7ad788e3a62`) and live prompt row untouched.

## Round 5 (step b): the 12 that never came back + the 16 round-4 failures, build lib5 + reply rule v6 ($0.60)
Run `1120-1813-ai-next-5e5f`, graded with the updated `tools/grade.py` (round 5 on: an offer is required on a complicated topic (Tommy's list), "offer not wanted" only
on a simple one-number question; word limits count the answer without the safety line and the offer; new counts: safety line on safety topics, offers).
| Group | Pass | Facts right |
|---|---|---|
| The 12 never answered in round 4 (incl. canary `lib-us-osha-1`) | 8 of 12 (canary passes) | 11 of 12 |
| Round 4's 16 answered failures | 10 of 16 | 14 of 16 |
Wrong state 0. Safety line on 19 of 20 safety topics. **State cards now used:** `lib-ut-sp-2` (8 hours, (801) 530-6901), `lib-mi-sp-4` (running soil 3:1),
`lib-mi-sp-1`, `lib-mt-spec-1` (4 ft) all pass. **Stacked boxes `lib-us-osha-33` now gives the rule** ("OSHA says stacked shields don't all have to be designed for the
deepest part ... each box only at a depth not greater than it is designed for"; 74 words, 4 over). Still failing on facts: `lib-us-osha-62` (fourth time: answers with
Caltrans road plates instead of the 1926.502(i) twice-the-axle-load card, which is excerpt 1 in the free check) and `lib-us-mutcd-40` (says "off the travel lane with an
escape route", case wants "shoulder"; close to right). `lib-us-fed-17` (SWPPP records 3 years) is a retrieval gap: "keep ... reports" pulls OSHA 1904 recordkeeping.
Other failures: 4 to 7 words over 70, offers on two one-number questions, no offer on `lib-us-osha-12` and the two old "complex" probes (HOS, AC pipe bursting).
After this the rule was tightened in the test prompt row only (v6b, `src_patch/reply_rule.txt`): 45 words before the closing lines; no offer on one-number questions.

**Why batches "never came back" (round 4's 12 and round 5's first try):** the batch got HTTP 546 (worker resource limit) three times and `eval_collect` stops retrying.
A batch is 6 questions, 3 at a time, in one worker that also builds the 3,228-chunk overlay index. The same 6 questions posted one by one all answered (200). Real app
questions are one per request, so this hits quality runs, not crews; lib5's extra question-only search adds some CPU. Work-around used: re-post the lost batch one question at a time with
`pb_ai.eval_post` and grade from `net._http_response` (round 5's raw file has both).

## Follow-through (Tommy's decision 2): 10 two-turn cases, direct posts ($0.43)
`work/followup/` (cases.json, turn1.json, turn2_graded.md). Turn 1: 10 of 10 complicated questions ended with an offer naming the left-out part. Turn 2 ("yes", "go on",
"more", "keep going" ...): **8 of 10 continued cleanly where they stopped** (numbering went on 7, 8, 9 ...; nothing repeated, nothing restarted); 2 (benching
dimensions, fu-2 and fu-8) continued but said the table did not come through: the plain card `osha-appendix-b-c-d-in-words-2` was not retrieved for the follow-up.
One slip: an Ohio permit follow-up quoted "25 ppm CO (Cal/OSHA)". How it works: the app sends earlier turns as `history`; the server puts them in the question as
"EARLIER IN THIS CONVERSATION" and the intent step reads them, so "yes" searches the earlier topic.

## Full regression (step c): the same 148 existing cases as the last live-build run ($5.01)
Run `1120-1816-ai-next-a1b6` (build lib5 + reply rule v6/v6b) against `1120-1657-ai-next-9e1a` (b7ad, the live build, + live prompt row), server grading (`pb_ai.eval_score`):
| | Live build b7ad (1120-1657) | ai-next lib5 (1120-1816) |
|---|---|---|
| Pass (facts + nothing forbidden + within limit) | 117 / 148 | **141 / 148** |
| Facts right | 146 | 141 |
| Forbidden claims | 1 | **0** |
| Too long | 29 | **0** |
| Average words | 118 | **70** |
| Errors | 0 | 0 |
| Cost | $4.59 | $5.01 |
Better: 30 cases (mostly length; `ng2` and `ph02` now have the facts). **Worse on the server's grader: 7** (`brk1`, `ct4`, `nw12`, `ph08`, `tr12`, `tr14`, `wa3`). Read by hand:
- **Two were real.** `tr12` (Type C, 10 ft, how far back): the go/no-go answer guard replaced the first sentence and left "Your competent person or entry supervisor makes
  that call on site. B)." with no number (the guard also cut the sentence at "App." in "App. B"). `tr14` (exactly 20 ft in Type B): said 1:1 applies and dropped the engineer.
  Fix, reply rule v6c (test prompt row + `src_patch/reply_rule.txt`): numbers for their own cut are given as "what the rule allows", and a number right at a limit names
  which side and the engineer. Re-run 3 times each on lib6 ($0.20): **tr12 3 of 3 give "at least 15 ft back"; tr14 3 of 3 name 20 ft and the engineer.**
  tr14 is split on the substance (2 say exactly 20 ft is inside "20 feet or less", 1 says Table B-1 covers only "less than 20 feet"): Appendix B's own wording differs
  (Table B-1 heading vs Figure B-1.2), and the app's sloping tool says Engineer Required at exactly 20 ft. **For Tommy / lead:** decide which reading Ask should give (recommend: the
  app's, engineer at 20 ft and deeper, the safe side), then add one line to the slope card.
- **Five are the case pattern, not the answer:** `brk1` "2 unpaid 30-minute duty-free meals" (pattern allows 25 characters between "2" and "meal"; the re-run passes);
  `ct4` "1-1/2 hours" (pattern wants "1.5 h" or "90 min"); `nw12` now gives Arkansas's 20 working days with the statute (the live build said "not confirmed") but says
  "811 notice", not "ticket"; `ph08` says "doesn't know what kind of utility" instead of "unknown"; `wa3` dropped the 150 psi side note (re-run includes it).
  Suggested pattern fixes for the lead (eval tables not touched): ct4 add `1[- ]1/2 ?h`; nw12 add `notice`; brk1 widen to `{0,35}`; ph08 add `doesn.t know`.
**Net:** by hand nothing is worse once v6c is in; by the server's patterns 3 still read worse (ct4, nw12, ph08) until those patterns are widened.

## Traffic cards v2 folded in (coordinator, 10:2x): build lib6
`merge.py` lines 22 and 164 now read `lib_traffic_nov20/v2/` (lib5 merge kept as `work/merge_lib5.py`, outputs in `work/out_lib5_backup/`). `merge.py` + `build_kb.py`:
lib_kb 0 errors (33 warnings); core 448 (389 new + 59 in place), 3,229 rows; cases 688 (676 core; +8 new traffic cases). Free check: 626 of 676 get their chunk, 0 lost to the
10,000 cut; existing 127: none worse than lib4. Overlay `lib6` (64 replaced, 389 added). Deno 54 passed. **Installed on `ai-next`: `13f8e89a0c31`** (commit fd02a7f), serving as build
stamp `1120-1821`. Test prompt row: reply rule v6c + exChars 10000.

## Round 6 (step d, first of two): lib6 + reply rule v6c ($2.03)
Run `1120-1838-ai-next-f458` + the six MUTCD questions of batch 9 re-posted one by one (546 three times as a batch; all six answered alone). Grader fixes before the
final grade (none changes an answer): an emergency is never a "complicated topic" (no offer in an emergency); an offer line may be up to 16 words; an offer on a
traffic-setup question (sign spacing, tapers) is allowed even when the case is "simple" (Tommy's list); `24-inch` with a hyphen counts for "24 in" (`fixes.py`, 16 cases).
**Fresh 66 / 72 (92%)**, re-asked 2 / 8, canaries 15 / 15 (all safety canaries pass), style 4 / 5, **wrong state 0**, facts 96 / 100, within limit 93, answer first 94,
median 68 words (answer + safety line + offer), safety line on 47 of 53 safety topics, competent-person line on 3 non-safety answers.
Real misses (facts): `lib-us-mutcd-15` (cones in the flagger's short taper: gave "speed in feet", the card says 20 ft), `lib-us-mutcd-55` ("short duration" on a traffic job
answered with OSHA's 24-hour short-term exposure; the MUTCD card was retrieved), `lib-us-mutcd-40` (third time), `lib-us-osha-12` ("classify the soil" left out), `lib-us-fed-17`
(library gap, 191 words of "from general knowledge"). Length: 7 answers 3 to 15 words over, plus `lib-us-fed-9` at 163. One filler pattern seen often: a line that only
says "<state> follows federal OSHA for private crews"; reply rule v6d (test row) drops it.

## Round 7 (step d, second of two): lib6 + reply rule v6d ($2.18)
Run `1120-1902-ai-next-6f2f` (all 17 batches came back, many on a second or third try after 546).
**Fresh 54 / 68 (79%)**, re-asked 2 / 12, canaries 15 / 15, style 3 / 5, facts 95 / 100, **wrong state 1**, within limit 86, answer first 89, median 72 words.
- **Length is the main failure (14):** most are 1 to 17 words over, from a third "- " line on top of the safety line (`lib-ut-sp-1` 87, `lib-in-dig-2` 80, `lib-ny-sp-1` 81);
  `lib-us-fed-9` 220 and `lib-us-fed-17` 169 run long when the library lacks the fact.
- **Wrong state (1):** `lib-mt-dig-1` (Montana ticket life, not confirmed): "Iowa's 25 days, for example, doesn't apply here." Right advice, but it names another state's number.
- **Facts (5):** repeats only: `lib-us-osha-12` (classify the soil), `lib-us-mutcd-40` (shoulder), `lib-us-mutcd-55` (short duration answered with OSHA's 24-hour
  short-term exposure, third time), and two case patterns (`lib-us-osha-94` lists the 22 states without the number; `lib-us-osha-51` is right but never says
  "agreement" or "notify").
- Offers: 6 of 11 complicated topics offered; 11 offers elsewhere (several on traffic setups, which Tommy's rule allows).
- Answer-guard artifact again: `lib-ny-sp-1` shows "Subpart A\n\nA." where a sentence was cut (same guard splitting seen in `tr12`).

## Scores (this helper)
| Round | Build / rule | Fresh | Canaries | Wrong state | Facts | Within limit | Answer first | Median words | Cost |
|---|---|---|---|---|---|---|---|---|---|
| 5 (12 lost + 16 failures) | lib5 / v6 | n/a (re-asks: 18 of 28) | 1 / 1 | 0 | 25 / 28 | 22 / 28 | 21 / 28 | 77.5 | $0.60 |
| Follow-through (10 x 2 turns) | lib5 / v6 | 8 of 10 continue cleanly, 2 partly | | | | | | | $0.43 |
| Full 148 existing | lib5 / v6, v6b | pass 141 vs live 117 | | | 141 vs 146 | 148 vs 119 | | 70 avg vs 118 | $5.01 |
| tr12 / tr14 + 5 re-checks | lib6 / v6c | tr12 3/3, tr14 3/3 | | | | | | | $0.24 |
| 6 | lib6 / v6c | **66 / 72 (92%)** | 15 / 15 | 0 | 96 | 93 | 94 | 68 | $2.03 |
| 7 | lib6 / v6d | **54 / 68 (79%)** | 15 / 15 | 1 | 95 | 86 | 89 | 72 | $2.18 |
**Spent by this helper: $10.49** (of $17). With the earlier $8.16 this job is at $18.65; Tommy's Ask test total is about $33.5 of $50. Batches that hit 546 may have used some
model time before failing; that is not in these numbers. Nothing is running.

## Stop rule and the big run: NO-GO for now
Two rounds in a row at 90% fresh and zero wrong state: **not met** (92% then 79%, one wrong-state mention). Safety canaries pass in every round. What to do first (all small):
1. **Length:** the safety line plus the offer pushed answers up; v6d did not hold them. Next wording to try (free, test row): "at most 2 '- ' lines BEFORE the safety line;
   the safety line and the offer are extra" and drop the federal-OSHA filler in state.ts itself (it tells the model "federal OSHA IS <state>'s rule", which it then repeats as a line).
2. **Wrong state:** add to the reply rule "never name another state or its number, not even as an example" (the Montana case).
3. **Quality-run harness:** the 6-question batch hits 546 (worker resource limit) on most first tries with the overlay build; the big run (~830 questions) will lose
   batches and take hours. Before it: 3-question batches (`eval_start` groups by 6; needs the lead) or re-post failed batches one by one as done here.
4. **Answer guard sentence split** (gonogo.ts, live code too): it cuts at "App." / "Subpart A." and leaves fragments ("... makes that call on site. B)."). Seen 3 times.
   This is live code: lead's call.
5. The 20-ft question (tr14): pick one reading (recommend the app's: engineer at exactly 20 ft) and add it to the slope card.
6. Retrieval gaps seen twice or more: SWPPP record retention (`fed-epa-cgp-*` lose to OSHA 1904 on "keep ... reports"), "short duration" (MUTCD) vs OSHA "short term",
   benching dimensions on a follow-up (`osha-appendix-b-c-d-in-words-2` not pulled for "yes please").
Then one round of 100; if fresh is at or above 90% with zero wrong state twice, the big run is about $17 (830 x ~$0.02).

## What is on the server because of this helper
| Thing | State |
|---|---|
| `pb_ai.code` slot `next` | `13f8e89a0c31` (lib6: lib5 code + traffic v2 overlay), commit fd02a7f. lib5 `40d00759e67d` (commit ec25df6) was installed before it. **Live slot untouched (`b7ad788e3a62`).** |
| `teacher_v2@next` prompt row | reply rule v6d + `{"knobs": {"exChars": 10000}}`; v5 kept in `work/reply_rule_v5.txt`. Live row untouched. |
| `pb_ai.eval_set` | +140 inactive library cases (cat `lib6`, `lib7`); same cleanup line as above. Active cases and their patterns not touched. |
| Library tables, shelf | nothing written. |
| Repo | two sealed build files under `data/ask/` (b-40d00759e67d.txt, b-13f8e89a0c31.txt), one commit each; nothing else committed. |

## If promoted
lib6 as built carries reply rule **v6** built in; the test row carries **v6d**. Before any promotion rebuild with `src_patch/reply_rule.txt` (now v6d) or put v6d in the
live row. Parts 2 to 7 of `src_patch/apply_patch.py` apply on live too; part 7 (state cards first, excerpts 10,000) has been through the full 148 regression.
Files: `src_patch/apply_patch.py` (part 7 added), `src_patch/reply_rule.txt` (v6d), `tools/cut.mjs`, `tools/intent_try.mjs`, `tools/regress_build.mjs`, `tools/release_from.sh`,
`tools/grade.py` (round 5 rules; round 4 grader kept as `work/grade_r4.py`), `work/round5..7/`, `work/followup/`, `merge.py` (traffic v2 paths), `fixes.py` (24-inch pattern).

---
# Third helper (Nov 20, from ~22:40 UTC): Tommy's 14:47 list (all 148, follow-through, strictest rule, 20 ft, checker cut, add-on)
(in progress; saved early)

## Minimal promotable build (coordinator asked for it first): `4a5c84ce8242`
- `/home/claude/ask_v24/src` rebuilt with PB_BUILD 1120-1647 is **byte-identical** to live `b7ad788e3a62` (decrypted and compared), so it is the live source.
- Build = that source + `ask_followups_nov20/server/ask_state_addon.py` + `src_patch/apply_patch_guardsplit.py` (answer checker: no cut at "App." / "Subpart A." / "No." / lone letters; tail pieces under 6 characters glued back). Deno 42 passed (incl. `tests/guardsplit_test.ts`, 3 new; its first test fails on b7ad).
- Sealed, commit 57230c8, `data/ask/b-4a5c84ce8242.txt`, installed on `ai-next` with `pb_ai.code_install`. Smoke 5 questions $0.55: tr12 keeps "App. B, B-1.3" whole.


## lib7 build (strictest rule, continuation, 20 ft, checker split) on ai-next
Source chain (all exact-once patches, reproducible): `/home/claude/ask_v24/src` (= live b7ad) -> `ask_followups_nov20/server/ask_state_addon.py` -> `ask_shelf_nov20/src_patch/apply_patch.py`
-> `src_patch/apply_patch.py` (lib1-6 parts, reply rule from `src_patch/reply_rule.txt`) -> `src_patch/apply_patch_guardsplit.py` -> `src_patch/apply_patch_lib7.py`. Tree: `work/b7/src7`; tests `work/b7/t7` (Deno **62 passed**:
the 42 of the minimal build + shelf 14 (one wording check updated to the new line, `tests/shelf_test_lib7.ts`) + kb_next 2 + `tests/lib7_test.ts` 4).
- **Continuation turns (Tommy item 2, general for every topic):** `continuationOf()` in ask.ts: a short "yes / go on / sure / more / ok go ahead / the table" (8 words or fewer, or 3 or fewer after an offer)
  with history is a continuation. Retrieval = the thread's ORIGINAL question (the newest earlier question that is not itself a "yes"), i.e. the same search turn 1 ran (turn 1's cards come back),
  plus up to 3 new cards from "<offered part> + original question" (+ the intent words); excerpt budget +4,000 characters on a continuation. A CONTINUATION line tells the model to deliver
  the offered part in full (every row / item / step, with numbers), never "did not come through". Free check (`tools/fu_retr.mjs`): the benching card is now in the turn-2 excerpts for both
  old misses (fu-2, fu-8; the plain "offer + question" search alone found only 1 of 2, which is why turn 1's cards are carried).
- **Strictest rule (item 3):** state.ts lines (all branches), prompts_v2 (air limits by jurisdiction, labor law), go/no-go line, reply rule v7: give the STRICTER of state and federal
  with its source in a few words; equal = no extra sentence; unsure = both, follow the stricter; never weaker because it is the state's; never name another state. Retrieval: own card 1,
  best general (federal) card 2, then the rest, so both sides survive the excerpt cut. Free checks: 676 lib cases 625 with their chunk, 0 lost to the cut (same as lib6); 127 existing: identical to lib6.
- **20 ft (item 4):** reply rule DEPTH 20 FT line; go/no-go line; card edits `osha-appendix-b-c-d-in-words-1/-2` (exactly 20 ft and deeper = registered PE, as the app's sloping tool).
- **Cards (item 7):** new `mutcd-6d-flagger-where-1` (shoulder / closed lane), `mutcd-6n-short-def-1` (short duration = up to 1 hour, not OSHA's 24 h), `fed-epa-cgp-records-1` (3 years after
  coverage ends, CGP 4.7.4 / 5.4.4, re-read Nov 20 from EPA's PDF), `sp-ca-road-plates-1` (Caltrans plate table moved out of the general card, state CA); edits: `kb2-102`, `tc-2` (flagger
  position), `trench-crossings-fall-public-4` (plate table -> 1926.502(i) twice the axle load), `osha-pl-fall-holes-covers-1` (steel road plates named). `fixes.py` LIB7_*; lib_kb 0 errors.
- Builds: `7e5e3cf69dc0` (lib7, commit a4f8603) then **`1b7f661c3a5c` (lib7b, commit 2ee399f, installed on ai-next)**: lib7b = lib7 + "equal: no sentence", no federal-OSHA filler line
  in state.ts, overlay lib7b (68 replaced, 393 added). Test prompt row `teacher_v2@next`: reply rule element = `src_patch/reply_rule.txt` v7b exactly (md5 7d2bb60c... both sides).
- **Harness (item 8):** `tools/run3.py` inserts `pb_ai.eval_runs` rows of 3 questions (eval_start makes 6) and the usual `eval_collect` pumps 5 in flight; photos/feature fields carried
  (first pilot missed them for ph08: re-asked in round 8). **Continuation questions hit HTTP 546 even at 3 per batch** (all 5 first batches); one per batch works (26 of 27 first try).
  `tools/turn2.py` builds turn 2 server-side from the turn-1 answers (`PER=1`).

## Pilot on lib7 (`1120-lib7-pilot`, 57 questions, $2.05) and follow-through turn 2 (`1120-lib7-fu2b`, 27, about $1.25)
- **Follow-through, 27 two-turn cases (`work/lib7/cases_lib7.py`, graded `work/lib7/fu_graded.json`):** turn 1 ended with an offer on 22 of 27 (the 5 without had already given the whole
  answer: taper length, NV renewal steps, TX update steps, power-line distances, competent person list). Turn 2: **27 of 27 continued the same topic, none restarted, none repeated turn 1's first line.**
  The offered part was delivered in 25 of 27 by hand-read. The 2 left: `fu7-04`, `fu7-20` delivered the Appendix D steps but said "the exact table values ... are not in the excerpts":
  that is true. The library has the how-to card, not the D-1.x table numbers (library gap; see Next). The automatic check passes 15 of 27; the other 10 are length (turn 2 runs
  124 to 457 words, median 230; the table offered in full is long) and case patterns (`fu7-02`'s offer was Type C options, not bench heights; `fu7-14` "two 28-day extensions").
- Strictest (12, on lib7): facts right 12 of 12 (WA 4 ft "stricter than federal 5 ft", WA no 1/2:1, UT 8 h, CA CO 25 ppm, CA shade 80 F, GA and WY $7.25 "federal is stricter",
  Seattle $21.30), **0 weaker rules, 0 other states named**; 5 of 12 failed on length only, mostly the "<state> follows the federal rule here" sentence on equal cases. Fixed in lib7b, re-asked in round 8.
- Re-asks: `lib-us-mutcd-55` now answers "up to 1 hour (MUTCD 6N.01)" (third-time miss fixed; long); `lib-us-fed-17` "3 years after coverage expires or is terminated" (fixed; long);
  `lib-us-osha-62` still quoted the Caltrans plate table on a PA job (card fixed in lib7b); `lib-us-mutcd-40` still no "shoulder" (two old cards said "off the travel lane"; fixed in lib7b).
  Existing: tr12 and tr14 pass (tr14 names exactly 20 ft and the engineer), ct4, nw12, brk1, wa3 pass.

## Round 8 (`1121-lib7b-r8`, lib7b, $2.51 for 117 questions incl. strictest + re-asks)
Round cases picked with `NO_REASK=1 python3 tools/pick.py 8` (Tommy: rounds of FRESH questions): 71 fresh (state caps left no more), 15 canaries, 5 style.
**Fresh 54 / 71 by the grader, wrong state 0, facts 81 / 88**, median 71 words. Read by hand, about 62 / 71 are right; the rest of the 17:
- case or grader, not the answer (fixed for later rounds): "10-minute" vs "10 minutes" (`lib-md-sp-4`; the grader now reads "N-minute/hour/day" as "N minutes"); `lib-us-fed-1`'s forbidden pattern
  hit "no CDL is needed" in the exception line of a right "Yes, a Class A CDL is needed" answer (`fixes.py` MUSTNOT_FIX); gas-line-hit questions counted as "complicated, needs an offer"
  (the grader now treats them as emergencies: no offer).
- real: 6 answers 2 to 18 words over; `lib-il-dig-4` compared Illinois' 811 notice with "OSHA's 24-hour response window" (the strictest wording leaking into a state-only rule) ->
  **lib7c**: compare only the same requirement; 811 / state specs / state DOT manuals get no federal comparison (state.ts + reply rule); `lib-wa-fup-5` (Texas, short-term Type A) lost line 1
  to the go/no-go guard (old behaviour, live too); `lib-us-mutcd-55` answered OSHA's 24 h again (passed on lib7); `lib-us-mutcd-40` still no "shoulder" (old cards fixed in lib7b; this ran on lib7b).
- Strictest 9 / 12 (3 length). `lib-us-osha-62`: passed (twice the axle load); `lib-us-fed-17`: right (3 years after coverage ends), long.
- Canary `tr3` and two more were still running at grading; collected later.

## lib7c / lib7d / lib7e (coordinator, Nov 20 evening)
- lib7c `6aa26cab381e`: the state-only comparison fix above (not installed alone).
- **Appendix D table cards** (coordinator: deliver the table values on a continuation): `osha-pl-appd-vertical-1` (D-1.1/D-1.2 vertical shores, Type A/B: spacing 8/8/7 and 8/6.5/5.5 ft,
  4 ft vertical, cylinder by width), `osha-pl-appd-waler-b-1` (D-1.3), `osha-pl-appd-waler-c-1` (D-1.4, solid sheeting). The federal tables are images in the eCFR; values read twice from
  Cal/OSHA's identical text copy (8 CCR 1541.1 App. D, dir.ca.gov/Title8/1541_1d.html), consistent, and they match OSHA's own Example 1. **Appendix C (timber) NOT added:** the only text copy is an
  ASCII grid whose row/column alignment the reader could not confirm (depth bands and upright columns marked unclear); timber sizes from a doubtful read are a safety risk. For Tommy to get:
  a clean copy of Tables C-1.1 to C-2.3 (OSHA's own PDF of Subpart P, or the Federal Register 1989 final rule tables).
- Continuation retrieval: the extra cards for the offered part are now searched with the offered part's own words (3+ words), plain-language cards first (verbatim OSHA text outranks them).
  Free check: fu7-20's turn 2 now gets an Appendix D table card; fu-2 / fu-8 benching card still there.
- lib7e: reply rule v7c FOLLOW-UP line: give the whole offered table, list or steps with one lead-in sentence and no filler (coordinator: over 200 words is fine for real content).
- **Installed on ai-next: `ce846c1a3e15` (lib7e, commit 76fe5cc)**, test row reply rule = `src_patch/reply_rule.txt` (md5 8f15b056e6af17964b77a85456b10a18). Deno 62 passed.

## Running notes (lib7e runs)
- Harness: with two runs pumping (10 batches of 3 in flight, then 15 with a manual `eval_pump(run, 8)`), 58 requests came back **503 "Ask is updating"** in 3 minutes. That reply is the boot
  stub's (`/home/claude/ask_boot/next_index.ts`): the worker could not load the sealed build (blob ~1.35 MB on next because of the library overlay). It is a cold-start failure under many
  new workers, not an answer failure; live's blob is 0.4 MB (no overlay). Lost batches were re-queued (`update pb_ai.eval_runs set req = null, tries = 0` for this job's own rows) and runs
  were then pumped one at a time at the default 5.

# Fourth helper (resumed Nov 21 ~00:30 UTC after a container restart)
- Collected server-side: `1121-lib7e-r9` 113 / 113 answered; `1121-lib7e-148` 84 + `1121-lib7e-148b` 42 = 117 of the 148 distinct; `1121-lib7e-fu2c` 2 / 2. The 31 missing of the 148 are the
  queued one-per-batch rows of `148b` (k 43-73); the 20 never-sent batches left in `148` (same questions) stay queued (a delete needed a confirmation that did not come): **never call `eval_collect('1121-lib7e-148')` again** (it pumps); collect it with the insert-only query.
- **Spend since 14:47 PST (22:47 UTC) Nov 20**, from the reply bodies in `net._http_response` (every answer carries its `usd`): ai-next **$15.40** (202 replies, incl. direct posts and smoke) +
  one live-slot smoke $0.24 at 22:59 = **$15.63**. Eval-table view: pilot 2.05 + fu2b 0.85 + r8 2.91 + 148 3.77 + r9 2.77 + 148b 1.99 + fu2c 0.07 = $14.41 (rest = direct posts).
  Batches that failed 546/503 may have used model time not counted. **Left: about $9.37 of $25.**

## Round 9 (`1121-lib7e-r9`, lib7e, 113 questions, $2.77): graded (`work/round9/graded.json`, extras `work/round9/grade7.txt`)
By the grader: **fresh 72 / 80 (90%)**, canaries 15 / 15 (no safety canary fails), **wrong state 0**, facts 99 / 100, within limit 92, answer first 93, median 69 words
(answer + safety line + offer), safety line on 54 of 60 safety topics, style 1 / 5. Read by hand, every failure:
- **Case pattern, not the answer (1):** `lib-ri-dig-1` says "a Dig Safe ticket doesn't expire as long as the marks are maintained"; the pattern lacks `doesn.t expire`. Fixed in `fixes.py` (documented below).
- **Grader, not the answer (2):** `lib-us-mutcd-24`, `lib-us-mutcd-22` offer sign spacing on a traffic setup question; Tommy's list allows offers on traffic setups (the round-6 grader rule
  only matched "sign spacing" wording in the question). `lib-us-mutcd-22` is also 3 words over.
- **Real, small (4 fresh):**
  - `lib-in-dig-3` (Indiana joint meet): adds "Federal OSHA allows going ahead without a locate only after 24 hours ..." to an 811 answer: a federal comparison on a state-only 811 rule, which Tommy said not to do. 114 words.
  - `lib-or-sp-6`, `lib-wa-sp-13`: right rule, then a guessing tail line ("If you meant water for dust control ...", "If you meant a 100-degree pipe bend ..."). 109 / 79 words.
  - `lib-la-dig-3` (Louisiana fine not confirmed): 118 words of side facts around "not confirmed, ask Louisiana 811". `lib-wv-dig-3` 9 words over.
- Style probes (4): `lib-us-osha-48` gave the whole permit list (169 words) instead of offering it; `lib-us-mutcd-54` sidewalk steps 131 words; `lib-us-fed-11`, `lib-us-fed-19` short and right, no offer. The content is right in all four.
Extras: re-asks `lib-il-dig-4` (no federal comparison now), `lib-us-mutcd-40` ("on the shoulder"), `lib-us-mutcd-55` (up to 1 hour, MUTCD 6N.01), `lib-us-osha-62` (twice the axle load),
`lib-wa-fup-5` (line 1 kept) **all pass**. Strictest 5 / 6: `st7-11` (Oakland, depth for a trench box) says "same as federal 5 ft" and leaves out Cal/OSHA's excavation **permit** for
trenches 5 ft or deeper that people enter (the stricter state part). Follow-through `fu7-04`, `fu7-20` (`1121-lib7e-fu2c`): **both now deliver the table / checklist** (Appendix D cylinder
sizes, the Type C 8 ft row from Table D-1.4; the box checklist), no "not in the excerpts" line. The two old misses are fixed.

## Promotion SQL: found stale, regenerated, tested locally (free)
- `promotion/04_library_core.sql` was made before lib7c/d: it **lacked 5 cards that ai-next runs** (`osha-pl-appd-vertical-1`, `osha-pl-appd-waler-b-1`, `osha-pl-appd-waler-c-1`,
  `mutcd-6d-flagger-where-1`, `mutcd-6n-short-def-1`) and its header said +393 while PROMOTION.md said +396. Regenerated with `tools/mk_sql.py` (old package kept in `work/promo_before_v4/`):
  now +396 added, 68 replaced in place = exactly `out/rows_changed.jsonl` = the lib7d overlay on ai-next (464 rows; the 9 chunks edited in place also carry a harmless `supersedes` key).
- `03_library_precheck.sql`: its comment said `already_there = 0`; the right first-run value is **9** (the 9 in-place edits keep their ids). Comment fixed.
- **Live library changed since our copy:** ords 110-239 (app-data cards: pipe wall / laying lengths, fittings, service intervals, calculator formulas) differ on live from
  `ask_state_nov20/work/kb_after.json`. None of them is touched by our SQL; the precheck's id/length check still passes. The live md5 today: `6d20fceeb4976ce1f304c75338fd89d3` (ord:lib:chunk, all 2,840).
- **Rolled-back test, done on a local Postgres 16 copy** (`tools/local_sql_test.sh`; live rows rebuilt locally, md5 equal to the server's): precheck 9 / 68 / 2840 / ids_same, texts_same true;
  core -> **3,236 rows, ords 0..3235 with no gap, ids unique, kb_versions.n 3236, saved index dropped**; core run twice = no change; shelf twice = 47 rows (10 states);
  `94_library_rollback.sql` -> **2,840 rows, md5 back to 6d20fcee... exactly**, kb_versions back to 2,840. The loaded rows equal the ai-next library row for row (only differences: 119 live app-data rows in ords 110-239, which come from live, and the `supersedes` key).
  Nothing was run against the server's library tables.

## The 148 existing cases on lib7e (`1121-lib7e-148` 84 + `1121-lib7e-148b` 64 one per batch; $5.84; graded `work/r148/graded.json`, `work/r148/grade7.txt`)
**140 / 148 pass** by the server's patterns (+ the 4 documented widenings and one more below); live b7ad was 117 / 148, lib5 141 / 148. Average 80 words (live 118), median 74. Read by hand, the 8:
- `tr11`: **case pattern, not the answer.** The forbidden pattern `1/2\s*:\s*1 (for|in|applies)` hit "The one-day exception (1/2:1 for 12 ft or less, open 24 hours or less) applies only to Type A",
  a right answer (1:1 for Type B). Widened to `...(?![^.]{0,80}type a)` (grade7 `NOT_WIDEN`, and `promotion/06_eval_pattern_fixes.sql`). Counted as a pass above.
- Length only, content right (4): `cut3` 174 / 140 (cut sheet steps), `eq4` 157 / 150, `ph09` 185 / 150 (photo of marks), `tie6` 151 / 150.
- `ph02` (photo): read the stake as "cut 3.82"; the stake is 3.83. Live b7ad read 3.82 too; lib5 read 3.83. Photo reading varies; not the library.
- `sa10` (Louisville, depth for a trench box): "OSHA requires ... 5 ft" with no Kentucky. lib7b removed the "follows federal" filler line, and with it the state. Kentucky runs its own plan,
  so the source should be named. **Fixed in reply rule v7d** (state plan named inside line 1's parentheses when the rules match).
- `sw1` (8-inch sewer slope, Wildomar): a web-search answer whose first line is missing; it starts "- This is from the Eastern Municipal Water District design guidelines ... 8" mains at.0040".
  The headline was dropped after the model wrote it (the text blocks of a web answer are joined with nothing between them, and a v28 clean-up drops a first paragraph it reads as a stall).
  **Live code path** (ask.ts around "web search answers come split", same in 4a5c); seen once here. For the lead: check with one or two web-search questions on live before promotion.

## lib7f on ai-next (free fixes from round 9 and the 148)
- Reply rule **v7d** (`src_patch/reply_rule.txt`; v7c kept in `work/reply_rule_v7c.txt`): (1) when the state ADDS a requirement the federal rule lacks (a permit, a notice) say it in line 1 or the line under
  it (`st7-11`, Cal/OSHA excavation permit); (2) in a state with its own OSHA plan, name the plan as the source in line 1's parentheses even when the rules match (`sa10`); (3) 811 / ticket rules: "no
  comparison and no OSHA line" (`lib-in-dig-3`); (4) no "if you meant ..." guess lines (`lib-or-sp-6`, `lib-wa-sp-13`).
- Build **`62dd8ef92316`** (lib7f = lib7e source `work/b7/src7` with only the built-in reply rule swapped to v7d: `work/b7/src8`; Deno 62 passed), sealed, commit 1a8bfeb,
  `data/ask/b-62dd8ef92316.txt`, **installed on ai-next** (`installed next 62dd8ef92316 (1344296 chars)`). Test row `teacher_v2@next` reply_rule element = v7d (md5 of the stripped text
  `e0687cbaae8092cd0f585c5e44796f57` on both sides). Live slot 4a5c84ce8242 and live row (md5 bbe7c4599587734e6727895da4f2e8d9) untouched.
- Case / grader fixes: `lib-ri-dig-1` pattern + `doesn.t expire` (fixes.py, out/cases.jsonl); grade.py: any traffic-control question may offer the setup (Tommy's list); grade7.py: `tr11` as above.

## Check run on lib7f (`1121-lib7f-check`, 16 questions, about $0.48): hand-read 15 / 16
- Fixed: `st7-11` now adds "California adds a Cal/OSHA permit for trenches 5 ft or deeper that a person enters (8 CCR 1539/341)"; `lib-in-dig-3` no OSHA line on the 811 answer;
  `lib-or-sp-6`, `lib-wa-sp-13` no "if you meant" tail; `lib-la-dig-3` 118 -> about 70 words; `sw1` now leads with 0.40% (0.0040 ft/ft).
- Guards still right: `tr12` (at least 15 ft back), `tr14` (exactly 20 ft = engineer), `nw12` (Arkansas 20 working days), `cs1` (19.5-23.5%), `st7-01` (WA 4 ft, stricter), `st7-06` (GA: federal $7.25), `lib-il-dig-4` (no federal comparison).
- Still: `sa10` names no Kentucky (the parenthetical rule did not take; likely no Kentucky card in the excerpts for this wording). Minor: the answer is the right rule.
- **Live-code issue seen again (web search):** `sw1`'s answer starts with the model's search lead-in and a stray tag: "The libraries don't give a sewer main minimum, so I'll check the web for the agency standard.TYPE: general".
  Together with the 148-run's `sw1` (headline dropped), web-search answers are where the text clean-up fails. It is in the live build too (not from this job); lead's call.

## Live build without the overlay (for promotion): `8b7042f9dfee`
`work/b7/src8live` = lib7f source with `kb_overlay.ts` emptied (rev "" turns the overlay off on every slot). Sealed 0.42 MB (lib7f is 1.34 MB because the 464-row overlay rides inside; that size
is what the 503 "Ask is updating" cold-start failures on ai-next were tied to). Deno 61 passed, 1 failed by design (the test that expects the overlay on ai-next). Commit e5ae1f1,
`data/ask/b-8b7042f9dfee.txt`. **Not installed anywhere.** Use it for live only after `04_library_core.sql` has put the library into the tables. `promotion/PROMOTION.md` rewritten for lib7f.

## Big partial run (`1121-lib7f-big`, lib7f) - running notes
241 core cases not asked on any lib7 build: 118 never asked in any round + 48 that failed last time on an older build + 75 earlier passes (osha / specs / more weighted). All read from `pb_ai.eval_set`
(already inserted, inactive) in batches of 3, one run at a time at 5 in flight. **Budget stop:** at $20.43 spent with 120 answered (about $0.03 a question), the last 8 batches (22 questions:
lib-ut-tc-3 ... lib-wv-dig-1, mostly VA / WA) were parked (`req = -1`) so the job ends under $25. Note: parked rows count as "running" in `eval_pump`, so it is pumped with `eval_pump(run, 13)`.

## Big partial run results (`1121-lib7f-big`, lib7f, 219 answered of 241, $5.59; graded `work/round10/graded.json`)
| Group | Pass (grader) | Facts right (grader) |
|---|---|---|
| Never asked before (fresh) | 94 / 108 (87%) | 107 / 108 |
| Failed last time on an older build | 29 / 41 | 37 / 41 |
| Passed last time (re-check) | 52 / 70 | 68 / 70 |
| **All answered** | **175 / 219 (80%)** | **212 / 219 (97%)** |
**Wrong state 0.** Median 69 words. Safety line on 112 of 126 safety topics. By collection: 811 68 / 74, specs 18 / 20, traffic 46 / 56, OSHA 37 / 56, more 6 / 13.
- **Length is most of the failures: 28** (26 length only), half of them 1 to 4 words over; the long ones are office / environmental questions (`lib-us-fed-18` AC pipe 181 words, `lib-us-fed-15` dewatering 154,
  `lib-us-test-3` manhole vacuum steps 138). Within 5 words counted as a pass: about 190 / 219 (87%).
- Read by hand, the 16 non-length failures: **10 are the case pattern, not the answer** (`lib-ks-dig-1` gives Kansas' 20 days and mentions the old 15; `lib-us-osha-51`, `-61`, `-15`, `-2`, `-60`,
  `lib-us-mutcd-23`, `-41`, `-11`, `lib-us-std-more-3`, `lib-ca-sp-2`, `lib-mi-sp-5`: right answers in other words, or an allowed offer). **6 are real:**
  - `lib-us-mfr-12` (flushing speed): "AWWA C651 recommends ... about 2.5 ft per second": live card `testing-water-8` still carried the 2005 number while `quick-reference-3` says C651-14 = 3.0. **Fixed: lib7g** (below).
  - `lib-us-osha-33` (stacked trench boxes): still muddled ("designed for the full depth only when you dig 2 ft below"). Recurring since round 3; the card is right, the answer is not. Not fixed.
  - `lib-us-mutcd-18` (cone bands for night): "the excerpts don't give the band widths": library gap (6 in and 4 in bands are not in a card).
  - `lib-us-osha-94` (which states have their own OSHA): a web answer whose headline was dropped (starts with "- Six states ..."), same clean-up failure as `sw1`. Live code.
  - `lib-sc-sp-1` (South Carolina competent person training): shows "[quote removed: not found in the OSHA text the app has]" in the middle of line 1. The quote check removed a quote of the SC card and left the note. Live code path; the SC card should be reworded without a quote.
  - `lib-mi-dig-2` (Michigan 48 in caution zone): adds "wider than the common 18 to 24 in elsewhere": other places' number, against Tommy's rule. Minor.

## lib7g on ai-next (the flushing card)
`testing-water-8` edited (fixes.py `LIB7_EDIT`, out/edits.jsonl): "AWWA C651-14 (Sec. 4.4.2) calls for flushing at 3.0 ft per second or more; the 2005 edition said about 2.5 ...", flows recomputed for 3.0 ft/s
(Q = v x area x 448.83: 4 in 120, 6 in 265, 8 in 470, 10 in 735, 12 in 1,060, 16 in 1,880 gpm). `build_kb.py`: 3,236 rows, 465 differ from live (396 new, 69 in place). Overlay rev lib7g.
`promotion/03` (already_there = 10, to_replace 69), `04` regenerated, `94_library_rollback.sql` now generated by `tools/mk_rollback.py` (69 rows back). Local test re-run: precheck 10 / 69 / 2840 / true x3,
core 3,236 (twice), shelf 47 (twice), rollback to md5 6d20fcee... exactly; loaded rows = overlay rows (465 / 465).
Build **`9418e997119c`** (`work/b7/src9`: lib7f + overlay lib7g; Deno 62 passed), commit 897e044, installed on ai-next (`installed next 9418e997119c (1346116 chars)`). Prompt row unchanged (v7d).
The live build `8b7042f9dfee` has no overlay, so it is unchanged by this. (`work/b7/src8` = lib7f as installed before, kept.)

## Spend (fourth helper's job, budget $25 since 14:47 PST = 22:47 UTC Nov 20)
From the reply bodies in `net._http_response` (each answer carries its `usd`): **ai-next $22.27 (313 replies) + one live-slot smoke $0.24 at 22:59 = $22.51.** By run: lib7 pilot 2.05, fu2b 0.85,
r8 2.91, 148 3.77 + 148b 2.07, r9 2.77, fu2c 0.07, lib7f check 0.50, big 5.59, lib7g smoke 0.04, plus direct posts by the third helper (smoke, re-checks). Batches that failed with 546 / 503 may have
used some model time that is not in these numbers. **Left about $2.49; stopped.** Parked, never sent: 22 big-run questions (`req = -1`, run `1121-lib7f-big`) and 20 old duplicate batches in
`1121-lib7e-148` (never call `eval_collect` on that run).

## Promotion package (final): `promotion/PROMOTION.md`
- Library: `03_library_precheck.sql` (expect 10 / 69 / 2840 / 2839, true x3) -> `04_library_core.sql` (+396, 69 in place, 3,236 rows) -> optional `05_library_shelf.sql` (47). Rollback `94_library_rollback.sql`.
  All tested on a local Postgres 16 copy of the live rows (`tools/local_sql_test.sh`); nothing run on the server's library tables.
- Build for live: **`8b7042f9dfeecc10ec4d2d4143a8ca2cdb0a504fbe629369bf3154ffe58ac391`** (no overlay, 0.42 MB), URL in PROMOTION.md. Tested code on ai-next: `9418e997119c` (lib7g) = same code + overlay.
- Prompt row: `02_prompt_row_promote.sql` copies `teacher_v2@next` (reply rule v7d, md5 e0687cbaae8092cd0f585c5e44796f57; exChars 10000 = the built-in default) to `teacher_v2`; rollback `92`.
- Eval pattern fixes (optional): `06_eval_pattern_fixes.sql` (ct4, nw12, ph08, brk1, tr11).
- Go / no-go table and "For Tommy to get" are in PROMOTION.md. **Recommendation: GO** in the order library -> build -> row, with the 4-question smoke; not "all 148 pass" literally (140; 2 real misses).

## What is on the server because of this helper
| Thing | State |
|---|---|
| `pb_ai.code` slot `next` | `9418e997119c` (lib7g). Before it this helper installed `62dd8ef92316` (lib7f). Live slot `4a5c84ce8242` untouched. |
| Repo | 3 sealed build files, one commit each: `b-62dd8ef92316.txt` (1a8bfeb), `b-8b7042f9dfee.txt` (e5ae1f1, not installed), `b-9418e997119c.txt` (897e044). |
| `teacher_v2@next` | reply rule element = v7d. Live row `teacher_v2` untouched (md5 bbe7c4599587734e6727895da4f2e8d9). |
| `pb_ai.eval_runs` / `eval_results` | runs `1121-lib7f-check`, `1121-lib7f-big` (8 parked batches, req = -1), `1121-lib7g-smoke`; results collected for `1121-lib7e-r9`, `-148`, `-148b`, `-fu2c`. |
| `pb_ai.eval_set`, library tables, shelf | nothing written. |

---
# Fifth helper (Nov 20 ~18:40 PST): lib8 fixes on live 8b7042f9dfee + tables 3,236 (in progress; saved early)
- Base: `work/b7/src10` = copy of `work/b7/src8live` (= live 8b7042f9dfee source). Tests `work/b7/t10` baseline 61 passed / 1 failed by design (kb_next overlay test).
- Overlay empty -> `overlayOn()` false on every slot -> ai-next reads `pb_ai.kb_chunks` (kb.ts:23, 56). Checked in code.
- Budget: started at $0; coordinator relayed Tommy's approval at 18:36 of up to $10 for the 148 + 27 follow-through + one fresh round.

