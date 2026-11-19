#!/usr/bin/env python3
# speed2 #51 (page side; pairs with SW_01_cache_first_shell.py). The app now opens from the phone's own copy and the
# worker downloads the newest page behind it. This adds:
#  1) "New version ready - Reload": a slim line above the tabs when the worker stored a newer build than the one on
#     screen (it says so with {pb:'pb-update'}; the page also asks {pb:'shell-check'} 3 s after start and whenever the
#     app comes back to the foreground, and {pb:'shell-status'} when a new worker takes over). Reload with unsaved typing
#     on the screen asks first. Never shown on a "?pbprev=1" open (he just went back on purpose).
#  2) the boot watchdog (the screen shown when the app didn't start) gets "Load the Newest Version" (?pbfresh=1: the
#     worker's network-first path with the r17.01 4 s budget) and, when a worker controls the page, "Open the Previous
#     Version" (?pbprev=1: the previous copy, and the broken page is never stored again). ES5 like the rest of it.
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# 2) watchdog buttons
rep("""font:inherit; font-size:16px;">Close</button></div>""",
"""font:inherit; font-size:16px;">Close</button><button type="button" id="pbOldPhoneFresh" style="display:block; width:100%; max-width:300px; margin:14px auto 0; min-height:44px; border:1px solid #666; border-radius:12px; background:transparent; color:#fff; font:inherit; font-size:16px;">Load the Newest Version</button><button type="button" id="pbOldPhonePrev" style="display:none; width:100%; max-width:300px; margin:14px auto 0; min-height:44px; border:1px solid #666; border-radius:12px; background:transparent; color:#fff; font:inherit; font-size:16px;">Open the Previous Version</button></div>""")
rep("""    if (c) c.onclick = function () { el.style.display = 'none'; };
    el.style.display = 'block';""",
"""    if (c) c.onclick = function () { el.style.display = 'none'; };
    // speed2 #51: a way out of a page that won't start (the worker answers these two addresses specially)
    var go = function (q) { try { window.location.replace(window.location.pathname + '?' + q + '=1'); } catch (e) {} };
    var fr = document.getElementById('pbOldPhoneFresh'), pv = document.getElementById('pbOldPhonePrev');
    if (fr) fr.onclick = function () { go('pbfresh'); };
    var ctl = false; try { ctl = !!(navigator.serviceWorker && navigator.serviceWorker.controller) && !/[?&]pbprev=/.test(window.location.search); } catch (e) {}
    if (pv) { pv.style.display = ctl ? 'block' : 'none'; pv.onclick = function () { go('pbprev'); }; }
    el.style.display = 'block';""")

# 1) the update line
rep("""        if (d.pb === 'push-resync') pbPushSync({ background: true, check: true });
      });
    }
  } catch (e) {}
""",
"""        if (d.pb === 'push-resync') pbPushSync({ background: true, check: true });
      });
    }
  } catch (e) {}
  // speed2 #51: the app opens from the phone's own copy; when the worker has stored a newer build behind it, a slim
  // "New version ready - Reload" line shows above the tabs.
  (function pbUpdateLine() {
    let sw = null; try { sw = navigator.serviceWorker; } catch (e) {}
    if (!sw || typeof sw.addEventListener !== 'function') return;
    let prevMode = false; try { prevMode = /[?&]pbprev=/.test(window.location.search); } catch (e) {}
    const num = (b) => { const m = /^r(\\d+)\\.(\\d+)/.exec(String(b || '')); return m ? Number(m[1]) * 1000 + Number(m[2]) : null; };
    const newer = (b) => { if (!b || b === PB_APP_BUILD) return false; const a = num(b), c = num(PB_APP_BUILD); return a === null || c === null ? true : a > c; };
    let line = null;
    function reloadNow() {
      try {
        const q = new URLSearchParams(window.location.search); q.delete('pbfresh'); q.delete('pbprev');
        const qs = q.toString(); window.location.replace(window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
      } catch (e) { try { window.location.reload(); } catch (x) {} }
    }
    function tapReload() {
      let busy = null; try { busy = pbScreenFormWork(pbCurrentScreen); } catch (e) { busy = null; }
      if (!busy) { reloadNow(); return; }
      pbShowModal('What you are entering on this screen has NOT been saved. Save it first, or reload now and lose it.', [
        { label: 'Not Now' },
        { label: 'Reload Anyway', primary: true, onClick: reloadNow }
      ], 'New Version Ready');
    }
    function show(b) {
      if (line || prevMode || !newer(b)) return;
      line = document.createElement('div');
      line.id = 'pbUpdateLine'; line.setAttribute('role', 'status');
      line.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom, 0px));z-index:8500;margin:0 auto;max-width:480px;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 14px;border-radius:12px;background:var(--pb-raised, #1C2026);color:var(--pb-text, #F4F6F8);border:1px solid var(--pb-brand-line, rgba(244,197,66,.55));box-shadow:0 6px 18px rgba(0,0,0,.35);font:15px/1.3 var(--pb-font, sans-serif);';
      const t = document.createElement('span'); t.style.cssText = 'flex:1;'; t.textContent = 'New version ready';
      const r = document.createElement('button'); r.type = 'button'; r.id = 'pbUpdateReload'; r.textContent = 'Reload';
      r.style.cssText = 'min-height:40px;padding:0 16px;border:0;border-radius:10px;background:var(--pb-brand, #F4C542);color:var(--pb-brand-ink, #111318);font:600 15px/1 var(--pb-font, sans-serif);';
      r.addEventListener('click', tapReload);
      const x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'Later'); x.textContent = '\\u00d7';
      x.style.cssText = 'min-width:40px;min-height:40px;border:0;background:transparent;color:inherit;font-size:22px;line-height:1;';
      x.addEventListener('click', () => { if (line) line.style.display = 'none'; });
      line.appendChild(t); line.appendChild(r); line.appendChild(x);
      (document.body || document.documentElement).appendChild(line);
    }
    window.__pbUpdateLineShow = show; // tests
    sw.addEventListener('message', (ev) => { const d = ev && ev.data; if (d && typeof d === 'object' && (d.pb === 'pb-update' || d.pb === 'shell-status')) show(d.build); });
    const ask = (kind) => { try { if (sw.controller) sw.controller.postMessage({ pb: kind }); } catch (e) {} };
    setTimeout(() => ask('shell-check'), 3000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') ask('shell-check'); });
    sw.addEventListener('controllerchange', () => ask('shell-status'));
  })();
""")

open(out, 'w', encoding='utf-8').write(s)
print('ok', out)
