# billing_nov22 b3: words.
#  #25  AI allowances reset at midnight UTC (4 PM Pacific in winter): say the real time on this phone, not "tomorrow" / "on the 1st".
#  #26  "Contractor plan" -> "Company plan" everywhere a person reads it.
#  #16  an individual whose plan lapsed (server: individual_state 'lapsed') gets the plan screens closed and "payment due" on the account line.
# usage: python3 b3_words.py in.html out.html
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()

# ---- #25 ----
p.rep("""  async function pbAiWhyMsg(feature) { /* pricing_nov20: null when the server can't say (then the old one-line message is used) */""",
"""  /* billing_nov22 #25: the server's AI day and month start at midnight UTC (4 PM Pacific in winter, 5 PM in summer). Say it in this phone's time. */
  function pbAiResetTxt(month) {
    try {
      const n = new Date(), r = month ? new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1)) : new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1));
      const t = r.toLocaleTimeString('en-US', r.getMinutes() ? { hour: 'numeric', minute: '2-digit' } : { hour: 'numeric' });
      const sameDay = r.getFullYear() === n.getFullYear() && r.getMonth() === n.getMonth() && r.getDate() === n.getDate();
      const tmr = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1), isTmr = r.getFullYear() === tmr.getFullYear() && r.getMonth() === tmr.getMonth() && r.getDate() === tmr.getDate();
      if (!month) return 'It resets at ' + t + (sameDay ? ' today' : isTmr ? ' tomorrow' : '') + '.';
      return 'It resets ' + (sameDay ? 'today' : isTmr ? 'tomorrow' : r.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) + ' at ' + t + '.';
    } catch (e) { return month ? 'It resets at the start of next month.' : 'It resets later today or tomorrow.'; }
  }
  window.pbAiResetTxt = pbAiResetTxt;
  async function pbAiWhyMsg(feature) { /* pricing_nov20: null when the server can't say (then the old one-line message is used) */""")
p.rep("""      const m = w === 'feature_day' ? 'You\\u2019ve used today\\u2019s limit for this. It resets tomorrow.'
        : w === 'person_day' ? 'You\\u2019ve used today\\u2019s ' + n(d.day) + 'AI requests. It resets tomorrow.' + (d.who === 'owner' ? ' The company account has a small allowance. People on your plan have more.' : '')
        : w === 'person_month' ? 'You\\u2019ve used this month\\u2019s ' + n(d.month) + 'AI requests. It resets on the 1st.'
        : w === 'company_day' ? 'Your company has used today\\u2019s ' + n(d.company_day) + 'AI requests. It resets tomorrow.'
        : w === 'company_month' ? 'Your company has used this month\\u2019s ' + n(d.company_month) + 'AI requests. It resets on the 1st.'
        : w === 'budget' ? 'This month\\u2019s AI allowance is used up. It resets on the 1st. Everything else still works.'""",
"""      const m = w === 'feature_day' ? 'You\\u2019ve used today\\u2019s limit for this. ' + pbAiResetTxt(false)
        : w === 'person_day' ? 'You\\u2019ve used today\\u2019s ' + n(d.day) + 'AI requests. ' + pbAiResetTxt(false) + (d.who === 'owner' ? ' The company account has a small allowance. People on your plan have more.' : '')
        : w === 'person_month' ? 'You\\u2019ve used this month\\u2019s ' + n(d.month) + 'AI requests. ' + pbAiResetTxt(true)
        : w === 'company_day' ? 'Your company has used today\\u2019s ' + n(d.company_day) + 'AI requests. ' + pbAiResetTxt(false)
        : w === 'company_month' ? 'Your company has used this month\\u2019s ' + n(d.company_month) + 'AI requests. ' + pbAiResetTxt(true)
        : w === 'budget' ? 'This month\\u2019s AI allowance is used up. ' + pbAiResetTxt(true) + ' Everything else still works.'""")
p.rep("""    daily: () => 'You’ve hit today’s limit. It resets tomorrow. Emergency? Call 911.', // v20: one line, whichever allowance ran out""",
"""    daily: () => 'You’ve hit today’s limit. ' + pbAiResetTxt(false) + ' Emergency? Call 911.', // v20: one line, whichever allowance ran out; billing_nov22 #25""")

# ---- #26 ----
p.rep("""    plan: 'AI is part of the paid plans (Individual or Contractor). Your plan on this phone doesn’t include it. Emergency? Call 911.',""",
"""    plan: 'AI is part of the paid plans (Individual or Company). Your plan on this phone doesn’t include it. Emergency? Call 911.',""")
# the same English is a key of the Spanish dictionary (pbI18nDict): both change, and the Spanish says "plan de compañía"
p.rep("on the Contractor plan", "on the Company plan", 2)
p.rep("(Contractor plan)", "(Company plan)", 5)
p.rep("plan Contractor", "plan de compañía", 3)
p.rep('"Plan: Contractor (active)":"Plan: Contractor (activo)"', '"Plan: Company (active)":"Plan: Compañía (activo)"')
p.rep("""    const tierName = s.tier === 'contractor' ? 'Contractor' : s.tier === 'individual' ? 'Individual' : '';""",
      """    const tierName = s.tier === 'contractor' ? 'Company' : s.tier === 'individual' ? 'Individual' : ''; /* billing_nov22 #26 */""")
p.rep("""    const tierNeeded = PB_CONTRACTOR_SCREENS.includes(name) ? 'Contractor' : 'Individual';
    const current = sbCachedSubscription.tier === 'none' ? 'no active subscription' : (sbCachedSubscription.tier + ' (' + sbCachedSubscription.status + ')');
    pbAlert('This requires an active ' + tierNeeded + ' subscription. Your current status: ' + current + '.', 'Subscription Required');""",
"""    const tierNeeded = PB_CONTRACTOR_SCREENS.includes(name) ? 'Company' : 'Individual'; /* billing_nov22 #26 */
    const current = sbCachedSubscription.tier === 'none' ? 'no active plan' : (pbTierName(sbCachedSubscription.tier) + ' (' + (sbCachedSubscription.status === 'active' ? 'active' : sbCachedSubscription.status === 'past_due' ? 'payment due' : sbCachedSubscription.status) + ')');
    pbAlert('This needs an active ' + tierNeeded + ' plan. Yours: ' + current + '.', 'Plan Needed');""")
p.rep("""  function pbTierMeetsRequirement(requiredTier) {""",
"""  const pbTierName = (t) => (t === 'contractor' ? 'Company plan' : t === 'individual' ? 'Individual plan' : String(t || 'no') + ' plan'); /* billing_nov22 #26: never "contractor" on screen */
  function pbTierMeetsRequirement(requiredTier) {""")
p.rep("""      else if (sbCachedSubscription.tier === 'none' || sbCachedSubscription.status !== 'active') { el.textContent = 'Signed in as ' + sbUser.email + ' \\u2014 no active subscription'; }
      else { el.textContent = 'Signed in as ' + sbUser.email + ' \\u2014 ' + sbCachedSubscription.tier + ' plan (active)'; }""",
"""      else if (sbCachedSubscription.tier === 'individual' && sbCachedSubscription.status === 'past_due') { el.textContent = 'Signed in as ' + sbUser.email + ' \\u2014 Individual plan (payment due)'; } /* billing_nov22 #16 */
      else if (sbCachedSubscription.tier === 'none' || sbCachedSubscription.status !== 'active') { el.textContent = 'Signed in as ' + sbUser.email + ' \\u2014 no active plan'; }
      else { el.textContent = 'Signed in as ' + sbUser.email + ' \\u2014 ' + pbTierName(sbCachedSubscription.tier) + ' (active)'; }""")

# ---- #16: a lapsed individual plan closes the plan screens (the server already stops its AI) ----
p.rep("""    // Another account signed in while this was waiting — this answer is not theirs.
    if (!sbUser || sbUser.id !== user.id) return;
    sbCachedSubscription = result;""",
"""    /* billing_nov22 #16: the subscriptions row stays 'active' until Tommy turns it off; the plan (pb_my_plan) knows the payment lapsed */
    try { const pl = typeof window.pbPlanNow === 'function' ? window.pbPlanNow() : null;
      if (result.tier === 'individual' && result.status === 'active' && pl && pl.ok && pl.individual === false && pl.individual_state === 'lapsed') result.status = 'past_due'; } catch (e) {}
    // Another account signed in while this was waiting — this answer is not theirs.
    if (!sbUser || sbUser.id !== user.id) return;
    sbCachedSubscription = result;""")
p.rep("""        if (r && !r.error && r.data && r.data.ok) { plan = r.data; try { localStorage.setItem(planKey(), JSON.stringify(plan)); } catch (e) {} }""",
"""        if (r && !r.error && r.data && r.data.ok) { plan = r.data; try { localStorage.setItem(planKey(), JSON.stringify(plan)); } catch (e) {}
          try { const s = sbCachedSubscription, lap = plan.individual === false && plan.individual_state === 'lapsed'; /* billing_nov22 #16: open or close the plan screens */
            if (s && s.tier === 'individual' && ((lap && s.status === 'active') || (!lap && s.status === 'past_due')) && typeof pbRefreshSubscriptionCache === 'function') pbRefreshSubscriptionCache().then(() => { try { updateLoginStatusDisplay(); } catch (e) {} }); } catch (e) {} }""")
p.rep("""    return 'Locked — needs ' + (PB_CONTRACTOR_SCREENS.includes(d.gate) ? 'a Contractor' : 'an Individual') + ' subscription';""",
      """    return 'Locked — needs ' + (PB_CONTRACTOR_SCREENS.includes(d.gate) ? 'a Company' : 'an Individual') + ' plan'; /* billing_nov22 #26 */""")
p.save()
