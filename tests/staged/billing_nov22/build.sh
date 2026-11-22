#!/bin/sh
# billing_nov22 app build: r17.16 candidate A (tests/staged/r1716_candidate/work/A/index.src.html) + b1..b4.
#   sh tests/staged/billing_nov22/build.sh  -> work/out/index.src.html, work/out/build (publish), work/out/build_hooks (tests)
set -e
ROOT=/home/claude/index.html-
S=$ROOT/tests/staged
D=$S/billing_nov22
W=$D/work/out; rm -rf $W; mkdir -p $W/steps
cp $S/r1716_candidate/work/A/index.src.html $W/steps/s00.html
i=0; prev=$W/steps/s00.html
for f in b1_plan_line b2_crew_settings b3_words b4_owner_billing; do
  i=$((i+1)); out=$W/steps/s0$i.html; echo "== $f"; python3 $D/patches/$f.py $prev $out; prev=$out
done
cp $prev $W/index.src.html
python3 $S/records_nov22/patches/jscheck.py $W/index.src.html
python3 $ROOT/tests/r1708/speed2/build/build.py $W/index.src.html $W/build >/dev/null
python3 $ROOT/tests/r1708/speed2/build/build.py $W/index.src.html $W/build_hooks --hooks >/dev/null
cp $S/design_nov22/fonts/pbx/*.woff2 $W/build/pbx/; cp $S/design_nov22/fonts/pbx/*.woff2 $W/build_hooks/pbx/
cp $S/r1716_candidate/work/A/sw.js $W/build_hooks/sw.js
for n in manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png privacy.html terms.html; do cp $ROOT/$n $W/build_hooks/$n; done
cp -r $ROOT/data $W/build_hooks/data
cp $W/build_hooks/index.html $W/build_hooks/cur.html
md5sum $W/index.src.html $W/build/index.html $W/build_hooks/index.html
