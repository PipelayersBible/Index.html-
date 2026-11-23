#!/bin/sh
# emergency_nov22 golden update (with the release that carries the app patch): office/a1_ask prints the end of the emergency
# card; it now has the new space line (tested and ventilated) and the "Not an emergency? Send to Ask" link.
set -e
ROOT="$(cd "${1:-/home/claude/index.html-}" && pwd)"
cd "$(dirname "$0")"; cp tests/expect/bughunt_nov17__office__a1_ask.js.txt "$ROOT/tests/expect/"; echo updated tests/expect/bughunt_nov17__office__a1_ask.js.txt
