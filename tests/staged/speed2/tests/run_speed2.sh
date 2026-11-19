#!/bin/sh
# speed2 tests. Usage: run_speed2.sh <site folder: index.html (+ pbx/) + sw.js> <r17.04 index.html> <r17.04 sw.js> <out dir> [port]
# Serves the site on 127.0.0.1:<port> (default 8871; the hooked page as /hk/cur.html, r17.04 as /hk/base.html, same
# origin = same phone storage) and runs the photo tests (p*), the room warning test and the worker tests (s*).
# HTTPS tests use ports 8874/8875. Needs NODE_PATH=/opt/npm-tools/node_modules.
H=$(cd "$(dirname "$0")" && pwd); SITE=$1; BASE=$2; BASESW=$3; OUT=$4; PORT=${5:-8871}
mkdir -p "$OUT"; export NODE_PATH=${NODE_PATH:-/opt/npm-tools/node_modules}
OLD="$OUT/oldsite"; mkdir -p "$OLD"; cp "$BASE" "$OLD/index.html"; cp "$BASESW" "$OLD/sw.js"
SW="$SITE/sw.js" BASE="$BASE" node "$H/mksite.js" "$SITE/index.html" "$OUT/served" "$PORT" > "$OUT/server.log" 2>&1 &
SRV=$!; sleep 3
export PB_ROOT="http://127.0.0.1:$PORT/hk/" PB_SITE="$OUT/served/hk" PB_OUT="$OUT"
fail=0
for t in p01_migrate p02_kill p03_quota p04_outputs p05_gc_tabs p07_rollback_damage p08_clear p09_room_warning; do
  timeout 900 node "$H/$t.js" > "$OUT/$t.log" 2>&1; r=$?; echo "$t: $(tail -1 "$OUT/$t.log") (exit $r)"; [ $r -ne 0 ] && fail=1
done
SITE_SRC="$SITE" timeout 900 node "$H/s01_sw_shell.js" > "$OUT/s01_sw_shell.log" 2>&1; r=$?; echo "s01_sw_shell: $(tail -1 "$OUT/s01_sw_shell.log") (exit $r)"; [ $r -ne 0 ] && fail=1
OLD_SITE="$OLD" NEW_SITE="$SITE" timeout 600 node "$H/s02_sw_upgrade.js" > "$OUT/s02_sw_upgrade.log" 2>&1; r=$?; echo "s02_sw_upgrade: $(tail -1 "$OUT/s02_sw_upgrade.log") (exit $r)"; [ $r -ne 0 ] && fail=1
kill $SRV 2>/dev/null
exit $fail
