#!/bin/sh
# From r17.08 the published page is BUILT. The master source is _src/index.html (Jekyll skips folders starting with "_",
# so it is not published). Patch and test _src/index.html; at release, run this to write the published files:
#   index.html (minified, no renaming), pbx/ (pdf.js + jsPDF parts, fingerprinted names)
# sw.js is not built: edit it in place (bump PB_SW_BUILD with PB_APP_BUILD in _src/index.html).
# Publish index.html + pbx/ + sw.js in ONE commit. Needs esbuild (PATH, ~/.npm-global/bin, or $ESBUILD) and node.
# Usage: tests/release_build.sh [--hooks <out dir>]   (--hooks: a test build with the runner hooks, for run_all.sh)
set -e
REPO=$(cd "$(dirname "$0")/.." && pwd)
B="$REPO/tests/r1708/speed2/build/build.py"
if [ "$1" = "--hooks" ]; then
  OUT=$2; mkdir -p "$OUT"
  for n in $(ls -A "$REPO"); do case $n in tests|.*|_src|node_modules|index.html|pbx) ;; *) cp -r "$REPO/$n" "$OUT/";; esac; done
  python3 "$B" "$REPO/_src/index.html" "$OUT" --hooks
else
  rm -rf "$REPO/pbx"
  python3 "$B" "$REPO/_src/index.html" "$REPO"
fi
