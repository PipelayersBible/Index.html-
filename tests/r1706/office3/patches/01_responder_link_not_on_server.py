#!/usr/bin/env python3
# office3 #30: the responder link on the emergency panel says "(not on the server yet)" until the server has filed it.
# Responders who open the link before the permit reaches the server see a "not found yet" page. The panel already knows
# whether the code is filed (pbEmFiled: an upload that carried it succeeded, or pb_em_view answered for it); while it is
# not, the line under the link now says so. pbEmFiledMark already repaints the panel when an upload succeeds, so the
# words go away by themselves once the phone gets signal. Display only: nothing about the link, the text or the permit
# changes.
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

# 1) a span inside the link line for the words
rep("""<p class="pb-help cp-em-link" id="cpEmLink" style="display:none;">Responders can open <strong id="cpEmLinkAddr"></strong> <button""",
    """<p class="pb-help cp-em-link" id="cpEmLink" style="display:none;">Responders can open <strong id="cpEmLinkAddr"></strong> <span id="cpEmLinkWait" hidden>(not on the server yet)</span> <button""")

# 2) pbTxRender: show it while the code isn't filed for the account that owns the permit
rep("""      if (lk) { lk.style.display = em ? '' : 'none'; lk.dataset.k = em; pbEmLinkAddrSet(el('cpEmLinkAddr'), em ? pbEmShown(em) : ''); } }
  }
  window.pbTxRender = pbTxRender;""",
"""      if (lk) { lk.style.display = em ? '' : 'none'; lk.dataset.k = em; pbEmLinkAddrSet(el('cpEmLinkAddr'), em ? pbEmShown(em) : ''); }
      /* office3 #30: until the server has this code, a responder opening the link finds nothing yet */
      const wt = el('cpEmLinkWait');
      if (wt) { let wait = false; try { const owner = confinedPermit ? confinedSessionOwnerUid : (pbClosedEmergencyShown && pbClosedEmergencyShown.uid); wait = !!em && !pbEmFiled(owner, em, null); } catch (e) { wait = false; } if (wt.hidden === wait) wt.hidden = !wait; } }
  }
  window.pbTxRender = pbTxRender;""")

# 3) the server answering pb_em_view for the code also counts (pbEmFiled reads pbEmSrv): repaint on that answer too
rep("""        if (st === 'conflict' && pbEmReplaceTaken(k)) return; /* feat_security S2 */
        if (st !== before) { try { pbTxRender(); } catch (e) {} }""",
"""        if (st === 'conflict' && pbEmReplaceTaken(k)) return; /* feat_security S2 */
        if (st !== before || st === 'open' || st === 'closed') { try { pbTxRender(); } catch (e) {} } /* office3 #30: "(not on the server yet)" goes once the server answers for it */""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
