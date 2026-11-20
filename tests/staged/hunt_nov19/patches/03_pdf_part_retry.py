# hunt_nov19 03: "PDF library didn't load - check your connection and try again" never worked on a second try.
# Since r17.08 jsPDF is its own file (pbx/...), read into the page 1.5 s after load. If it isn't on the phone yet when
# the first PDF is asked for (first open on a slow signal, or signal lost while the update came down) the one read
# fails, and the loader then never tried again: every Save PDF, report PDF and export failed with the same message
# until the app was closed and opened again, even with full signal back.
# Now a failed read is not final: nothing is marked done, and the next PDF reads the part again.
# Usage: python3 03_pdf_part_retry.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""  function load() {
    if (done) return; done = true;
    try { delete window.jspdf; } catch (e) {}
    ['pbJsPdfSrc', 'pbJsPdfAtSrc'].forEach(function (id) {
      var el = document.getElementById(id); if (!el) return;
      var code = el.textContent;
      if (!code && el.getAttribute('data-pb-src') && window.pbLazySync) code = window.pbLazySync(el); // speed2 #53: kept in its own file
      try { var sc = document.createElement('script'); sc.text = code; (document.head || document.documentElement).appendChild(sc); } catch (e) { console.error('PDF tool', e); }
    });
  }""", """  function load() {
    if (done) return;
    var codes = [], miss = false; // hunt_nov19 03: both parts in hand first; a part that couldn't be read is read again at the next PDF
    ['pbJsPdfSrc', 'pbJsPdfAtSrc'].forEach(function (id) {
      var el = document.getElementById(id); if (!el) return;
      var code = el.textContent;
      if (!code && el.getAttribute('data-pb-src') && window.pbLazySync) code = window.pbLazySync(el); // speed2 #53: kept in its own file
      if (!code) miss = true; else codes.push(code);
    });
    if (miss) return;
    done = true;
    try { delete window.jspdf; } catch (e) {}
    codes.forEach(function (code) {
      try { var sc = document.createElement('script'); sc.text = code; (document.head || document.documentElement).appendChild(sc); } catch (e) { console.error('PDF tool', e); }
    });
  }""")
p.rep("      get: function () { load(); return window.jspdf; },", "      get: function () { load(); return done ? window.jspdf : undefined; }, // not read yet: undefined (the app says the PDF library didn't load), asked again next time")
p.save()
