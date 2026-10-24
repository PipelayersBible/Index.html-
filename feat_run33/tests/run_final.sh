#!/bin/bash
cd /home/claude/feat_run33/tests; mkdir -p logs; : > final_results.txt
p=9203
for t in /home/claude/feat_run33/tests/t_run33.js test/hunt2/sweep2-corrections/s1_resume_tile_other_form.js test/hunt2/sweep2-corrections/s1b_reload_and_hub.js test/hunt17/engine/c_relock_nothing_changed.js test/hunt17/engine/d_relock_after_hub_correction_engineer.js test/hunt26/lifecycle/a3_reload_edit_run_data_relock_same_run.js test/hunt26/lifecycle/r1_boot_already_locked_hub_ids.js test/hunt26/lifecycle/a2_reload_then_edit_run_data_untimed.js test/hunt2/sweep2-lock-endrun/s3_relock_same.js test/hunt3/lifecycle/l1_relock_after_correction.js test/hunt3/lifecycle/l3_resume_goback_relock.js test/hunt3/lifecycle/l6_edit_run_data_bypasses_guard.js test/hunt19/lifecycle/a1_duplicate_settings_bypasses_already_locked.js test/hunt19/lifecycle/a2_retap_rod_unit_bypasses_already_locked.js test/hunt18/engine/s2_failed_stake_hub_correction_breaks_relock_guard.js test/hunt18/engine/s3_refused_hub_correction_breaks_relock_guard.js test/hunt23/lifecycle/t1_edit_run_data_second_run_timer.js test/hunt25/lifecycle/l11_left_edits_then_locked.js test/hunt4/lifecycle/h3_lock_edited_run_strands_pending_photo.js test/hunt24/lifecycle/a7_stake_hub_correction_stamps_next_run.js test/hunt25/lifecycle/l9_rod_roundtrip_relock.js test/hunt5/review/n1_relock_after_end_manhours.js test/hunt24/review/a6_locked_form_with_photo_back.js batch3/T2/tests/t2_finish_individual.js test/hunt30/A3/t_home_work.js batch14/F/tests/t_laid.js batch14/R/tests/t_r14_drafts.js test/hunt22/numbers/f3_bothways_backflow_sides.js test/hunt24/lifecycle/r1_resumed_stop_before_earlier_stop.js test/hunt12/engine/a_post_lock_interval_absorbed.js test/hunt3/lifecycle/l4_form_edit_bedding_correction.js batch12/L2/tests/t05_persist.js; do
  case "$t" in /*) f="$t";; *) f="/home/claude/$t";; esac
  n=$(echo "$t" | tr '/' '_')
  bash /home/claude/batch29/ROLES/tests/run_t.sh /home/claude/feat_run33/out/site "$f" $p > logs/$n.log 2>&1; rc=$?
  echo "$t rc=$rc fails=$(grep -c FAIL logs/$n.log) ok=$(grep -c '^OK' logs/$n.log)" >> final_results.txt
  p=$((p+1)); [ $p -gt 9209 ] && p=9203
done
echo DONE >> final_results.txt
