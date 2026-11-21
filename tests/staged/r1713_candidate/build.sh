#!/bin/sh
# Rebuild the r17.13 candidate from _src/index.html (r17.12): sh tests/staged/r1713_candidate/build.sh
set -e
ROOT=/home/claude/index.html-
D=$ROOT/tests/staged/r1713_candidate
W=$D/work; mkdir -p $W
cp $ROOT/_src/index.html $W/s0.html
python3 $D/patches/1_811_state_fixes.py $W/s0.html $W/s1.html
python3 $D/patches/2_safety_by_state.py $W/s1.html $W/s2.html
python3 $D/patches/3_trench_job_state.py $W/s2.html $W/s3.html
python3 $D/patches/4_spanish.py $W/s3.html $W/s4.html
python3 $D/patches/9_stamp.py $W/s4.html $D/index.src.html
sed "s/const PB_SW_BUILD = 'r17.12 · 2026-11-20';/const PB_SW_BUILD = 'r17.13 · 2026-11-20';/" $ROOT/sw.js > $D/sw.js
grep -q "PB_SW_BUILD = 'r17.13 · 2026-11-20'" $D/sw.js
rm -rf $D/build $D/build_hooks
python3 $ROOT/tests/r1708/speed2/build/build.py $D/index.src.html $D/build
python3 $ROOT/tests/r1708/speed2/build/build.py $D/index.src.html $D/build_hooks --hooks
md5sum $D/index.src.html $D/build/index.html $D/build_hooks/index.html $D/sw.js
