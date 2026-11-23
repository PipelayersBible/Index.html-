#!/bin/sh
# r17.16 FINAL release candidate, from _src/index.html (LIVE r17.15 · 2026-11-22, md5 e0eaced9...), with Tommy's Nov 22 answers.
#   sh tests/staged/r1716_final/build.sh   -> work/ (git-ignored):
#     work/index.src.html (new _src/index.html), work/build/ (publish: index.html + pbx/), work/build_hooks/ (tests), work/sw.js
# Order (each patch exact-once, python3 p.py in out; see NOTES.md):
#   1. r1716_candidate variant Bx: field fixes, records phase B app parts, design phase 2 (new look), p2x Station/Distance fix
#   2. billing_nov22 b1-b4 as written (every anchor still matches once; the result equals A+b1-b4 with the look applied after)
#   3. emergency_nov22 p1, p2, p4 + patches/p3_spanish_rows_rb.py (p3 rebased on billing b3); p1 pastes
#      emergency_nov22/src_patch/emergency.ts, which now carries the H2S words (same file the server build uses)
#   4-8. decisions 56, 21, 11 (firstweek 05b), 22 (patches/d*.py); decision 12 needed no app change (checked, tests/t_decisions.js)
#   9. stamp r17.16 · 2026-11-23
set -e
ROOT=/home/claude/index.html-
S=$ROOT/tests/staged
D=$S/r1716_final
W=$D/work; rm -rf $W; mkdir -p $W/steps
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
design_nov22/patches/p2/look_css.py
design_nov22/patches/p2/look_needs_pick.py
design_nov22/patches/p2/look_permit_top.py
design_nov22/patches/p2/look_names_row.py
design_nov22/patches/p2/look_next_row_dark.py
r1716_candidate/patches/p2x_station_toggle.py
billing_nov22/patches/b1_plan_line.py
billing_nov22/patches/b2_crew_settings.py
billing_nov22/patches/b3_words.py
billing_nov22/patches/b4_owner_billing.py
emergency_nov22/patches/p1_emergency_block.py
emergency_nov22/patches/p2_not_emergency_link.py
r1716_final/patches/p3_spanish_rows_rb.py
emergency_nov22/patches/p4_dispatcher_interpreter.py
r1716_final/patches/d56_crew_no_company_price.py
r1716_final/patches/d21_crew_hours_by_day.py
firstweek_web_nov22/patches/05b_DECISION_72h_links.py
r1716_final/patches/d22_wa_weekly_talks.py
"
cp $ROOT/_src/index.html $W/steps/s00.html
i=0; prev=$W/steps/s00.html
for f in $LIST; do
  i=$((i+1)); out=$W/steps/s$(printf %02d $i).html
  echo "== $f"; python3 $S/$f $prev $out; prev=$out
done
python3 $D/patches/9_stamp.py $prev $W/index.src.html
python3 $S/records_nov22/patches/jscheck.py $W/index.src.html
grep -q "PB_APP_BUILD = 'r17.16 · 2026-11-23'" $W/index.src.html
sed "s/const PB_SW_BUILD = 'r17.15 · 2026-11-22';/const PB_SW_BUILD = 'r17.16 · 2026-11-23';/" $ROOT/sw.js > $W/sw.js
grep -q "PB_SW_BUILD = 'r17.16 · 2026-11-23'" $W/sw.js
python3 $ROOT/tests/r1708/speed2/build/build.py $W/index.src.html $W/build >/dev/null
python3 $ROOT/tests/r1708/speed2/build/build.py $W/index.src.html $W/build_hooks --hooks >/dev/null
cp $S/design_nov22/fonts/pbx/*.woff2 $W/build/pbx/; cp $S/design_nov22/fonts/pbx/*.woff2 $W/build_hooks/pbx/
cp $W/sw.js $W/build_hooks/sw.js
for n in manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png privacy.html terms.html; do cp $ROOT/$n $W/build_hooks/$n; done
cp -r $ROOT/data $W/build_hooks/data
cp $W/build_hooks/index.html $W/build_hooks/cur.html
md5sum $W/index.src.html $W/build/index.html $W/build_hooks/index.html $W/sw.js
