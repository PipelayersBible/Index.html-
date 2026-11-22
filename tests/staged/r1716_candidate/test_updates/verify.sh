#!/bin/sh
# Re-runs the tests whose goldens change, on a COPY of tests/ with test_updates/<V> applied (the repo stays as it is).
#   sh tests/staged/r1716_candidate/test_updates/verify.sh A|B
set -e
V=$1; ROOT=/home/claude/index.html-; D=$ROOT/tests/staged/r1716_candidate
T=${TMPDIR:-/tmp}/r1716_verify_$V; rm -rf $T; mkdir -p $T/repo/tests
(cd $ROOT/tests && tar cf - --exclude=./staged .) | (cd $T/repo/tests && tar xf -); cp $ROOT/sw.js $T/repo/ 2>/dev/null || true
(cd $D/test_updates/$V && find tests -type f | while read -r f; do cp "$f" "$T/repo/$f"; done)
ONLY=$(cd $D/test_updates/$V/tests/expect && ls | sed 's/__/\//g; s/\.txt$//; s/\./\\./g' | paste -sd'|')
$T/repo/tests/run_all.sh --build $D/work/$V/build_hooks/index.html --jobs 2 --only "$ONLY" --out $T/out 2>&1 | tail -8
