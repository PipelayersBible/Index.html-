#!/bin/sh
# build the pages the tests use: mk.sh <serve dir>  ->  base.html, cur.html and hk/{cur,base}.html (with the audit hooks)
set -e
R="$(cd "$(dirname "$0")/../../../.." && pwd)"; W="$1"; mkdir -p "$W/hk"
cp "$R/_src/index.html" "$W/base.html"
sh "$R/tests/staged/permit_short_nov19/patches/apply_all.sh" "$R/_src/index.html" "$W/cur.html"
node -e "const {addHooks}=require('$R/tests/runner/hooks.js');const fs=require('fs');for(const n of ['cur','base']){const r=addHooks(fs.readFileSync('$W/'+n+'.html','utf8'));if(r.warnings.length)console.log(r.warnings);fs.writeFileSync('$W/hk/'+n+'.html',r.html);}"
