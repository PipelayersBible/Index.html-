#!/usr/bin/env python3
# office3 #31: check-ins and check-outs reach the office's "Live now" board right away (they waited for the next
# one-minute tick; an emergency already went up at once).
# 1) Permit phone: a roster repaint (check-in, check-out, add/remove a person, evacuate) asks the live-permit sender
#    to look again 400 ms later (at most one pending look: the roster also repaints every second while a timer runs). pbLivePermitTick only queues a status when it changed (it hashes it), so a repaint that
#    changes nothing sends nothing. Display copy only: it reads the permit, never changes it.
# 2) Office board: while a reported permit has someone inside, the board reloads every 20 s instead of every 60 s, so the
#    office sees a check-out within about 20 s of the phone sending it. Same RPC as before (pb_prod_company_live_permits
#    via pbBdLoad), only while Company production is on screen and visible.
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

rep("""  function renderRosterList() {
    pbRenderRosterUnsavedBanner();""",
"""  let pbLiveBoardT = null; /* office3 #31: the office board hears a check-in or check-out now, not at the next minute */
  function pbLiveBoardSoon() { try { if (pbLiveBoardT) return; pbLiveBoardT = setTimeout(() => { pbLiveBoardT = null; try { if (typeof window.__pbLivePermitTick === 'function') window.__pbLivePermitTick(); } catch (e) {} }, 400); } catch (e) {} } // one look 400 ms after the first repaint (the roster repaints every second while a timer runs)
  function renderRosterList() {
    pbLiveBoardSoon(); // office3 #31 (display copy only; never waits, never changes the permit)
    pbRenderRosterUnsavedBanner();""")

rep("""  setInterval(() => { if (pbCurrentScreen === 'prodDashboard' && document.visibilityState === 'visible') pbBdLoad(false).catch(() => null); }, 60 * 1000);""",
"""  setInterval(() => { if (pbCurrentScreen === 'prodDashboard' && document.visibilityState === 'visible') pbBdLoad(false).catch(() => null); }, 60 * 1000);
  /* office3 #31: someone inside a reported permit: look again every 20 s (a check-out shows within about 20 s) */
  setInterval(() => { try { if (pbCurrentScreen !== 'prodDashboard' || document.visibilityState !== 'visible' || pbBd.busy) return; const P = pbBd.permits, L = P && Array.isArray(P.permits) ? P.permits : []; if (!L.some(x => x && !x.closed && Number((x.status || {}).inside) > 0) || Date.now() - (pbBd.at || 0) < 18000) return; pbBdLoad(true).catch(() => null); } catch (e) {} }, 20 * 1000);""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
