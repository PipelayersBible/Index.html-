#!/bin/sh
# Re-runs every test this folder updates, on a COPY of tests/ with the updates applied, against the r1716_final hooks build
# (the repo stays as it is).   sh tests/staged/r1716_final/test_updates/verify.sh
set -e
ROOT=/home/claude/index.html-; D=$ROOT/tests/staged/r1716_final
T=${TMPDIR:-/tmp}/r1716_final_verify; rm -rf $T; mkdir -p $T/repo/tests
(cd $ROOT/tests && tar cf - --exclude=./staged .) | (cd $T/repo/tests && tar xf -); cp $ROOT/sw.js $T/repo/ 2>/dev/null || true
(cd $D/test_updates && find tests -type f | while read -r f; do mkdir -p "$T/repo/$(dirname "$f")"; cp "$f" "$T/repo/$f"; done)
G=$(cd $D/test_updates/tests/expect && ls | sed 's/__/\//g; s/\.txt$//; s/\./\\./g')
X=$(cd $D/test_updates/tests && find . -name '*.js' -not -path './expect/*' | sed 's#^\./##; s/\./\\./g')
ONLY=$(printf '%s\n%s\n' "$G" "$X" | grep -v '^$' | paste -sd'|')
echo "only: $ONLY"
$T/repo/tests/run_all.sh --build $D/work/build_hooks/index.html --jobs 2 --only "$ONLY" --out $T/out 2>&1 | tail -12
