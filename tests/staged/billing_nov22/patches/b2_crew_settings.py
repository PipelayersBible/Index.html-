# billing_nov22 b2: Settings > Your plan box (filled by b1), Crew members uses the bill's numbers (#7), email invite refusals (#24),
# and the two messages that sent people to Settings for something that wasn't there (#23).
# usage: python3 b2_crew_settings.py in.html out.html
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()

p.rep("""      <div class="pb-tag" id="settingsCompanyLabel">Company</div>""",
"""      <div class="pb-tag" id="settingsCompanyLabel">Company</div>
      <div id="settingsYourPlan" class="pbx-name pbx-cotime" hidden></div><!-- billing_nov22 #23: the company account's own plan -->""")

# #24: the crew-admin function passes these codes through; the app has the words
p.rep("""    'pb:trial_seats': 'The beta includes the company account plus 6 people. Remove someone or wait for a pending invite to expire to add another.', /* r16.67 */""",
"""    'pb:trial_seats': 'The beta includes the company account plus 6 people. Remove someone or wait for a pending invite to expire to add another.', /* r16.67 */
    'pb:beta_ended': 'This company\\u2019s trial has ended, so no one new can join until it starts its plan. The company account starts it on its Home screen.', /* billing_nov22 #24 */
    'pb:read_only': 'This company\\u2019s plan is paused, so no one new can join right now. The company account can see why in Settings \\u203a Your plan.',""")

# #23: join refusals
p.rep("""    'pb:beta_ended': 'Your company’s beta has ended, so no one new can join. The company account can see the plan choices in Settings.',
    'pb:read_only': 'Your company’s account is read-only right now, so no one new can join. The company account can see why in Settings.',""",
"""    'pb:beta_ended': 'Your company’s trial has ended, so no one new can join. The company account can start the plan on its Home screen.', /* billing_nov22 #23 */
    'pb:read_only': 'Your company’s plan is paused right now, so no one new can join. The company account can see why in Settings › Your plan.',""")

# #7: Crew members counts people the way the bill does
p.rep("""    pbCmEl('crSeats').textContent = seats == null ? '' : bSeats != null ? seats + ' of ' + bSeats + ' people in the beta (plus the company account)' + pbCmPrice(seats, true) : seats + ' member' + (seats === 1 ? '' : 's') + (inc != null ? ' (your plan includes ' + inc + ')' : '') + pbCmPrice(seats, false);""",
"""    const bl = D && D.billing && typeof D.billing === 'object' ? D.billing : null; /* billing_nov22 #7: the same count as the bill */
    const pplTxt = (n, w) => (n === 1 ? '1 person' : n + ' people') + (w > 0 ? ' (' + w + ' waiting to join)' : '');
    const pbCmPriceY = () => { try { const p = window.pbPlanPrices(); return ' \\u00b7 ' + p.usd(p.seat * p.ym) + ' a year for each person over ' + p.seats + ', plus tax'; } catch (e) { return ''; } };
    if (bl && Number.isFinite(+bl.people)) {
      const n = +bl.people, w = Math.max(0, +bl.waiting || 0);
      pbCmEl('crSeats').textContent = bl.plan === 'trial' ? pplTxt(n, w) + (Number.isFinite(+bl.trial_limit) ? ' of ' + (+bl.trial_limit) + ' in the trial (plus the company account)' : '') + pbCmPrice(n, true)
        : pplTxt(n, w) + (bl.paid != null ? ' \\u00b7 ' + (+bl.paid) + ' paid' : '') + (bl.interval === 'year' ? ' \\u00b7 yearly' + pbCmPriceY() : bl.interval === 'month' ? ' \\u00b7 monthly' + pbCmPrice(n, false) : pbCmPrice(n, false));
    } else
    pbCmEl('crSeats').textContent = seats == null ? '' : bSeats != null ? seats + ' of ' + bSeats + ' people in the beta (plus the company account)' + pbCmPrice(seats, true) : seats + ' member' + (seats === 1 ? '' : 's') + (inc != null ? ' (your plan includes ' + inc + ')' : '') + pbCmPrice(seats, false);""")
p.save()
