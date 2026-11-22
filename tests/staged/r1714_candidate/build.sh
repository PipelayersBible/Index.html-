#!/bin/sh
# Rebuild the r17.14 candidate from _src/index.html (r17.13, md5 4f2101b2...): sh tests/staged/r1714_candidate/build.sh
set -e
ROOT=/home/claude/index.html-
D=$ROOT/tests/staged/r1714_candidate
P=$D/patches
W=$D/work; mkdir -p $W $P/results
cp $ROOT/_src/index.html $W/s00.html
i=0; prev=$W/s00.html
for f in 811/p1_wait_days_confirmed.py 811/p2_wait_full_days.py 811/p3_wait_not_call_day.py 811/p4_rules_hit_line_fills.py 811/p5_state_phone_location.py \
         safety/p1_injury_states.py safety/p2_trench_rows.py safety/p3_rules_safety_lines.py safety/p4_talks.py safety/p5_permit_rules.py \
         specs/1_xing_state_rule.py specs/2_spec_words.py \
         survey/s1_cutsheet_lt_rt.py survey/s2_cutsheet_cut_fill_words.py survey/s3_stake_cut_fill_needs_letter.py survey/s4_slope_ftft_hv.py survey/s5_glossary_datum_units.py \
         timerecords/01_crew_hours_not_a_timecard.py spanish/es_injury_lines.py; do
  i=$((i+1)); out=$W/s$(printf %02d $i).html
  echo "== $f"; python3 $P/$f $prev $out; prev=$out
done
python3 $P/9_stamp.py $prev $D/index.src.html
sed "s/const PB_SW_BUILD = 'r17.13 · 2026-11-20';/const PB_SW_BUILD = 'r17.14 · 2026-11-20';/" $ROOT/sw.js > $D/sw.js
grep -q "PB_SW_BUILD = 'r17.14 · 2026-11-20'" $D/sw.js
rm -rf $D/build $D/build_hooks
python3 $ROOT/tests/r1708/speed2/build/build.py $D/index.src.html $D/build
python3 $ROOT/tests/r1708/speed2/build/build.py $D/index.src.html $D/build_hooks --hooks
# test build only: the regression runner serves the folder of --build, so give build_hooks/ the new sw.js and the
# site's static files (t07_sw needs sw.js). build/ stays page + pbx only (publish sw.js from $D/sw.js).
cp $D/sw.js $D/build_hooks/sw.js
for n in manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png privacy.html terms.html; do cp $ROOT/$n $D/build_hooks/$n; done
cp -r $ROOT/data $D/build_hooks/data
md5sum $D/index.src.html $D/build/index.html $D/build_hooks/index.html $D/sw.js
