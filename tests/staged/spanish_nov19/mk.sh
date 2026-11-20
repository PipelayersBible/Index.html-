#!/bin/sh
# build the dictionary and the test page: sh mk.sh  (writes /tmp/claude-0/es19/site/cur.html)
set -e
cd "$(dirname "$0")"
python3 build.py
python3 patches/01_spanish.py ../../../_src/index.html /tmp/claude-0/es19/site/cur.html
