# Library load on the test slot + Ask rounds (library_load_nov20, Nov 20 2026)

**In short (for the lead):** the staged library is merged, checked for free, and running on `ai-next` only. Rounds are in progress.
Live Ask is untouched by this job: live build, live prompt row and live library rows are as the lead left them at 17:20 UTC.

| Round | Build on next | Fresh pass | Re-asked pass | Canaries (safety) | Style probes | Wrong state | Median words | Within limit | Answer first | Cost | Cost so far |
|---|---|---|---|---|---|---|---|---|---|---|---|
| (rounds are filled in below as they finish) | | | | | | | | | | | |

Budget: $34 cap for this job (lead, 17:20 UTC). Spent so far: $0.

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

