#!/bin/sh
# Copies the r17.14 test updates over tests/ (with the r17.14 release commit).
# Usage: sh tests/staged/r1714_candidate/apply_test_updates.sh [repo root, default: current folder]
# See NOTES.md ("Test updates") for each file and why it changes. Checked: each fails on r17.14 as it is in the repo
# and passes on r17.14 with the update (results/).
set -e
ROOT="$(cd "${1:-.}" && pwd)"
HERE=$ROOT/tests/staged/r1714_candidate
[ -f "$ROOT/_src/index.html" ] || { echo "repo not found at $ROOT"; exit 1; }
cd "$HERE/test_updates"
find tests -type f | while read -r f; do mkdir -p "$ROOT/$(dirname "$f")"; cp "$f" "$ROOT/$f"; echo "updated $f"; done
