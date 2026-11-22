# C-3: End Run (and Send Report) says where the report went and whether it got there.
#  - Right after the run ends, a short line at the bottom (3.5 s, read out by screen readers): "Run ended. Sending the
#    report to Brandon Jones and the office…", or with no signal "Run ended. Report saved on this phone: it goes to …
#    when there's signal". A run with no one to send to: "Run ended. Saved in Records."
#  - When the server confirms it, the same line says "Report sent to … ✓" (Home's card already changes to
#    "Report sent to … · 7:02 PM").
#  - Home's card no longer says "Sending…" for ever: 2 minutes after the end, while it is still waiting, it says
#    "Not sent yet: it goes to … by itself" (it keeps trying; nothing else changes).
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
p = P()
# toast helper (global), next to the End Run label
p.rep("""  window.pbRfEndLabel = function() { return pbRfCrew(pbArchiveOwnerUid) ? 'End Run and Send Report' : 'End Run'; };""",
"""  window.pbRfEndLabel = function() { return pbRfCrew(pbArchiveOwnerUid) ? 'End Run and Send Report' : 'End Run'; };
  // design C-3: a short confirmation line at the bottom (role=status), gone after a few seconds
  let pbDoneToastT = null;
  window.pbDoneToast = function(text, ms) {
    const app = document.getElementById('pbApp'); if (!app || !text) return;
    let el = document.getElementById('pbDoneToast');
    if (!el) { el = document.createElement('div'); el.id = 'pbDoneToast'; el.className = 'pb-laid-toast pb-done-toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); el.innerHTML = '<span class="pb-laid-toastt"></span>'; app.appendChild(el); }
    el.querySelector('.pb-laid-toastt').textContent = String(text); el.hidden = false;
    clearTimeout(pbDoneToastT); pbDoneToastT = setTimeout(() => { el.hidden = true; }, ms || 3500);
  };
  window.pbRfEndToastText = function(e) {
    const uid = pbArchiveOwnerUid;
    if (!e || !pbRfCrew(uid) || !e.reportSendWanted) return 'Run ended. Saved in Records.';
    if (e.reportSentAt) return 'Run ended. Report sent to ' + pbRfToWhom(uid, e) + ' \\u2713';
    return navigator.onLine === false ? 'Run ended. Report saved on this phone: it goes to ' + pbRfToWhom(uid, e) + ' when there\\u2019s signal.' : 'Run ended. Sending the report to ' + pbRfToWhom(uid, e) + '\\u2026';
  };
  { const o = window.pbRrNoteSent; window.pbRrNoteSent = function(e) { const r = o.apply(this, arguments);
    try { if (r && e && e.reportSendWanted && Date.now() - pbRrEndMs(e) < 15 * 60000) window.pbDoneToast('Report sent to ' + pbRfToWhom(pbArchiveOwnerUid, e) + ' \\u2713'); } catch (x) {}
    return r; }; }""")
p.rep("""    if (e.reportSendWanted) return navigator.onLine === false ? 'Report saved on this phone: it goes to ' + pbRfToWhom(uid, e) + ' as soon as there’s signal' : 'Sending the report to ' + pbRfToWhom(uid, e) + '…';
    return 'Run ended: its report';""",
"""    if (e.reportSendWanted) return navigator.onLine === false ? 'Report saved on this phone: it goes to ' + pbRfToWhom(uid, e) + ' as soon as there’s signal' : Date.now() - pbRrEndMs(e) > 120000 ? 'Not sent yet: it goes to ' + pbRfToWhom(uid, e) + ' by itself' /* design C-3 */ : 'Sending the report to ' + pbRfToWhom(uid, e) + '…';
    return 'Run ended: its report';""")
# End Run: the line, once the run really ended
p.rep("""    if (ok) {
      if (ok === 'stats-later') pbStatsLaterNotice();
      if (pbCurrentScreen === 'results' && getCurrentArchiveEntry() === entry) pbGoto('home');""",
"""    if (ok) {
      if (ok === 'stats-later') pbStatsLaterNotice();
      if (pbCurrentScreen === 'results' && getCurrentArchiveEntry() === entry) pbGoto('home');
      try { if (typeof window.pbDoneToast === 'function' && ok !== 'stats-later') window.pbDoneToast(window.pbRfEndToastText(entry)); } catch (x) {} /* design C-3 */""")
p.rep("""#pbApp .pb-laid-toast[hidden] { display: none; }""",
"""#pbApp .pb-laid-toast[hidden] { display: none; }
#pbApp .pb-done-toast { padding: 12px 16px; font-size: 15px; font-weight: 600; width: max-content; pointer-events: none; }
#pbApp .pb-done-toast .pb-laid-toastt { white-space: normal; }""")
p.save()
