#!/bin/sh
# usage: sh patches/apply_all.sh in.html out.html   (in.html = a COPY of _src/index.html, r17.10)
set -e
python3 "$(dirname "$0")/01_feedback_in_header.py" "$1" "$2"
