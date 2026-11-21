# state_audit_nov21/811 patch 5: the 811 dates use where the phone is before falling back to California.
# Tommy's rule: the job's state first, then the company's state, then the phone's location. pbSrJob (811 dates, the
# Locates header, the injury line, the confined space rule state) skipped the phone's location and went straight to
# its California default, so a Texas crew with no state on the job and no company state got California's dates.
# python3 p5_state_phone_location.py in.html out.html   Applies alone on r17.13 or stacked with p1..p4.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""    const c = pbSrCompany(uid); if (c) return { code: c, how: 'company' };
    return { code: 'CA', how: 'default' };""", """    const c = pbSrCompany(uid); if (c) return { code: c, how: 'company' };
    try { const h = typeof window.pbHereState === 'function' ? window.pbHereState() : null; if (pbSrOk(h)) return { code: h, how: 'here' }; } catch (e) {} /* state_audit_nov21/811: then where the phone is */
    return { code: 'CA', how: 'default' };""")
p.rep("""company: 'the company’s state', default: 'no state in the job address' };""", """company: 'the company’s state', here: 'where this phone is', default: 'no state in the job address' };""")
# the Taper calculator's own label: a phone-location answer is not "the job"
p.rep("""return { code: x.code, how: x.how === 'company' ? 'company' : 'job' }; }""", """return { code: x.code, how: x.how === 'company' ? 'company' : x.how === 'here' ? 'here' : 'job' }; }""")
p.save()
print('p5 ok')
