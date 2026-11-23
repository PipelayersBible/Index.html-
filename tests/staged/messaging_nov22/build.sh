#!/bin/sh
# messaging_nov22: company messages on top of the r17.16 FINAL build (tests/staged/r1716_final/work/index.src.html, not edited;
# rebased Nov 22 from r1716_candidate A, where it was built first: the patch applies to both unchanged).
# BASE=<folder with index.src.html and sw.js> to build on another base (e.g. BASE=$S/r1716_candidate/work/A).
#   sh tests/staged/messaging_nov22/build.sh  ->  work/index.src.html, work/build/ (publish), work/build_hooks/ (tests). work/ is git-ignored.
set -e
ROOT=/home/claude/index.html-
S=$ROOT/tests/staged
D=$S/messaging_nov22; W=$D/work; A=${BASE:-$S/r1716_final/work}
rm -rf $W/build $W/build_hooks; mkdir -p $W/steps
cp $A/index.src.html $W/steps/s00.html
python3 $D/patches/m1_messages.py $W/steps/s00.html $W/index.src.html
python3 $S/records_nov22/patches/jscheck.py $W/index.src.html
python3 -c "import re,json,sys;s=open(sys.argv[1],encoding='utf-8').read();m=re.search(r'<script type=\"application/json\" id=\"pbI18nDict\">(.*?)</script>',s,re.S);d=json.loads(m.group(1));print('i18n dictionary ok:',len(d['t']),'strings,',len(d['p']),'patterns')" $W/index.src.html
python3 $ROOT/tests/r1708/speed2/build/build.py $W/index.src.html $W/build >/dev/null
python3 $ROOT/tests/r1708/speed2/build/build.py $W/index.src.html $W/build_hooks --hooks >/dev/null
cp $S/design_nov22/fonts/pbx/*.woff2 $W/build/pbx/; cp $S/design_nov22/fonts/pbx/*.woff2 $W/build_hooks/pbx/
cp $A/sw.js $W/sw.js; cp $W/sw.js $W/build_hooks/sw.js
for n in manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png privacy.html terms.html; do cp $ROOT/$n $W/build_hooks/$n; done
cp -r $ROOT/data $W/build_hooks/data
cp $W/build_hooks/index.html $W/build_hooks/cur.html
md5sum $A/index.src.html $W/index.src.html $W/build/index.html $W/build_hooks/index.html
