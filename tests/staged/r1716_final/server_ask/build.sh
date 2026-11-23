#!/bin/sh
# r1716_final server_ask/build.sh: the Ask server build that matches the r17.16 app's emergency text (NOT installed).
# Same steps as emergency_nov22/build/build.sh (make_src.sh = live src_q + emergency_nov22.diff, which now carries the
# "(often hydrogen sulfide, H2S)" / "(casi siempre ácido sulfhídrico, H2S)" words; esbuild cjs minify neutral; sealed with
# /home/claude/ask_boot/seal.py), but writes here so emergency_nov22/build/b-cdddf51b34db.txt (the build now live) stays.
set -e
D=$(cd "$(dirname "$0")" && pwd); E=$D/../../emergency_nov22; W=$D/../work/server_ask; mkdir -p $W
sh $E/src_patch/make_src.sh $W/build_src >/dev/null
esbuild $W/build_src/index.ts --bundle --format=cjs --minify --platform=neutral --external:'jsr:*' --external:'npm:*' --define:PB_BUILD=\"1123-h2s1\" --outfile=$W/cjs.js --log-level=warning
SHA=$(python3 /home/claude/ask_boot/seal.py $W/cjs.js $W/askb.txt)
rm -f $D/b-*.txt; cp $W/askb.txt $D/b-$(echo $SHA | cut -c1-12).txt
echo "$SHA" > $D/SHA256
echo "SHA=$SHA  file=server_ask/b-$(echo $SHA | cut -c1-12).txt"
