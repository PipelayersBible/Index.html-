#!/usr/bin/env python3
"""feat_phonechk (r15.30): what the owner's real-phone checks found (Oct 23, 10 PM).
 K1 Company "Live now" board kept a closed permit as live (1 inside): the phone sent "closed" only on its 60-second tick,
    and the owner had left the app by then. Now the closed status is queued and sent the moment the permit retires, and
    again on Finish & Return Home. (The server also closes it when the closed permit backs up: migration 31.)
 K2 No notification with the phone locked: his only push subscription had been ended on Oct 21 by Log Out — by design —
    and after signing back in notifications stayed off with nothing saying so (3 days of pushes failed "no_device").
    Now Log Out remembers that this phone had them on for that account; when the SAME account signs back in and the
    phone's permission is still granted, they are turned back on and re-registered (background sync, retried). A different
    account gets nothing.
 K3 Owner: drop the closeout "Send Report Email" card (the PDF in Records is the copy to send). The card is hidden, not
    removed, so the closeout code and older records keep working; the notice says where the PDF is.
 K4 Records > Unfinished permits: the row for the permit that is live on THIS phone gets an "Open on this phone" button
    (the list is the server's backup copy; it was View-only, which read as a dead end)."""
import sys
R = []
def r(n, a, b, cnt=1): R.append((n, a, b, cnt))
# K1: the closed status goes out at once
r('K1a', """  function pbRetireClosedPermitState() {
    stopConfinedCommTimer(); stopConfinedAtmoTimer(); stopConfinedEmergencyTimer();
    confinedPermit = null;""",
"""  function pbRetireClosedPermitState() {
    stopConfinedCommTimer(); stopConfinedAtmoTimer(); stopConfinedEmergencyTimer();
    confinedPermit = null;
    try { if (typeof window.__pbLivePermitTick === 'function') setTimeout(() => { window.__pbLivePermitTick(); }, 300); } catch (e) {} // feat_phonechk K1: the board hears "closed" now, not at the next minute""")
r('K1b', """    document.getElementById('cpCloseoutPanel').style.display = 'none';
    document.getElementById('confinedResumeTile').style.display = 'none';""",
"""    document.getElementById('cpCloseoutPanel').style.display = 'none';
    document.getElementById('confinedResumeTile').style.display = 'none';
    try { if (typeof window.__pbLivePermitTick === 'function') window.__pbLivePermitTick(); } catch (e) {} // feat_phonechk K1""")
# K2: remember, then restore for the same account
r('K2a', "        await pbPushSaveDevice({ uid: null, want: 'off', synced: true, why: 'signed_out', endpoint: null });",
  "        await pbPushSaveDevice({ uid: null, want: 'off', synced: true, why: 'signed_out', endpoint: null, wasOn: dev.want === 'on' ? dev.uid : null }); // feat_phonechk K2: so the same account gets them back")
r('K2b', """    if (dev && dev.uid && dev.uid === now) {
      if (dev.want === 'on') await pbPushSetOwner(now);
      setTimeout(() => pbPushSync({ background: true, check: dev.want === 'on' }), 4000);
    }
  }""",
"""    if (dev && dev.uid && dev.uid === now) {
      if (dev.want === 'on') await pbPushSetOwner(now);
      setTimeout(() => pbPushSync({ background: true, check: dev.want === 'on' }), 4000);
      return;
    }
    // feat_phonechk K2: Log Out ended this phone's notifications for this very account; it is back, and the phone still
    // allows them, so they come back too (registered again in the background; the Notifications screen shows how it went).
    if (dev && !dev.uid && now && dev.wasOn === now && dev.why === 'signed_out' && pbPushPerm() === 'granted' && pbPushHostOk()) {
      await pbPushSaveDevice({ uid: now, want: 'on', synced: false, why: '', endpoint: null });
      await pbPushSetOwner(now);
      setTimeout(() => pbPushSync({ background: true }), 4000);
    }
  }""")
# K3: the closeout email card
r('K3a', """      <div class="pb-clean" style="margin-top:16px;">This permit is saved in Records. Email a copy below if needed, then tap Finish &amp; Return Home.</div>
      <div class="pb-section">
        <div class="pb-tag">Closeout Report</div>""",
"""      <div class="pb-clean" style="margin-top:16px;">This permit is saved in Records, with its PDF. Tap Finish &amp; Return Home.</div>
      <div class="pb-section" hidden><!-- feat_phonechk K3: the email card is retired (the PDF in Records is the copy to send); kept for the code that fills it -->
        <div class="pb-tag">Closeout Report</div>""")
# K4: open the live permit from the unfinished list
r('K4', """          + '<div class="pb-arch-actions"><button type="button" class="pb-btn ghost small" onclick="pbCprToggle(' + i + ')">View</button></div>'
          + '<pre id="cprView' + i + '" style="display:none;">' + escapeHtml(pbOpenSnapText(x.snapshot || {}, x.saved_at)) + '</pre></div>'; }).join('');""",
"""          + '<div class="pb-arch-actions">' + (confinedPermit && confinedPermit.sessionId && 'cps-' + confinedPermit.sessionId === String(x.client_permit_id) ? '<button type="button" class="pb-btn small" onclick="pbGoto(\\'confinedActive\\')">Open on this phone</button>' : '') + '<button type="button" class="pb-btn ghost small" onclick="pbCprToggle(' + i + ')">View</button></div>' // feat_phonechk K4
          + '<pre id="cprView' + i + '" style="display:none;">' + escapeHtml(pbOpenSnapText(x.snapshot || {}, x.saved_at)) + '</pre></div>'; }).join('');""")

def apply(s):
    for n, a, b, cnt in R:
        c = s.count(a); assert c == cnt, (n, c); s = s.replace(a, b)
    return s
if __name__ == '__main__':
    s = open(sys.argv[1], encoding='utf-8').read(); s = apply(s); open(sys.argv[2], 'w', encoding='utf-8').write(s); print('phonechk written', len(s))
