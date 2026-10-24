#!/bin/bash
# usage: bash run_suite.sh SITE_DIR [suite.txt]  -> suite_result.txt ("== N pass, M fail" on the last line)
SITE=${1:?site dir}; LIST=${2:-/home/claude/suite.txt}; OUT=/home/claude/suite_result.txt; : > $OUT
TMP=$(mktemp -d); split -n r/3 "$LIST" $TMP/lane_
i=0
for f in $TMP/lane_*; do
  port=$((9020+i)); i=$((i+1))
  ( while read -r t; do [ -z "$t" ] && continue; case "$t" in /*) ;; *) t=/home/claude/$t;; esac
      out=$(bash /home/claude/batch29/ROLES/tests/run_t.sh "$SITE" "$t" $port 2>&1); rc=$?
      nf=$(echo "$out" | grep -c -E '\*\*\* FAIL|SCRIPT ERROR|RUNNER ERROR'); nok=$(echo "$out" | grep -c '^OK')
      if [ $rc -ne 0 ] || [ $nf -gt 0 ]; then { echo "FAIL  $t (ok=$nok fails=$nf exit=$rc)"; echo "$out" | grep -E '\*\*\* FAIL|SCRIPT ERROR|RUNNER ERROR' | head -4 | cut -c1-220 | sed 's/^/      /'; } >> $OUT
      else echo "pass  $t (ok=$nok)" >> $OUT; fi
    done < $f ) &
done
wait
echo "== $(grep -c '^pass' $OUT) pass, $(grep -c '^FAIL' $OUT) fail" >> $OUT; tail -1 $OUT
