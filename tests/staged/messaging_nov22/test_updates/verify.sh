#!/bin/sh
# Re-runs the 8 tests whose goldens change with Messages, on a COPY of tests/ with these expect files (the repo stays as it is).
#   sh tests/staged/messaging_nov22/test_updates/verify.sh
# w2 and a7 are r17.16 A's own changes (field fixes; same as r1716_candidate/test_updates/A except w2's page height +1 px
# from the Settings Messages row). w1/w3/w4/t06_hash: the Home Messages card and the Settings row; s1_smoke/t03_roles:
# the app now calls pb_msg_list. Copy test_updates/tests over tests/ with the release commit that ships Messages.
set -e
ROOT=/home/claude/index.html-; D=$ROOT/tests/staged/messaging_nov22
T=${TMPDIR:-/tmp}/msg_verify; rm -rf $T; mkdir -p $T/repo/tests
(cd $ROOT/tests && tar cf - --exclude=./staged .) | (cd $T/repo/tests && tar xf -); cp $ROOT/sw.js $T/repo/ 2>/dev/null || true
(cd $D/test_updates && find tests -type f | while read -r f; do cp "$f" "$T/repo/$f"; done)
ONLY=$(cd $D/test_updates/tests/expect && ls | sed 's/__/\//g; s/\.txt$//; s/\./\\./g' | paste -sd'|')
$T/repo/tests/run_all.sh --build $D/work/build_hooks/index.html --jobs 2 --only "$ONLY" --out $T/out 2>&1 | tail -10
