#!/bin/sh
# field_nov22: Field Conditions fixes on top of the r17.15 candidate (tests/staged/r1715_candidate/index.src.html).
#   sh tests/staged/field_nov22/build.sh   -> work/index.src.html, work/build (publish), work/build_hooks (tests)
set -e
ROOT=/home/claude/index.html-
S=$ROOT/tests/staged
D=$S/field_nov22; W=$D/work; mkdir -p $W/steps
LIST=${LIST:-"f1_results_compact.py f4_laid_toast.py f5_loading.py f6_xl_text.py f7_zoom_inv.py f8_tap_targets.py f9_copy_longpress.py f10_wake.py"}
cp $S/r1715_candidate/index.src.html $W/steps/s00.html
i=0; prev=$W/steps/s00.html
for f in $LIST; do
  [ -f $D/patches/$f ] || { echo "skip $f (not written)"; continue; }
  i=$((i+1)); out=$W/steps/s$(printf %02d $i).html
  echo "== $f"; python3 $D/patches/$f $prev $out; prev=$out
done
cp $prev $W/index.src.html
python3 $S/records_nov22/patches/jscheck.py $W/index.src.html
rm -rf $W/build $W/build_hooks
python3 $ROOT/tests/r1708/speed2/build/build.py $W/index.src.html $W/build >/dev/null
python3 $ROOT/tests/r1708/speed2/build/build.py $W/index.src.html $W/build_hooks --hooks >/dev/null
cp $S/design_nov22/fonts/pbx/*.woff2 $W/build/pbx/; cp $S/design_nov22/fonts/pbx/*.woff2 $W/build_hooks/pbx/
cp $S/r1715_candidate/sw.js $W/build_hooks/sw.js
for n in manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png privacy.html terms.html; do cp $ROOT/$n $W/build_hooks/$n; done
cp -r $ROOT/data $W/build_hooks/data
cp $W/build_hooks/index.html $W/build_hooks/cur.html
md5sum $W/index.src.html $W/build/index.html $W/build_hooks/index.html
