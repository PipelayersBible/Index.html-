#!/usr/bin/env python3
# speed2 #53 (page side; the build step is build/build.py). Lets the big, rarely used parts live in their own files
# next to the page (pbx/<name>-<fingerprint>.js) instead of inside it, the way pdf.js already sat as inert text:
#  - pdf.js + its worker (cutsheet PDF reader, plans viewer; ~370 KB gzipped): when the build moved them out, their
#    inert <script> is empty and names the file (data-pb-src). pbEnsurePdfjs (already async) reads the file first.
#  - jsPDF + AutoTable (~127 KB gzipped): the r17.01 getter on window.jspdf runs them synchronously on first use; when
#    the build moved them out, the page reads them in the background shortly after it has loaded, so they are there
#    long before anyone makes a PDF; read on first use (synchronous request) if a PDF is made in the first seconds.
#  - pbLazyText(): the phone's own copy first (Cache Storage 'pb-lazy-v1', which the service worker fills when it
#    stores a page, and this page fills too), else the network (then kept). So the parts work offline after the first
#    load even without a service worker. 10 s after load (with signal) the parts not kept yet are fetched and kept.
# The source page (blocks still inline, no data-pb-src) behaves exactly as before.
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

rep("""<script>
/* perf audit 04: jsPDF + AutoTable (the two inert blocks above) run the first time window.jspdf is read. */
(function () {
  var done = false;
  function load() {
    if (done) return; done = true;
    try { delete window.jspdf; } catch (e) {}
    ['pbJsPdfSrc', 'pbJsPdfAtSrc'].forEach(function (id) {
      var el = document.getElementById(id); if (!el) return;
      try { var sc = document.createElement('script'); sc.text = el.textContent; (document.head || document.documentElement).appendChild(sc); } catch (e) { console.error('PDF tool', e); }
    });
  }""",
"""<script>
/* speed2 #53: parts kept in their own files (pbx/...): the phone's own copy first, else the network (then kept). */
(function () {
  var CACHE = 'pb-lazy-v1';
  function abs(src) { return new URL(src, window.location.href).href; }
  window.pbLazyText = function (src) {
    var u = abs(src);
    var kept = function () { if (!window.caches) return Promise.resolve(null); return caches.open(CACHE).then(function (c) { return c.match(u); }).then(function (r) { return r ? r.text() : null; })['catch'](function () { return null; }); };
    return kept().then(function (t) {
      if (t) return t;
      return fetch(u, { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var copy = r.clone();
        if (window.caches) caches.open(CACHE).then(function (c) { return c.put(u, copy); })['catch'](function () {});
        return r.text();
      });
    });
  };
  // first use before the background read finished: read now (from the service worker's / browser's copy)
  window.pbLazySync = function (el) {
    try { var x = new XMLHttpRequest(); x.open('GET', abs(el.getAttribute('data-pb-src')), false); x.send(null); if (x.status === 200 && x.responseText) { el.textContent = x.responseText; return x.responseText; } } catch (e) {}
    return '';
  };
  window.addEventListener('load', function () {
    var els = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
    // jsPDF + AutoTable: read into the page soon after load (they must be at hand synchronously)
    setTimeout(function () {
      els('script[data-pb-src][data-pb-now]').forEach(function (el) { if (el.textContent) return; window.pbLazyText(el.getAttribute('data-pb-src')).then(function (t) { if (!el.textContent) el.textContent = t; })['catch'](function () {}); });
    }, 1500);
    // the rest (pdf.js): only kept on the phone for offline use, read when needed
    setTimeout(function () {
      if (navigator.onLine === false) return;
      els('script[data-pb-src]:not([data-pb-now])').forEach(function (el) { if (!el.textContent) window.pbLazyText(el.getAttribute('data-pb-src')).then(function () {}, function () {}); });
    }, 10000);
  });
})();
</script>
<script>
/* perf audit 04: jsPDF + AutoTable (the two inert blocks above) run the first time window.jspdf is read. */
(function () {
  var done = false;
  function load() {
    if (done) return; done = true;
    try { delete window.jspdf; } catch (e) {}
    ['pbJsPdfSrc', 'pbJsPdfAtSrc'].forEach(function (id) {
      var el = document.getElementById(id); if (!el) return;
      var code = el.textContent;
      if (!code && el.getAttribute('data-pb-src') && window.pbLazySync) code = window.pbLazySync(el); // speed2 #53: kept in its own file
      try { var sc = document.createElement('script'); sc.text = code; (document.head || document.documentElement).appendChild(sc); } catch (e) { console.error('PDF tool', e); }
    });
  }""")

rep("""      const libEl = document.getElementById('pbPdfjsLibSrc'), wkEl = document.getElementById('pbPdfjsWorkerSrc');
      if (!libEl || !wkEl) return !!window.pdfjsLib;""",
"""      const libEl = document.getElementById('pbPdfjsLibSrc'), wkEl = document.getElementById('pbPdfjsWorkerSrc');
      if (!libEl || !wkEl) return !!window.pdfjsLib;
      for (const el of [libEl, wkEl]) if (!el.textContent && el.getAttribute('data-pb-src')) el.textContent = await window.pbLazyText(el.getAttribute('data-pb-src')); // speed2 #53: kept in its own file""")

open(out, 'w', encoding='utf-8').write(s)
print('ok', out)
