# field_nov22: Field Conditions review fixes (on top of the r17.15 candidate)

Base: `tests/staged/r1715_candidate/index.src.html` (r17.15 candidate, not edited). Review doc
"claude/Review – Field Conditions – 2026-11-21.md" could not be opened here (no Projects tool): items were taken from
the lead's brief and every one was reproduced on the r17.15 build before fixing (see "Verified" and `results/t_field_on_r1715.txt`).
Not redone (design helper): F2 EMERGENCY bar, F3 Set reminder contrast, Feedback button size.

Build: `sh tests/staged/field_nov22/build.sh` -> `work/index.src.html` (new source), `work/build/` (publish: index.html +
pbx/ incl. the 4 woff2), `work/build_hooks/` (tests). `work/` is git-ignored. sw.js: the r17.15 candidate's (no change).

## Patches (stacked in this order, exact-once, `python3 patch.py in.html out.html`)
| patch | item | what |
|---|---|---|
| `f1_results_compact.py` | F1 | Run going (locked, not ended): Locked line, Edit Run Data, Run details, trench card, Flagged at Lock, Columns/Hide laid/Zoom fold into ONE line; the line says "Trench 4 ft or Deeper · Flagged at Lock (1): Backflow" in words (red edge for trench); a tap opens all of it with the trench text open. Grade sheet box taller in that state. Results opens with the Next row at the top of the sheet. Timer row (Pipe laid / Avg. / Current / Break) stays. Ended runs unchanged. |
| `f4_laid_toast.py` | F4 | "Laid to … Undo" at the top of the screen; moves to the bottom only if the Next row is up there (checked on show, while the sheet scrolls, on any scroll). Undo still 6 s, ignores taps in its first 0.6 s, outlined (not yellow). |
| `f5_loading.py` | F5 | While the first account check is really still out (start-up sign-in answer pending or plan check running) and no plan is kept on the phone: Home shows "Loading your account…" (plain line, no progress bar), tiles stop saying "Requires subscription", a tap says "Still loading your account…" instead of a wrong "Subscription Required". Max 30 s, then as before. A kept plan opens at once (unchanged). |
| `f6_xl_text.py` | F6 | CSS: Run details summary wraps; Pipe laid / Avg. / Current labels wrap at Large/XL; toggles (Pass/Fail/Partial) never narrower than their longest word at Large/XL; tab label at 320 XL shows "Records" whole; "+ Add Crossing"/"+ Add Hub" 6 px side padding, may wrap. |
| `f7_zoom_inv.py` | F7 | Zoom never wider than the screen: Dist. column 0.8x, value columns as big as fit (360: 29 -> 33 px, INV on screen). Display only. |
| `f8_tap_targets.py` | F8 | Invisible 44 px hit area on `a.pb-extlink` (OSHA/NIOSH/CFR links) and Settings Terms/Privacy; Run Setup Clear 44x44. |
| `f9_copy_longpress.py` | F9 | Touch: Copy sheet on the Run Results grade cells needs press and hold (0.45 s, finger still); a short tap does nothing but say once per visit "Press and hold a number to copy it". Mouse, keyboard, screen readers unchanged. |
| `f10_wake.py` | F10 | Wake lock only while an entry permit is open (or a closed permit's emergency panel is open) or Results shows a run going (not on break). Re-checked on screen change, on return, every 5 s; released otherwise. Was: requested at app open and on every return. |

## Verified on the r17.15 build before fixing (`results/t_field_on_r1715.txt`: 27 FAIL, 12 PASS)
- F1: 360x740 a fresh locked run shows 1 full grade row; 360x640 shows 0. The Next row of a run 10 rows in is off screen when Results reopens.
- F4: at 360x640 the toast (y 504-560) sits on the Next row (510-593), Undo over it, Undo yellow; a tap on Undo 0.15 s after the mark undid it.
- F5: first open with every server answer 3 s late: tiles locked with "— Requires subscription", a tap says "Subscription Required … no active subscription" (wrong) for ~12 s (longer on worse signal; the plan check has no time limit). The page download itself is covered by the existing boot cover ("Loading your records…"), so that part was not the problem. A phone with its plan kept opens fine (unchanged).
- F6: XL: run details summary cut (159 px of text in 60 px); Avg./Current labels overlap by 1 px; "Partial" 52 px in a 47 px button; 320 px XL tab shows "Recor…" (its 11 px font draws at x1.4 = 15.4 px, so the size itself is not small); "+ Add Crossing" 8 px past its box at Normal.
- F7: Zoom at 360: numbers 29 -> 36 px, INV header at 342-396 px of a 344 px box (53 px sideways scroll).
- F8: Terms/Privacy 17 px tall, OSHA links 19-20 px, Run Setup Clear 39x40. Home notice dots (.pb-ng-dots) are already 44x44 in CSS; none render in the rig, not changed.
- F9: a finger tap on BOP opened Copy.
- F10: wake lock requested at app open (Home, nothing going) and kept the whole time.
- Gloved swipe scrolling the table: NOT changed. The row swipe already needs 12 px sideways at 1.4x the vertical move and 64-120 px travel; the main case where a sideways swipe scrolls instead of marking was a table wider than the screen, which F7 removes at Zoom on 360. Changing touch-action on the sheet risks breaking vertical scroll or marking a row by accident.

## Tests
`tests/t_field.js` (39 checks; `PB_URL=http://127.0.0.1:PORT/cur.html node t_field.js`):
field build `results/t_field_on_field_build.txt` DONE all pass; r17.15 `results/t_field_on_r1715.txt` 27 FAIL (the 12 passes are the
"unchanged" guards: Break, mouse copy, ended run, kept-plan start, grade values, no errors). Grade rows of the 200 ft test run are
identical on both builds (INFO lines). Other probes: `tests/probe.js`, `xl_probe.js`, `slow_probe*.js` (F5 timing), `shots.js`.
Shots (360x740, scale 2): `shots/before_|after_` results_active, laid_toast, laid_toast_640, settings.

## Regression (`results/regression/summary.txt`, `--jobs 2`)
pass 216, FAIL 6, skip 15 (of 237). r17.15 candidate run (`r1715_candidate/results`): pass 207, FAIL 15 -- that run started 22:27,
before the expected golden updates landed in tests/expect (23:01-23:03), which is why 11 of its failures pass here.
- New, expected (layout only), goldens in `test_updates/tests/expect/` (copy with `sh test_updates/apply.sh`):
  - `bughunt_nov17/critic/w2.js`: Run Setup 3064 -> 3068 px (Clear 40 -> 44 px, F8); Results reads "Flagged at Lock (1): Check | More" instead of the separate Locked / Edit Run Data / Run details / Columns / Zoom (F1), 3 fewer visible buttons.
  - `bughunt_nov17/new/a7.js`: the Pipe laid row's top moves 351 -> 140 px (blocks above folded, F1); its widths and left/right positions are identical.
- Same failure on both builds (not from this work): `new/f06_breakend.js` (TimeoutError waiting for #pbEaTime), `office/a3_stake.js`, `office/t1_ticket.js` (wording goldens), `offline/rig/t10_quota.js` (Records Save Failed modal in the quota rig).
- Offline: sw.js unchanged; no patch touches fetch/storage paths; the offline suite passes except t10 (same as the base).

## Decisions for Tommy
1. F1: during a run, Locked / Edit Run Data / Run details / Columns / Zoom live behind one "More" line (warnings always spelled out on it). Recommend: ship.
2. F4: toast at the top covers the header (Back / Feedback) for 6 s; Undo is now outlined, not yellow. Recommend: ship (Undo is not the next step).
3. F9: copy on the grade sheet needs press-and-hold on a phone. Recommend: ship; a short tap explains it once per visit.
4. F10: screen stays awake only on an open permit / emergency panel or a run going on Results (not on break, not in Run Setup or calculators). Recommend: ship; say if Run Setup should stay awake too.
5. F7: Zoom on narrow phones now means "as big as fits" (+14-20% at 360) instead of +25% with sideways scrolling. Recommend: ship.

## DONE

## Lead: rebuilt on LIVE r17.15 (Nov 22, 12:30 AM)
- build.sh now stacks on the published r17.15 source (includes the 911-on-Ask-only patch). t_field unchanged.
- Full regression (jobs 3): 217 pass, 5 fail. w2 and a7 = the expected layout goldens in test_updates/. The 3 permit/records
  tests (t_o3_37_38_39, t_o3_30_31, permit_active_screen) failed only under load: re-run alone they pass on this build and on r17.15.
- Waiting on Tommy's answers 40-44 on the Nov 22 decisions page before shipping.
