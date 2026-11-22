# r1716_candidate: r17.16 in two variants (Nov 22 2026)

Base: `_src/index.html` = LIVE r17.15 · 2026-11-22 (md5 e0eaced9…; the r1715 build/index.html = live index.html, 67a8a7f2…).
Nothing published, committed, pushed, or written to the server. Server: one read-only look at `pb_permit_open_put` /
`pb_prod_run_versions` (the second one is not on the server yet).

## Build
`sh tests/staged/r1716_candidate/build.sh A` or `... build.sh B` -> `work/<V>/` (git-ignored):
`index.src.html` (new `_src/index.html`), `build/` (publish: index.html + pbx/ with the 4 woff2 fonts), `build_hooks/`
(test build), `sw.js` (`PB_SW_BUILD = 'r17.16 · 2026-11-22'`). Stamp: `patches/9_stamp.py` (`PB_APP_BUILD` r17.15 -> r17.16).
Builds are reproducible (rebuilt twice, same md5).

| | index.src.html | build/index.html (publish) | build_hooks/index.html | sw.js |
|---|---|---|---|---|
| A (no look change) | 3703f40c88a89c41c6b7c6aae73190ac | **8c514f20227c269649e43539ad5534c2** | 76924b425076be27bce6956c52337269 | 7ac18e22de9a21069673238fe6641875 |
| B (A + new look) | 0f818ec8d4479526f0d221854581b98c | **676354eca7bb7752f8218438c6033904** | f8eb63c0a5102d8fc1d03a6e61b8a27e | 7ac18e22de9a21069673238fe6641875 |
| Bx (B + optional p2x, NOT the default) | 3bbd522f90c9d0d387c5b863d4410341 | b2f9a43c067413a8822d510c11acdd8c | 0d547fc5590a656311acc9961ffb69a6 | same |

Patch order (each exact-once, `python3 p.py in out`):
- A: field_nov22 `f1_results_compact, f4_laid_toast, f5_loading, f6_xl_text, f7_zoom_inv, f8_tap_targets, f9_copy_longpress,
  f10_wake` -> records_nov22 `phaseb/b3_open_phoneat, phaseb/b8_export_versions` -> `9_stamp`.
- B: A's list + design_nov22 `p2/look_css, look_needs_pick, look_permit_top, look_names_row, look_next_row_dark` -> `9_stamp`.
- Bx (`EXTRA=1 sh build.sh B` -> `work/Bx`): B + `patches/p2x_station_toggle.py` (see "Needs Tommy" 3).

**Rebase: none needed.** Every anchor matched exactly once on r17.15 as written. Check: after the 8 field patches the
step file is byte-identical to `field_nov22/work/index.src.html` (0314a406…), so field behaviour is exactly what was tested there.

## Release steps (lead, after Tommy's answer)
Publish `work/<V>/build/index.html` -> `index.html`, `work/<V>/build/pbx/*` -> `pbx/` (the fonts are already live since
r17.15, so nothing new there), `work/<V>/sw.js` -> `sw.js`, `work/<V>/index.src.html` -> `_src/index.html`, then
`sh tests/staged/r1716_candidate/test_updates/apply.sh <V>`; one commit.

## Phase B app parts: safe without the server part (checked)
- B3 (`snap.phoneAt` on the open-permit backup). Live `pb_permit_open_put` stores the snapshot as given (no key check,
  2 MB limit), so an extra key is harmless today. Added after the app's change hash, so an unchanged permit is not sent again.
  Side effect: the server's "same snapshot" check (sha256 of the whole snapshot) now never matches, so the first send
  after an app reload (the app's hash is in memory only) counts as a new save (`saves`+1, `saved_at` moves) even with no
  change. Small; the server could hash `p_snapshot - 'phoneAt'` when the b3 SQL goes in (server work, not done here).
- B8 (Export for Records asks `pb_prod_run_versions`). Not on the server now -> the error is caught, the export is made
  exactly as before plus one manifest line: "Versions: the server's version history could not be read for this export
  (only the company account or a manager can export it)." Waits up to 45 s for that answer on bad signal (no signal:
  Export already stops at "needs signal").
- `tests/t_phaseb.js` (25 checks): phoneAt sent and close to the phone clock; no resend when nothing changed; an upload
  error leaves the permit open, no page errors; Export with the function missing / refused / answering nothing: export
  still made, no history files, the manifest line, no error on screen; with the function answering: history.json +
  versions/run-v2.json, run-v3.json (v1 had no record), removal reason kept, files in the SHA-256 list, asks with the
  run id + signed-in account. A: all pass, B: all pass, r17.15: 9 FAIL (the new parts).

## Tests
| | jscheck | t_field (39) | t_phaseb (25) | t_design_p1 (39) / p1b (17) | t_design_p2 (32) | full regression |
|---|---|---|---|---|---|---|
| A | ok | all pass | all pass | all pass / all pass | 25 FAIL (expected: A has no new look) | **221 pass, 2 FAIL, 15 skip** |
| B | ok | all pass | all pass | all pass / all pass | all pass | **219 pass, 4 FAIL, 15 skip** |
| Bx | ok | - | - | - | all pass | not run (one CSS rule on one toggle) |

Files: `results/jscheck_*.txt`, `t_field_*.txt`, `t_phaseb_*.txt`, `t_design_*.txt`, `full_regression_{A,B}.log`,
`regression_{A,B}/summary.txt` (+ logs/, git-ignored), `test_updates_verify_{A,B}.log`, `yellow_audit_*.txt`.
`new/f06_breakend.js` (time-of-day flaky) passed in both runs this time. No failure needed a rerun to clear: every
failure is an expected golden change, and each passes with the updated golden (verified on a copy of tests/).

### Regression A: 2 failures, both expected (field fixes), goldens in `test_updates/A`
- `critic/w2`: Run Setup 3064 -> 3068 px (F8 Clear 44 px); Results top folded into "Flagged at Lock (1): Check · More"
  (F1), 19 -> 16 visible buttons. Identical to field_nov22's own staged golden.
- `new/a7`: Pipe laid row top 351 -> 140 px at all three widths (F1 fold); widths/left/right unchanged. Identical to field_nov22's.

### Regression B: 4 failures, all expected (field + look), goldens in `test_updates/B`
- `critic/w1`: Feedback 90x36 -> 87x34 (one quiet size everywhere). Same as design_nov22's full-build golden.
- `critic/w2`: A's changes, plus Review screen 1323 -> 1345 px ("Check Before Locking" at 24 px takes 2 lines; design's
  own full golden had the same 1345), Run Setup 3067 (A 3068: 1 px from the look's header).
- `critic/w3`: Entry Permit draft top: the "Nothing here allows entry…" sentence behind "What a draft does" (look_permit_top)
  and "0 of 15 required boxes filled" shown; page 1642 -> 1664 px. Words 483 -> 452 (the sentence is behind the (i)).
- `new/a7`: A's change; at 320 px the row is 21 px lower than A (165 vs 144): the 24 px title. design_nov22 saw the same +22.
`sh test_updates/apply.sh A|B` copies them; `sh test_updates/verify.sh A|B` re-runs them on a copy of tests/ (2/2, 4/4 pass).

## Screenshots (`shots/`, 360x740, scale 2, light, foreman with a company)
`before_*` = r17.15, `after_*` = B; `*_full.png` = the whole page; `sheet_*.png` = side by side. Home, runsetup, results
(locked 100 ft run, laid to 20 ft, trench + Backflow flags), calculators, permit_active (one entrant, a good air reading).
What changes: Feedback yellow pill -> quiet outline everywhere; Home's Add note / Daily report icons not yellow; Run Setup
step number not yellow, Foreman / Pipelayer full rows, still-empty Jobsite box outlined; Results (field F1) shows 6 grade
rows instead of 1.5 with the Next row at the top; Calculators chips outlined; Active Permit title same size as other screens.

## Yellow rule check on B (`results/yellow_audit_B.txt`, strong yellow only, same 5 screens)
r17.15 had 18 strong-yellow items on these screens (Feedback x4, Home icons, step numbers, made choices, Read All Stake
Photos, the next-step buttons). B has: Run Setup "Review & Calculate" (next step), Results "End Run and Send Report" (next step) + the Next row,
the empty Pipe size / Jobsite outlines (still to fill), and **one miss: Run Setup's "Enter as: Station | Distance" toggle
stays solid yellow** (a made choice; look_css's rule needs a `.active` class this toggle doesn't have). Optional fix:
`patches/p2x_station_toggle.py` (Bx). Also seen: the Review screen has 3 solid yellow buttons (Flip This Run and Check
Trench Sloping Calculator inside their warnings, plus Lock This Run); the Ask tab keeps its yellow outline when not selected.

## Needs Tommy
1. **A or B** (the new look). Recommend B: all tests pass; yellow now means the next step or a box still to fill.
2. **Field decisions 40-44** (field_nov22 NOTES: F1 fold behind "More", F4 toast at top, F9 press-and-hold copy, F10
   wake lock only on permit/run going, F7 Zoom "as big as fits"). Both variants contain all of them; if he says no to
   one, drop that patch from LIST (they are independent; the w2/a7 goldens would then need a new run).
3. **Station/Distance toggle** (B only): solid yellow after it's chosen. Recommend the p2x fix (ship Bx instead of B;
   I'd run the full regression on Bx first, ~46 min).
4. **Small B look points**: on Results the folded line shows lock flags with a grey icon, while opened they sit in a
   yellow box; Review screen has 3 yellow buttons; Ask tab outline. Recommend: leave for the next design pass.
5. **B8 wording** before the server SQL is in: the manifest says only a manager can export the history, even for a
   manager. Recommend: fine for a few days; apply the b8 SQL soon after r17.16.

## DONE

## Lead: variant Bx (B + p2x Station/Distance toggle fix), Nov 22 afternoon
- Built with `EXTRA=1 sh build.sh B` -> work/Bx (build/index.html md5 b2f9a43c…).
- Full regression (two overlapping runs after a container restart): 215 pass, 7 fail. w1, w2, w3, a7 = B's expected goldens
  (test_updates/B verified on the Bx build: 4/4 pass). a4, t00_smoke, t07_sw failed only under the doubled load: re-run alone
  they pass on B and on Bx.
- Ready to ship as r17.16 if Tommy picks the new look; otherwise ship A.
