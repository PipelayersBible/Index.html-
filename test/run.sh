#!/bin/bash
# usage: ./run.sh test.js [timeout-seconds]
# Serves /home/claude/test on localhost:$PORT for the duration of one test and
# returns THE TEST'S exit status (never the cleanup's).
#   97 = port already in use (refuses to test against a pre-existing server)
#   98 = test server failed to start
#  124 = test timed out
cd "${PB_TEST_DIR:-/home/claude/test}"
PORT=${PB_TEST_PORT:-8765}
if curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/" 2>/dev/null; then
  echo "RUNNER ERROR: port $PORT is already in use; refusing to test against a pre-existing server" >&2; exit 97
fi
python3 -m http.server "$PORT" >/tmp/http.log 2>&1 &
SP=$!
cleanup() { kill "$SP" 2>/dev/null; wait "$SP" 2>/dev/null; }
trap cleanup EXIT
trap 'cleanup; exit 130' INT TERM
up=0
for i in $(seq 1 50); do
  kill -0 "$SP" 2>/dev/null || break                     # server process died
  if [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 1 "http://localhost:$PORT/app.html")" = "200" ]; then up=1; break; fi
  sleep 0.1
done
if [ $up -ne 1 ]; then echo "RUNNER ERROR: test server failed to start on port $PORT" >&2; exit 98; fi
cd /home/claude/test
timeout "${2:-150}" node "$1" 2>&1
rc=$?
[ $rc -eq 124 ] && echo "RUNNER ERROR: test timed out after ${2:-150}s"
exit $rc
