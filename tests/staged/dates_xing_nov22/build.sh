#!/bin/sh
# Stack the dates_xing_nov22 patches on r17.14 (_src/index.html, md5 25adfdd9...): sh tests/staged/dates_xing_nov22/build.sh
set -e
D=/home/claude/index.html-/tests/staged/dates_xing_nov22; W=$D/work; mkdir -p $W $D/results
cp /home/claude/index.html-/_src/index.html $W/s00.html
i=0; prev=$W/s00.html
for f in d1_center_holidays.py d2_weekend_call.py d3_az_wait.py d4_call_time.py d5_ut_expiry_time.py d6_crossings.py d7_permit_co_words.py d8_spec_card_state.py; do
  i=$((i+1)); out=$W/s$(printf %02d $i).html; echo "== $f"; python3 $D/patches/$f $prev $out; prev=$out
done
cp $prev $D/index.src.html; md5sum $D/index.src.html
mkdir -p $W/srv/base $W/srv/mine
cp $W/s00.html $W/srv/base/cur.html; cp $W/s00.html $W/srv/base/r1714.html
cp $prev $W/srv/mine/cur.html; cp $prev $W/srv/mine/r1714.html
