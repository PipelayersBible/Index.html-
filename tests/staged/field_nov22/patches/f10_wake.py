# F10 screen wake: r17.15 asked for the screen wake lock the moment the app opened and again every time it came back
# (keep-awake the whole time the app was on screen: battery). Now the screen is kept awake only while it is clearly
# needed: an entry permit is open (or a closed permit's emergency panel is still open), or Run Results shows a run that
# is going (not on a break, not ended). Checked when the screen changes, when the app comes back, and every 5 s; the
# lock is let go as soon as none of those holds. The plan-set upload keeps its own wake lock (unchanged).
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from _rep import P
p = P()
p.rep('''  // ---------- keep screen awake while the app is open (best effort) ----------
  let pbWakeLock = null;
  async function pbRequestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        pbWakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (e) { /* not supported here, or blocked by the embedding context — best effort only */ }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pbRequestWakeLock();
  });
  pbRequestWakeLock();
''', '''  // ---------- keep the screen awake only while it is needed (best effort) ----------
  // field_nov22 F10: an open entry permit (or a closed permit's emergency still open), or Run Results on a run going.
  let pbWakeLock = null, pbWakeAsking = false;
  function pbWakeWanted() {
    try { if (confinedPermit) return 'permit'; } catch (e) {}
    try { if (pbClosedEmergencyShown) return 'emergency'; } catch (e) {}
    try {
      if (pbCurrentScreen === 'results') { const e = getCurrentArchiveEntry(); if (e && e.kind === 'run' && !e.completed && !e.incomplete && !e.onBreak) return 'run'; }
    } catch (e) {}
    return '';
  }
  async function pbRequestWakeLock() {
    if (pbWakeAsking || (pbWakeLock && !pbWakeLock.released)) return;
    pbWakeAsking = true;
    try {
      if ('wakeLock' in navigator) {
        const l = await navigator.wakeLock.request('screen'); pbWakeLock = l;
        try { l.addEventListener('release', () => { if (pbWakeLock === l) pbWakeLock = null; }); } catch (e) {}
      }
    } catch (e) { /* not supported here, or blocked by the embedding context — best effort only */ }
    pbWakeAsking = false;
    if (!pbWakeWanted()) pbWakeCheck(); // the need ended while asking
  }
  function pbWakeCheck() {
    const want = document.visibilityState === 'visible' && !!pbWakeWanted();
    if (want) { pbRequestWakeLock(); return; }
    const l = pbWakeLock; pbWakeLock = null;
    if (l && !l.released) { try { l.release().catch(() => {}); } catch (e) {} }
  }
  window.pbWakeState = () => ({ wanted: pbWakeWanted(), held: !!(pbWakeLock && !pbWakeLock.released) });
  document.addEventListener('visibilitychange', () => { try { pbWakeCheck(); } catch (e) {} });
  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(() => { setTimeout(() => { try { pbWakeCheck(); } catch (e) {} }, 0); });
  setInterval(() => { try { pbWakeCheck(); } catch (e) {} }, 5000);
''')
p.save()
