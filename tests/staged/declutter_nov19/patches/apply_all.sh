#!/bin/sh
# Apply the declutter patches in order: sh apply_all.sh in.html out.html
set -e
D=$(cd "$(dirname "$0")" && pwd); T=$(mktemp -d); cp "$1" "$T/0.html"; i=0
for p in "$D"/0[1-9]_*.py; do n=$((i+1)); python3 "$p" "$T/$i.html" "$T/$n.html"; echo "applied $(basename "$p")"; i=$n; done
cp "$T/$i.html" "$2"; rm -rf "$T"
