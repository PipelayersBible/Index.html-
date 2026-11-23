#!/bin/sh
# r17.17 = live r17.16 + foremen_job_nov23 f1 ("Foremen on this job") + stamp r17.17 · 2026-11-23
set -e
ROOT=/home/claude/index.html-; S=$ROOT/tests/staged; D=$S/r1717; W=$D/work
rm -rf $W; mkdir -p $W
python3 $S/foremen_job_nov23/patches/f1_job_foremen.py $ROOT/_src/index.html $W/s1.html
python3 - $W/s1.html $W/index.src.html <<'PY'
import sys
s=open(sys.argv[1],encoding='utf-8').read(); a="const PB_APP_BUILD = 'r17.16 · 2026-11-23';"
assert s.count(a)==1; open(sys.argv[2],'w',encoding='utf-8').write(s.replace(a,"const PB_APP_BUILD = 'r17.17 · 2026-11-23';"))
PY
python3 $S/records_nov22/patches/jscheck.py $W/index.src.html
python3 $ROOT/tests/r1708/speed2/build/build.py $W/index.src.html $W/build >/dev/null
python3 $ROOT/tests/r1708/speed2/build/build.py $W/index.src.html $W/build_hooks --hooks >/dev/null
cp $S/design_nov22/fonts/pbx/*.woff2 $W/build/pbx/; cp $S/design_nov22/fonts/pbx/*.woff2 $W/build_hooks/pbx/
sed "s/const PB_SW_BUILD = 'r17.16 · 2026-11-23';/const PB_SW_BUILD = 'r17.17 · 2026-11-23';/" $ROOT/sw.js > $W/sw.js
grep -q "PB_SW_BUILD = 'r17.17 · 2026-11-23'" $W/sw.js; cp $W/sw.js $W/build_hooks/sw.js
for n in manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png privacy.html terms.html; do cp $ROOT/$n $W/build_hooks/$n; done
cp -r $ROOT/data $W/build_hooks/data; cp $W/build_hooks/index.html $W/build_hooks/cur.html
md5sum $W/index.src.html $W/build/index.html
