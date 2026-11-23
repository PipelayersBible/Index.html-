#!/bin/sh
# foremen_job_nov23: "Foremen on this job" on top of _src/index.html (LIVE r17.16 · 2026-11-23, md5 0f613d6c...). Not stamped
# (the lead stamps the release). sh tests/staged/foremen_job_nov23/build.sh -> work/ (git-ignored):
#   work/index.src.html (new _src/index.html), work/build/ (publish), work/build_hooks/ (tests)
set -e
ROOT=/home/claude/index.html-
S=$ROOT/tests/staged; D=$S/foremen_job_nov23; W=$D/work; BASE=${BASE:-$ROOT/_src/index.html}
rm -rf $W; mkdir -p $W/steps
cp $BASE $W/steps/s00.html
python3 $D/patches/f1_job_foremen.py $W/steps/s00.html $W/index.src.html
python3 $S/records_nov22/patches/jscheck.py $W/index.src.html
python3 -c "import re,json,sys;s=open(sys.argv[1],encoding='utf-8').read();m=re.search(r'<script type=\"application/json\" id=\"pbI18nDict\">(.*?)</script>',s,re.S);d=json.loads(m.group(1).replace('<\\\\/','</'));print('i18n dictionary ok:',len(d['t']),'strings,',len(d['p']),'patterns')" $W/index.src.html
python3 $ROOT/tests/r1708/speed2/build/build.py $W/index.src.html $W/build >/dev/null
python3 $ROOT/tests/r1708/speed2/build/build.py $W/index.src.html $W/build_hooks --hooks >/dev/null
cp $S/design_nov22/fonts/pbx/*.woff2 $W/build/pbx/; cp $S/design_nov22/fonts/pbx/*.woff2 $W/build_hooks/pbx/
cp $ROOT/sw.js $W/sw.js; cp $W/sw.js $W/build_hooks/sw.js
for n in manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png privacy.html terms.html; do cp $ROOT/$n $W/build_hooks/$n; done
cp -r $ROOT/data $W/build_hooks/data
cp $W/build_hooks/index.html $W/build_hooks/cur.html
md5sum $BASE $W/index.src.html $W/build/index.html $W/build_hooks/index.html
