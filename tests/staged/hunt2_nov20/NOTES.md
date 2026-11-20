# hunt2_nov20 — bug hunt round 2 notes

Status: IN PROGRESS. Work dir: scratchpad/h2 (ports 9400-9449). Source: _src/index.html r17.10.
(Round 1 = ../hunt_nov19; not redone.)

## Log
- started; reading round 1 + rigs.
- Item 1 reducer reload: REPRODUCED and fixed. patches/01_reducer_wall_reload.py + tests/t_r01_reducer_reload.js
  (hook page). Worse than the old note said: with a pipe that HAS a table wall, a typed reducer wall is silently
  replaced by the table wall on Edit Run Data (SDR 35 12->8, typed 0.05: BOP after the reducer 10.55 -> 10.52, and a
  second Lock records it). Clay (no table wall): BOP/TOP/SG dash on the reducer AND every row after it. Base FAIL 4, patched PASS.
- Item 1 independent grade re-check: tests/grade3/ (myref.js = my own first-principles math, mygen.js = my own
  scenarios incl. fill stakes, flat, 20-100 % steep, 2,000-9,000 ft, inverts below zero, 2-12 ft runs, station text
  both directions, stepped starts, reducers; run3.js drives the real form). Seeds 0-479: 480 scenarios, 20,458 rows,
  ~235,000 values (INV/BOP/TOP/SG elevations, rod readings, shown text in 0.01 ft and ft-in-1/16, station text,
  slopes %, HI, every interval mark present): **0 math mismatches** at 0.0005 ft. The 4 flagged seeds (221, 390, 401,
  437) are my generator typing a rod reading for an invert ABOVE the instrument; the app refuses those ("can't be
  negative"), correctly. Two app conventions I had to adopt (both stated in the app, not bugs): a Run N "step" is
  bottom-of-pipe to bottom-of-pipe; top of pipe = BOP + the pipe's real OD (ASTM D3034 values checked by hand; a
  BLANK pipe type is treated as PVC SDR 35 — see "worth a look" below). No metric mode exists in the app.
- Item 2 (round 1's open item) BUILT: patches/02_missing_photo_notice.py + tests/t_p02_missing_photo_notice.js (hook
  page). Records banner "N photos are missing from this phone" (tap: which records; sent photos are still with the
  company), one line on the run's Results, and a "Photo missing from this phone" picture wherever a lost photo would
  draw. Base: 4 FAIL; patched: all pass (light + dark checked by screenshot).
- Item 6a BUILT: patches/03_permit_started_last_night.py + tests/t_c03_permit_last_night.js (hook page; 7 clock
  cases). Asked only when the typed window has not started AND the same times one day earlier are running now.
  Base: 5 FAIL; patched: all pass. "Entry Supervisor Decides" still shows once.
