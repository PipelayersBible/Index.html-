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

## DONE
