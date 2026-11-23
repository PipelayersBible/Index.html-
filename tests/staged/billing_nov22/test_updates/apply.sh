#!/bin/sh
# Copies the billing_nov22 test updates over tests/ (only with the commit that ships billing_nov22).
#   sh tests/staged/billing_nov22/test_updates/apply.sh [repo root, default /home/claude/index.html-]
# Goldens (wording changes only): t99_removed (Not Now hides the line), critic w1/w3/w4 ("Company plan (active)"),
# office a1_ask / a3_stake (AI reset time "at 4 PM today", "Individual or Company"), office b3_owner (company request line).
# t127_billing0.js: catch-up line says "joined"; Make Paid needs a billing state and sends seats / state / Terms version.
# critic/w2 and new/a7 are NOT here: they fail the same on the r17.16 candidate A and are in r1716_candidate/test_updates/A.
set -e
ROOT="$(cd "${1:-/home/claude/index.html-}" && pwd)"
[ -f "$ROOT/_src/index.html" ] || { echo "repo not found at $ROOT"; exit 1; }
cd "$ROOT/tests/staged/billing_nov22/test_updates"
find tests -type f | while read -r f; do mkdir -p "$ROOT/$(dirname "$f")"; cp "$f" "$ROOT/$f"; echo "updated $f"; done
