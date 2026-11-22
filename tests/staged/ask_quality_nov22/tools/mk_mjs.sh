#!/bin/bash
# mk_mjs.sh <src dir> <out dir>: the build's own search code as ES modules for the free retrieval check (esbuild, same as prior helpers).
set -e; S=$1; O=$2; mkdir -p $O
esbuild $S/_shared/retrieval.ts --bundle --format=esm --log-level=warning > $O/retrieval.mjs
esbuild $S/state.ts --format=esm --log-level=warning > $O/state.mjs
esbuild $S/route.ts --format=esm --log-level=warning > $O/route.mjs
