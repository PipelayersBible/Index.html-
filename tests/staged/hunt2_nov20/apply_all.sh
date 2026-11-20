#!/bin/sh
# hunt2_nov20: applies the page patches 01-05 in order to a COPY of the source page.
# usage: sh apply_all.sh <in index.html> <out index.html>
# They also apply on top of ../hunt_nov19/apply_all.sh (round 1), in either order (checked Nov 20).
set -e
H="$(cd "$(dirname "$0")" && pwd)/patches"; T="$(mktemp -d)"
python3 "$H/01_reducer_wall_reload.py" "$1" "$T/1.html"
python3 "$H/02_missing_photo_notice.py" "$T/1.html" "$T/2.html"
python3 "$H/03_permit_started_last_night.py" "$T/2.html" "$T/3.html"
python3 "$H/04_signin_code_words.py" "$T/3.html" "$T/4.html"
python3 "$H/05_no_negative_run_time.py" "$T/4.html" "$2"
rm -rf "$T"; echo "ok $2"
