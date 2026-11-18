import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# offline audit 03 (Nov 17, on r16.95) [low]: a run whose Lock time is more than 21 days back by the phone's clock is
# never sent (pbRrSend only looks at runs locked in the last PB_RR_DAYS). When the phone's clock was weeks behind
# (reset after the battery died, no network time in the trench), a run locked and ended with End Run and Send Report
# never reaches the company, and Home says "Not sent: 1 run report" for ever (pbUnsentGroups counts it with no age
# limit). rig/t11_clock.js. Fix: a report the crew member asked to send (reportSendWanted, not yet learned as sent)
# goes whatever its date; everything else keeps the 21-day window (old personal runs are never pushed to a company).
rep("""      && (() => { const t = (e.lockTime instanceof Date ? e.lockTime : new Date(e.lockTime)).getTime(); return isFinite(t) && t > since; })());""",
    """      && ((e.reportSendWanted && !e.reportSentAt && (e.completed || e.incomplete)) /* offline audit 03: a report he sent goes whatever the phone's clock said */ || (() => { const t = (e.lockTime instanceof Date ? e.lockTime : new Date(e.lockTime)).getTime(); return isFinite(t) && t > since; })()));""")
# ...and it is sealed like any other finished run once the company has it (the seal pass had the same 21-day window).
rep("""        const t = (e.lockTime instanceof Date ? e.lockTime : new Date(e.lockTime)).getTime(); if (!(isFinite(t) && t > since)) continue;""",
    """        const t = (e.lockTime instanceof Date ? e.lockTime : new Date(e.lockTime)).getTime(); if (!(isFinite(t) && t > since) && !e.reportSendWanted) continue; /* offline audit 03 */""")
open(out, 'w', encoding='utf-8').write(s)
