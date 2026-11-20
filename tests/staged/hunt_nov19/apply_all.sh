#!/bin/sh
# hunt_nov19: applies the page patches in order to a COPY of the source page, and the worker patch to a COPY of sw.js.
# usage: sh apply_all.sh <in index.html> <out index.html> [<in sw.js> <out sw.js>]
set -e
H="$(cd "$(dirname "$0")" && pwd)/patches"; T="$(mktemp -d)"
python3 "$H/01_reload_asks_unsaved.py" "$1" "$T/1.html"
python3 "$H/02_night_shift_not_day_crew.py" "$T/1.html" "$T/2.html"
python3 "$H/03_pdf_part_retry.py" "$T/2.html" "$T/3.html"
python3 "$H/04_update_line_under_questions.py" "$T/3.html" "$2"
if [ -n "$3" ]; then python3 "$H/SW_01_keep_page_until_parts.py" "$3" "$4"; node --check "$4"; fi
rm -rf "$T"; echo "ok $2 ${4:-}"
