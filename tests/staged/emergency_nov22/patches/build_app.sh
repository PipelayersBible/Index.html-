#!/bin/sh
# build_app.sh : the app with the emergency_nov22 patches, on the r17.16 candidate A (tests/staged/r1716_candidate/work/A/index.src.html,
# md5 3703f40c...). Output in work/app/: index.src.html, build/ (publish) and build_hooks/ (tests). Patch order: p1 p2 p3 p4.
set -e
ROOT=/home/claude/index.html-; S=$ROOT/tests/staged; D=$S/emergency_nov22; W=$D/work/app
BASE=${BASE:-$S/r1716_candidate/work/A/index.src.html}
mkdir -p $W; cp $BASE $W/s00.html
python3 $D/patches/p1_emergency_block.py $W/s00.html $W/s01.html
python3 $D/patches/p2_not_emergency_link.py $W/s01.html $W/s02.html
python3 $D/patches/p3_spanish_rows.py $W/s02.html $W/s03.html
python3 $D/patches/p4_dispatcher_interpreter.py $W/s03.html $W/index.src.html
python3 $S/records_nov22/patches/jscheck.py $W/index.src.html
rm -rf $W/build $W/build_hooks
python3 $ROOT/tests/r1708/speed2/build/build.py $W/index.src.html $W/build >/dev/null
python3 $ROOT/tests/r1708/speed2/build/build.py $W/index.src.html $W/build_hooks --hooks >/dev/null
A=$S/r1716_candidate/work/A
cp $S/design_nov22/fonts/pbx/*.woff2 $W/build/pbx/; cp $S/design_nov22/fonts/pbx/*.woff2 $W/build_hooks/pbx/
cp $A/sw.js $W/build_hooks/sw.js
for n in manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png privacy.html terms.html; do cp $ROOT/$n $W/build_hooks/$n; done
cp -r $ROOT/data $W/build_hooks/data
cp $W/build_hooks/index.html $W/build_hooks/cur.html
md5sum $BASE $W/index.src.html $W/build/index.html $W/build_hooks/index.html
