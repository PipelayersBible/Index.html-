import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# beta audit 04: when the beta ends, the COMPANY ACCOUNT (the beta owner, often a superintendent) read the crew's words:
# "New runs and reports stop sending to your company in 2 days unless it starts a plan" with a "My Own Plan" button.
# He is the company: an individual plan for him means nothing (his account stays the company's), and the line should say
# that his crew's work stops reaching him. The company account now reads its own words and gets one button, Start
# Company Plan (the same pb_plan_request 'company' the crew's Company Plan sends).
rep("""            const own = plan.individual ? '<span>You have an individual plan.</span>'""",
    """            const office = !!(sbCachedSubscription && sbCachedSubscription.companyRole === 'Company account'); /* beta audit 04: the company account itself */
            const whatOffice = plan.closed || !graceLeft ? 'Your records stay in your account. Your crew\\u2019s new runs and reports wait on their phones and come in once you start a plan.'
              : 'Your crew\\u2019s new runs and reports stop reaching you in ' + (graceLeft === 1 ? '1 day' : graceLeft + ' days') + ' unless you start a plan. Nothing is deleted.';
            const own = office ? (plan.requested ? '<span>Request sent. You\\u2019ll be contacted to set it up.</span>' : '<span class="pb-beta-acts"><button type="button" class="pb-btn small" data-plan="company">Start Company Plan</button></span>')
              : plan.individual ? '<span>You have an individual plan.</span>'""")
rep("""            line.innerHTML = '<span class="pb-beta-chip">Beta ended</span><span>' + what + '</span>' + own;""",
    """            line.innerHTML = '<span class="pb-beta-chip">Beta ended</span><span>' + (office ? whatOffice : what) + '</span>' + own;""")
open(out, 'w', encoding='utf-8').write(s)
