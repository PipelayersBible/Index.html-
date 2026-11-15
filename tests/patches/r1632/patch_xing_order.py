import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(s.count(a),a[:90]); s=s.replace(a,b)
# r16.32 (Tommy, Nov 15): crossings move into station order as soon as their station (or a hub's) is filled:
# while typing (not only when the box loses focus), and after a stake photo fills a hub.
rep("""  ['change', 'click'].forEach(t => document.addEventListener(t, (ev) => { const tg = ev.target; if (tg && tg.closest && tg.closest('#screen-input') && document.querySelector('#screen-input .pb-xing-card')) pbRsxOrderSoon(); }, true));""",
"""  ['change', 'click'].forEach(t => document.addEventListener(t, (ev) => { const tg = ev.target; if (tg && tg.closest && tg.closest('#screen-input') && document.querySelector('#screen-input .pb-xing-card')) pbRsxOrderSoon(); }, true));
  document.addEventListener('input', (ev) => { const tg = ev.target; if (!tg || !tg.id || !/(Sta|StaTxt|Station)$/.test(tg.id) || !tg.closest || !tg.closest('#screen-input') || !document.querySelector('#screen-input .pb-xing-card')) return; clearTimeout(pbRsxOrderT); pbRsxOrderT = setTimeout(() => { if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.pb-xing-card') && document.activeElement.id === tg.id) { pbRsxOrderSoon(); return; } try { window.pbXingOrder(); } catch (e) { console.error(e); } }, 900); }, true);
  window.pbRsxOrderNow = function() { try { if (document.querySelector('#screen-input .pb-xing-card')) window.pbXingOrder(); } catch (e) { console.error(e); } };""")
rep("""      if (/hub/.test(prefix)) { try { pbHubIdents(); } catch (e) {} }""",
"""      if (/hub/.test(prefix)) { try { pbHubIdents(); } catch (e) {} }
      try { if (window.pbRsxOrderNow) window.pbRsxOrderNow(); } catch (e) {}""")
# (Tommy, Nov 15) a bend with no angle given is not assumed to be a 45: no laying length until the angle is entered
# (22.5, 11.25, 90, 45 ...). Replaces the Nov 2 "angle unknown: 45 value".
rep("""      if (a === null) return { k: 'bend45', ap: true };""", """      if (a === null) return null;""")
# crews say "22" and "11" for 22.5 and 11.25 bends
rep("""    m = /(?:^|[\\s,(])(90|45|22\\.5|11\\.25)(?=$|[\\s,)])/.exec(s); return m ? Number(m[1]) : null;""",
"""    m = /(?:^|[\\s,(])(90|45|22\\.5|11\\.25)(?=$|[\\s,)])/.exec(s); if (m) return Number(m[1]);
    m = /(?:^|[\\s,(])(22|11)(?=$|[\\s,)])/.exec(s); return m ? (m[1] === '22' ? 22.5 : 11.25) : null;""")
open(sys.argv[2],'w').write(s); print('ok')
