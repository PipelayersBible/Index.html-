#!/bin/sh
# Copies the r17.16 FINAL test updates over tests/ (only with the r17.16 release commit).
#   sh tests/staged/r1716_final/test_updates/apply.sh [repo root, default /home/claude/index.html-]
# Merged from r1716_candidate/test_updates/B (look + field), billing_nov22/test_updates, emergency_nov22/test_updates and
# field_nov22/test_updates, with the goldens that two folders both changed (and the new decision changes) re-made from the
# r1716_final regression. The list and the reason for each file: ../NOTES.md "Test updates".
set -e
ROOT="$(cd "${1:-/home/claude/index.html-}" && pwd)"
[ -f "$ROOT/_src/index.html" ] || { echo "repo not found at $ROOT"; exit 1; }
cd "$ROOT/tests/staged/r1716_final/test_updates"
find tests -type f | sort | while read -r f; do mkdir -p "$ROOT/$(dirname "$f")"; cp "$f" "$ROOT/$f"; echo "updated $f"; done
