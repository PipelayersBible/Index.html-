import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
old = "reverse?format=jsonv2&zoom=18&addressdetails=1&lat=' + f.lat.toFixed(6) + '&lon=' + f.lng.toFixed(6)"
new = "reverse?format=jsonv2&zoom=18&addressdetails=1&lat=' + f.lat.toFixed(4) + '&lon=' + f.lng.toFixed(4) /* r16.77 (privacy): about 35 ft, not the exact spot */"
assert s.count(old) == 1
s = s.replace(old, new)
open(out, 'w', encoding='utf-8').write(s); print('ok')
