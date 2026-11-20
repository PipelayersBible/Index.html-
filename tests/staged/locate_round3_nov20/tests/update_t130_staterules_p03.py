#!/usr/bin/env python3
# locate_round3_nov20: tests/r1706/staterules/tests/t130_staterules.js used Arkansas as its "nothing confirmed" state.
# Arkansas now has a notice wait and a ticket life (p03), so those checks move to Pennsylvania (still not confirmed).
# Run AFTER locate_form_nov20/tests/update_t130_staterules.py:
#   python3 update_t130_staterules_p03.py <t130_staterules.js in> <out>
import sys
s = open(sys.argv[1], encoding='utf-8').read()
n = s.count("'AR'") + s.count('Arkansas') + s.count('AR: ')
assert s.count("'AR'") == 3 and s.count('Arkansas') >= 4 and 'Pennsylvania' not in s, (s.count("'AR'"), s.count('Arkansas'))
s = s.replace("'AR'", "'PA'").replace('Arkansas', 'Pennsylvania').replace('AR: ', 'PA: ')
open(sys.argv[2], 'w', encoding='utf-8').write(s)
print('ok', n)
