#!/bin/sh
# Copies the r17.12 test updates over tests/ (run from the repo root, with the r17.12 release commit).
# 2 test scripts (t98/t99: new plan-button selectors), 1 verdict test (t_b04: new crew buttons), 2 staged feature tests,
# and 11 goldens (tests/expect). Each was checked: fails on r17.12 as written, passes on r17.11 as written,
# passes on r17.12 with the update (see NOTES.md).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "${1:-.}" && pwd)"
[ -f "$ROOT/_src/index.html" ] || { echo "run from the repo root (or pass it)"; exit 1; }
cd "$HERE/test_updates"
find tests -type f | while read -r f; do mkdir -p "$ROOT/$(dirname "$f")"; cp "$f" "$ROOT/$f"; echo "updated $f"; done
