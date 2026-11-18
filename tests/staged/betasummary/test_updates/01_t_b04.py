import sys
# t_b04_ownerended: the company account's ended-beta line now also has the Beta Results button (staged betasummary).
# Same check as before (one plan button: Start Company Plan), with Beta Results allowed beside it.
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
old = "btns.join()==='Start Company Plan'"
new = "btns.filter(x=>x!=='Beta Results').join()==='Start Company Plan'"
assert s.count(old) == 1, s.count(old); s = s.replace(old, new)
open(p, 'w', encoding='utf-8').write(s); print('ok', p)
