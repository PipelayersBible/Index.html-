# design_nov22: "Fix the design" (r17.14 audit + deeper review + field-conditions review), Nov 21 2026

Nothing published, pushed or committed. Server not touched (no SQL). `_src/index.html` and the repo's tests are unchanged.
Base: `_src/index.html` LIVE r17.14 · 2026-11-21 (md5 25adfdd9…). Price untouched. No feature removed.

## Folder
- `patches/p1/*.py` PHASE 1 (behaviour, ship-ready), `patches/p2/*.py` PHASE 2 (the look; needs Tommy's OK), `patches/9_stamp.py`
  (r17.15 · 2026-11-21). Each is an exact-once patch (`_rep.py`, assert count == 1): `python3 <patch> in.html out.html`.
- `sh build.sh p1` -> `candidates/p1/` (PHASE 1 only), `sh build.sh full` -> `candidates/full/` (PHASE 1 + 2). Each has
  `index.src.html` (new `_src/index.html`), `build/` (publish: index.html + pbx/ incl. the 4 font files), `build_hooks/`
  (test build), `sw.js` (stamp only).
- `fonts/pbx/*.woff2` + OFL licences (A-12). Tests: `tests/t_design_p1.js`, `tests/t_design_p1b.js`, `tests/t_design_p2.js`.
  Screenshots: `tests/shots.js`, `tests/shots_permit.js`, `tests/make_sheets.py`.
- `shots/before_*.png`, `after_*.png`, `sheet_*.png` (390x844, DSF 2; Home also dark; Active Permit with an O2 18.9% reading).
- `results/`: test outputs on the candidates and on r17.14, the regressions, `test_updates/` + `apply_test_updates.sh`.

## Verified / false alarms
| Item | Verdict | Evidence / what was done |
|---|---|---|
| A-4 tab highlight | **Verified**, fixed (P1) | Home > Daily report / Log Work / New record > Field ticket / Management report lit Records; More > Account & Settings lit Home (t_design_p1 on r17.14: FAIL). |
| A-3 Back arrow | **Verified** for 7 screens (their Home square is hidden by CSS line 1930), fixed (P1) | Education & Reference, Management report, Report Receipt, Confined Space, Active Permit, Quick Run, Run Results. **False alarm:** Calculators hub (a tab root: no Back by design). Run Setup keeps Cancel. |
| C-1 job follows you | **Verified**, fixed (P1) | After End Run Home said "None chosen"; Log Work Without a Run and Plans ignored the Current job. Daily report, Add note, permit, ticket already used it. |
| C-2 times | **Verified** for the field ticket (Time blank), fixed (P1). **False alarms:** check-off (date/time/zone are filled when opened from an item; blank only with no item, which no button does), Entry Permit date (filled, see before_permit.png). Safety events filter / New job start date not changed (a filter; company form not checked). |
| C-3 End Run done | **Partly false**: Home's card already said "Sending the report to <who>…" and changes to "Report sent to … · time". Added: the confirmation line at End Run, a "sent ✓" line, and "Not sent yet: it goes to … by itself" after 2 min instead of "Sending…" for ever. |
| B-3 report twice | **Verified**, fixed (P1) | Needs Attention "Not sent · 1 run report" under the card for the same run. Home order change: not done (decision 3). |
| A-12 fonts | **Verified** (Google link; sw.js never kept it), fixed (P1) | Self-hosted, see below. |
| C-4 dead screens | **Verified**: calcCat* 4 screens unreachable -> removed. confinedHub blank icons **verified** -> fixed. **False alarm:** pdfView (the in-app PDF viewer; with nothing to show it goes back by design). |
| G-1 green Check In while entry not allowed | **Verified** (before_permit_active.png: big green Check In under an O2 18.9% banner), fixed (P1) |
| G-2 attendant / supervisor "On Duty" | **Rejected (would be wrong)**: in this app a roster row "in" means INSIDE the space for every role. The attendant's Check In is entering, and the app blocks it with the OSHA 1926.1209(d) attendant rule; relabelling it "On Duty" would tell an attendant to tap it to start the shift. G-1 now shows that row as "Check In (entry not allowed)". |
| G-3 acknowledgment before validation | **Verified** (t104's own output), fixed (P1) |
| G-4 close-out default | **Verified**, fixed (P1). The existing "Completed Normally anyway?" question stays. |
| G-12 break bar | **False alarm**: the active bar already shows "On break · N min · End" on every screen except Run Results (provider `brk`, r16.88). |
| G-13 cutsheet rows without N/E | **Verified** (parseCutsheetLine returns null for the sample row and the C6.20 / C 6.20 / F+0.02 forms, also with N/E in front). **Not changed**: a parser change needs its own test set against real sheets (decision 5). |
| G-10, G-11, F1, F4-F10, H-1 (inline links), H-4, H-5, G-5..G-9 | Not done in this pass (proposed). H-1: Feedback now 34 px tall with a 44 px tap area. |
| F2 EMERGENCY scrolls away | **Verified**, fixed (P1): pinned red EMERGENCY bar while the button is off screen. |
| F3 Set reminder 1.7:1 | **Verified** (`var(--pb-accent, #f2c230)`, --pb-accent undefined), fixed (P1). |
| H-2 show password | **Verified** (none), added (P1). |
| H-3 kickers read twice | **Verified** (sr-only span), display:none (P1). |
| A-7 "Loads with signal" everywhere | **False alarm for no signal**: with no signal the app already hides those lines and shows one "No signal" line (feat_r1614, line ~24724). The repeats appear when the phone HAS signal but the server answers nothing (the audit's offline rig). Not changed. |
| A-1, A-2, A-6, A-9 (permit top), A-10, A-11 (names), H-7 | **Verified**, changed in PHASE 2 (below). |
| A-5, A-8, A-13, B-1, B-2, B-4, D table rest | Not changed (B-1/B-2/B-4 not clearly better without losing a way in; decision 4). |

## PHASE 1 (ship-ready; `candidates/p1`)
1. `a4_tab_origin.py` the lit tab is the tab you came from; Back restores it; tab roots / tab taps / untabbed run+permit screens unchanged.
2. `a3_back_arrows.py` Back on 7 screens; steps over the forms behind (run form/Review behind Results, permit form behind Active Permit, report form behind its receipt); empty history -> Home.
3. `c1_job_follows.py` a run open on Results makes its job the Current job (never an ended run's); Log Work Without a Run (new form) and Plans start on it; nothing typed is replaced.
4. `c2_ticket_time.py` new field ticket: time now; AI ticket read may replace the app's own date/time without asking (never the person's).
5. `c3_end_run_done.py` End Run line "Run ended. Sending the report to … / saved, goes when there's signal"; "Report sent to … ✓"; card stops saying "Sending…" after 2 min.
6. `b3_home_no_double.py` Home's Needs Attention leaves out the run whose card is showing (Log Out warning still counts it).
7. `a12_fonts_local.py` **self-hosted** (not system fonts): Inter + Oswald variable (every weight the CSS uses is exact), Plex Mono 500/600, latin, 107 KB, fontsource npm packages (OFL). Files in pbx/ with a fingerprint; the page names them with `data-pb-src="pbx/…"` on inert `<meta>` tags, which is exactly how sw.js already finds and keeps lazy parts (stored at install/update, pbx/* cache-first, tidied by what the page names): **no sw.js change**. Page size: +1.2 KB HTML. Why not system fonts: the app's look (Oswald title, Plex Mono numbers) would change for everyone, online too.
8. `c4_dead_screens.py` calcCat* removed (their CSS left: harmless); Confined Space tile icons.
9. `g_permit_safety.py` G-1, G-3, G-4, F2, F3.
10. `h_access.py` H-2, H-3.
Tests: `results/t_design_p1_on_phase1.txt` (all pass) vs `_on_r1714.txt` (28 FAIL); `t_design_p1b_on_phase1.txt` (all pass) vs `_on_r1714.txt` (7 FAIL + crash).

## PHASE 2 (the look; `candidates/full` = PHASE 1 + these; needs Tommy's OK)
- `look_css.py`: A-1 per Tommy (Nov 21): yellow = the next step and a choice still to make; a made choice = dark ink fill (calm);
  no decorative yellow (step numbers, Feedback, Home quick icons); AI read buttons outlined with a sparkle; Crew members' Invite outlined.
  A-2: Feedback one size everywhere (34 px, neutral outline, the word kept); titles 24 px on pushed screens, never hyphenated
  (the title CSS had `hyphens: auto`: the "per-mit" break), at most 2 lines; Add to Home a small chip under the title.
  A-6: secondary buttons outlined; Quick Run "Clear Calculation" not red. A-10: OSHA-table / not-an-OSHA-number / full-standard
  boxes blue info; "Flagged at Lock" yellow. Active Permit header like the others; Ask tab selected like the others.
- `look_needs_pick.py`: still-to-fill required boxes outlined yellow (Run Setup Pipe size; the permit's 15 required boxes), calm once filled.
- `look_permit_top.py`: permit top = badge + count; the "Nothing here allows entry…" sentence behind (i) (same words).
- `look_names_row.py` (A-11) Foreman / Pipelayer full rows. `look_next_row_dark.py` (H-7) Next row amber at full strength in dark mode.
- Side effect: the small trench icon beside calculator titles no longer shows (title row = back · title · Feedback).
Tests: `results/t_design_p2_on_full.txt`.

## Builds (final; the regressions ran on exactly these)
| | index.src.html | build/index.html | build_hooks/index.html | sw.js |
|---|---|---|---|---|
| p1 | 578a0436… | 27c31791… (5,838,607 B; live 5,832,349) | f50472e4… | ff5fb111… |
| full | b00e269a… | f74c663a… (5,845,519 B) | ea52075c… | ff5fb111… |
build/pbx/ = the 4 r17.14 parts (unchanged) + the 4 font files (107 KB).

## Regression (`tests/run_all.sh --build <build_hooks> --jobs 2`, from scratch)
- **PHASE 1 build: pass 198, FAIL 24, skip 15 of 237** (`results/p1/full_regression.log`, logs in `results/p1/regression/`).
- **PHASE 1+2 build: pass 198, FAIL 24, skip 15 of 237** (`results/full/full_regression.log`). Same 24 tests.
- **No real bug.** 23 are expected changes, 1 is pre-existing:
| Test(s) | Why it changed |
|---|---|
| critic/w2, w4, w5, grade/g1, cs2/s1, safety/d1, office/c1, n1, p2_viewer, t1, x1, offline/t04_cv, sync/t03 | H-3: the hidden ALL-CAPS kicker ("NEW RUN", "ACTIVE PERMIT"…) is no longer in the page text. (p2_viewer: the plan set name sat in the plan sheet's hidden kicker; it was never visible.) w2/w4 also count the new Back buttons. |
| critic/w1 | C-4: the 4 calcCat screens gone from the screen list (+ the Feedback size it measures). |
| critic/w3, offline/t02_day | C-1 + B-3: after End Run Home shows "Job 24-017 — …" and no second "Not sent · 1 run report" row. |
| offline/t06_twotabs | A-3: Run Results' first button is now Back. |
| offline/t07_sw | A-12: the service worker's lazy cache now holds the font files (proof that offline caching works with no sw.js change). |
| t89_photostamp | A-12: one failed outside request fewer (Google Fonts), so its error list prints on one line. |
| new/a7 | A-3 / A-10: Run Results' header (+4 px) and, in the full build, the yellow "Flagged at Lock" box move the progress row down. |
| safety/d2 | G-4: a permit closed after an out-of-range reading now records "Evacuated / Prohibited Condition" (it did not pick a reason). |
| t104_permitack | G-3: the test locked an EMPTY permit and expected the acknowledgment first. Rewritten: empty -> no acknowledgment, the 15 missing fields listed; complete -> acknowledgment, then active. |
| permit_active_screen.py | G-1: a Check In that isn't allowed now takes the full row (was column 2). Check updated to allow that. |
| new/f06_breakend | **Pre-existing**: fails the same way on r17.14 `_src/index.html` run alone tonight (its 21-hour shift depends on the time of day; r17.14 notes call it intermittent). |
- **Test updates:** `sh tests/staged/design_nov22/apply_test_updates.sh p1` (or `full`), absolute default ROOT `/home/claude/index.html-`:
  `common/` (t104_permitack.js + its expect, permit_active_screen.py) + 21 golden files per build. Checked on a copy of tests/
  with the updates applied: **23/23 pass on each build** (`results/*/test_updates_verify.log`; `tests/verify_updates.sh`).
- Feature tests on the final minified builds: `t_design_p1` all pass on both (28 FAIL on r17.14), `t_design_p1b` all pass on
  both (7 FAIL + crash on r17.14), `t_design_p2` all pass on full, 25 FAIL on the PHASE 1 build (it checks the look).

## Release steps (lead)
PHASE 1 only: publish `candidates/p1/build/index.html` -> `index.html`, `candidates/p1/build/pbx/*` -> `pbx/` (adds the 4 woff2),
`candidates/p1/sw.js` -> `sw.js`, `candidates/p1/index.src.html` -> `_src/index.html`, then `apply_test_updates.sh p1`; one commit.
With the look (after Tommy's OK): the same from `candidates/full/` and `apply_test_updates.sh full`.

## Decisions for Tommy
1. **The look (PHASE 2)**: approve as shown in `shots/sheet_*.png`? Recommend yes: yellow now only marks the next step and a box
   still to fill (his Nov 21 rule), Feedback one quiet size, red only for danger. PHASE 1 ships either way.
2. **Long titles**: at most 2 lines at one size (recommended) vs one line cut with "…" (the review's suggestion; would cut
   "Education & Reference", "Rod Reading → Elevation").
3. **Foreman Home order**: put Start work above Crew runs / My production / inspections (review B-3)? Recommend yes for foremen
   (it is their main use); not done because it changes his decided Home layout.
4. **Records vs Reports merge, My production tabs (B-1/B-2/B-4)**: recommend a separate pass with his walk-through; not done
   here because each removes a way in that someone may use.
5. **Cutsheet rows with no Northing/Easting (G-13)**: recommend making coordinates optional with a one-line reason on every
   "Not used" row, built against 3-4 real sheets from different surveyors before shipping (the parser drives grade).

## Proposed, not built (verified where noted)
G-13 (verified), G-10, G-11, F1, F4-F10, H-1 inline links, H-4, H-5, G-5..G-9, A-5, A-8, A-13, D table rest; "Couldn't load"
wording when online but the server is down (A-7 remainder); "Nothing in progress." showing above the run-ended card.

## DONE
