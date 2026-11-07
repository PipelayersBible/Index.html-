import sys
src,out=sys.argv[1],sys.argv[2]; s=open(src,encoding='utf-8').read()
def rep(a,b):
    global s; c=s.count(a); assert c==1,(c,a[:70]); s=s.replace(a,b)
anchor = "/* feat_r1613 (owner, Nov 7): no Menu column; the distance is the row's menu button (outlined, with a caret) */"
rep(anchor, """/* feat_r1614 (owner, Nov 7): no signal = one line under the screen's header, not "Loads with signal" on every card */
html.pb-nosig #pbApp .pb-offhide { display: none !important; }
#pbApp .pb-nosig-line { display: none; margin: 10px var(--pb-gutter, 16px) 0; padding: 8px 12px; border-radius: 10px; background: var(--pb-raised, #f3f1ea); color: var(--pb-text-2, #555); font-size: 14px; font-weight: 600; }
html.pb-nosig #pbApp .pb-screen.active > .pb-nosig-line { display: block; }
""" + anchor)
rep("  function pbSlRowNotesInto(body, e, idx, colCount) {", """  (function () { // feat_r1614: one "No signal" line per screen; the per-card signal lines hide while there is none
    const PH = /^(loads with signal\\.?|couldn\\u2019t load\\.?|couldn't load\\.?|couldn\\u2019t load crew runs\\.?|active runs and permits load with signal\\.?|sign in with signal to see the latest\\.?|no signal\\..*|loads with signal \\u2014.*)$/i;
    let mo = null, t = null;
    const tidy = () => {
      t = null; const off = navigator.onLine === false; document.documentElement.classList.toggle('pb-nosig', off);
      if (!off) return;
      const scr = document.querySelector('#pbApp .pb-screen.active'); if (!scr) return;
      if (!scr.querySelector(':scope > .pb-nosig-line')) { const h = scr.querySelector(':scope > .pb-header'); const d = document.createElement('p'); d.className = 'pb-nosig-line'; d.setAttribute('role', 'status'); d.textContent = 'No signal \\u00b7 showing what\\u2019s saved on this phone'; if (h) h.after(d); else scr.prepend(d); }
      scr.querySelectorAll('p, span, div, small').forEach(el => { if (el.children.length || el.classList.contains('pb-nosig-line')) return; const x = (el.textContent || '').trim(); if (x && x.length < 90 && PH.test(x)) el.classList.add('pb-offhide'); });
    };
    const soon = () => { if (!t) t = setTimeout(tidy, 60); };
    const watch = () => { if (navigator.onLine === false) { if (!mo) { mo = new MutationObserver(soon); const app = document.getElementById('pbApp'); if (app) mo.observe(app, { childList: true, subtree: true, characterData: true }); } } else if (mo) { mo.disconnect(); mo = null; } soon(); };
    window.addEventListener('offline', watch); window.addEventListener('online', watch);
    (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(() => soon());
    setTimeout(watch, 0);
  })();
  function pbSlRowNotesInto(body, e, idx, colCount) {""")
open(out,'w',encoding='utf-8').write(s); print('ok')
