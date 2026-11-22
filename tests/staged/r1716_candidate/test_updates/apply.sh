#!/bin/sh
# Copies the r17.16 golden updates over tests/ (only with the release commit of the variant that ships).
#   sh tests/staged/r1716_candidate/test_updates/apply.sh A|B [repo root, default /home/claude/index.html-]
# A: critic/w2 (Run Setup Clear 44 px; Results top folded into one line), new/a7 (stats row higher). Same files as field_nov22.
# B: A's two plus the design phase 2 look changes (see NOTES.md "Regression B").
set -e
V=${1:-}; case "$V" in A|B) ;; *) echo "usage: apply.sh A|B [root]"; exit 1;; esac
ROOT="$(cd "${2:-/home/claude/index.html-}" && pwd)"
[ -f "$ROOT/_src/index.html" ] || { echo "repo not found at $ROOT"; exit 1; }
cd "$ROOT/tests/staged/r1716_candidate/test_updates/$V"
find tests -type f | while read -r f; do mkdir -p "$ROOT/$(dirname "$f")"; cp "$f" "$ROOT/$f"; echo "updated $f"; done
