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

## Verified (r17.15 build, 360 px)
(filled in below)

## Tests
(filled in below)

## Regression
(filled in below)
