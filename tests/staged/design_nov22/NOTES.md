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

## Regression
(filled in below when the runs finish)
