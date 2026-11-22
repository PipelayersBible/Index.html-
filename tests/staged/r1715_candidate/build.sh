#!/bin/sh
# r17.15 integrated candidate from _src/index.html (LIVE r17.14). sh tests/staged/r1715_candidate/build.sh
set -e
ROOT=/home/claude/index.html-
S=$ROOT/tests/staged
D=$S/r1715_candidate; W=$D/work; rm -rf $W; mkdir -p $W
LIST="
records_nov22/patches/a1a4_runs_unsent.py
records_nov22/patches/a2_delete_guard.py
records_nov22/patches/a3_legacy_sync_offline.py
records_nov22/patches/a5a6a7_logout_keep_storage.py
records_nov22/patches/a8_office_fill_pdf.py
records_nov22/patches/a9_run_remove_reason.py
records_nov22/patches/a10_exhibit_dates.py
dates_xing_nov22/patches/d1_center_holidays.py
dates_xing_nov22/patches/d2_weekend_call.py
dates_xing_nov22/patches/d3_az_wait.py
dates_xing_nov22/patches/d4_call_time.py
dates_xing_nov22/patches/d5_ut_expiry_time.py
dates_xing_nov22/patches/d6_crossings.py
dates_xing_nov22/patches/d7_permit_co_words.py
dates_xing_nov22/patches/d8_spec_card_state.py
firstweek_web_nov22/patches/01_a2hs_ios26.py
firstweek_web_nov22/patches/02_trial_chip_crew_end.py
firstweek_web_nov22/patches/03_login_trial_link.py
firstweek_web_nov22/patches/04_in_use_msg.py
firstweek_web_nov22/patches/05_join_link_expired.py
ask_quality_nov22/app_patch/p_emergency_app.py
design_nov22/patches/p1/a4_tab_origin.py
design_nov22/patches/p1/a3_back_arrows.py
design_nov22/patches/p1/c1_job_follows.py
design_nov22/patches/p1/c2_ticket_time.py
design_nov22/patches/p1/c3_end_run_done.py
r1715_candidate/patches/b3_home_no_double_on_records.py
design_nov22/patches/p1/a12_fonts_local.py
design_nov22/patches/p1/c4_dead_screens.py
design_nov22/patches/p1/g_permit_safety.py
design_nov22/patches/p1/h_access.py
security_nov22/patches/p01_csp.py
"
cp $ROOT/_src/index.html $W/s00.html
i=0; prev=$W/s00.html
for f in $LIST; do
  i=$((i+1)); out=$W/s$(printf %02d $i).html
  echo "== $f"; python3 $S/$f $prev $out; prev=$out
done
python3 $S/records_nov22/patches/9_stamp.py $prev $D/index.src.html
python3 $S/records_nov22/patches/jscheck.py $D/index.src.html
md5sum $D/index.src.html
