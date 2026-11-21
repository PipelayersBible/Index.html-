# state_audit_nov21/safety p4: toolbox talks and the talk schedule.
# python3 p4_talks.py in.html out.html   (applies alone on r17.13)
#  (a) Talk schedule: one line under "Every week / Every 2 weeks": Washington needs weekly (WAC 296-155-110(5)(a));
#      California every 10 working days (8 CCR 1509(e)). "Every 2 weeks" on a Washington job is not enough.
#  (b) TT-050 First Aid: Washington foremen / crew leaders need a first-aid card (WAC 296-155-120(2)); California posts
#      emergency numbers at the job (8 CCR 1512(e)).
#  (c) TT-013 Utility Strike: reference 49 CFR 196.109 (gas or hazardous liquid released by excavation damage: the
#      excavator calls 911), read Nov 20 2026 https://www.law.cornell.edu/cfr/text/49/196.109
#  (d) TT-031 / TT-033: Subpart G is now only 1926.200 and 1926.201 (lib_traffic_nov20 finding 1, eCFR).
#  (e) TT-032 Flagging: MUTCD 6C.05 says flaggers should wear Class 3 at night (lib_traffic_nov20 finding 2); state card
#      rules are in Rules for your state (patch p3) — the line does not depend on p3 being applied.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
# (a)
p.rep('''<option value="2"' + (p.every === 2 ? ' selected' : '') + '>Every 2 weeks</option></select></div>';''',
      '''<option value="2"' + (p.every === 2 ? ' selected' : '') + '>Every 2 weeks</option></select></div>'
      + '<p class="pb-tt-rule" id="ttEveryRule">State rules: Washington, at least weekly (WAC 296-155-110). California, at least every 10 working days (8 CCR 1509).</p>'; /* state_audit_nov21/safety */''')
p.rep('''.pb-inj strong { display: block; }''', '''.pb-inj strong { display: block; }
#pbApp .pb-tt-rule { font-size: 12px; color: var(--ink-soft); margin: 4px 0 10px; line-height: 1.4; }''')
# (b)
p.rep('''"Know where the nearest emergency room is and the fastest route."''',
      '''"Know where the nearest emergency room is and the fastest route.","State rules: in Washington every foreman or crew leader needs a valid first-aid card (WAC 296-155-120). In California the doctor, hospital, ambulance and fire numbers are posted at the job (8 CCR 1512)."''')
p.rep('''"29 CFR 1926.50 (medical services and first aid)",''',
      '''"29 CFR 1926.50 (medical services and first aid)","Washington WAC 296-155-120; California Title 8 CCR 1512",''')
# (c)
p.rep('''"Local utility emergency procedures",''', '''"Local utility emergency procedures","49 CFR 196.109 (gas or hazardous liquid escaping after excavation damage: the excavator calls 911)",''')
# (d)
p.rep('''"29 CFR 1926.200-203 (Subpart G signs, signals and barricades)"''', '''"29 CFR 1926.200(g) and 1926.201(a) (Subpart G signs, signals and barricades)"''')
p.rep('''"29 CFR 1926.200-203 (Subpart G)"''', '''"29 CFR 1926.200(g) and 1926.201(a) (Subpart G)"''')
# (e)
p.rep('''day and night. Consider Class 3 at night."''', '''day and night. Class 3 at night (MUTCD 6C.05)."''')
p.rep('''"Only trained flaggers on our jobs. The MUTCD calls for flagger training, and many states require certification."''',
      '''"Only trained flaggers on our jobs. The MUTCD calls for flagger training, and many states require certification. Washington (all flagging) and Oregon (public roads): every flagger carries a current card."''')
p.save()
