# Test fixtures

- `evimg/p01.jpg … p13.jpg`: the stake photos the rig's `H.img('pNN')` feeds to the photo inputs (the AI read itself is
  stubbed by each test, so only the files matter). Copied from /tmp/claude-0/evimg on Nov 18 2026.
- `daily.json`: a daily report snapshot used by t111 and bughunt_nov17/new/exp.js.
- `t123_before_r16.94.json`: what t123 measures on the r16.94 New Run form (height at 390 px, visible inputs / dropdowns /
  buttons, every id). t123 compares the live form against it when run_all.sh gets no `--base`. To remake it from the
  r16.94 page: `tests/run_all.sh --only t123 --base path/to/r16.94.html --keep`, then copy
  `/tmp/pbtest-*/out/t123_newrunshort.js/t123_before.json` here.
