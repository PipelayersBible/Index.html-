import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# perf audit 04 (Nov 17, on r16.97) [low-medium: ~0.15-0.25 s of every start-up on a cheap phone, plus its memory]:
# jsPDF + AutoTable (~400 KB of script) were compiled and run at every start-up although a PDF is made only on a tap
# (or by the background seal pass). Like pdf.js already is, they are now kept as inert text and run the first time
# anything reads window.jspdf (pdfLibReady(), new jspdf.jsPDF, a test hooking jspdf.jsPDF.API): the read itself loads
# them, synchronously, so every caller sees exactly what it saw before. Still bundled: works with no signal.
rep("""<script>
/* jsPDF 2.5.1 (MIT) — bundled into this file so PDF export works with no connection.""",
"""<script type="text/plain" id="pbJsPdfSrc">
/* jsPDF 2.5.1 (MIT) — bundled into this file so PDF export works with no connection.""")
rep("""<script>
/* jsPDF-AutoTable 3.5.25 (MIT) — bundled into this file so PDF tables work with no connection.""",
"""<script type="text/plain" id="pbJsPdfAtSrc">
/* jsPDF-AutoTable 3.5.25 (MIT) — bundled into this file so PDF tables work with no connection.""")
rep("""<!-- pdf.js 3.5.141 (Apache-2.0), bundled as INERT TEXT""",
"""<script>
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
  }
  try {
    Object.defineProperty(window, 'jspdf', { configurable: true, enumerable: true,
      get: function () { load(); return window.jspdf; },
      set: function (v) { Object.defineProperty(window, 'jspdf', { value: v, writable: true, configurable: true, enumerable: true }); } });
  } catch (e) { load(); }
})();
</script>
<!-- pdf.js 3.5.141 (Apache-2.0), bundled as INERT TEXT""")
open(out, 'w', encoding='utf-8').write(s)
