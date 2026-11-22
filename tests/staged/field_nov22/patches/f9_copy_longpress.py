# F9 Run Results: a finger tap on a BOP / INV (any value) cell opened the Copy sheet, so a gloved tap or a swipe that
# didn't travel far enough popped a sheet over the grade sheet. Now on a touch screen the Copy sheet needs a press and
# hold (0.45 s, finger kept still); a short tap does nothing but say once per visit "Press and hold a number to copy it".
# A mouse click, the keyboard (Enter / Space) and screen readers open it as before. Only the Run Results grade cells;
# Quick Run and the calculators are unchanged. Nothing about the values or the copy text changes.
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from _rep import P
p = P()
p.rep('''@media (prefers-reduced-motion: reduce) { #pbApp#pbApp .pb-laid-toast.pb-on { animation: pbLaidFade 200ms linear !important; } }
''', '''@media (prefers-reduced-motion: reduce) { #pbApp#pbApp .pb-laid-toast.pb-on { animation: pbLaidFade 200ms linear !important; } }
/* field_nov22 F9: hold to copy on the grade sheet: no text selection / call-out under the finger */
#pbApp #screen-results #resultsBody td.pb-tap-copy { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
''')
p.rep('''  window.pbCopyCellKey = function(e, el, fn) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(el); } };''',
      '''  window.pbCopyCellKey = function(e, el, fn) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(el); } };
  // ---- field_nov22 F9: on a touch screen the grade sheet's Copy sheet opens on press and hold, never on a tap ----
  (function () {
    const LP_MS = 450, SLOP = 10; let lp = null, hinted = false;
    const cellOf = (t) => t && t.closest ? t.closest('#screen-results #resultsBody td.pb-tap-copy') : null;
    const cancel = () => { if (lp) { clearTimeout(lp.t); lp.t = null; } };
    document.addEventListener('pointerdown', (e) => {
      const td = cellOf(e.target); cancel();
      if (!td || e.pointerType === 'mouse') { lp = null; return; }
      lp = { td, x: e.clientX, y: e.clientY, fired: false, t: null };
      lp.t = setTimeout(() => { if (!lp || lp.td !== td || !td.isConnected) return; lp.fired = true; lp.t = null; try { if (navigator.vibrate) navigator.vibrate(15); } catch (x) {} window.pbChooseResultsCopy(td); }, LP_MS);
    }, true);
    document.addEventListener('pointermove', (e) => { if (lp && lp.t && (Math.abs(e.clientX - lp.x) > SLOP || Math.abs(e.clientY - lp.y) > SLOP)) cancel(); }, true);
    document.addEventListener('pointerup', cancel, true);
    document.addEventListener('pointercancel', () => { cancel(); lp = null; }, true);
    document.addEventListener('contextmenu', (e) => { if (cellOf(e.target)) e.preventDefault(); }, true);
    document.addEventListener('click', (e) => { // the click after a finger: never the Copy sheet (a hold already opened it)
      const td = cellOf(e.target); if (!td || !lp || lp.td !== td) return;
      const fired = lp.fired; lp = null;
      e.stopPropagation(); e.preventDefault();
      if (!fired && !hinted) { hinted = true; try { const live = document.getElementById('laidLive'); if (live) live.textContent = 'Press and hold a number to copy it.'; } catch (x) {} pbRsHoldHint(); }
    }, true);
    (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push((name) => { cancel(); lp = null; if (name === 'results') hinted = false; });
  })();
  function pbRsHoldHint() {
    let t = document.getElementById('pbHoldHint');
    if (!t) { t = document.createElement('div'); t.id = 'pbHoldHint'; t.className = 'pb-laid-toast pb-done-toast'; t.setAttribute('role', 'status'); t.innerHTML = '<span class="pb-laid-toastt"></span>'; (document.getElementById('pbApp') || document.body).appendChild(t); }
    t.querySelector('.pb-laid-toastt').textContent = 'Press and hold a number to copy it.';
    t.hidden = false; clearTimeout(pbRsHoldHint.t); pbRsHoldHint.t = setTimeout(() => { t.hidden = true; }, 2200);
  }''')
p.save()
