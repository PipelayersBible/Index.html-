#!/bin/sh
# apply_all.sh <in.html> <out.html>   (in = a COPY of the r17.11 candidate source; never _src/index.html itself)
set -e
D="$(cd "$(dirname "$0")" && pwd)"
python3 "$D/01_trench_state_rules.py" "$1" "$2"
