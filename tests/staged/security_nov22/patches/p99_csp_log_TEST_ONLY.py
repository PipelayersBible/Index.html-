# TEST BUILD ONLY (never publish): logs every CSP violation to the console as "CSP-VIOLATION <directive> <blocked> <source>"
# and keeps them in window.__cspV, so the regression logs and the CSP smoke test can see them.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import rep
s = open(sys.argv[1], encoding='utf-8').read()
s = rep(s, '<title>The Pipelayer', '<script>window.__cspV=[];document.addEventListener("securitypolicyviolation",function(e){var t=e.effectiveDirective+" "+e.blockedURI+" "+(e.sourceFile||"")+":"+(e.lineNumber||"");window.__cspV.push(t);console.error("CSP-VIOLATION "+t);});</script>\n<title>The Pipelayer', 'title')
open(sys.argv[2], 'w', encoding='utf-8').write(s)
print('p99 ok')
