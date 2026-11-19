# askgrade: grade fixes #40-#43, Trench Sloping at 20 ft (#63), Ask KB lockout entry (#65)

Staged Nov 19 2026 against the live build r17.04 (index.html). Nothing was applied, deployed, committed or pushed. The
SQL tests ran against the live database inside DO blocks that end with `raise exception 'RESULT: ...'`, so nothing was
kept. Afterwards, kb_chunks still has 2,782 rows, n = 2782 and parts = 2.

## What is here

| file | what |
|---|---|
| `patches/01_grade_step_start_exact.py` | #40. This replaces `tests/staged/grade04/02_grade_step_start_exact.py`, which you should drop. |
| `patches/02_grade_agreeing_shots_reload.py` | #43 |
| `patches/03_grade_short_elev_same_job.py` | #42 |
| `patches/04_trench_20ft_engineer.py` | #63 (app side) |
| `tests/glib.js` | Shared helper for the grade tests: the grade2 page driver plus Review and Lock with the modals answered |
| `tests/t_g40_reload_exact.js`, `t_g41_prefix_stations.js`, `t_g42_short_elev_job.js`, `t_g43_shots_reload.js` | Grade tests (hook page) |
| `tests/t131_trench20.js` | #63 test (plain page) |
| `sql/kb_lockout_trench20.py` | KB source and generator for #65 and #63. It writes the `.jsonl`, the migration and its test. A copy is in `/home/claude/kb_add/lockout_trench20.py` next to the other KB sources. |
| `sql/kb_lockout_trench20.jsonl` | The 2 new chunks (rebuild source) |
| `sql/01_ask_kb_lockout_trench20.sql` | Staged migration: 2 new chunks, the chunk 224 edit, kb_versions n/counts, blob invalidation |
| `sql/01_ask_kb_lockout_trench20_test.sql` | Rolled-back test of the same statements |
| `sql/02_ask_eval_cases.sql`, `sql/eval_cases_add.py.txt` | 3 Ask eval questions (tr14, cs4, cs5) |

The patches apply in order 01, 02, 03, 04 to r17.04. Each one also applies on its own. None of their anchors overlap
the other staged folders (grep checked against staterules, daily3, office3, speed2, onboard2, sec2, billing0 and
betasummary). 04 changes text inside pbCalcTrench. staterules wraps pbCalcTrench from outside, so the two combine.
`node --check` passes on the largest script after all four.

## A) Grade

### #40 Architect's rod, a stepped Additional Run start: the root cause of the run_lock failure

The held-back patch made the calculation use the exact step invert instead of the Invert box, which is rounded to the
nearest 1/16 in. The record therefore stored the exact value: `intervalRows[].piFt` = 4645.376083 for grade2 seed 1, Run 2 Start.

Edit Run Data and Resume (`pbLoadRunIntoForm`) do not restore the step. They write `piFt` back into the Invert box,
which rounds it to 4645.375. They then mark that box as a typed invert (not derived from the step), so the reloaded
run calculated from the rounded box. That gave a 0.001 ft difference on Run 2 Start and on every row after it, plus Run 4
and Run 5 in that seed. Before the patch this could not show up, because the record already held the rounded box value.

The fix, in the same patch:
- The loader keeps each Run N Start's recorded invert, together with what its box showed right after loading (`window._pbSegStartLoaded`).
- `pbSegStartExact` returns that recorded value while the box still shows exactly that, the start is in Invert mode, and the
  two are within 0.003 ft.
- Typing a new invert, a new step or a shot that changes the box drops the recorded value.
- The map is cleared on every new form (`pbResetRunForm`) and every load.
- Records locked before this fix have `piFt` equal to their box value, so they reload exactly as before. Section 4 of t_g40 tests this.

Proof (all on r17.04 + patches 01-04, through the grade2 driver and an independent reference calculator):

| check | result |
|---|---|
| grade2 `t04_step_exact` | PASS (seg2start INV 98.039, BOP 6'-11 7/8") |
| grade2 `ref/run_lock.js 0 8` (the failure) | 8 locked, 846 rows, 0 mismatches |
| `ref/run_lock.js 0 60` | 60 locked, 5,648 rows, 0 mismatches |
| `t_g40_reload_exact.js` | PASS: 15 runs (12 Architect, 3 Engineer, all stepped, seed 1 included) locked and reloaded with every value within 1e-9 and every shown string and station equal. A box typed after reload is used. A pre-fix record reloads unchanged. Base r17.04 fails sections 1 and 4 as expected. |
| differential sweep, 2,000 random scenarios (grade2 `gen`, seeds 0-1999), r17.04 vs patched, every row's INV/BOP/TOP/SG/elevation/station text, warnings, volumes, HI | see below |

The sweep:
- **Rows:** shown values changed in 259 scenarios, all Architect, all in runs with a stepped start: 4,334 rows and 6,955
  values. Every changed value now matches the independent reference. 0 changed values that were right before, and 0
  changes outside a stepped run.
- **No change:** HI, row count, stations, station text.
- **Warnings:** in 159 stepped Architect scenarios, only the numbers in the warning text changed (for example "Run 4 Start is
  0.434 ft below Run 3 End", was 0.432; the exact value is 0.4336). In 2 Engineer scenarios, a slope-percent photo warning
  moved by 0.01 % on a rounding edge (seed 74: -10.87 to -10.88, exact -10.875; seed 93: 2.22 to 2.21, exact 2.215).
- **Backfill volume:** changed by up to 0.12 yd³ in stepped Architect runs, always closer to the reference (8 of 8 that
  the reference covers). Engineer and Lenker runs differ only by float noise (1e-11).
- Scripts: `ref/gen.js` seeds, page driver `ref/driver.js`, comparison against `ref/refcalc.js`. The sweep and diff
  scripts are in the scratchpad (not delivered).

### #41 Runs locked before the station-direction fix keep their Run 2+ labels: confirmed, no code change

- Record station text comes only from the record's own `runStations[n].dir`, captured at Lock (`pbStRowStaFn`): Results,
  the run report and the PDF.
- Edit Run Data puts that direction back on the form (`pbStRestorePt` calls `pbStDirSet`). pbStDirOf uses it before
  r17.00's "continue the run before it" fallback, so a lock from that form keeps it.
- Nothing rewrites `runStations` after Lock. The only writer is the lock capture.
- `t_g41_prefix_stations.js` builds a pre-r17.00 record (Run 2 up from 9+00 while Run 1 runs down). It shows 9+50 / 10+00
  on Results, the report function, the reloaded form, a re-capture, and after a page restart. Today's record shows
  8+50 / 8+00. PASS on base and patched.

### #43 Edit Run Data keeps agreeing rod shots as field shots (implemented, patch 02)

- **Cause:** `pbHdSrcSnap` kept how the HI was given, and the shots typed (`hiSrc`), only when the readings disagreed by
  0.01 ft or more. Readings that agreed within 0.005 ft (and a single shot) were dropped on reload:
  - the HI was typed in as the laid-to HI (110.003 instead of 110),
  - every reading came back faded (predicted),
  - the Shot column and verified marks were lost at the next Lock.
- On r17.04 the rod readings after reload also moved: rINV at 25 ft was 12.003 instead of 12.00075.
- **Fix:** keep `hiSrc` whenever any field shot exists. `pbHdRestoreSrc` already checks that the form gives back both
  recorded HIs, and falls back to the typed HI when it doesn't. No shots and no disagreement still gives null, as before.
- `t_g43_shots_reload.js` covers offsets 0, 0.003, 0.01 and one shot. After reload every shot is still a field shot and
  still verifies its point, the HI is still 110 from stakes, and the rows are exact. PASS. Base fails for 0, 0.003 and
  one shot.

### #42 Short-elevation helper borrows only from the same job (implemented, patch 03)

`pbSeRef` now uses only these sources:
- the latest full elevation typed on this form, while the job is unchanged;
- this run's own boxes;
- the job's stored last elevation.

"This phone's last from any job" is no longer read. With no job number or jobsite and nothing on the run, nothing is
borrowed.

`t_g42_short_elev_job.js` (keyboard typing, then blur):

| case | result |
|---|---|
| job 24-017 | 97.27 → 2597.27, as before |
| new job | 97.27 stays 97.27 (was 2597.27) |
| no job | stays 97.27 (was 2597.27) |
| own run's 1097.50 | 98.10 → 1098.10 |
| job changed on the form | uses the new job's 2597.27 (was 1097.27 from the old job) |

PASS. Base fails 3 of 5.

### Found while testing, outside this task (not fixed)

- **Edit Run Data does not give a mid-run reducer back.** The record keeps `reducers` but the loader never restores the
  reducer's size or typed wall. After reload, the reducer hub row shows BOP/TOP/SG as "—". Repro: grade2
  `gen(25, {rod: 'architect'})`, a Vitrified Clay 27" run with a 24" reducer and a typed 0.042 wall at 682.51. It
  happens on r17.04 too. t_g40 leaves out scenarios with reducers for this reason. It shows a blank, not a wrong number.
- **The grade2 driver writes boxes without typing**, so the short-elevation helper can still change a box under 100 ft
  when Review takes the focus (seed 26: 87.81 → 187.81). It is a test artefact, but `run_lock.js` ranges past seed 8
  can hit it. t_g40 clears the typed flag after filling.

## B) Ask and Trench Sloping

### #63 Trench Sloping at exactly 20 ft (patch 04)

- `depth >= 20` now gives no slope, no offset, no top width and no drawing. It shows "Engineer Required", "20 ft" (or "Over
  20 ft") and OSHA's two sentences. At exactly 20 ft the label reads "20 Feet Is Outside Table B-1".
- Below 20 ft nothing changes.
- The Education entry ("20 feet or more") and the calculator's Details now say the same.
- **Source:** Table B-1 covers excavations "less than 20 feet deep" (29 CFR 1926 Subpart P App. B), and note 3 says "greater
  than 20 feet ... registered professional engineer". The app already quoted both. Both were checked again against the
  KB's eCFR copy and REVIEW F10.
- `t131_trench20.js` tests every soil choice (including short-term A and A with the vertical lower portion) at 19.9 / 20 /
  20.0 / 25, and the Review link at a computed 19.96 ft, which rounds up to 20.0. PASS. Base fails.

### #65 Lockout before entry (KB) and the chunk 224 update for #63

Two new field-library chunks:
- `lockout-before-entry-1`: plain steps — list sources, shut down, isolate (disconnect locked, not the float; blank,
  remove a section, double block and bleed), release stored energy, verify by try-start. Also covers personal locks, the
  fact that a live sewer can't be fully isolated, the permit, and the owner or utility doing its own lockout.
- `lockout-before-entry-2`: which rule applies.

Citations, each checked on Nov 19 with WebFetch:
- **osha.gov:**
  - 1926.1204(c)(3) "Isolating the permit space and physical hazard(s) within the space" (the (c)? in the task is (c)(3)), and (e)(1) for sewers.
  - 1926.1202 definitions of isolation, blanking and double block and bleed.
  - 1926.1203(e)(1) and the (g) note that ventilation is not isolation.
  - 1910.146(d)(3)(iii) "Isolating the permit space;" and (f)(8).
  - 1910.147(a)(1)(ii)(A): construction is not covered. The (d) steps.
  - 1926.417(a)-(c).
- **dir.ca.gov:**
  - 8 CCR 1953(a)(3)(C), construction.
  - 5157(d)(3)(B) and (f)(8), general industry. Isolation is (d)(3)(B), not (C).
  - 3314(c) and (g), lockout.
- 1910.146 Appendix E is quoted from the KB's own eCFR copy (ord 2536).

**Note:** REVIEW.md suggested "1926.1207 isolation". 1926.1207 is Training, so it is not cited.

What `01_ask_kb_lockout_trench20.sql` does:
1. Inserts the chunks at the next ords (2782 and 2783 today, computed as max + 1). The insert is guarded by id.
2. Edits chunk 224 (the app's Trench Sloping description, "At exactly 20 ft it still gives the slope with a warning") to the
   new behaviour. Guarded by the old phrase.
3. **Updates `kb_versions.n` and `counts` from the rows.** This step is required. The Ask loader pages to `n` and refuses a
   build whose rows don't match ("got N of n rows"). `kb_activate` checks the same, and boot only serves a blob whose n
   matches. Without this step, the next cold start would fail to load the KB.
4. Sets `kb_index.parts = 32`, as fixes.sql does. A worker had re-saved a fresh blob at 02:51 today (parts = 2), so this is
   needed again.

Test result (live, rolled back):

`RESULT: PASS rows 2782 -> 2784, new ords 2782-2783, n 2784, counts {"app": 238, "osha": 278, "field": 2268}, blob used f, chunk 224 edited, page from 2782: lockout-before-entry-1 + lockout-before-entry-2, rerun no-op`

The baseline today serves the blob (index type `object`). One correction to the test was needed: boot returns
`"index": null` as JSON null, so the check uses `jsonb_typeof`. In the live run, the second, rerun insert used short
stand-in texts. It is guarded by id, so it is the same no-op as the file's full text.

**Apply 01 with the release that ships patch 04**, so chunk 224 never describes a build that still gives a slope at
20 ft. Warm workers keep their index until they cold-start.

**Rebuild from source:** the new chunks are in `kb_add/lockout_trench20.py` and its `.jsonl`. The chunk 224 edit is the
script's `UPD` list. Like the 22 Nov 18 fixes, chunk 224 has no other local source file.

### Eval questions (`02_ask_eval_cases.sql`, `eval_cases_add.py.txt`)

- `tr14` (exactly 20 ft in Type B: must name an engineer and 20 ft; must not give 1:1 as the answer or call it safe)
- `cs4` (lift station wet well float swap: lock, pump, verify/try, permit or supervisor; no "safe to enter")
- `cs5` (does 1910.147 cover a construction crew in California: 1910.147, construction, and one of 1926.1204/1953/3314/1926.417/1202)

The ids were checked free in `pb_ai.eval_set`. lo1-lo7 are locates, so the lockout cases are cs4 and cs5. The insert was
tested rolled back (161 → 164 rows). I could not open the Project doc `claude/Ask_eval_cases.py.txt` here (no Projects
tool), so the lines to append are in `eval_cases_add.py.txt`, in the tuple layout of `/home/claude/evalset/cases.py`.
They have not been run against Ask.

## Runner changes to make when this ships

In `tests/runner/suites.js`:
- **Remove the XFAIL entry** `'bughunt_nov17/grade2/tests/t04_step_exact.js'`. It now passes, and the run reports it as XPASS until it is removed.
- Copy `tests/t_g4*.js` and `glib.js` into `tests/bughunt_nov17/grade2/tests/`. glib finds `./lib.js` there by itself. Add them
  to the `grade2` suite list: `'tests/t_g40_reload_exact.js', 'tests/t_g41_prefix_stations.js', 'tests/t_g42_short_elev_job.js', 'tests/t_g43_shots_reload.js'`.
- Copy `t131_trench20.js` into `tests/` and add `'t131_trench20.js'` to the `main` suite.

## Test results

REGRESSION_PLACEHOLDER

## Decisions

1. **The Engineer's rod gets the exact step invert too.** The held-back patch already did this, because the 0.001 ft box
   rounds by up to 0.0005 ft. In 2,000 scenarios no shown row value changed for Engineer. Only 2 slope-percent warnings
   on a rounding edge moved by 0.01 %. *Recommend: keep* (same rule for every rod).
2. **How Edit Run Data restores a stepped start.** It comes back as the exact recorded invert, held as a fixed invert, the
   way it reloaded before. It is not re-linked to the step, so editing Run 1's End on the reloaded form does not move
   Run 2's start. The alternative is to store the step in the record and restore it as step-driven, which changes the
   reloaded form's behaviour. *Recommend: keep as staged.*
3. **#43 also keeps a single shot** (not only two or more that agree). It is the same loss and the same restore check.
   *Recommend: keep.*
4. **#42 with no job on the form:** nothing is borrowed (the phone-wide fallback is gone, Quick Run included).
   *Recommend: keep; "only the same job" means no job, no borrowing.*
5. **Edit Run Data drops a mid-run reducer** (found above, older bug: blanks after the reducer on the reloaded form).
   *Recommend: fix in the next grade batch, with a run_lock variant that includes reducers.*

## DONE
