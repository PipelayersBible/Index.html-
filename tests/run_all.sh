#!/bin/sh
# One command for the whole browser test suite. Options: --build FILE --base FILE --only REGEX --suite a,b --jobs N
# --timeout SECS --update-golden --keep --list. See README_RUN.md.
exec node "$(dirname "$0")/runner/run_all.js" "$@"
