import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# beta audit 02: on a BETA company Crew members said "N members (your plan includes 5)" (the server's paid-plan number,
# pb_crew.seats_included() = 5) while the beta allows the company account plus 6 people (trial_limits().seats = 7, the
# guard counts members). A super adding his 6th person read that he was over his plan. A beta company now reads
# "N of 6 people in the beta" from the plan the app already has (pb_my_plan limits).
rep("""    pbCmEl('crSeats').textContent = seats == null ? '' : seats + ' member' + (seats === 1 ? '' : 's') + (inc != null ? ' (your plan includes ' + inc + ')' : '');""",
    """    const bp = typeof window.pbPlanNow === 'function' ? window.pbPlanNow() : null, bSeats = bp && bp.plan === 'trial' && bp.limits && Number.isFinite(+bp.limits.seats) ? +bp.limits.seats - 1 : null; /* beta audit 02: the beta's own number */
    pbCmEl('crSeats').textContent = seats == null ? '' : bSeats != null ? seats + ' of ' + bSeats + ' people in the beta (plus the company account)' : seats + ' member' + (seats === 1 ? '' : 's') + (inc != null ? ' (your plan includes ' + inc + ')' : '');""")
open(out, 'w', encoding='utf-8').write(s)
