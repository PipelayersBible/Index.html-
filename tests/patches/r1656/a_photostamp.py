import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:80])
    s = s.replace(a, b)

# pbAddPhoto: a photo just taken gets the stamp (time, GPS, compass, address) in a band under it; not report-a-problem photos
rep("    const tempUrl = URL.createObjectURL(file);\n    const img = new Image();\n    img.onload = function() { try { pbAddPhotoDecoded(); } finally { if (riExif) riExif.then(finishCapture, finishCapture); else finishCapture(); } };\n    const pbAddPhotoDecoded = function() {",
    "    const stampCtx = prefix !== 'riPhoto' && window.pbCam ? window.pbCam.ctxFor(file) : null; /* r16.56 */\n    const tempUrl = URL.createObjectURL(file);\n    const img = new Image();\n    img.onload = function() { Promise.resolve().then(pbAddPhotoDecoded).catch(e => console.error('photo', e)).finally(() => { if (riExif) riExif.then(finishCapture, finishCapture); else finishCapture(); }); };\n    const pbAddPhotoDecoded = async function() {")
rep("      const dataUrl = canvas.toDataURL('image/jpeg', 0.72);\n      URL.revokeObjectURL(tempUrl);\n      const newPhotoEntry = { url: dataUrl, name: file.name, captureId: 'cap-' + Date.now().toString(36) + '-' + (++pbCaptureSeq) };",
    "      URL.revokeObjectURL(tempUrl);\n      let outCanvas = canvas, stampMeta = null;\n      if (stampCtx) { try { const r = await window.pbCam.stamp(canvas, stampCtx); outCanvas = r.canvas; stampMeta = r.meta; } catch (e) { console.error('stamp', e); }\n        if (window._pbPhotoContextGen !== captureGen || (window._pbPointLifecycleGen[prefix] || 0) !== captureLifecycleGen) return; }\n      const dataUrl = outCanvas.toDataURL('image/jpeg', 0.72);\n      const newPhotoEntry = { url: dataUrl, name: file.name, captureId: 'cap-' + Date.now().toString(36) + '-' + (++pbCaptureSeq) }; if (stampMeta) newPhotoEntry.stamp = stampMeta;")
# stake reader photos: the stamp from when they were taken
rep("      return { mediaType: 'image/jpeg', data: data.slice(data.indexOf(',') + 1), w: c.width, h: c.height, extras };",
    "      return { mediaType: 'image/jpeg', data: data.slice(data.indexOf(',') + 1), w: c.width, h: c.height, extras, stampCtx: window.pbCam ? window.pbCam.ctxFor(file) : null }; /* r16.56 */")
rep("        const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(el, 0, 0, w, h);\n        out.push({ url: c.toDataURL('image/jpeg', 0.72),",
    "        let c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(el, 0, 0, w, h);\n        let sm = null; if (im.stampCtx && window.pbCam) { try { const r = await window.pbCam.stamp(c, im.stampCtx); c = r.canvas; sm = r.meta; } catch (e) {} } /* r16.56 */\n        out.push({ stamp: sm || undefined, url: c.toDataURL('image/jpeg', 0.72),")
# Run Setup thumbs say whose they are (for Caption in the viewer)
rep("list.innerHTML = photos.map((p,i) => `<span class=\"pb-photo-chip\"><img class=\"pb-photo-thumb\" src=\"${pbSafePhotoUrl(p.url || p)}\">",
    "list.innerHTML = photos.map((p,i) => `<span class=\"pb-photo-chip\"><img class=\"pb-photo-thumb\" src=\"${pbSafePhotoUrl(p.url || p)}\"${(explicitPhotos === undefined && !locked && pbCurrentScreen === 'input' && !pbFormPhotoLocked(prefix, p.url || p)) ? ` data-pfx=\"${prefix}\" data-i=\"${i}\"` : ''}>")
rep("  window.pbRemovePhoto = function(prefix, idx) {",
    "  window.pbPhotoChanged = function(prefix) { renderPhotoList(prefix); if (pbCurrentScreen === 'input') { try { pbStampFormEdit(); pbNoteFormEdit(); } catch (e) {} } }; /* r16.56: a caption changed a photo */\n  window.pbRemovePhoto = function(prefix, idx) {")

rep("        if (capturedNoteIdx === null && pbCurrentScreen === 'input') pbNoteFormEdit(); // a point photo added on the run form",
    "        if (capturedNoteIdx === null && pbCurrentScreen === 'input' && window.pbCapOffer) window.pbCapOffer(prefix, newPhotoEntry); /* r16.56: optional caption box under it */\n        if (capturedNoteIdx === null && pbCurrentScreen === 'input') pbNoteFormEdit(); // a point photo added on the run form")
tail = r"""<!-- r16.56:photostamp -->
<script>
// r16.56: photo stamp. A photo taken with the camera just now (its file is under 3 minutes old) gets a band under it with
// the date and time, the compass direction, the GPS position (± ft) and the street address (OpenStreetMap Nominatim,
// cached, at most 1 lookup a second, 2.5 s wait), plus an optional caption added in the photo viewer. Photos picked
// from the library get nothing: where and when they were taken isn't known. Location runs only while Run Setup or Run
// Results is in use (5 minutes after the last tap).
(function () {
  'use strict';
  var G = { fix: null, watch: null, stopT: 0, head: null, headAt: 0, ori: false, addr: new Map(), lastReq: 0 };
  function stopSoon() { clearTimeout(G.stopT); G.stopT = setTimeout(function () { if (G.watch !== null) { try { navigator.geolocation.clearWatch(G.watch); } catch (e) {} G.watch = null; } }, 300000); }
  function geoOn() {
    try {
      if (navigator.geolocation && G.watch === null) G.watch = navigator.geolocation.watchPosition(function (p) {
        var c = p && p.coords; if (!c || !isFinite(c.latitude) || !isFinite(c.longitude)) return;
        G.fix = { lat: c.latitude, lng: c.longitude, acc: c.accuracy, at: Date.now() }; addrFor(G.fix);
      }, function () {}, { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 });
    } catch (e) {}
    stopSoon();
  }
  function oriOn() {
    if (G.ori) return;
    var listen = function () { if (G.ori) return; G.ori = true; window.addEventListener('deviceorientation', function (e) {
      var h = null; if (typeof e.webkitCompassHeading === 'number' && e.webkitCompassHeading >= 0) h = e.webkitCompassHeading; else if (e.absolute && typeof e.alpha === 'number') h = (360 - e.alpha) % 360;
      if (h !== null && isFinite(h)) { G.head = h; G.headAt = Date.now(); } }, true); };
    try { var D = window.DeviceOrientationEvent; if (!D) return; if (typeof D.requestPermission === 'function') D.requestPermission().then(function (r) { if (r === 'granted') listen(); }).catch(function () {}); else listen(); } catch (e) {}
  }
  // a tap on Run Setup / Run Results starts location; the compass asks on a tap that isn't the camera (two pop-ups at once lose one)
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest || !t.closest('#screen-input, #screen-results')) return;
    geoOn();
    var b = t.closest('button, label, input[type=file]'), cam = b && (b.matches('input[type=file]') || /photo|stake w\/|read stake/i.test(b.textContent || '') || /Photo'\)\.click|AiStake/.test(b.getAttribute('onclick') || ''));
    if (!cam) oriOn();
  }, true);
  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function (name) { if (name === 'input' || name === 'results') geoOn(); });
  function key(f) { return f.lat.toFixed(4) + ',' + f.lng.toFixed(4); }
  function addrFor(f) {
    if (!f) return Promise.resolve(null);
    var k = key(f), v = G.addr.get(k); if (v !== undefined) return Promise.resolve(v);
    if (navigator.onLine === false || Date.now() - G.lastReq < 1100) return Promise.resolve(null);
    G.lastReq = Date.now();
    var p = fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=' + f.lat.toFixed(6) + '&lon=' + f.lng.toFixed(6), { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        var a = j && j.address; if (!a) return null;
        var st = [a.house_number, a.road].filter(Boolean).join(' '), city = a.city || a.town || a.village || a.hamlet || a.suburb || a.county || '';
        var stz = [(a['ISO3166-2-lvl4'] || '').replace(/^US-/, '') || a.state || '', a.postcode || ''].filter(Boolean).join(' ');
        var s = [st, city, stz].filter(Boolean).join(', '); G.addr.set(k, s || null); return s || null;
      }).catch(function () { return null; });
    G.addr.set(k, undefined);
    return p;
  }
  function wait(p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(function () { r(null); }, ms); })]); }
  function ctxFor(file) {
    var now = Date.now(), lm = Number(file && file.lastModified) || 0;
    if (!lm || Math.abs(now - lm) > 180000) return null; // from the library: not stamped
    var f = G.fix && now - G.fix.at < 180000 ? G.fix : null, h = G.head !== null && now - G.headAt < 20000 ? G.head : null;
    var tz = ''; try { tz = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date(lm)).find(function (x) { return x.type === 'timeZoneName'; }).value; } catch (e) {}
    return { at: lm, tz: tz, geo: f ? { lat: f.lat, lng: f.lng, acc: f.acc } : null, head: h, addr: f ? (G.addr.get(key(f)) || null) : null };
  }
  var DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  function lines(m) {
    var d = new Date(m.at), p = function (n) { return (n < 10 ? '0' : '') + n; };
    var hh = d.getHours(), t = (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear() + '  ' + ((hh % 12) || 12) + ':' + p(d.getMinutes()) + ' ' + (hh < 12 ? 'AM' : 'PM') + (m.tz ? ' ' + m.tz : '');
    if (m.head !== null && m.head !== undefined) t += '   ' + DIRS[Math.round(m.head / 45) % 8] + ' ' + Math.round(m.head) + '°';
    var L = [t];
    L.push(m.geo ? m.geo.lat.toFixed(5) + ', ' + m.geo.lng.toFixed(5) + (isFinite(m.geo.acc) ? '  (±' + Math.max(1, Math.round(m.geo.acc * 3.28084)) + ' ft)' : '') : 'No GPS position');
    if (m.addr) L.push(m.addr);
    if (m.caption) L.push(m.caption);
    return L;
  }
  function draw(base, w, h, m) {
    var fs = Math.max(13, Math.round(w * 0.026)), lh = Math.round(fs * 1.3), pad = Math.round(fs * 0.6), tmp = document.createElement('canvas').getContext('2d');
    tmp.font = '600 ' + fs + 'px system-ui, -apple-system, sans-serif';
    var max = w - pad * 2 - Math.round(fs * 0.4), out = [];
    lines(m).forEach(function (ln, i) { var words = String(ln).split(' '), cur = ''; words.forEach(function (wd) { var nx = cur ? cur + ' ' + wd : wd; if (cur && tmp.measureText(nx).width > max) { out.push([cur, i]); cur = wd; } else cur = nx; }); out.push([cur, i]); });
    var bh = pad * 2 + out.length * lh, c = document.createElement('canvas'); c.width = w; c.height = h + bh;
    var g = c.getContext('2d'); g.drawImage(base, 0, 0, w, h, 0, 0, w, h);
    g.fillStyle = '#14171c'; g.fillRect(0, h, w, bh); g.fillStyle = '#F5BF1F'; g.fillRect(0, h, Math.max(4, Math.round(fs * 0.25)), bh);
    g.textBaseline = 'top';
    out.forEach(function (o, k) { var cap = m.caption && o[1] === lines(m).length - 1; g.font = (cap ? '700 ' : '600 ') + fs + 'px system-ui, -apple-system, sans-serif'; g.fillStyle = cap ? '#F5BF1F' : '#ffffff'; g.fillText(o[0], pad + Math.round(fs * 0.4), h + pad + k * lh); });
    return { canvas: c, meta: Object.assign({}, m, { w: w, h: h, band: bh }) };
  }
  async function stamp(canvas, ctx) {
    var m = Object.assign({}, ctx);
    if (m.geo && !m.addr) m.addr = await wait(addrFor(m.geo), 2500);
    return draw(canvas, canvas.width, canvas.height, m);
  }
  // Caption: the photo is redrawn from its own pixels above the band, with the caption added (or removed)
  function recaption(entry, text) {
    return new Promise(function (ok, no) {
      var im = new Image(); im.onload = function () {
        var st = entry.stamp || null, w = st ? st.w : im.width, h = st ? st.h : im.height;
        var m = st ? Object.assign({}, st) : { at: null, caption: '' }; m.caption = String(text || '').trim().slice(0, 120);
        if (!st && !m.caption) { ok(entry); return; }
        var r = st ? draw(im, w, h, m) : drawCaptionOnly(im, w, h, m);
        entry.url = r.canvas.toDataURL('image/jpeg', 0.72); entry.stamp = r.meta; ok(entry);
      }; im.onerror = no; im.src = entry.url;
    });
  }
  function drawCaptionOnly(im, w, h, m) { // a library photo: a band with the caption only
    var save = lines; lines = function () { return [m.caption]; };
    try { var r = draw(im, w, h, m); r.meta.captionOnly = true; return r; } finally { lines = save; }
  }
  window.pbCam = { ctxFor: ctxFor, stamp: stamp, recaption: recaption, _g: G };
  // right after a photo: an optional caption box under the photos (ignore it and the photo is done)
  window.pbCapOffer = function (pfx, en) {
    try {
      var list = document.getElementById(pfx + 'PhotoList'); if (!list || !en) return;
      var old = document.getElementById(pfx + 'CapOffer'); if (old) old.remove();
      var d = document.createElement('div'); d.id = pfx + 'CapOffer'; d.className = 'pb-capoffer';
      d.innerHTML = '<input type="text" maxlength="120" enterkeyhint="done" placeholder="Caption (optional)" aria-label="Caption for this photo"><button type="button" class="pb-btn small">Save</button>';
      list.parentNode.insertBefore(d, list.nextSibling);
      var inp = d.querySelector('input'), btn = d.querySelector('button');
      var save = function () { var t = inp.value.trim(); if (!t) { d.remove(); return; } btn.disabled = true; recaption(en, t).then(function () { d.remove(); if (window.pbPhotoChanged) window.pbPhotoChanged(pfx); }).catch(function () { btn.disabled = false; }); };
      btn.onclick = save; inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); save(); } });
    } catch (e) { console.error('r16.56 caption offer', e); }
  };
  if (!document.getElementById('pbCapOfferCss')) { var cs0 = document.createElement('style'); cs0.id = 'pbCapOfferCss'; cs0.textContent = '#pbApp .pb-capoffer{display:flex;gap:8px;align-items:center;margin:8px 0 4px}#pbApp .pb-capoffer input{flex:1;min-width:0}#pbApp .pb-capoffer .pb-btn{flex:none;min-height:44px;padding:0 16px}'; document.head.appendChild(cs0); }
  // the viewer: Caption, for a Run Setup photo that isn't part of a locked run yet
  var V0 = window.pbPhotoViewer;
  if (typeof V0 === 'function') window.pbPhotoViewer = function (list, i, from) {
    V0.apply(this, arguments);
    try {
      var pfx = from && from.dataset && from.dataset.pfx; if (!pfx) return;
      var el = document.querySelector('.pb-pv'); if (!el) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cap'; b.textContent = 'Caption'; el.appendChild(b);
      if (!document.getElementById('pbCapCss')) { var cs = document.createElement('style'); cs.id = 'pbCapCss'; cs.textContent = '.pb-pv .cap{bottom:calc(44px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:auto!important;padding:0 20px!important;font:600 16px/48px system-ui,sans-serif!important}.pb-pv .pb-capbox{position:absolute;left:12px;right:12px;bottom:calc(100px + env(safe-area-inset-bottom));display:flex;gap:8px}.pb-pv .pb-capbox input{flex:1;min-width:0;height:48px;border-radius:12px;border:0;padding:0 14px;font:16px system-ui,sans-serif}.pb-pv .pb-capbox button{position:static;width:auto;padding:0 18px;font:600 16px system-ui,sans-serif;background:#F5BF1F;color:#14171c}'; document.head.appendChild(cs); }
      b.onclick = function () {
        var cur = el.querySelector('img'), list2 = (window._pbPhotos || {})[pfx] || [], en = list2.find(function (p) { return p && p.url === cur.src; }); if (!en) return;
        var box = el.querySelector('.pb-capbox'); if (box) { box.remove(); return; }
        box = document.createElement('div'); box.className = 'pb-capbox';
        box.innerHTML = '<input type="text" maxlength="120" enterkeyhint="done" placeholder="Caption"><button type="button">Save</button>';
        el.appendChild(box); var inp = box.querySelector('input'); inp.value = (en.stamp && en.stamp.caption) || ''; inp.focus();
        ['pointerdown', 'pointerup', 'pointermove', 'click'].forEach(function (t) { box.addEventListener(t, function (ev) { ev.stopPropagation(); }); });
        var save = function () { recaption(en, inp.value).then(function () { cur.src = en.url; box.remove(); if (window.pbPhotoChanged) window.pbPhotoChanged(pfx); }).catch(function () { box.remove(); }); };
        box.querySelector('button').onclick = save; inp.addEventListener('keydown', function (ev) { ev.stopPropagation(); if (ev.key === 'Enter') save(); });
      };
    } catch (e) { console.error('r16.56 caption', e); }
  };
})();
</script>
</body>
</html>"""
i = s.rstrip().rfind('</body>')
s = s[:i] + tail + '\n'
s = s.replace("const PB_APP_BUILD = 'r16.55 · 2026-11-16';", "const PB_APP_BUILD = 'r16.56 · 2026-11-16';")
assert "r16.56 · 2026-11-16" in s
open(out, 'w', encoding='utf-8').write(s)
