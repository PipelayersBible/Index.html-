import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# Bug hunt (sync 02): the Terms sheet never covers a live confined space permit or its kept emergency panel. It is
# asked at the first screen change after the permit is closed out (and the 60 s check).
rep("""      if (!sbUser || sbUser.id !== uid) return;
      pbTermsShow(uid);
    } finally { pbTermsBusy = false; }""",
"""      if (!sbUser || sbUser.id !== uid) return;
      if (pbTermsPermitLive()) return; /* asked after the permit is closed out */
      pbTermsShow(uid);
    } finally { pbTermsBusy = false; }""")
rep("""  function pbTermsShow(uid) {
    if (document.getElementById('pbTermsSheet')) return;""",
"""  function pbTermsPermitLive() { try { return !!(confinedPermit || pbClosedEmergencyShown); } catch (e) { return false; } }
  function pbTermsShow(uid) {
    if (document.getElementById('pbTermsSheet')) return;""")
rep("""(window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function () { setTimeout(() => { window.pbTermsCheck().catch(() => {}); }, 400); });""",
"""(window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function () { try { if (pbTermsPermitLive()) { const d = document.getElementById('pbTermsSheet'); if (d) d.remove(); } } catch (e) {} /* a permit restored after the sheet went up */ setTimeout(() => { window.pbTermsCheck().catch(() => {}); }, 400); });""")
open(out, 'w', encoding='utf-8').write(s)
