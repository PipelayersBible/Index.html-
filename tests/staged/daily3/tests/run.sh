#!/bin/bash
# Runs the daily3 tests against a build made by ../build.sh. usage: run.sh SITE_URL_ROOT (e.g. http://127.0.0.1:8897/hk/) [OUTDIR]
HERE="$(cd "$(dirname "$0")" && pwd)"; export PB_ROOT="${1:-http://127.0.0.1:8897/hk/}" PB_OUT="${2:-/tmp/claude-0/d3/out}" NODE_PATH=/opt/npm-tools/node_modules TZ=America/Los_Angeles
mkdir -p "$PB_OUT"; rc=0
for t in "$HERE"/t0*.js; do n=$(basename "$t" .js); timeout 400 node "$t" > "$PB_OUT/$n.log" 2>&1; r=$?; p=$(grep -c '^PASS' "$PB_OUT/$n.log"); f=$(grep -c '^FAIL' "$PB_OUT/$n.log"); echo "$n exit=$r PASS=$p FAIL=$f"; [ $r -ne 0 ] && rc=1; done
exit $rc
