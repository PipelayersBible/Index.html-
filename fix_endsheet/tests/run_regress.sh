#!/bin/bash
# usage (inside the lock): run_regress.sh LIST SITE OUT   -> one test at a time, >= 2 GB free before each
LIST=$1; SITE=$2; OUT=$3; : > "$OUT"
while read -r f; do [ -z "$f" ] && continue
  out=$(bash /home/claude/batch29/ROLES/tests/run_t.sh "$SITE" "$f" 8862 2>&1); rc=$?
  nf=$(echo "$out" | grep -c -E '\*\*\* FAIL|SCRIPT ERROR|RUNNER ERROR'); nok=$(echo "$out" | grep -c '^OK')
  if [ $rc -ne 0 ] || [ $nf -gt 0 ]; then echo "FAIL  $f (ok=$nok fails=$nf exit=$rc)" >> "$OUT"; echo "$out" | grep -E '\*\*\* FAIL|SCRIPT ERROR|RUNNER ERROR' | head -6 | cut -c1-260 | sed 's/^/      /' >> "$OUT"
  else echo "pass  $f (ok=$nok)" >> "$OUT"; fi
done < "$LIST"
echo "== $(grep -c '^pass' "$OUT") pass, $(grep -c '^FAIL' "$OUT") fail" >> "$OUT"
