#!/bin/sh
# records_nov22 PHASE A candidate from _src/index.html (LIVE r17.14, md5 25adfdd9...).
#   sh tests/staged/records_nov22/build.sh   -> candidate/index.src.html, candidate/build (publish), candidate/build_hooks (tests)
set -e
ROOT=/home/claude/index.html-
D=$ROOT/tests/staged/records_nov22
P=$D/patches
C=$D/candidate; W=$C/work; mkdir -p $W
LIST="a1a4_runs_unsent.py a2_delete_guard.py a3_legacy_sync_offline.py a5a6a7_logout_keep_storage.py a8_office_fill_pdf.py a9_run_remove_reason.py a10_exhibit_dates.py"
cp $ROOT/_src/index.html $W/s00.html
i=0; prev=$W/s00.html
for f in $LIST; do
  i=$((i+1)); out=$W/s$(printf %02d $i).html
  echo "== $f"; python3 $P/$f $prev $out; prev=$out
done
python3 $P/9_stamp.py $prev $C/index.src.html
python3 $P/jscheck.py $C/index.src.html
sed "s/const PB_SW_BUILD = 'r17.14 · 2026-11-21';/const PB_SW_BUILD = 'r17.15 · 2026-11-22';/" $ROOT/sw.js > $C/sw.js
grep -q "PB_SW_BUILD = 'r17.15 · 2026-11-22'" $C/sw.js
rm -rf $C/build $C/build_hooks
python3 $ROOT/tests/r1708/speed2/build/build.py $C/index.src.html $C/build
python3 $ROOT/tests/r1708/speed2/build/build.py $C/index.src.html $C/build_hooks --hooks
cp $C/sw.js $C/build_hooks/sw.js
for n in manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png privacy.html terms.html; do cp $ROOT/$n $C/build_hooks/$n; done
cp -r $ROOT/data $C/build_hooks/data
[ -d $ROOT/pbx ] && cp -rn $ROOT/pbx/. $C/build_hooks/pbx/ 2>/dev/null || true
md5sum $C/index.src.html $C/build/index.html $C/build_hooks/index.html $C/sw.js
