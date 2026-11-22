#!/bin/sh
# r17.16 candidate from _src/index.html (LIVE r17.15 · 2026-11-22, md5 e0eaced9...).
#   sh tests/staged/r1716_candidate/build.sh A   -> work/A  (field fixes + records phase B app parts; no look change)
#   sh tests/staged/r1716_candidate/build.sh B   -> work/B  (A + design phase 2, the new look)
# Each: work/<V>/index.src.html (new _src/index.html), work/<V>/build/ (publish: index.html + pbx/), work/<V>/build_hooks/
# (tests), work/<V>/sw.js (stamped). work/ is git-ignored.
set -e
ROOT=/home/claude/index.html-
S=$ROOT/tests/staged
D=$S/r1716_candidate
V=${1:-A}
case "$V" in A|B) ;; *) echo "usage: build.sh A|B"; exit 1;; esac
SFX=; if [ "${EXTRA:-0}" = 1 ]; then SFX=x; fi
W=$D/work/$V$SFX; rm -rf $W; mkdir -p $W/steps
LIST="
field_nov22/patches/f1_results_compact.py
field_nov22/patches/f4_laid_toast.py
field_nov22/patches/f5_loading.py
field_nov22/patches/f6_xl_text.py
field_nov22/patches/f7_zoom_inv.py
field_nov22/patches/f8_tap_targets.py
field_nov22/patches/f9_copy_longpress.py
field_nov22/patches/f10_wake.py
records_nov22/patches/phaseb/b3_open_phoneat.py
records_nov22/patches/phaseb/b8_export_versions.py
"
LOOK="
design_nov22/patches/p2/look_css.py
design_nov22/patches/p2/look_needs_pick.py
design_nov22/patches/p2/look_permit_top.py
design_nov22/patches/p2/look_names_row.py
design_nov22/patches/p2/look_next_row_dark.py
"
if [ "$V" = B ]; then LIST="$LIST $LOOK"; fi
if [ "$V" = B ] && [ "${EXTRA:-0}" = 1 ]; then LIST="$LIST r1716_candidate/patches/p2x_station_toggle.py"; fi # optional, see NOTES.md
cp $ROOT/_src/index.html $W/steps/s00.html
i=0; prev=$W/steps/s00.html
for f in $LIST; do
  i=$((i+1)); out=$W/steps/s$(printf %02d $i).html
  echo "== $f"; python3 $S/$f $prev $out; prev=$out
done
python3 $D/patches/9_stamp.py $prev $W/index.src.html
python3 $S/records_nov22/patches/jscheck.py $W/index.src.html
grep -q "PB_APP_BUILD = 'r17.16 · 2026-11-22'" $W/index.src.html
sed "s/const PB_SW_BUILD = 'r17.15 · 2026-11-22';/const PB_SW_BUILD = 'r17.16 · 2026-11-22';/" $ROOT/sw.js > $W/sw.js
grep -q "PB_SW_BUILD = 'r17.16 · 2026-11-22'" $W/sw.js
python3 $ROOT/tests/r1708/speed2/build/build.py $W/index.src.html $W/build >/dev/null
python3 $ROOT/tests/r1708/speed2/build/build.py $W/index.src.html $W/build_hooks --hooks >/dev/null
cp $S/design_nov22/fonts/pbx/*.woff2 $W/build/pbx/; cp $S/design_nov22/fonts/pbx/*.woff2 $W/build_hooks/pbx/
cp $W/sw.js $W/build_hooks/sw.js
for n in manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png privacy.html terms.html; do cp $ROOT/$n $W/build_hooks/$n; done
cp -r $ROOT/data $W/build_hooks/data
cp $W/build_hooks/index.html $W/build_hooks/cur.html
md5sum $W/index.src.html $W/build/index.html $W/build_hooks/index.html $W/sw.js
