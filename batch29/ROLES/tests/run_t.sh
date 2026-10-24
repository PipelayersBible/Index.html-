#!/bin/bash
# usage (inside the lock): tests/run_t.sh SITE_DIR TEST.js [port]  -> waits for >= 2 GB free, then one run
SITE=$1; T=$2; PORT=${3:-8851}
while [ "$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)" -lt 2048 ]; do sleep 5; done
cd /home/claude/test; PB_TEST_DIR=$SITE PB_TEST_PORT=$PORT timeout 900 ./run.sh $T 800
