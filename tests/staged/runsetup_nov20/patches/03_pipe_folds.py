#!/usr/bin/env python3
# runsetup 03: under the pipe, "Wall & laying length" and "Intervals" are one line each until they need a look.
# They stay where the owner put them on Nov 17 (r16.96: under the Pipe section), with their values on the closed line:
#   Wall & laying length   Wall 0.02 ft (auto) · 14 ft lengths
#   Intervals              Every 10 ft
# Each opens BY ITSELF when: the pipe size has no table wall (the wall must be typed), the wall or laying length was typed
# by hand or carried in (Remember, Reuse, a draft, a resumed run, Edit Run Data), the interval is not the usual 10 ft or
# laying-length intervals are on, a field in it is flagged or warned about, or it gets focus / "Go to this field".
# A line the person closes stays closed until something in it changes.
# Display only: reads the form, moves one section into a <details>, opens/closes folds. Never writes a field or the run.
# Usage: python3 03_pipe_folds.py in.html out.html
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

rep("""      var ws = document.getElementById('runWallSection'); if (ws && ws.parentNode !== pc) pc.appendChild(ws); /* r16.96: wall & laying length under the pipe */""",
    """      var ws = document.getElementById('runWallSection'), wg = null; /* r16.96: wall & laying length under the pipe; runsetup 03: in its own fold there */
      if (ws) { wg = card('runWallGroup', 'Wall &amp; laying length', 'runWallGroupSum'); if (!wg.dataset.rs3) { wg.dataset.rs3 = '1'; wg.open = false; wg.classList.add('pb-rs3'); } if (wg.parentNode !== pc) pc.appendChild(wg); if (ws.parentNode !== wg) wg.appendChild(ws); }
      if (ic && !ic.dataset.rs3) { ic.dataset.rs3 = '1'; ic.open = false; ic.classList.add('pb-rs3'); }""")
rep("""      sums();
    } catch (e) { console.error('r16.53 subcards', e); }""",
    """      sums();
      try { rs3Check(); } catch (e) { console.error('runsetup 03', e); }
    } catch (e) { console.error('r16.53 subcards', e); }""")
rep("""  window.pbSubCards = apply;
  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function (name) { if (name === 'input') setTimeout(apply, 0); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(apply, 60); }); else setTimeout(apply, 60);""",
    """  // runsetup 03: the two folds under the pipe (see the patch notes). Display only.
  var rs3Gen = null, rs3Settle = 0, rs3Sig = {};
  function rs3Auto(id) { try { return !!(window.pbPiAIsAuto && window.pbPiAIsAuto(id)); } catch (e) { return false; } }
  function rs3Shown(w) { try { return w.checkVisibility ? (w.closest('details:not([open])') ? String(w.textContent || '').trim() !== '' && w.style.display !== 'none' && !w.hidden : w.checkVisibility()) : true; } catch (e) { return true; } }
  function rs3Check() {
    var wg = document.getElementById('runWallGroup'), ig = document.getElementById('runIntGroup'); if (!wg && !ig) return;
    var gen = null; try { gen = window.pbJobGrpFormGen ? window.pbJobGrpFormGen() : null; } catch (e) {}
    if (gen !== rs3Gen) { rs3Gen = gen; rs3Sig = {}; rs3Settle = Date.now() + 800; [wg, ig].forEach(function (d) { if (d && d.open && !d.querySelector('[aria-invalid="true"]')) d.open = false; }); } // a new form: both start as a line
    var size = v('runIdSel'), wt = v('runWT'), ll = v('layLen'), wAuto = rs3Auto('runWT'), lAuto = rs3Auto('layLen'), iv = v('interval'), lu = document.getElementById('layUse');
    var ws = document.getElementById('runWallGroupSum');
    if (ws) { var t1 = (wt ? 'Wall ' + wt + ' ft' + (wAuto ? ' (auto)' : '') : (size ? 'Wall not entered' : 'Fills in from the pipe size')) + (ll ? ' \\u00b7 ' + ll + ' ft lengths' : ''); if (ws.textContent !== t1) ws.textContent = t1; }
    if (Date.now() < rs3Settle) { setTimeout(function () { try { rs3Check(); } catch (e) {} }, rs3Settle - Date.now() + 30); return; } // the app is still filling a new form
    var oddW = [], oddI = [];
    if (size && !wt) oddW.push('need'); if (wt && !wAuto) oddW.push('wt:' + wt); if (ll && !lAuto) oddW.push('ll:' + ll);
    if (iv !== '10') oddI.push('iv:' + iv); if (lu && lu.checked) oddI.push('lay');
    [[wg, oddW], [ig, oddI]].forEach(function (x) {
      var d = x[0]; if (!d) return;
      var bad = d.querySelectorAll('[aria-invalid="true"]').length, warn = Array.prototype.filter.call(d.querySelectorAll('.pb-inline-warn, .pb-warn'), rs3Shown).length;
      var sig = JSON.stringify([x[1], bad, warn]);
      if ((x[1].length || bad || warn) && sig !== rs3Sig[d.id] && !d.open) d.open = true; // something new in it: shown, never folded away unseen
      rs3Sig[d.id] = sig;
    });
  }
  window.pbRs3Check = rs3Check;
  setInterval(function () { try { var sc = document.getElementById('screen-input'); if (sc && sc.classList.contains('active')) rs3Check(); } catch (e) {} }, 1000);
  document.addEventListener('input', function (ev) { if (ev.target && ev.target.closest && ev.target.closest('#screen-input')) setTimeout(function () { try { rs3Check(); } catch (e) {} }, 60); }, true);
  document.addEventListener('change', function (ev) { if (ev.target && ev.target.closest && ev.target.closest('#screen-input')) setTimeout(function () { try { rs3Check(); } catch (e) {} }, 60); }, true);
  window.pbSubCards = apply;
  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function (name) { if (name === 'input') setTimeout(apply, 0); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(apply, 60); }); else setTimeout(apply, 60);""")
rep("""/* r16.53: the four sub-cards look alike: Job details takes the sub-card look the Trench design card already had */""",
    """/* runsetup 03: the folds under the pipe: the closed line shows the values, whole */
#pbApp#pbApp #screen-input #runPipeGroup > details#runWallGroup { margin: 0; background: transparent; border-top: 1px solid var(--pb-divider); border-radius: 0; }
#pbApp#pbApp #screen-input details.pb-rs3 > summary { min-height: 52px; }
#pbApp#pbApp #screen-input details.pb-rs3:not([open]) > summary .pb-subrow-sum { white-space: normal; overflow: visible; text-overflow: clip; overflow-wrap: anywhere; }
#pbApp#pbApp #screen-input details.pb-rs3[open] > summary .pb-subrow-sum { display: none; }
/* r16.53: the four sub-cards look alike: Job details takes the sub-card look the Trench design card already had */""")
open(out, 'w', encoding='utf-8').write(s)
print('03_pipe_folds ok')
