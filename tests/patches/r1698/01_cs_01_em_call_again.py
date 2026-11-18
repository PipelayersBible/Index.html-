import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# cs2 01: after EMERGENCY the page scrolls the panel to the top, so the EMERGENCY (call) button is off screen and the
# first, biggest red button is "Text 911". A call that failed, was cancelled at the phone's prompt or dropped must be
# one tap away again: a "Call <number> again" button at the top of the panel, wired to the same pbTriggerEmergency
# (a second tap is already a redial of the same open incident; on a closed permit's kept panel it dials and records).
rep("""      <div id="cpEmergencyDetails">
      <div id="cpTextWrap" style="display:none;">""",
    """      <div class="pb-btn-wrap" style="padding-top:12px;"><button type="button" class="pb-emergency-btn cp-em-again" id="cpEmCallAgain" onclick="pbTriggerEmergency()">Call 911 again</button></div>
      <div id="cpEmergencyDetails">
      <div id="cpTextWrap" style="display:none;">""")
# the label follows the number EMERGENCY dials (live permit and kept panel); set before anything else in the render
rep("""  function pbTxRender() {
    const wrap = document.getElementById('cpTextWrap'); if (!wrap) return;""",
    """  function pbTxRender() {
    try { const ca = document.getElementById('cpEmCallAgain'); if (ca) { const t = 'Call ' + pbDialNumberNow() + ' again'; if (ca.textContent !== t) ca.textContent = t; } } catch (e) {} // cs2 01
    const wrap = document.getElementById('cpTextWrap'); if (!wrap) return;""")
# A permit closed out while its emergency is still open (the kept panel): the is-closed screen hid the EMERGENCY button and
# the rescue line, while the dialog and the panel say "tap EMERGENCY to call again". Shown again while that panel is open.
rep("""/* closeout: the four reasons as a 2 x 2 choice, separate from the emergency controls */""",
    """/* closeout: the four reasons as a 2 x 2 choice, separate from the emergency controls */
#pbApp#pbApp #screen-confinedActive.is-closed:has(#cpEmergencyPanel:not([style*="none"])) > .pb-btn-wrap:has(.pb-emergency-btn), #pbApp#pbApp #screen-confinedActive.is-closed:has(#cpEmergencyPanel:not([style*="none"])) > .pb-rescue { display: block !important; } /* cs2 01: kept emergency panel */""")
open(out, 'w', encoding='utf-8').write(s)
