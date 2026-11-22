#!/bin/sh
# make_src.sh <out dir>: the new Ask build source = live build 1b8514750e72's source (ask_quality_nov22/work/src_q, verified: its
# esbuild with PB_BUILD "1122-0504" has sha256 1b8514750e72...) + emergency_nov22.diff. Checks emergency.ts = src_patch/emergency.ts.
set -e
D=$(cd "$(dirname "$0")" && pwd); O=$1
[ -n "$O" ] || { echo "usage: make_src.sh <out dir>"; exit 1; }
rm -rf "$O"; cp -r "$D/../../ask_quality_nov22/work/src_q" "$O"
(cd "$O" && patch -p1 -s < "$D/emergency_nov22.diff")
cmp "$O/emergency.ts" "$D/emergency.ts"
echo "source ready: $O"
