import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# perf audit 01 (Nov 17, on r16.97) [high on a cheap phone: ~0.4-0.9 s of every start-up at desktop speed, x4-6 on a
# cheap phone, and a stall each time a screen adds form fields]: the accessibility namer (Batch 10 A) asks every form
# control for `el.labels`. In Chromium that walks the whole document for each control (~1 ms per control at desktop
# speed; the page has ~435 controls at start and adds more with each screen it draws), so start-up spends most of its
# script time in hasName(). Fix: one lookup of label[for] per scan pass (same answer as el.labels: a label whose `for`
# names this control, where the control is the element that id resolves to, plus an enclosing label that labels it).
# Names, descriptions and roles come out the same (rig/a11y_same.js compares every control's attributes before/after).
rep("""  function idFor(el, p) { if (!el.id) el.id = 'pbA11y' + p + (++n); return el.id; }
  function hasName(el) {
    var lb = el.getAttribute('aria-labelledby');
    if (lb && lb.split(/\\s+/).some(function (id) { return !!textOf(document.getElementById(id)); })) return true;
    if (clean(el.getAttribute('aria-label'))) return true;
    if (el.labels && Array.prototype.some.call(el.labels, function (l) { return !!textOf(l); })) return true;""",
"""  function idFor(el, p) { if (!el.id) el.id = 'pbA11y' + p + (++n); return el.id; }
  // perf audit 01: el.labels walks the whole document per control; one label[for] lookup per scan pass instead.
  var forMap = null;
  function labelsOf(el) {
    if (!forMap) { forMap = Object.create(null); document.querySelectorAll('label[for]').forEach(function (l) { var f = l.htmlFor; if (f) (forMap[f] = forMap[f] || []).push(l); }); }
    var out = [];
    if (el.id && forMap[el.id] && document.getElementById(el.id) === el) out = forMap[el.id].slice();
    var anc = el.parentElement && el.parentElement.closest('label');
    if (anc && !anc.hasAttribute('for') && anc.querySelector('input:not([type=hidden]), select, textarea, button, meter, output, progress') === el && out.indexOf(anc) === -1) out.push(anc);
    return out;
  }
  function setFor(lab, el) { lab.htmlFor = el.id; if (forMap) (forMap[el.id] = forMap[el.id] || []).push(lab); }
  function hasName(el) {
    var lb = el.getAttribute('aria-labelledby');
    if (lb && lb.split(/\\s+/).some(function (id) { return !!textOf(document.getElementById(id)); })) return true;
    if (clean(el.getAttribute('aria-label'))) return true;
    if (labelsOf(el).some(function (l) { return !!textOf(l); })) return true;""")
rep("""        if (el.id && !lab.htmlFor) lab.htmlFor = el.id; else el.setAttribute('aria-labelledby', idFor(lab, 'L'));
        describe(el, field);""",
"""        if (el.id && !lab.htmlFor) setFor(lab, el); else el.setAttribute('aria-labelledby', idFor(lab, 'L'));
        describe(el, field);""")
rep("""      if (el.id && !prev.htmlFor) prev.htmlFor = el.id; else el.setAttribute('aria-labelledby', idFor(prev, 'L'));""",
"""      if (el.id && !prev.htmlFor) setFor(prev, el); else el.setAttribute('aria-labelledby', idFor(prev, 'L'));""")
rep("""    if (!own.length && el.labels && el.labels.length && textOf(el.labels[0])) own = [idFor(el.labels[0], 'L')];""",
"""    var labs = labelsOf(el); if (!own.length && labs.length && textOf(labs[0])) own = [idFor(labs[0], 'L')];""")
rep("""  function scan(root) {
    if (!root || !root.querySelectorAll) return;""",
"""  function scan(root, keep) {
    if (!root || !root.querySelectorAll) return;
    if (!keep) forMap = null; // perf audit 01: a fresh label lookup for each pass (the page changes between passes)""")
rep("""  window.pbA11yUnnamed = function (root) {
    return""", """  window.pbA11yUnnamed = function (root) {
    forMap = null;
    return""")
rep("""  window.pbA11yScan = scan;""", """  window.pbA11yScan = function (root) { return scan(root); };""")
rep("""    var flush = function () { queued = false; var list = pending; pending = []; list.forEach(function (x) { if (x.isConnected) scan(x); }); };""",
"""    var flush = function () { queued = false; var list = pending; pending = []; forMap = null; list.forEach(function (x) { if (x.isConnected) scan(x, true); }); };""")
open(out, 'w', encoding='utf-8').write(s)
