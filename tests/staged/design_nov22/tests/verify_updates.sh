#!/bin/sh
# Re-runs the updated tests on a COPY of tests/ with the updates applied (the repo stays as it is):
#   sh verify_updates.sh p1|full "<--only regex>"
set -e
MODE=$1; ONLY=$2
ROOT=/home/claude/index.html-; D=$ROOT/tests/staged/design_nov22
T=$(mktemp -d /tmp/claude-0/-home-claude/301429b0-ad8e-5cc1-a9ea-816c5040b6d3/scratchpad/vu.XXXX)
mkdir -p $T/repo; cp -r $ROOT/tests $T/repo/tests; cp $ROOT/sw.js $T/repo/ 2>/dev/null || true
rm -rf $T/repo/tests/staged
for d in common $MODE; do (cd $D/test_updates/$d && find tests -type f | while read -r f; do mkdir -p "$T/repo/$(dirname "$f")"; cp "$f" "$T/repo/$f"; done); done
$T/repo/tests/run_all.sh --build $D/candidates/$MODE/build_hooks/index.html --jobs 2 --only "$ONLY" --out $T/out 2>&1 | tail -40
echo "logs: $T/out"
