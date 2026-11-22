#!/bin/sh
# design_nov22 candidates from _src/index.html (LIVE r17.14 · 2026-11-21, md5 25adfdd9...).
#   sh tests/staged/design_nov22/build.sh p1     -> candidates/p1   (PHASE 1 only: behaviour fixes, no look change)
#   sh tests/staged/design_nov22/build.sh full   -> candidates/full (PHASE 1 + PHASE 2 look)
# Each: index.src.html (new _src/index.html), build/ (publish: index.html + pbx/ incl. the 4 font files),
# build_hooks/ (test build: + sw.js, icons, data/), sw.js (stamped).
set -e
ROOT=/home/claude/index.html-
D=$ROOT/tests/staged/design_nov22
P=$D/patches
MODE=${1:-p1}
C=$D/candidates/$MODE; W=$C/work; mkdir -p $W
P1="p1/a4_tab_origin.py p1/a3_back_arrows.py p1/c1_job_follows.py p1/c2_ticket_time.py p1/c3_end_run_done.py p1/b3_home_no_double.py p1/a12_fonts_local.py p1/c4_dead_screens.py p1/g_permit_safety.py p1/h_access.py"
P2=""
[ -f $P/p2/LIST ] && P2=$(cat $P/p2/LIST)
LIST="$P1"; [ "$MODE" = full ] && LIST="$P1 $P2"
cp $ROOT/_src/index.html $W/s00.html
i=0; prev=$W/s00.html
for f in $LIST; do
  i=$((i+1)); out=$W/s$(printf %02d $i).html
  echo "== $f"; python3 $P/$f $prev $out; prev=$out
done
python3 $P/9_stamp.py $prev $C/index.src.html
sed "s/const PB_SW_BUILD = 'r17.14 · 2026-11-21';/const PB_SW_BUILD = 'r17.15 · 2026-11-21';/" $ROOT/sw.js > $C/sw.js
grep -q "PB_SW_BUILD = 'r17.15 · 2026-11-21'" $C/sw.js
rm -rf $C/build $C/build_hooks
python3 $ROOT/tests/r1708/speed2/build/build.py $C/index.src.html $C/build
python3 $ROOT/tests/r1708/speed2/build/build.py $C/index.src.html $C/build_hooks --hooks
cp $D/fonts/pbx/*.woff2 $C/build/pbx/; cp $D/fonts/pbx/*.woff2 $C/build_hooks/pbx/
cp $C/sw.js $C/build_hooks/sw.js
for n in manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png privacy.html terms.html; do cp $ROOT/$n $C/build_hooks/$n; done
cp -r $ROOT/data $C/build_hooks/data
md5sum $C/index.src.html $C/build/index.html $C/build_hooks/index.html $C/sw.js
