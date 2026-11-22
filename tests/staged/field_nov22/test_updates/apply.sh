#!/bin/sh
# Copies the field_nov22 golden updates over tests/ (with the release commit of the build that ships them).
# w2: Run Setup 4 px taller (Clear 44 px, F8) and the Results line folded (F1); a7: the stats row sits higher (F1).
set -e
ROOT="$(cd "${1:-/home/claude/index.html-}" && pwd)"
cd "$ROOT/tests/staged/field_nov22/test_updates"
find tests -type f | while read -r f; do cp "$f" "$ROOT/$f"; echo "updated $f"; done
