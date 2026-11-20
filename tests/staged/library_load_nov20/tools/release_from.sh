#!/bin/bash
# release_from.sh <src dir> "<label>" : release.sh (ask_boot) steps, but built from the given source tree (does not touch /home/claude/ask_v24/src)
set -e
SRC=$(cd "$1" && pwd)
esbuild $SRC/index.ts --bundle --format=cjs --minify --platform=neutral --external:'jsr:*' --external:'npm:*' --define:PB_BUILD=\"$(date -u +%m%d-%H%M)\" --outfile=/tmp/claude-0/cjs_lib.js --log-level=warning
SHA=$(python3 /home/claude/ask_boot/seal.py /tmp/claude-0/cjs_lib.js /tmp/claude-0/askb_lib.txt)
cd /home/claude/index.html-
git pull -q 2>/dev/null || true
F=data/ask/b-${SHA:0:12}.txt
cp /tmp/claude-0/askb_lib.txt $F
git add $F
git -c user.name="Tommy Fontaine" -c user.email="tfontaine@digcivil.com" commit -qm "Ask server build ${SHA:0:12} (sealed): $2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012AuVFXAKJtbd3q3yBau6Wi" -- $F
git push -q 2>&1 | grep -v -i "moved\|github.com/Pipe" || true
C=$(git rev-parse HEAD)
echo "URL=https://raw.githubusercontent.com/PipelayersBible/Index.html-/$C/$F"
echo "SHA=$SHA"
