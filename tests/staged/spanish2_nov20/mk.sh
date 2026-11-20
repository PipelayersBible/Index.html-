#!/bin/sh
# build the dictionary and the test pages: sh mk.sh
#   /tmp/claude-0/es20/site/cur.html     Spanish offered (PB_ES_ENABLED=1), what the Spanish tests use
#   /tmp/claude-0/es20/site/hidden.html  as it ships this week (PB_ES_ENABLED=False)
#   /tmp/claude-0/es20/site/base.html    unpatched r17.10
set -e
cd "$(dirname "$0")"
S=/tmp/claude-0/es20/site; mkdir -p $S
python3 build.py
PB_ES_ENABLED=1 python3 patches/01_spanish.py ../../../_src/index.html $S/cur.html
python3 patches/01_spanish.py ../../../_src/index.html $S/hidden.html
cp ../../../_src/index.html $S/base.html
cp ../../../terms.html ../../../privacy.html $S/ 2>/dev/null || true
cp terms_es.html privacy_es.html $S/ 2>/dev/null || true
PB_ES_REVIEW_LINK=0 python3 patches/01_spanish.py ../../../_src/index.html $S/nolink.html
