#!/bin/sh
# usage: sh apply_all.sh in.html out.html   (01..03 in order; each rep() must match exactly once)
set -e; d=$(dirname "$0"); t=$(mktemp -d)
python3 "$d/01_feedback_pill_off_work_screens.py" "$1" "$t/1.html"
python3 "$d/02_home_screen_card_order.py" "$t/1.html" "$t/2.html"
python3 "$d/03_join_sheet_dvh.py" "$t/2.html" "$2"
rm -rf "$t"
