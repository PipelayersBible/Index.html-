# Tests

`permit_active_screen.py` is a small first set of browser checks for the Active Permit screen (timer chips, reminders set
after locking, air test range hints, roster layout, Emergency pause/resolve, closeout report). Run from the repo root:

    pip install playwright && python3 tests/permit_active_screen.py

It loads `index.html` from disk with the network blocked and uses a fake clock for the "due" checks.

## Not covered yet (to build when appropriate)
The earlier coding sessions ran a much larger suite (1,000+ files: runs, cutsheet import, sync queue, records, accounts, the
company dashboard, confined-space edge cases). Those files are NOT in this repo. Before the next big change, either recover that
suite from its owner or rebuild the highest-risk parts here: confined-space save/restore and multi-tab behavior, the run lock and
sync queue, and cloud permit backup.
