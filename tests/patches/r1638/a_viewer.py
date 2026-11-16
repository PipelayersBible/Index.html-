import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, old[:80]
    s = s.replace(old, new)
JS = r"""  // Photo viewer: tap a photo thumbnail to see it full screen. Pinch or double-tap to zoom, drag to move, rotate, swipe or arrows for the next photo.
  (function() {
    const THUMBS = 'img.pb-photo-thumb, .pb-sl-ph img, .pbd-thumb img, .pb-ai-qphotos img, .pb-ai-thumb img, img.pb-zoomable';
    const GROUPS = '[id$="PhotoList"], .pb-sl-photos, .pbd-thumbs, .pb-ai-qphotos, .pb-zoom-group';
    const css = '.pb-pv{position:fixed;inset:0;z-index:2147483000;background:#000;display:flex;align-items:center;justify-content:center;touch-action:none;overscroll-behavior:contain;user-select:none;-webkit-user-select:none}'
      + '.pb-pv img{max-width:100vw;max-height:100vh;max-height:100dvh;object-fit:contain;transform-origin:center center;will-change:transform;-webkit-user-drag:none}'
      + '.pb-pv button{position:absolute;width:48px;height:48px;border-radius:24px;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:24px;line-height:48px;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center}'
      + '.pb-pv .x{top:calc(12px + env(safe-area-inset-top));right:12px}.pb-pv .rot{top:calc(12px + env(safe-area-inset-top));left:12px}'
      + '.pb-pv .pv{left:8px;top:50%;margin-top:-24px}.pb-pv .nx{right:8px;top:50%;margin-top:-24px}'
      + '.pb-pv .n{position:absolute;bottom:calc(14px + env(safe-area-inset-bottom));left:0;right:0;text-align:center;color:#fff;font:600 14px/1.2 system-ui,sans-serif;text-shadow:0 1px 3px #000;pointer-events:none}'
      + THUMBS.split(', ').map(x => x + '{cursor:zoom-in}').join('');
    let st = null;
    function addCss() { if (document.getElementById('pbPvCss')) return; const el = document.createElement('style'); el.id = 'pbPvCss'; el.textContent = css; document.head.appendChild(el); }
    function apply() { const S = st; if (!S) return; S.img.style.transform = 'translate(' + S.x + 'px,' + S.y + 'px) scale(' + S.z + ') rotate(' + S.r + 'deg)'; }
    function show(i) {
      const S = st; if (!S) return;
      S.i = (i + S.list.length) % S.list.length; S.z = 1; S.x = 0; S.y = 0; S.r = 0;
      S.img.src = S.list[S.i]; apply();
      S.n.textContent = S.list.length > 1 ? (S.i + 1) + ' / ' + S.list.length : '';
      S.pv.hidden = S.nx.hidden = S.list.length < 2;
    }
    function close() { if (!st) return; st.el.remove(); document.removeEventListener('keydown', onKey, true); const f = st.from; st = null; try { f && f.focus && f.focus({ preventScroll: true }); } catch (e) {} }
    function onKey(e) { if (!st) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } else if (e.key === 'ArrowRight') show(st.i + 1); else if (e.key === 'ArrowLeft') show(st.i - 1); }
    function clampPan() { const S = st; if (S.z <= 1) { S.x = 0; S.y = 0; return; } const w = S.img.clientWidth * S.z, h = S.img.clientHeight * S.z, mx = Math.max(0, (w - innerWidth) / 2 + 40), my = Math.max(0, (h - innerHeight) / 2 + 40); S.x = Math.max(-mx, Math.min(mx, S.x)); S.y = Math.max(-my, Math.min(my, S.y)); }
    function zoomAt(z, cx, cy) { const S = st, nz = Math.max(1, Math.min(6, z)), k = nz / S.z; S.x = (S.x - (cx - innerWidth / 2)) * k + (cx - innerWidth / 2); S.y = (S.y - (cy - innerHeight / 2)) * k + (cy - innerHeight / 2); S.z = nz; clampPan(); apply(); }
    window.pbPhotoViewer = function(list, i, from) {
      if (!list || !list.length) return;
      addCss(); close();
      const el = document.createElement('div'); el.className = 'pb-pv'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Photo');
      el.innerHTML = '<img alt="Photo"><button type="button" class="x" aria-label="Close">✕</button><button type="button" class="rot" aria-label="Rotate">↻</button><button type="button" class="pv" aria-label="Previous photo">‹</button><button type="button" class="nx" aria-label="Next photo">›</button><div class="n"></div>';
      document.body.appendChild(el);
      st = { el, list, from, img: el.querySelector('img'), n: el.querySelector('.n'), pv: el.querySelector('.pv'), nx: el.querySelector('.nx'), i: 0, z: 1, x: 0, y: 0, r: 0 };
      el.querySelector('.x').onclick = close;
      el.querySelector('.rot').onclick = () => { st.r = (st.r + 90) % 360; st.z = 1; st.x = st.y = 0; apply(); };
      st.pv.onclick = () => show(st.i - 1); st.nx.onclick = () => show(st.i + 1);
      document.addEventListener('keydown', onKey, true);
      const pts = new Map(); let pinch = null, drag = null, lastTap = 0, moved = false, downOn = null;
      el.addEventListener('pointerdown', e => {
        if (e.target.closest('button')) return;
        el.setPointerCapture && el.setPointerCapture(e.pointerId);
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false; if (pts.size === 1) downOn = e.target;
        if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: st.z }; drag = null; }
        else if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, sx: st.x, sy: st.y, t: Date.now() };
      });
      el.addEventListener('pointermove', e => {
        if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch && pts.size >= 2) { const [a, b] = [...pts.values()]; zoomAt(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2); moved = true; return; }
        if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 8) moved = true; if (st.z > 1) { st.x = drag.sx + dx; st.y = drag.sy + dy; clampPan(); apply(); } }
      });
      const up = e => {
        if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
        if (pts.size < 2) pinch = null;
        if (pts.size || !drag) { if (!pts.size) drag = null; return; }
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y, quick = Date.now() - drag.t < 500; drag = null;
        if (st.z === 1 && quick && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && st.list.length > 1) { show(st.i + (dx < 0 ? 1 : -1)); return; }
        if (st.z === 1 && quick && dy > 100 && Math.abs(dy) > Math.abs(dx) * 1.5) { close(); return; }
        if (moved) return;
        const now = Date.now();
        if (now - lastTap < 320) { lastTap = 0; if (st.z > 1) { st.z = 1; st.x = st.y = 0; apply(); } else zoomAt(2.5, e.clientX, e.clientY); }
        else { lastTap = now; if (downOn === el && st.z === 1) setTimeout(() => { if (lastTap === now && st && st.el === el) close(); }, 330); }
      };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', e => { pts.delete(e.pointerId); pinch = null; drag = null; });
      el.addEventListener('wheel', e => { e.preventDefault(); zoomAt(st.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY); }, { passive: false });
      show(i || 0);
      el.querySelector('.x').focus({ preventScroll: true });
    };
    document.addEventListener('click', e => {
      const t = e.target, img = t && t.closest && t.closest(THUMBS); if (!img || !img.src || img.closest('.pb-pv')) return;
      const g = img.closest(GROUPS) || img.parentElement;
      const imgs = [...g.querySelectorAll(THUMBS)].filter(x => x.src);
      e.preventDefault(); e.stopPropagation();
      window.pbPhotoViewer(imgs.map(x => x.src), Math.max(0, imgs.indexOf(img)), img);
    }, true);
  })();
  function renderPhotoList(prefix, locked, explicitPhotos) {"""
rep("  function renderPhotoList(prefix, locked, explicitPhotos) {", JS)
# results-table note photos
rep("""it.photos.map(u => '<img src="' + pbSafePhotoUrl(u) + '" style="width:64px;height:64px;object-fit:cover;margin:4px""", """it.photos.map(u => '<img class="pb-zoomable" alt="Photo" src="' + pbSafePhotoUrl(u) + '" style="width:64px;height:64px;object-fit:cover;margin:4px""")
open(out, 'w', encoding='utf-8').write(s)
