# r1716_final decision 22: Washington needs a toolbox talk at least every week (WAC 296-155-110), so on a Washington job the
# toolbox-talk schedule doesn't offer "Every 2 weeks". "Washington job" = the state of the foreman's Current job as the app
# already knows it (window.pbSrJobState: picked on this phone, the job's address, else the company's state; the California
# fallback when nothing is known does not count). A schedule already set to every 2 weeks keeps working as it is, shows
# "Every 2 weeks" greyed out with a one-line note, and switches to every week the next time he saves the schedule (any change:
# days, how often, queue, random pick). Other states are unchanged.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""  function pbTtPlanChanged(uid, keepRnd) {
    const st = pbTt.st; if (!st) return;
    st.plan.at = Date.now(); st.plan.sent = false; st.plan.err = null;""",
"""  function pbTtWa() { /* r1716 decision 22: the foreman's Current job is in Washington */
    try {
      let n = ''; try { const j = typeof pbTkCurrentJob === 'function' ? pbTkCurrentJob() : null; n = j && j.number ? String(j.number) : ''; } catch (e) { n = ''; }
      const s = typeof window.pbSrJobState === 'function' ? window.pbSrJobState(n) : null;
      return !!(s && s.how !== 'default' && s.code === 'WA');
    } catch (e) { return false; }
  }
  window.pbTtWa = pbTtWa;
  function pbTtPlanChanged(uid, keepRnd) {
    const st = pbTt.st; if (!st) return;
    if (st.plan.every === 2 && pbTtWa()) st.plan.every = 1; /* r1716 decision 22: weekly on the next save */
    st.plan.at = Date.now(); st.plan.sent = false; st.plan.err = null;""")
p.rep("""    h += '<div class="pb-field pb-tt-sel"><select id="ttEvery" aria-label="How often" onchange="pbTtEvery(this.value)"><option value="1"' + (p.every === 1 ? ' selected' : '') + '>Every week</option><option value="2"' + (p.every === 2 ? ' selected' : '') + '>Every 2 weeks</option></select></div>'""",
"""    const ttWa = pbTtWa(); /* r1716 decision 22 */
    h += '<div class="pb-field pb-tt-sel"><select id="ttEvery" aria-label="How often" onchange="pbTtEvery(this.value)"><option value="1"' + (p.every === 1 ? ' selected' : '') + '>Every week</option>' + (!ttWa ? '<option value="2"' + (p.every === 2 ? ' selected' : '') + '>Every 2 weeks</option>' : p.every === 2 ? '<option value="2" selected disabled>Every 2 weeks</option>' : '') + '</select></div>'
      + (ttWa && p.every === 2 ? '<p class="pb-tt-rule" id="ttEveryWa">Washington job: talks are weekly there. This changes to every week the next time you change the schedule.</p>' : '')""")
p.rep("""  window.pbTtEvery = function(v) { const uid = pbTtFm(); if (!uid) return; const p = pbTt.st.plan, n = String(v) === '2' ? 2 : 1;""",
"""  window.pbTtEvery = function(v) { const uid = pbTtFm(); if (!uid) return; const p = pbTt.st.plan, n = String(v) === '2' && !pbTtWa() ? 2 : 1; /* r1716 decision 22 */""")
p.save()
