#!/bin/sh
# Rebuild the CSP page from _src/index.html (r17.14, md5 25adfdd9...): sh tests/staged/security_nov22/patches/build_csp.sh [outdir]
# out/index.src.html  = _src + p01 (the source to publish as _src/index.html)
# out/build/          = publish build (index.html + pbx/)
# out/build_hooks/    = TEST build: + p99 (logs CSP violations) + hooks + site files. Never publish build_hooks.
set -e
ROOT=/home/claude/index.html-; P=$ROOT/tests/staged/security_nov22/patches; O=${1:-/tmp/claude-0/pbsec_csp}
mkdir -p $O; rm -rf $O/build $O/build_hooks
python3 $P/p01_csp.py $ROOT/_src/index.html $O/index.src.html
python3 $P/p99_csp_log_TEST_ONLY.py $O/index.src.html $O/test.src.html
python3 $ROOT/tests/r1708/speed2/build/build.py $O/index.src.html $O/build
python3 $ROOT/tests/r1708/speed2/build/build.py $O/test.src.html $O/build_hooks --hooks
cp $ROOT/sw.js $O/build_hooks/sw.js
for n in manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png privacy.html terms.html; do cp $ROOT/$n $O/build_hooks/$n; done
cp -r $ROOT/data $O/build_hooks/data
md5sum $O/index.src.html $O/build/index.html $O/build_hooks/index.html
