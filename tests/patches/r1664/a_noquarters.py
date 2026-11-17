import sys
s=open(sys.argv[1]).read()
a="""        if (Math.max(w, h) > maxPx * 1.25) {
          const tw = Math.round(w * 0.55), th = Math.round(h * 0.55);"""
b="""        if (false && Math.max(w, h) > maxPx * 1.25) { /* r16.64: no close-up quarters (same accuracy in the stake eval, faster and cheaper) */
          const tw = Math.round(w * 0.55), th = Math.round(h * 0.55);"""
assert s.count(a)==1; s=s.replace(a,b)
open(sys.argv[2],'w').write(s)
