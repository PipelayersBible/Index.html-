# Simpler Run Setup (Nov 20) — NOTES

Status: BUILT as 4 stacked patches on the r17.11 candidate, with tests. Nothing committed, deployed or written to the server.
Base page: /tmp/claude-0/r1711/src.html (copied, never edited; md5 c92fb3c3…). Work dir: /tmp/claude-0/rs20 (ports 9650-9651).

## What Run Setup looks like now (foreman's phone, 390x844)

Top to bottom, a new run on a job the phone already knows:

1. **Import Cutsheet**: a small button at its own width (was a full-width bar). Still the first thing on the screen.
2. **Job details**: one line: `Job 24-017 · Wildomar Sewer Ph 2 · no pipelayer yet`. One tap opens the boxes.
3. **Pipe size | Pipe type** (the one pick a table pipe needs). Under it, where the owner put them on Nov 17:
   `Wall & laying length  Wall 0.02 ft (auto) · 14 ft lengths` and `Intervals  Every 10 ft`, one line each.
4. **More settings** (as r16.95: rod, HI, trench, on one line).
5. **Start Point, Hubs, End Point**, then Additional runs, then Review & Calculate. Unchanged.

Every fold opens by itself when it needs a look (below). Review, the backflow / deep-trench warnings and Lock This Run are
untouched: Lock is still at the end of the review, not pinned.

## Before / after (measured by tests/t_rs02_setup_short.js, rig co_fm = a foreman in a company)

| | Before (r17.11 candidate) | After |
|---|---|---|
| New run, job known: page height | 3,343 px (4.0 screens) | **2,752 px (3.3 screens)**, 18% shorter |
| Controls showing (boxes, dropdowns, tick boxes, buttons, fold headings; Feedback pill and jump button not counted) | 49 (17 boxes, 5 dropdowns, 2 tick boxes) | **38 (10 boxes, 4 dropdowns, 0 tick boxes)** |
| First stake box (Stake elevation) is at | 1,699 px (third screen) | **1,108 px (second screen)** |
| Review & Calculate is at | 3,173 px | 2,582 px |
| Import Cutsheet button | 358 x 44 px | 170 x 44 px |
| First-ever run (no job yet): height / controls | 3,343 px / 49 | 3,099 px / 45 (Job details stays open: the job has to be typed) |
| Typical run (job known, 8" table pipe, two staked points): what the foreman does | 1 pick + 7 boxes typed + Review & Calculate + Lock | **the same 1 pick + 7 boxes + 2 taps**, with 591 px less scrolling and no fold to open |
| Foreman's phone, "Pipelayer name" | the foreman's own name | **blank** (or the one pipelayer on his crew), names one tap away |

Honest reading: the typing for a run did not get shorter, because every box left is one the grade needs (stake elevation,
cut, rod reading, twice). What changed is how much a foreman has to look past to get to them. The critic's "53 controls,
3,364 px" was his own count on r17.10; mine on the candidate, counted as above, is 49 and 3,343 px.

Screenshots (shots/): `before_first_run_full.png`, `before_job_known_fold.png`, `before_job_known_full.png`,
`after_first_run_full.png`, `after_job_known_fold.png`, `after_job_known_full.png` (+ `before_fm_*.png` from the first probe).

## The patches (patches/, apply in order with `patches/apply_all.sh <in.html> <out.html>`)

Each is Python with an exact-once `rep()`, `python3 NN.py in.html out.html`. They stack on the r17.11 candidate.

| # | File | What it does | Can ship alone? |
|---|---|---|---|
| 01 | `01_pipelayer_prefill.py` | A FOREMAN's New Run no longer fills Pipelayer name with the foreman. Blank; or the crew's pipelayer when My crew is exactly one person. While blank, one-tap names under the box: the crew, the last run's pipelayer, "Me (name)". A typed name, a draft's, a resumed run's and Edit Run Data's are never touched. A pipelayer's phone still starts with his own name. Owner / manager phones and no-company phones are unchanged. | Yes |
| 02 | `02_job_fold_import_small.py` | Job details starts closed on a NEW run whose job is already on the form (current job or last run); the closed line gives job + pipelayer. Stays open when there is no job, on Edit Run Data / Resume / a draft, and for an account that chose "open" (the batch 14 remembered choice still wins). Import Cutsheet / Reuse Pipe Settings become compact buttons. | Yes |
| 03 | `03_pipe_folds.py` | "Wall & laying length" and "Intervals" are one line each, still under the pipe, with their values on the line. | Yes (needs nothing from 01/02). **Decision 1.** |
| 04 | `04_same_pipe_chip.py` | Under Pipe size, while no size is picked: "Same as the last run on this job: 8″ PVC SDR 35". A tap runs the existing Reuse Pipe Settings copy for that run and shows its own "Settings Applied" message. Nothing is filled without the tap. | Yes |

### When a fold opens by itself
- Job details: a flagged box, focus, "Go to this field", no job on the form, Edit Run Data / Resume / draft.
- Wall & laying length: the pipe size has no table wall (custom size: the wall must be typed); a wall or laying length typed
  by hand or carried in (Remember, Reuse, a draft, Resume, Edit Run Data); a flagged or warned box; focus; "Go to this field".
- Intervals: interval not 10 ft, laying-length intervals on, a flagged or warned box, focus, "Go to this field".
- A fold the person closes stays closed until something in it changes (same rule as r16.95's More settings).

### What was NOT changed
- Grade math, the run record, what Lock saves, the order and wording of Review's checks and warnings.
- No field was removed or renamed: all 139 box/dropdown ids the form had are still on it (test).
- Prefill that already existed is left as is: job from the current job / last run, Remember wall + ID, pipe type auto.

## Tests

Mine (tests/; run with `PB_URL=http://127.0.0.1:PORT/cur.html [PB_BASE=.../base.html] node <file>`, NODE_PATH=/opt/npm-tools/node_modules):
- `t_rs01_pipelayer.js`: 15 checks. Base shows the bug ("Tommy Fontaine" in the box); patched: blank, typed name survives
  the 3 s refresh, blank saves blank, last name offered next run, crew of one fills, crew of three offers, pipelayer phone unchanged.
- `t_rs02_setup_short.js`: 29 checks + the before/after table above (before numbers saved in `before_r1711.json`; give
  PB_BASE to re-measure). Folds, auto-open rules, every flagged box showing after Review, typical run to Lock, **Edit Run
  Data gives back all 133 fields exactly**, same-pipe button, Import Cutsheet still opens, no sideways scroll, no page errors.
- `t123_newrunshort_UPDATED.js`: the repo's t123 with ONE check reworded (see golden/expected changes).

Existing tests, one at a time (`tests/run_all.sh --build /tmp/claude-0/rs20/hooks/index.html --only '<regex>' --jobs 1`,
the hooks build of the patched page):
- `^(t90_|t91_|t103|t115|t118|t119|t122)|bughunt_nov17/grade/` : **24 of 24 pass, every golden matches** (g1-g7,
  repo_t115, repo_t117, t01-t07b, t90, t91, t103, t115, t118, t119, t122). 10 min 47 s.
- `t123_newrunshort` : 1 FAIL line, expected (below).
- `bughunt_nov17/grade2/|new/f01_fitresume|pdfs/t11_resumed|tonight/t_lowslope` : **17 of 17 pass, every golden matches**
  (ref/run, run_flip, run_lock, run_resume; t01-t04, t_g40-t_g43, cutsheet, edge; f01_fitresume; t11; t_lowslope_txt). 5 min 49 s.
- `tests/staged/hunt2_nov20/tests/t_r01_reducer_reload.js` (by hand, `PG=index.html PB_ROOT=http://127.0.0.1:9651/`):
  **all 15 checks pass** (clay typed wall, SDR 35 typed 0.05, table wall, Resume past the reducer).
- My two tests also pass on the built (minified, hooks) page, not only on the source page.
- Runner logs saved: tests/regression_grade_main.log, tests/regression_grade2.log.
- Not run: the full regression (shared machine rule). After the last regression run I changed three CSS colour variables
  only (border colour for dark mode); my own tests were re-run on the rebuilt page, the 41 runner tests were not.

## Golden files / tests expected to change

- **No golden file changes.** All 22 golden-judged run/grade tests above match their goldens as they are.
- `tests/t123_newrunshort.js`: ONE check fails by design if patch 03 ships: "pipe size fills the wall (auto), shown under
  the pipe" asks for the wall BOX to be showing; with 03 the wall is on the closed line ("Wall 0.02 ft (auto)"). The
  reworded check is in `tests/t123_newrunshort_UPDATED.js` (passes: T123 ALL PASS). Without patch 03, t123 passes untouched.
  (Note: do not give t123 `--base` = r17.11; its "350 px shorter" check is against the saved r16.94 numbers.)
- Screens that look different for any screenshot-based check: Run Setup top (Import Cutsheet), Job details closed line.

## Spanish (r17.11 has the dictionary; I did not touch it, to stay out of the Spanish helper's patches)

New English strings that need entries: `Wall & laying length`, `Fills in from the pipe size`, `Wall not entered`,
`Pipelayer:`, `no pipelayer yet`, and the patterns `Wall {n} ft (auto) · {n} ft lengths`, `Pipelayer {name}`,
`Me ({name})`, `Same as the last run on this job: {size}″ {type}`. Until then they show in English on a Spanish phone.

## Things I looked at and left

- A pinned Lock / skipping Review: not built (the simplifier's ruling stands).
- Hiding "Point label (optional)" behind a link: saves about 40 px per point and no controls. Not worth a new tap.
- Moving More settings below the points: the rod unit should be seen before rod readings are typed. Left above.
- Filling the pipe from the last run without a tap: a wrong wall moves bottom-of-pipe and subgrade. Tap only (patch 04).
- Start station = where the last run on this job ended: plausible, not built (a silent station is a wrong-record risk).
- Owner / manager phones still start Pipelayer with the signed-in name (r16.53 behaviour). Decision 3.

## Known limits

- Patch 01: on a foreman's phone, the name typed for the last run is no longer carried into the next run; it is the first
  one-tap name instead. That is one extra tap per run for a foreman who has no crew linked in the app.
- Patch 02: a foreman who never opens Job details locks runs with no pipelayer name (the line says "no pipelayer yet").
  The record is blank rather than wrong. I did not check how the office's production screens label a run with no pipelayer.
- Patch 04's tap ends with the app's existing "Settings Applied" message (one OK), and copies everything Reuse copies
  (rod unit, bedding, trench width too), which can open More settings.
- Rig only (fake server). Not tried on a real phone or against the live server.

## Decisions for Tommy (my recommendation first)

1. **Wall & laying length and Intervals as one line each under the pipe (patch 03)? Recommend yes.** On Nov 17 you asked
   for them under the pipe section. They are still there, but folded: the line shows the wall the app filled and the
   interval, and opens by itself whenever the wall was typed, is missing, or is flagged. Saying no keeps them open and
   costs about 300 px of the saving; drop patch 03, the others stand.
2. **Job details as one line when the job is already known (patch 02)? Recommend yes.** New runs on the same job stop
   showing five boxes that are already right. An account that prefers it open keeps it open after opening it once.
3. **Who should "Pipelayer name" start as on an owner's or manager's phone? Recommend the same as a foreman: blank with
   names to tap.** Today it is the signed-in name, which is the same wrong-name problem. Not built; a few lines in patch 01.
4. **Should a run with no pipelayer name be allowed to lock without a word? Recommend one line on the review
   ("No pipelayer named"), not a stop.** Not built. Today (and after these patches) it locks silently.
5. **"Same as the last run on this job" button (patch 04)? Recommend yes.** One tap and one OK instead of a pick, and it
   brings the wall, laying length and trench settings with it. It never fills anything by itself.

## How to rebuild

    tests/staged/runsetup_nov20/patches/apply_all.sh /tmp/claude-0/r1711/src.html /tmp/x/cand.html
    # hooks build: copy the repo's non-test files into <out> (as tests/release_build.sh --hooks does), then
    python3 tests/r1708/speed2/build/build.py /tmp/x/cand.html <out> --hooks
    tests/run_all.sh --build <out>/index.html --only '<regex>' --jobs 1

## DONE
