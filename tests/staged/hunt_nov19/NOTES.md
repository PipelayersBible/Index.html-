# hunt_nov19 — bug hunt notes (resumed after a machine restart)

Status: IN PROGRESS (resumed hunter). Patches 01-04 + SW_01 and tests t_h01-t_h05 are from the first hunter; being re-verified.
Work dir: /tmp/claude-0/hunt19b (site served on port 9000).

## Re-verified after the restart (each test run against _src/index.html unpatched, then patched)
| test | unpatched | patched |
|---|---|---|
| t_h01 Reload asks about unsaved work (patch 01) | 2 FAIL (quantities and note lost) | all pass |
| t_h02 day crew's open run vs night-shift rule (patch 02) | 3 FAIL (Tue run on Mon report) | all pass |
| t_h03 PDF part retry (patch 03) | 1 FAIL (never retries) | all pass |
| t_h04 worker keeps page until parts (SW_01, sw.js) | 2 FAIL (offline, no PDF tools) | all pass |
| t_h05 update line vs questions/active bar (patch 04) | 6 FAIL (covers Go Back + active bar, 3 phone sizes) | all pass |

All five of the first hunter's fixes confirmed: fail before, pass after.
