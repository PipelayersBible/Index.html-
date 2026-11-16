import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(s.count(a),a[:90]); s=s.replace(a,b)
# r16.33 (Tommy, Nov 15): hubs move into station order on the setup screen once their station is filled (typed, from a
# stake photo or a correction), with their slope pills and the crossings following. Hubs with no station yet stay at
# the bottom in the order added. Nothing moves while you're typing in that hub's station.
rep("""  window.pbXingOrder = function(only) {""", """  window.pbHubOrder = function(only) {
    const runs = only ? [only] : pbXingRunsOnForm();
    runs.forEach(n => {
      const host = document.getElementById(n === 1 ? 'hubsContainer' : 'hubsContainer' + n); if (!host) return;
      const hubs = Array.from(host.children).filter(k => k.matches('[data-hub-id]'));
      if (hubs.length < 2) return;
      const ae = document.activeElement;
      const dist = (h) => numVal(h.dataset.hubId + 'Station');
      const want = hubs.map((h, i) => ({ h, i, d: dist(h) })).sort((a, b) => ((a.d === null) - (b.d === null)) || (a.d !== null && b.d !== null ? a.d - b.d : 0) || a.i - b.i).map(x => x.h);
      if (want.every((h, i) => h === hubs[i])) return;
      if (ae && ae.closest && want.some(h => h.contains(ae)) && /(Station|StaTxt)$/.test(ae.id || '')) return; // still typing a station
      const tail = hubs[hubs.length - 1].nextSibling;
      want.forEach(h => { const p = h.previousElementSibling; if (p && p.classList.contains('pb-rs-slope')) p.remove(); host.insertBefore(h, tail); });
      try { pbRsSlopes(n); } catch (e) { console.error(e); }
      try { pbHubIdents(); } catch (e) {}
      if (ae && ae !== document.body && document.activeElement !== ae && document.contains(ae)) { try { ae.focus({ preventScroll: true }); } catch (e) {} }
    });
  };
  let pbHubOrderT = null;
  document.addEventListener('change', (ev) => { const tg = ev.target; if (!tg || !/hub\\d+(Station|StaTxt)$/.test(tg.id || '') || !tg.closest || !tg.closest('#screen-input')) return; clearTimeout(pbHubOrderT); pbHubOrderT = setTimeout(() => { try { window.pbHubOrder(); window.pbXingOrder(); } catch (e) { console.error(e); } }, 250); }, true);
  window.pbXingOrder = function(only) {""")
rep("""  window.pbRsxOrderNow = function() { try { if (document.querySelector('#screen-input .pb-xing-card')) window.pbXingOrder(); } catch (e) { console.error(e); } };""",
"""  window.pbRsxOrderNow = function() { try { window.pbHubOrder(); if (document.querySelector('#screen-input .pb-xing-card')) window.pbXingOrder(); } catch (e) { console.error(e); } };""")
open(sys.argv[2],'w').write(s); print('ok')
