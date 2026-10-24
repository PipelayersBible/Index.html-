#!/bin/bash
# runs each listed existing test on the feat_run33 site, one at a time; summary in existing_results.txt
cd /home/claude/feat_run33/tests; mkdir -p logs; : > existing_results.txt
p=9203
while read t; do
  [ -z "$t" ] && continue
  n=$(echo "$t" | tr '/' '_')
  bash /home/claude/batch29/ROLES/tests/run_t.sh /home/claude/feat_run33/out/site /home/claude/$t $p > logs/$n.log 2>&1; rc=$?
  f=$(grep -c "FAIL" logs/$n.log); o=$(grep -c "^OK\|^ok\|^  OK\|^PASS" logs/$n.log)
  echo "$t rc=$rc fails=$f ok=$o" >> existing_results.txt
  p=$((p+1)); [ $p -gt 9209 ] && p=9203
done < list_existing.txt
echo DONE >> existing_results.txt
