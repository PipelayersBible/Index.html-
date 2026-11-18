import sys
s=open(sys.argv[1],encoding='utf-8').read()
a="  function numVal(id) {\n"
assert s.count(a)==1
s=s.replace(a,"  window.__dbg = (s) => eval(s);\n"+a)
open(sys.argv[2],'w',encoding='utf-8').write(s)
