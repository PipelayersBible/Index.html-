#!/bin/sh
# esbuild copies of the search code the next build runs (from the source tree given, default /home/claude/ask_v24/src)
SRC=${1:-/home/claude/ask_v24/src}; cd "$(dirname "$0")/.."
esbuild $SRC/_shared/retrieval.ts --bundle --format=esm --outfile=work/retrieval.mjs --log-level=warning
esbuild $SRC/state.ts --format=esm --outfile=work/state.mjs --log-level=warning
