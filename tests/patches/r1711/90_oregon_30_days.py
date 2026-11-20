#!/usr/bin/env python3
# r17.11 (Nov 20): Oregon ticket life 45 -> 30 calendar days. Oregon 811's 2026 Addendum to the Oregon Standards Manual:
# changed "from 45 days to 30 days" (Jan 8 2026, OAR 952-001-0010(23)). Older copies still say 45; Tommy: early is better.
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
old = '"life":{"n":45,"unit":"cd","from":"call","text":"A ticket is good for 45 calendar days from the day it was sent in."},"renew":"Past 45 days, call in a new locate request."'
new = '"life":{"n":30,"unit":"cd","from":"call","text":"A ticket is good for 30 calendar days from the day it was sent in (Oregon changed this from 45 days on Jan 8, 2026)."},"renew":"Past 30 days, call in a new locate request."'
assert s.count(old) == 1, s.count(old)
s = s.replace(old, new)
open(out, 'w', encoding='utf-8').write(s); print('ok')
