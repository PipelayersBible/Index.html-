#!/bin/sh
# apply the permit_short patches in order: apply_all.sh in.html out.html
set -e
D="$(cd "$(dirname "$0")" && pwd)"; T="$(mktemp)"
python3 "$D/01_permit_form_short.py" "$1" "$T"
python3 "$D/02_permit_records_pdf.py" "$T" "$2"
rm -f "$T"
