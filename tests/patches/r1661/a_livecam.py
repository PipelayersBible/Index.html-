import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)
rep("    pbAiEnsurePrivacy(() => { const inp = document.getElementById(prefix + 'AiStakePhoto'); if (inp) inp.click(); });",
    "    pbAiEnsurePrivacy(() => { const inp = document.getElementById(prefix + 'AiStakePhoto'); if (window.pbLiveCam && window.pbLiveCam.ok()) window.pbLiveCam.open({ max: 2, review: true, title: 'Front of the stake', onDone: (files) => window.pbStakeAiPhoto(prefix, { files, value: '' }), onFail: () => { if (inp) inp.click(); } }); else if (inp) inp.click(); }); /* r16.61: in-app camera stays open for the back */")
rep("window.pbStakeAiAddBack = function(prefix) { const a = pbStakeAiAfter[prefix]; if (!a || pbStakeAiStale(prefix, a.ctx)) return; pbStakeAiFront[prefix] = { img: a.img, ctx: a.ctx }; const inp = document.getElementById(prefix + 'AiStakePhoto'); if (inp) inp.click(); };",
    "window.pbStakeAiAddBack = function(prefix) { const a = pbStakeAiAfter[prefix]; if (!a || pbStakeAiStale(prefix, a.ctx)) return; pbStakeAiFront[prefix] = { img: a.img, ctx: a.ctx }; const inp = document.getElementById(prefix + 'AiStakePhoto'); if (window.pbLiveCam && window.pbLiveCam.ok()) window.pbLiveCam.open({ max: 1, review: true, title: 'Back of the stake', onDone: (files) => window.pbStakeAiPhoto(prefix, { files, value: '' }), onFail: () => { if (inp) inp.click(); } }); else if (inp) inp.click(); };")
rep("    d.querySelector('#pbBatchBtn').addEventListener('click', () => pbAiEnsurePrivacy(() => { const i = document.getElementById('pbBatchInput'); if (i) i.click(); }));",
    "    d.querySelector('#pbBatchBtn').addEventListener('click', () => pbAiEnsurePrivacy(() => { const i = document.getElementById('pbBatchInput'); if (window.pbLiveCam && window.pbLiveCam.ok()) window.pbLiveCam.open({ max: 30, title: 'Shoot every stake, then Done', library: () => { if (i) i.click(); }, onDone: (files) => window.pbStakeBatch({ files, value: '' }), onFail: () => { if (i) i.click(); } }); else if (i) i.click(); }));")
tail = r"""<!-- r16.61:livecam -->
<script>
// r16.61: an in-app camera for the stake reader. The phone's own camera closes after every shot when a web app opens it;
// this one stays open: shoot the front and back (or every stake in a row), then it hands the photos over as files.
// Frames are taken from the camera's video at its best size (up to 4K); the stake reader uses 1600 px.
(function () {
  'use strict';
  function ok() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  function open(o) {
    o = o || {}; var max = o.max || 2, shots = [], stream = null, closed = false;
    var el = document.createElement('div'); el.className = 'pb-lc'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Camera');
    el.innerHTML = '<video playsinline muted autoplay></video><div class="pb-lc-top"><span class="pb-lc-t"></span><span class="pb-lc-n"></span></div><div class="pb-lc-strip"></div>'
      + '<div class="pb-lc-bar"><button type="button" class="pb-lc-x">Cancel</button><button type="button" class="pb-lc-shot" aria-label="Take photo"></button><button type="button" class="pb-lc-done">Done</button></div><div class="pb-lc-flash"></div>';
    document.body.appendChild(el); css();
    var v = el.querySelector('video'), t = el.querySelector('.pb-lc-t'), n = el.querySelector('.pb-lc-n'), strip = el.querySelector('.pb-lc-strip'), done = el.querySelector('.pb-lc-done'), shot = el.querySelector('.pb-lc-shot'), x = el.querySelector('.pb-lc-x');
    t.textContent = o.title || ''; done.disabled = true;
    if (o.library) { var lb = document.createElement('button'); lb.type = 'button'; lb.className = 'pb-lc-lib'; lb.textContent = 'From Photos'; el.querySelector('.pb-lc-top').appendChild(lb); lb.onclick = function () { stop(); o.library(); }; }
    function stop() { if (closed) return; closed = true; try { if (stream) stream.getTracks().forEach(function (k) { k.stop(); }); } catch (e) {} el.remove(); }
    function finish() { var f = shots.slice(); stop(); if (f.length && o.onDone) o.onDone(f); }
    x.onclick = function () { stop(); };
    // stake photos: each shot is shown with Retake / Another Photo / Use Photo
    function review(src) {
      var r = document.createElement('div'); r.className = 'pb-lc-rv';
      var more = shots.length < max;
      r.innerHTML = '<img alt="Photo just taken"><div class="pb-lc-rvbar"><button type="button" class="pb-lc-re">Retake</button>' + (more ? '<button type="button" class="pb-lc-more">Another Photo</button>' : '') + '<button type="button" class="pb-lc-use">Use Photo' + (shots.length > 1 ? 's' : '') + '</button></div>';
      r.querySelector('img').src = src; el.appendChild(r);
      r.querySelector('.pb-lc-re').onclick = function () { shots.pop(); var last = strip.lastElementChild; if (last) last.remove(); n.textContent = shots.length ? shots.length + ' of ' + max : ''; done.disabled = !shots.length; done.textContent = shots.length ? 'Done (' + shots.length + ')' : 'Done'; r.remove(); };
      if (more) r.querySelector('.pb-lc-more').onclick = function () { r.remove(); t.textContent = o.nextTitle || 'Back of the stake'; };
      r.querySelector('.pb-lc-use').onclick = function () { r.remove(); finish(); };
    }
    done.onclick = finish;
    shot.onclick = function () {
      if (!v.videoWidth || shot.disabled) return;
      var c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      var fl = el.querySelector('.pb-lc-flash'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
      shot.disabled = true;
      c.toBlob(function (b) {
        shot.disabled = false; if (!b) return;
        var f = new File([b], 'stake-' + Date.now() + '-' + (shots.length + 1) + '.jpg', { type: 'image/jpeg', lastModified: Date.now() });
        shots.push(f); var im = document.createElement('img'); im.src = URL.createObjectURL(b); strip.appendChild(im);
        n.textContent = shots.length + (max < 30 ? ' of ' + max : ' taken'); done.disabled = false; done.textContent = 'Done (' + shots.length + ')';
        if (o.review) { review(im.src); return; }
        if (shots.length >= max) finish();
      }, 'image/jpeg', 0.92);
    };
    navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } } }).then(function (s) {
      if (closed) { s.getTracks().forEach(function (k) { k.stop(); }); return; }
      stream = s; v.srcObject = s; var p = v.play(); if (p && p.catch) p.catch(function () {});
    }).catch(function () { stop(); if (o.onFail) o.onFail(); });
  }
  function css() {
    if (document.getElementById('pbLcCss')) return;
    var s = document.createElement('style'); s.id = 'pbLcCss';
    s.textContent = '.pb-lc{position:fixed;inset:0;z-index:2147483100;background:#000;color:#fff;font:600 16px system-ui,-apple-system,sans-serif}'
      + '.pb-lc video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}'
      + '.pb-lc-top{position:absolute;left:0;right:0;top:0;padding:calc(14px + env(safe-area-inset-top)) 16px 12px;display:flex;gap:12px;align-items:center;background:linear-gradient(rgba(0,0,0,.6),transparent)}'
      + '.pb-lc-t{flex:1;min-width:0}.pb-lc-n{color:#F5BF1F}.pb-lc-lib{background:rgba(0,0,0,.55);color:#fff;border:1px solid rgba(255,255,255,.5);border-radius:22px;min-height:44px;padding:0 14px;font:inherit}'
      + '.pb-lc-strip{position:absolute;left:12px;right:12px;bottom:calc(120px + env(safe-area-inset-bottom));display:flex;gap:6px;overflow-x:auto}.pb-lc-strip img{width:52px;height:52px;object-fit:cover;border-radius:8px;border:2px solid #fff;flex:none}'
      + '.pb-lc-bar{position:absolute;left:0;right:0;bottom:0;padding:16px 20px calc(20px + env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:space-between;background:linear-gradient(transparent,rgba(0,0,0,.7))}'
      + '.pb-lc-bar button{font:inherit;color:#fff;background:none;border:0;min-width:88px;min-height:48px}.pb-lc-done{color:#F5BF1F!important}.pb-lc-done:disabled{opacity:.4}'
      + '.pb-lc-shot{width:76px!important;height:76px;min-width:76px!important;border-radius:50%!important;background:#fff!important;border:5px solid #F5BF1F!important;box-shadow:0 0 0 3px #000}.pb-lc-shot:active{transform:scale(.94)}'
      + '.pb-lc-rv{position:absolute;inset:0;background:#000;display:flex;flex-direction:column}.pb-lc-rv img{flex:1;min-height:0;width:100%;object-fit:contain}'
      + '.pb-lc-rvbar{display:flex;gap:8px;padding:12px 12px calc(16px + env(safe-area-inset-bottom))}.pb-lc-rvbar button{flex:1;min-height:52px;border-radius:12px;border:1px solid rgba(255,255,255,.5);background:rgba(255,255,255,.08);color:#fff;font:600 16px system-ui,-apple-system,sans-serif}.pb-lc-rvbar .pb-lc-use{background:#F5BF1F;color:#14171c;border-color:#F5BF1F}'
      + '.pb-lc-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}.pb-lc-flash.on{animation:pbLcF .25s ease-out}@keyframes pbLcF{from{opacity:.7}to{opacity:0}}';
    document.head.appendChild(s);
  }
  window.pbLiveCam = { ok: ok, open: open };
})();
</script>
</body>
</html>"""
i = s.rstrip().rfind('</body>')
s = s[:i] + tail + '\n'
s = s.replace("const PB_APP_BUILD = 'r16.60 · 2026-11-16';", "const PB_APP_BUILD = 'r16.61 · 2026-11-16';")
assert "r16.61 · 2026-11-16" in s
open(out, 'w', encoding='utf-8').write(s)
