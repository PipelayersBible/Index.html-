# Feedback button placement (Nov 19) — IN PROGRESS (resumed after restart)

Job: Tommy wants Feedback on every screen, never covering anything. Compare 4 placements with screenshots, build the best as a patch.

## Status log
- Resumed. Previous helper left `t/lib.js` (probe: what is under the button), `t/base_walk.js`, `t/shot.js`, `t/mkresults.js`, and 7 `shots/before_*.png`. No patch, no notes.
- Facts so far (r17.10 source): pill = `#pbFbPill.pb-fb-pill`, made in pbBetaRender (~39807), fixed bottom-left above the bars, hidden on appProblem/appProblems/login/auth/confinedActive and when the keyboard or the feedback sheet is open. All 91 `.pb-screen` have a sticky `.pb-header` as first child.
- Leaning: button inside each screen's header bar. To verify with screenshots.
- Built `patches/01_feedback_in_header.py` (button in the showing screen's header, top-right). Mock-ups of the other 3 in `t/proto.js`. Shots: `shots/sheet_A.png`, `sheet_A2.png`, `sheet_B.png`, `sheet_C.png`, `sheet_D.png`. Baseline walk (r17.10, 390x844): pill covers something on 30 of 91 screens.
- Next: `tests/t_fb1_header.js` walk at 4 sizes; existing pill tests (t121, t95, t99, critic t_cr1).
