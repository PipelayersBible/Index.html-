#!/bin/bash
# runs every test in $1 (reg or base) from the rig folder; one line per test with its pass/fail counts; output in $1.out/
D=/tmp/claude-0/feat/onboard/tests/$1; O=$D.out; mkdir -p $O
cd /home/claude/rig
for f in $D/*.js; do n=$(basename $f .js); PB_URL=$( [ "$1" = reg ] && echo http://127.0.0.1:8878/cur.html || echo http://127.0.0.1:8878/index.html ) timeout 600 node $f > $O/$n.txt 2>&1; rc=$?; echo "$n rc=$rc pass=$(grep -c '^PASS' $O/$n.txt) fail=$(grep -c '^FAIL' $O/$n.txt)"; done
