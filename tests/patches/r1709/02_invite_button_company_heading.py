#!/usr/bin/env python3
# r17.09 (Tommy, Nov 19): Crew members screen: the big button says "Invite Crew Member"; the list heading says "Your company".
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)
rep('<use href="#pb-i-plus"/></svg>Add Crew Member</button>', '<use href="#pb-i-plus"/></svg>Invite Crew Member</button>')
rep('<h2 class="pb-h2 pbc-h2" id="crListHead">Your crew</h2>', '<h2 class="pb-h2 pbc-h2" id="crListHead">Your company</h2>')
open(out, 'w', encoding='utf-8').write(s); print('ok')
