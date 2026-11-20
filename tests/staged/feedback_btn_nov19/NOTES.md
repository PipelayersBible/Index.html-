# Feedback button placement (Nov 19)

Tommy: "I'd really prefer the feedback button being on every screen. See if there's just a better place to put it."

## Answer
Put it **in the top bar of every screen, top-right corner** (same yellow pill, same word, same sheet).
Built and tested as `patches/01_feedback_in_header.py` (apply: `sh patches/apply_all.sh in.html out.html` on a copy of
`_src/index.html` r17.10; every `rep()` matches exactly once).

Why it works: every one of the 91 screens already has a top bar that stays on screen while you scroll. A button
inside that bar is never on top of the page, so it cannot cover a Dist. box, Delay, the Terms line or a Notes box.
Anything that floats over the page (bottom pill, smaller pill, shrinking pill) is always on top of *something*.

## The four placements, with screenshots (390x844: Home, Run Results scrolled, Set Password, Run Setup end)
| | Placement | Picture | Verdict |
|---|---|---|---|
| now | Floating pill bottom-left (r17.10) | `shots/sheet_before.png` | Covers something on **30 of 91 screens** (measured, `t/base_walk.js`) |
| A | **In each screen's top bar, right corner** | `shots/sheet_A.png`, `sheet_A2.png`, `sheet_A_375.png`, `sheet_A_430.png`, `sheet_A_states.png` | **Chosen.** Covers nothing anywhere. On every signed-in screen. |
| B | Sixth slot in the bottom tab bar | `shots/sheet_B.png` | No: screens without the tab bar (Set Password, sign-up steps) lose it; 6 slots at 375 px are 62 px each, right beside Ask (easy mis-tap with gloves); label had to shrink. |
| C | Smaller corner pill + extra space under each page | `shots/sheet_C.png` | No: only clear when scrolled to the very end. Mid-scroll it still sits on rows/buttons (see Run Results in the picture). Adds a third layer above "Run in progress" + tab bar. |
| D | Pill that shrinks to a dot while scrolling | `shots/sheet_D.png` | No: smaller, but still on top of the page (dot sits on "Nothing logged yet" / over rows), and a dot is harder to find and to hit with gloves. |

B, C, D are mock-ups drawn on the r17.10 page (`t/proto.js`); only A is built.

## How A behaves
- **Where:** right end of the top bar, after the account / Cancel / star button if the screen has one. Same corner on every screen.
- **Thumbs / gloves:** 36 px tall to look at, 44 px tap area (the extra is inside the bar's own padding). At least 12 px
  (8 on Home) from the next button. Top corner is a stretch for a thumb, which is right for a button used now and then:
  it is out of the way of the working taps at the bottom.
- **iPhone notch / home bar:** it is inside the top bar, so it gets whatever the bar gets; nothing at the bottom edge any more.
- **Keyboard open:** stays in the top bar, not over the field (old pill hid itself). `shots/after_keyboard_runsetup.png`
- **Dialogs, Ask, the feedback sheet itself:** these draw over the top bar, so the button is under them and cannot be tapped by mistake. `shots/after_dialog.png`, `after_ask.png`
- **Grade sheet (Run Results), Run Setup, Entry Permit, Set Password:** in the bar; rows, Delay, End Run, View Report, Terms line, Notes box all clear.
- **Active Permit:** now shown (was hidden). Drawn quiet (grey outline, not yellow) so nothing competes with the red EMERGENCY button; about 30 px above it. `shots/after_confinedActive.png`. See decision 1.
- **App Problem screens:** now shown too (was hidden). Not shown signed out (Log In): feedback needs an account, as before.
- **Long titles:** the bar is never made taller by the button. `pbFbFit` picks, per screen and width: the word -> a smaller
  word -> the title a few px smaller -> the icon alone (speech bubble). At 390 px: word on 88 of 89 signed-in screens (33 with a slightly
  smaller title, 20 with the smaller word), icon on 1 (Flush / Flow Rate). At 375: icon on 2. At 430: icon on 6 calculators. `shots/sheet_A_tight.png`
- **Computer:** in the top bar like the phone (`shots/after1280_home.png`). Office Home on a computer has no top bar, so there the
  button sits in the side menu above Field tools, always on screen (`shots/after1280mgr_home_300.png`).
- Same element id (`#pbFbPill`), same `pbFeedbackOpen()`, same sheet, same text "Feedback". Settings > Send Feedback unchanged.

## Tests
`tests/t_fb1_header.js` (needs `t/h_r1710.json` = top-bar heights of r17.10; make again with `DUMP=t/h_r1710.json PB_URL=<r17.10 page>`):
every `.pb-screen` x 3 scroll positions x 390x844, 375x667, 430x932, 1280x800. Checks per position: button shown, fully in
view, on top, covers no button/input/link and no text (bounding boxes + elementFromPoint, `t/lib.js`), 44 px tap area
touches no other control, title not pushed out of its space, top bar no taller than r17.10; plus tap opens the sheet,
sheet covers the button, sheet closes.
- Foreman account: **PASS 8568, FAIL 0**. Office account (MGR=1) 390x844 + 1280x800: **PASS 3750, FAIL 0**. Also 1024x700: pass.
- 90 of 91 screens open in the rig (pdfView needs a file; it has the same top bar).
- One leftover: Construction Calculator at 375 px, scrolled, top bar is 8 px taller than r17.10 (title + icon + star + button). Nothing covered.

`tests/t_fb2_states.js`: keyboard open on Run Setup, Cancel dialog, Ask open, text size 140% (all screens), phone sideways
844x390 (all screens), 320x568 (all screens), each compared with r17.10 in the same state. **PASS 10, FAIL 0.**

Before/after of the 6 key screens: `shots/before_*.png` vs `shots/after_*.png` (home, results_420, setPassword, input_end,
settings_end, confinedPermit, + confinedActive); 375: `before375_*` vs `after375_*`; computer: `before1280_*` vs `after1280_*`.

Existing tests that read the pill, run on the patched page vs r17.10:
- `t95_beta`, `t99_removed`, `bughunt_nov17/cs2/e1`, `office/b1_beta`, `office/b5_feedback_modal`, `office/b6_shot`: same output. `t130_onboard`: ALL PASS.
- `t121_feedbackall`: passes; its printed line changes (below).
- NOT run: `tests/run_all.sh` (shared machine rule).

## Golden files expected to change
- `tests/expect/t121_feedbackall.js.txt`: `pill: {"hidden":false,"vis":false}` -> `"vis":true` (the button is now in the page, not fixed).
- `tests/expect/bughunt_nov17__cs2__fb.js.txt`: `pos=fixed static .` -> `'BUTTON#pbFbPill.pb-fb-pill pos=relative sticky .pb-header'` plus a `SPAN` line (the word is now in a span next to the icon).
- Any golden screenshot or text dump of a screen header may gain the word "Feedback" (it is now inside `.pb-header`); none found by grep in `tests/expect` beyond the two above.

## Clashes
- **Replaces critic_nov19 `patches/01_feedback_pill_off_work_screens.py`** (which hid the pill on 5 screens). Both edit the same two
  lines, so only one can be applied; apply this one, drop that one. `critic_nov19/tests/t_cr1_pill.js` tests the hiding and will not pass with this patch (its pill checks expect the button gone on those screens).
- Any staged patch that adds a button to a screen's top bar: re-run `t_fb1_header.js` after stacking.

## Found on the way (for the bug hunter, not fixed here)
- r17.10 at text size 140% on a 390 px phone: the title runs under the star button on 13 calculator screens (Structure Bedding,
  Material Volume, Bed & Shade, Ventilation, Trench, Pipe Weight, Lift, Slope Convert, Fraction, Construction, Manning, Manhole Depth,
  Rod Elevation). Seen by `t_fb2_states.js` on the unpatched page. The patch does not make these worse (Trench: title now wraps instead, bar 26 px taller).

## Decisions for Tommy
1. **Feedback on the Active Permit screen too?** Recommended: yes, as built (quiet grey, top corner, away from EMERGENCY). It was hidden there until now; "every screen" says show it. One word in the patch turns it back off.
2. **Icon alone on the few screens where the word does not fit** (1 screen at 390, up to 6 calculators on the biggest phones)? Recommended: yes. The other choice is a taller top bar on those screens.

## Files
- `patches/01_feedback_in_header.py`, `patches/apply_all.sh`
- `tests/t_fb1_header.js`, `tests/t_fb2_states.js`
- `t/lib.js` (what is under the button), `t/base_walk.js` (r17.10 count), `t/shot.js`, `t/mkresults.js`, `t/proto.js` (mock-ups B/C/D), `t/h_r1710.json`
- `shots/`

## DONE
