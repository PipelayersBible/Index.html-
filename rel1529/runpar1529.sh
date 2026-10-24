#!/bin/bash
OUT=/home/claude/rel1529/res1529.txt; : > $OUT
split -n r/3 /home/claude/rel1529/list1529.txt /tmp/claude-0/-home-claude/301429b0-ad8e-5cc1-a9ea-816c5040b6d3/scratchpad/sh1529_
i=0
for f in /tmp/claude-0/-home-claude/301429b0-ad8e-5cc1-a9ea-816c5040b6d3/scratchpad/sh1529_*; do
  port=$((9020+i)); i=$((i+1))
  ( while read -r t; do [ -z "$t" ] && continue
      out=$(bash /home/claude/batch29/ROLES/tests/run_t.sh /home/claude/rel1529/site1529 "$t" $port 2>&1); rc=$?
      nf=$(echo "$out" | grep -c -E '\*\*\* FAIL|SCRIPT ERROR|RUNNER ERROR'); nok=$(echo "$out" | grep -c '^OK')
      if [ $rc -ne 0 ] || [ $nf -gt 0 ]; then { echo "FAIL  $t (ok=$nok fails=$nf exit=$rc)"; echo "$out" | grep -E '\*\*\* FAIL|SCRIPT ERROR|RUNNER ERROR' | head -4 | cut -c1-220 | sed 's/^/      /'; } >> $OUT
      else echo "pass  $t (ok=$nok)" >> $OUT; fi
    done < $f ) &
done
wait
echo "== $(grep -c '^pass' $OUT) pass, $(grep -c '^FAIL' $OUT) fail" >> $OUT
