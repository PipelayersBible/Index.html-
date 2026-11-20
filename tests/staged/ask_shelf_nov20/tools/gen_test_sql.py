# Rebuilds the first half of sql/02_test_rolled_back.sql (the copy of 01's DDL) after 01_kb_shelf.sql changes.
#   python3 tools/gen_test_sql.py
import os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sql')
s = open(os.path.join(H, '01_kb_shelf.sql')).read(); body = s[s.index('begin;') + 6:s.rindex('commit;')]
t = open(os.path.join(H, '02_test_rolled_back.sql')).read()
a = t.index('begin;\n') + 7; b = t.index("\n-- ---- the test: always ends in")
open(os.path.join(H, '02_test_rolled_back.sql'), 'w').write(t[:a] + body + t[b:])
print('02_test_rolled_back.sql rebuilt from 01_kb_shelf.sql')
