# Simpler Run Setup (Nov 20) — NOTES

Status: STARTED. Base = /tmp/claude-0/r1711/src.html (copied to /tmp/claude-0/rs20/base.html).

## Progress log
- 01_pipelayer_prefill.py BUILT + tests/t_rs01_pipelayer.js passing (14 checks): foreman's phone -> blank / crew of one / one-tap names.
- Before numbers (foreman rig co_fm, 390x844, empty New Run): 3,343 px, 51 visible controls (19 boxes, 5 dropdowns), shots/before_fm_*.png
- 02_job_fold_import_small.py, 03_pipe_folds.py, 04_same_pipe_chip.py written and applying (patches/apply_all.sh in out). Tests for 02-04 next.
- tests/t_rs02_setup_short.js passing on the patched page (29 checks). Before numbers saved in tests/before_r1711.json.
- Hooks build of the patched page: /tmp/claude-0/rs20/hooks/index.html (rebuild: see "How to rebuild" below). Regression runs next.
