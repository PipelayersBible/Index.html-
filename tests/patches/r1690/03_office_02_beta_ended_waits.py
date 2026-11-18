# 02: after a beta closes the server refuses new company rows with pb:beta_ended (trigger pb_billing.beta_closed_guard).
# Home promises "New runs and reports wait on this phone and send once your company starts a plan", so that answer is
# "try again later", never a final refusal: daily reports / check-offs / job book (pbDlyAnswer) and no-run production.
import sys
s=open(sys.argv[1],encoding='utf-8').read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(a[:70],s.count(a)); s=s.replace(a,b)
rep("""  function pbDlyAnswer(r) {
    if (r && !r.error && r.data && typeof r.data === 'object') return r.data.ok ? { k: 'ok', d: r.data } : { k: 'refused', code: r.data.code || 'pb:server', d: r.data };
    const e = (r && r.error) || {}, m = String(e.message || ''), sc = String(e.code || ''), pb = /pb:[a-z_]+/.exec(m);""",
"""  const PB_DLY_BETA_WHY = 'Your company’s beta has ended. It waits on this phone and is sent once your company starts a plan.'; /* bughunt 02 */
  function pbDlyAnswer(r) {
    if (r && !r.error && r.data && typeof r.data === 'object' && !r.data.ok && r.data.code === 'pb:beta_ended') return { k: 'retry', why: PB_DLY_BETA_WHY }; /* bughunt 02: the beta closed: it waits, as Home says */
    if (r && !r.error && r.data && typeof r.data === 'object') return r.data.ok ? { k: 'ok', d: r.data } : { k: 'refused', code: r.data.code || 'pb:server', d: r.data };
    const e = (r && r.error) || {}, m = String(e.message || ''), sc = String(e.code || ''), pb = /pb:[a-z_]+/.exec(m);
    if (pb && pb[0] === 'pb:beta_ended') return { k: 'retry', why: PB_DLY_BETA_WHY }; /* bughunt 02 */""")
# reports an r16.88 phone already marked refused for this reason go back to waiting
rep("""    const st = await pbDlyLoad(uid); if (!st) return;
    pbDlyUnblock(st);
    const waiting = st.checks.some(c => c.state === 'waiting') || st.reports.some(r => r.state === 'waiting');""",
"""    const st = await pbDlyLoad(uid); if (!st) return;
    { let back = 0; st.checks.concat(st.reports).forEach(x => { if (x && x.state === 'refused' && x.code === 'pb:beta_ended') { x.state = 'waiting'; x.code = null; x.why = PB_DLY_BETA_WHY; back++; } }); if (back) { try { await pbDlySave(uid); } catch (e) {} } } /* bughunt 02 */
    pbDlyUnblock(st);
    const waiting = st.checks.some(c => c.state === 'waiting') || st.reports.some(r => r.state === 'waiting');""")
rep("""        if (navigator.onLine === false || /failed to fetch|networkerror|load failed|no client|timeout/i.test(m) || !code) break; // no signal / not ready: tried again later
        Object.assign(S, { refused: code, rh: h }); changed = true;""",
"""        if (navigator.onLine === false || /failed to fetch|networkerror|load failed|no client|timeout/i.test(m) || !code || code === 'pb:beta_ended') break; // no signal / not ready / the beta closed (bughunt 02): tried again later
        Object.assign(S, { refused: code, rh: h }); changed = true;""")
open(sys.argv[2],'w',encoding='utf-8').write(s)
