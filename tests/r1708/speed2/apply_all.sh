#!/bin/sh
# speed2: apply the page patches (01-05) to a source index.html and the worker patch to sw.js, then build the page that
# is published. Usage: apply_all.sh <index.html> <sw.js> <out dir>
#   <out dir>/src/index.html  the patched one-file source (tests run against it too)
#   <out dir>/site/           what is published: index.html (built), pbx/ (lazily loaded parts), sw.js
set -e
H=$(cd "$(dirname "$0")" && pwd); IN=$1; SW=$2; OUT=$3
mkdir -p "$OUT/src" "$OUT/site"; T=$(mktemp -d)
cp "$IN" "$T/p0.html"; i=0
for p in 01_update_line 02_photo_store 03_photo_clear 04_records_room_warning 05_lazy_parts; do
  n=$((i+1)); python3 "$H/patches/$p.py" "$T/p$i.html" "$T/p$n.html" >/dev/null; i=$n
done
cp "$T/p$i.html" "$OUT/src/index.html"
python3 "$H/patches/SW_01_cache_first_shell.py" "$SW" "$OUT/site/sw.js" >/dev/null
node --check "$OUT/site/sw.js"
python3 "$H/build/build.py" "$OUT/src/index.html" "$OUT/site"
rm -rf "$T"; echo "done: $OUT/src/index.html (source), $OUT/site (publish)"
