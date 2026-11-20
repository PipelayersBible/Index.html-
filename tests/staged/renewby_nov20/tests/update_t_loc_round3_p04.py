#!/usr/bin/env python3
# renewby_nov20: locate_round3_nov20/tests/t_loc_round3.js pins the two Renew-by tables; p04 adds CT IL MO NC NM and SC.
#   python3 update_t_loc_round3_p04.py <t_loc_round3.js in> <out>
import sys
s = open(sys.argv[1], encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:60])
    s = s.replace(a, b)
rep("tb.rb==='AL2 AR2 AZ2 CO2 DC3 GA3 IA2 ID2 IN2 KY2 LA3 MA3 MD3 ME3 MI3 MN2 MS3 NH3 NJ3 OK4 OR2 TN3 TX2 UT2 VA3 VT3 WA2 WV2'",
    "tb.rb==='AL2 AR2 AZ2 CO2 CT2 DC3 GA3 IA2 ID2 IL2 IN2 KY2 LA3 MA3 MD3 ME3 MI3 MN2 MO2 MS3 NC3 NH3 NJ3 NM2 OK4 OR2 TN3 TX2 UT2 VA3 VT3 WA2 WV2'")
rep("tb.rb0==='CA HI NV'", "tb.rb0==='CA HI NV SC'")
open(sys.argv[2], 'w', encoding='utf-8').write(s)
print('ok')
