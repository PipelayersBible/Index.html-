#!/bin/bash
cd /home/claude/feat_run33/tests; mkdir -p logs_base; : > base_results.txt
p=9203
for t in batch14/R/tests/t_r14_drafts.js test/hunt22/numbers/f3_bothways_backflow_sides.js batch2/B2/tests/b2_check.js batch2/B3/tests/b3_check.js batch9/L1/tests/t08_review1.js batch9/L1/tests/t09_review2.js test/hunt31/t2_finish_individual.js test/hunt24/lifecycle/r1_resumed_stop_before_earlier_stop.js; do
  n=$(echo "$t" | tr '/' '_')
  bash /home/claude/batch29/ROLES/tests/run_t.sh /home/claude/rel1532/site1532 /home/claude/$t $p > logs_base/$n.log 2>&1; rc=$?
  echo "$t rc=$rc fails=$(grep -c FAIL logs_base/$n.log) ok=$(grep -c '^OK' logs_base/$n.log)" >> base_results.txt
  p=$((p+1)); [ $p -gt 9209 ] && p=9203
done
echo DONE >> base_results.txt
