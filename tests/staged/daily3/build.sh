#!/bin/bash
# Builds r17.04 + the daily3 patches (patches/0*.py, in order) and syntax-checks the result.
# usage: tests/staged/daily3/build.sh OUTDIR
#   OUTDIR/site/index.html      the build with the repo's other files (give it to tests/run_all.sh --build)
#   OUTDIR/serve/hk/curT.html   the same with the runner's test hooks (serve OUTDIR/serve, PB_ROOT=http://127.0.0.1:PORT/hk/)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$HERE/../../.." && pwd)"; OUT="${1:-/tmp/claude-0/d3}"
SITE="$OUT/site"; HK="$OUT/serve/hk"
rm -rf "$SITE" "$OUT/serve"; mkdir -p "$SITE" "$HK"
for f in "$REPO"/*; do b=$(basename "$f"); [ "$b" = tests ] || [ "$b" = index.html ] || cp -r "$f" "$SITE/"; done
cp "$REPO/index.html" "$SITE/step0.html"; i=0
for p in "$HERE"/patches/0*.py; do n=$((i+1)); python3 "$p" "$SITE/step$i.html" "$SITE/step$n.html" >/dev/null; rm "$SITE/step$i.html"; i=$n; done
mv "$SITE/step$i.html" "$SITE/index.html"
python3 - "$SITE/index.html" "$OUT/main.js" <<'P'
import re,sys
s=open(sys.argv[1]).read(); b=max(re.findall(r'<script>(.*?)</script>', s, re.S), key=len); open(sys.argv[2],'w').write(b)
P
node --check "$OUT/main.js" && rm "$OUT/main.js"
for f in "$SITE"/*; do b=$(basename "$f"); [ "$b" = index.html ] || cp -r "$f" "$HK/"; done
NODE_PATH=/opt/npm-tools/node_modules node -e "const h=require('$REPO/tests/runner/hooks.js');const fs=require('fs');const r=h.addHooks(fs.readFileSync('$SITE/index.html','utf8'));if(r.warnings.length){console.log(r.warnings);process.exit(1);}fs.writeFileSync('$HK/curT.html',r.html);fs.writeFileSync('$HK/cur.html',r.html);"
echo "built $SITE/index.html (syntax ok) and $HK/curT.html"
