#!/bin/sh
# usage: mkcur.sh in.html out.html  -> adds the test eval hook
python3 - "$1" "$2" <<'PY'
import sys
s=open(sys.argv[1]).read()
a='  function elevOutOfRange(val) {'
assert s.count(a)==1
open(sys.argv[2],'w').write(s.replace(a,'  window.__ev = function (__s) { return eval(__s); };\n'+a))
PY
