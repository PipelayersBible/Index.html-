import sys
s=open(sys.argv[1],encoding='utf-8').read()
old="  let runArchive = [];\n"
assert s.count(old)==1
s=s.replace(old,old+"  window.__dEval = (x) => eval(x); // AUDIT TEST HOOK ONLY\n")
open(sys.argv[2],'w',encoding='utf-8').write(s)
