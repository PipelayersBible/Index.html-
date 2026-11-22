#!/bin/sh
# firstweek_web_nov22: stack the app patches on a COPY of _src/index.html.  sh apply.sh <in.html> <out.html>
# 05b (72-hour join links) is a DECISION and is NOT in this stack; add it after 05 only with sql/DECISION_72h_links.sql.
set -e
D=$(dirname "$0")/patches; T=$(mktemp -d)
python3 $D/01_a2hs_ios26.py "$1" $T/1.html
python3 $D/02_trial_chip_crew_end.py $T/1.html $T/2.html
python3 $D/03_login_trial_link.py $T/2.html $T/3.html
python3 $D/04_in_use_msg.py $T/3.html $T/4.html
python3 $D/05_join_link_expired.py $T/4.html "$2"
rm -rf $T
