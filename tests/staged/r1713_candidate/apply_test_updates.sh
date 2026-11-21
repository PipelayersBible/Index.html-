#!/bin/sh
# Copies the r17.13 test updates over tests/ (with the r17.13 release commit).
# 1 test: tests/r1706/staterules/tests/t130_staterules.js (Pennsylvania now has its 3-business-day wait, so the
# "nothing confirmed" checks move to Montana; the trench "not known" note has new words). Checked: fails on r17.13 as
# written, passes on r17.13 with the update (results/NOTES.md).
set -e
ROOT=/home/claude/index.html-
HERE=$ROOT/tests/staged/r1713_candidate
[ -f "$ROOT/_src/index.html" ] || { echo "repo not found at $ROOT"; exit 1; }
cd "$HERE/test_updates"
find tests -type f | while read -r f; do mkdir -p "$ROOT/$(dirname "$f")"; cp "$f" "$ROOT/$f"; echo "updated $f"; done
