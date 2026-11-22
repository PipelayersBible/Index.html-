#!/bin/sh
# Copies the design_nov22 test updates over tests/ (with the release commit of the build that ships).
# Usage: sh tests/staged/design_nov22/apply_test_updates.sh p1|full [repo root, default /home/claude/index.html-]
#   p1   = PHASE 1 only shipped (candidates/p1)     full = PHASE 1 + PHASE 2 shipped (candidates/full)
# common/: changed test scripts (t104_permitack.js: G-3 order; permit_active_screen.py: G-1 full-row button).
# <mode>/tests/expect/: new golden outputs (reviewed: see NOTES.md "Regression").
set -e
MODE=${1:-p1}
ROOT="$(cd "${2:-/home/claude/index.html-}" && pwd)"
HERE=$ROOT/tests/staged/design_nov22/test_updates
[ -f "$ROOT/_src/index.html" ] || { echo "repo not found at $ROOT"; exit 1; }
[ -d "$HERE/$MODE" ] || { echo "mode must be p1 or full"; exit 1; }
for d in common $MODE; do
  cd "$HERE/$d"
  find tests -type f | while read -r f; do mkdir -p "$ROOT/$(dirname "$f")"; cp "$f" "$ROOT/$f"; echo "updated $f"; done
done
