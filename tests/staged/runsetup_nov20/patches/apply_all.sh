#!/bin/sh
# Applies the Run Setup patches in order to a COPY of the r17.11 candidate. Usage: patches/apply_all.sh <in.html> <out.html>
set -e
D=$(cd "$(dirname "$0")" && pwd); T=$(mktemp -d)
python3 "$D/01_pipelayer_prefill.py" "$1" "$T/1.html"
python3 "$D/02_job_fold_import_small.py" "$T/1.html" "$T/2.html"
python3 "$D/03_pipe_folds.py" "$T/2.html" "$T/3.html"
python3 "$D/04_same_pipe_chip.py" "$T/3.html" "$2"
rm -rf "$T"
