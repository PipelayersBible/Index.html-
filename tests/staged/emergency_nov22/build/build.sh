#!/bin/sh
# build.sh : the staged Ask server build (NOT installed). Source = src_patch/make_src.sh; bundle exactly like
# library_load_nov20/tools/release_from.sh (esbuild cjs, minify, neutral) with a fixed PB_BUILD so the sha256 is reproducible;
# sealed with /home/claude/ask_boot/seal.py (AES-GCM, the slot key). Prints the sha256 of the plain bundle (= the install hash).
set -e
D=$(cd "$(dirname "$0")/.." && pwd); W=$D/work
sh $D/src_patch/make_src.sh $W/build_src >/dev/null
esbuild $W/build_src/index.ts --bundle --format=cjs --minify --platform=neutral --external:'jsr:*' --external:'npm:*' --define:PB_BUILD=\"1122-emg1\" --outfile=$W/cjs_emg.js --log-level=warning
SHA=$(python3 /home/claude/ask_boot/seal.py $W/cjs_emg.js $W/askb_emg.txt)
rm -f $D/build/b-*.txt; cp $W/askb_emg.txt $D/build/b-$(echo $SHA | cut -c1-12).txt
echo "$SHA" > $D/build/SHA256
echo "SHA=$SHA  file=build/b-$(echo $SHA | cut -c1-12).txt"
