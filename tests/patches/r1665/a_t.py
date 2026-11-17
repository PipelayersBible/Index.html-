import sys
s=open(sys.argv[1]).read()
a="""    if (/\\bTEE\\b/.test(d) || (/(?:^|\\s)T(?=\\s|$)/.test(d) && (sz || lat || /^T$/.test(bare)))) return { type: 'tee', info: info(latI, sz, tTag) };"""
b="""    if (/\\bTEE\\b/.test(d) || (/(?:^|\\s)T(?=\\s|$)/.test(d) && (sz || lat || /^T$/.test(bare))) || /(?:^|[^A-Z\\/])T(?![A-Z\\/0-9]|-\\d|\\s?\\d+\\.\\d)/.test(d)) return { type: 'tee', /* r16.65: T = tee: 8X6T, 6"T, T-LAT, (T), SS T; not T/C, TW, T-1, T 104.25 */ info: info(latI, sz, tTag) };"""
assert s.count(a)==1, s.count(a); s=s.replace(a,b)
open(sys.argv[2],'w').write(s)
