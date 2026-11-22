# F4 "Laid to ... Undo": the toast sat over the bottom of the grade sheet, its Undo where the next tap goes.
# Now: at the TOP of the screen; if the Next row is up there (page scrolled), it goes to the bottom instead: it never
# covers the Next row (checked when shown, as the sheet scrolls to Next, and on any scroll while it shows).
# Undo stays (6 s) but ignores taps in its first 600 ms (the second tap of a quick double tap), and is a plain
# outlined button: yellow is kept for the next step / decisions.
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from _rep import P
p = P()
p.rep('''@media (prefers-reduced-motion: reduce) { #pbApp#pbApp .pb-laid-toast.pb-on { animation: pbLaidFade 200ms linear !important; } }
''', '''@media (prefers-reduced-motion: reduce) { #pbApp#pbApp .pb-laid-toast.pb-on { animation: pbLaidFade 200ms linear !important; } }
/* field_nov22 F4: the laid toast at the top (bottom only when the Next row is up there); Undo outlined, not yellow */
#pbApp#pbApp #pbLaidToast { top: calc(env(safe-area-inset-top, 0px) + 10px); bottom: auto; }
#pbApp#pbApp #pbLaidToast.pb-toast-low { top: auto; bottom: calc(var(--pb-shell-h, 0px) + 16px + env(safe-area-inset-bottom, 0px)); }
#pbApp#pbApp #pbLaidToast .pb-laid-toastu { background: transparent; color: var(--pb-text); border: 1.5px solid var(--pb-control, #8a8f98); }
@keyframes pbToastInTop { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
#pbApp#pbApp #pbLaidToast.pb-on:not(.pb-toast-low) { animation: pbToastInTop 180ms ease-out; }
@media (prefers-reduced-motion: reduce) { #pbApp#pbApp#pbApp #pbLaidToast.pb-on { animation: pbLaidFade 200ms linear !important; } }
''')
p.rep('''      t.querySelector('button').addEventListener('click', () => { const a = pbLaidToastAct; pbLaidToastOff();''',
      '''      t.querySelector('button').addEventListener('click', (ev) => { if (Date.now() - pbLaidToastAt < PB_LAID_TOAST_GUARD_MS) { ev.preventDefault(); return; } /* field_nov22 F4: a double tap's second tap */ const a = pbLaidToastAct; pbLaidToastOff();''')
p.rep('''    t.hidden = false; t.classList.remove('pb-on'); void t.offsetWidth; t.classList.add('pb-on');
    clearTimeout(pbLaidToastT); pbLaidToastT = setTimeout(pbLaidToastOff, 6000);
  }
  function pbLaidToastOff() { clearTimeout(pbLaidToastT); pbLaidToastT = null; pbLaidToastAct = null; const t = document.getElementById('pbLaidToast'); if (t) { t.hidden = true; t.classList.remove('pb-on'); } }''',
      '''    t.classList.remove('pb-toast-low'); t.hidden = false; t.classList.remove('pb-on'); pbLaidToastPlace(); void t.offsetWidth; t.classList.add('pb-on');
    pbLaidToastAt = Date.now();
    [120, 400, 750].forEach(ms => setTimeout(pbLaidToastPlace, ms)); // the sheet scrolls to the Next row meanwhile
    clearTimeout(pbLaidToastT); pbLaidToastT = setTimeout(pbLaidToastOff, 6000);
  }
  // field_nov22 F4: never over the Next row: top, else bottom (whichever doesn't touch it; top when neither is clear)
  var pbLaidToastAt = 0; const PB_LAID_TOAST_GUARD_MS = 600;
  function pbLaidToastPlace() {
    const t = document.getElementById('pbLaidToast'); if (!t || t.hidden) return;
    const nx = document.querySelector('#resultsBody tr.pb-laid-next:not([data-laid-strip])');
    const over = () => { if (!nx || !nx.offsetParent) return false; const a = t.getBoundingClientRect(), r = nx.getBoundingClientRect(); return a.bottom + 6 > r.top && a.top - 6 < r.bottom; };
    t.classList.remove('pb-toast-low');
    if (!over()) return;
    t.classList.add('pb-toast-low');
    if (over()) t.classList.remove('pb-toast-low');
  }
  window.pbLaidToastPlace = pbLaidToastPlace;
  document.addEventListener('scroll', () => { const t = document.getElementById('pbLaidToast'); if (t && !t.hidden) pbLaidToastPlace(); }, { capture: true, passive: true });
  function pbLaidToastOff() { clearTimeout(pbLaidToastT); pbLaidToastT = null; pbLaidToastAct = null; const t = document.getElementById('pbLaidToast'); if (t) { t.hidden = true; t.classList.remove('pb-on', 'pb-toast-low'); } }''')
p.save()
