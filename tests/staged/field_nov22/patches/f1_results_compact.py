# F1 Run Results on a small phone: while a run is going (locked, not ended) the blocks above the grade sheet (Locked line,
# Edit Run Data, Run details, trench warning, Flagged at Lock, Columns / Hide laid / Zoom) fold into ONE line, and Results
# opens with the Next row at the top of the grade sheet. The line always says a trench warning or lock flags in words
# (red edge for the trench), and a tap opens everything again with the trench text open. Ended runs are unchanged.
# Timer row (Pipe laid / Avg. / Current / Break) stays: Break is used during the run.
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from _rep import P
p = P()
# markup: the one line, and an id on the Edit Run Data row so CSS can fold it
p.rep('''    <div class="pb-btn-wrap" style="padding-top:12px;"><button class="pb-btn ghost small" style="width:100%;" onclick="pbEditRunData()">''',
      '''    <div class="pb-btn-wrap" id="resEditWrap" style="padding-top:12px;"><button class="pb-btn ghost small" style="width:100%;" onclick="pbEditRunData()">''')
p.rep('''    <div id="resultsMainContent">
      <div class="pb-summary pb-rdet" id="runDetails">''',
      '''    <div id="resultsMainContent">
      <div class="pb-rs-top" id="pbRsTop" hidden></div><!-- field_nov22 F1 -->
      <div class="pb-summary pb-rdet" id="runDetails">''')
# CSS
p.rep('''@media (prefers-reduced-motion: reduce) { #pbApp#pbApp .pb-laid-toast.pb-on { animation: pbLaidFade 200ms linear !important; } }
''', '''@media (prefers-reduced-motion: reduce) { #pbApp#pbApp .pb-laid-toast.pb-on { animation: pbLaidFade 200ms linear !important; } }
/* field_nov22 F1: a run going: the blocks above the grade sheet fold into one line (never a warning hidden: the line says it) */
#pbApp#pbApp #screen-results.pb-rs-going :is(#lockband, #resEditWrap, #runDetails, #lockFlagsWrap, .pb-b3-tablebar, #resColsPanel) { display: none !important; }
#pbApp#pbApp #screen-results .pb-rs-top { margin: 8px var(--pb-gutter, 16px) 8px var(--pb-gutter, 16px); }
#pbApp#pbApp #screen-results .pb-rs-top[hidden] { display: none; }
#pbApp#pbApp #screen-results .pb-rs-topbtn { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 48px; margin: 0; padding: 6px 12px; box-sizing: border-box; border: 1px solid var(--pb-divider, rgba(128,128,128,0.35)); border-radius: 12px; background: var(--pb-surface); color: var(--pb-text); font: inherit; font-size: 15px; font-weight: 600; line-height: 1.25; text-align: left; cursor: pointer; }
#pbApp#pbApp #screen-results .pb-rs-topbtn .t { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
#pbApp#pbApp #screen-results .pb-rs-topbtn .m { flex: 0 0 auto; color: var(--pb-text-2); font-weight: 600; }
#pbApp#pbApp #screen-results .pb-rs-topbtn .pb-ic { flex: 0 0 auto; }
#pbApp#pbApp #screen-results .pb-rs-topbtn[aria-expanded="true"] .pb-rs-chev { transform: rotate(180deg); }
#pbApp#pbApp #screen-results .pb-rs-topbtn.danger { border-color: var(--rod-red, #c62828); box-shadow: inset 4px 0 0 var(--rod-red, #c62828); background: var(--pb-danger-soft, rgba(198,40,40,0.10)); }
#pbApp#pbApp #screen-results .pb-rs-topbtn.danger > .pb-ic:first-child { color: var(--rod-red, #c62828); }
#pbApp#pbApp #screen-results .pb-rs-topbtn.flag > .pb-ic:first-child { color: var(--pb-text-2); }
#pbApp#pbApp #screen-results.pb-rs-going #resultsMainContent > .pb-table-wrap { max-height: max(50vh, calc(100vh / var(--pb-zoom, 1) - var(--pb-shell-h, 0px) / var(--pb-text-zoom, 1) - 220px)); }
@supports (height: 100svh) { #pbApp#pbApp #screen-results.pb-rs-going #resultsMainContent > .pb-table-wrap { max-height: max(50svh, calc(100svh / var(--pb-zoom, 1) - var(--pb-shell-h, 0px) / var(--pb-text-zoom, 1) - 220px)); } }
''')
# JS: painted with every Results render; reset each time Results opens; opens at the Next row
p.rep('''  function renderResultsTable(entry) {
    try { pbGsClose(); } catch (e) {} /* r15.47 gsdots */''',
      '''  // ---- field_nov22 F1: a run going folds its top blocks into one line (the words of any warning on it); tap opens them ----
  var pbRsTopOpenFor = null; // the run whose top blocks are open on screen (not kept; closed each time Results opens)
  function pbRsGoing(e) { return !!(e && e.kind === 'run' && !e.completed && !e.incomplete); }
  function pbRsTopPaint(entry) {
    const scr = document.getElementById('screen-results'), el = document.getElementById('pbRsTop'); if (!scr || !el) return;
    const going = pbRsGoing(entry), open = going && pbRsTopOpenFor === entry.id;
    scr.classList.toggle('pb-rs-going', going && !open);
    if (!going) { el.hidden = true; el.innerHTML = ''; return; }
    const depth = entry.depthFlagged ? 'Trench ' + (entry.caveFt === 4 ? 4 : 5) + ' ft or Deeper' : '';
    const ws = (entry.warnings || []).filter(w => w && w.text);
    const flags = ws.length ? ((entry.correctionHistory || []).length ? 'Flags after correction (' : 'Flagged at Lock (') + ws.length + ')' + pbFlagKinds(ws) : '';
    let sum = ''; try { sum = pbRunDetSum(entry); } catch (e) { sum = ''; }
    const words = [depth, flags].filter(Boolean).join(' \\u00b7 ') || ('Run details' + (sum ? ' \\u00b7 ' + sum : ''));
    const cls = depth ? ' danger' : flags ? ' flag' : '';
    el.innerHTML = '<button type="button" class="pb-rs-topbtn' + cls + '" id="pbRsTopBtn" aria-expanded="' + open + '" onclick="pbRsTopToggle()">'
      + (cls ? '<svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-warn"/></svg>' : '')
      + '<span class="t">' + escapeHtml(words) + '</span><span class="m">' + (open ? 'Less' : 'More') + '</span><span class="pb-sr">' + (open ? '' : ': Edit Run Data, run details, columns and Zoom') + '</span>'
      + '<svg class="pb-ic pb-rs-chev" aria-hidden="true" focusable="false"><use href="#pb-i-chevron-down"/></svg></button>';
    el.hidden = false;
  }
  window.pbRsTopToggle = function () {
    const e = getCurrentArchiveEntry(); if (!pbRsGoing(e)) return;
    const open = pbRsTopOpenFor !== e.id; pbRsTopOpenFor = open ? e.id : null;
    pbRsTopPaint(e);
    if (open) { // the safety words open with it: the trench card's text and the lock flags
      const h = document.querySelector('#lockFlagsWrap .pb-wc[data-wc="depth"] .pb-wc-head'), body = h && h.parentElement.querySelector('.pb-wc-body');
      if (h && body && body.hidden) pbWcToggle(h);
      const d = document.getElementById('lockFlagsMore'); if (d) d.open = true;
    }
    try { pbRsFitSoon(); } catch (x) {}
    const b = document.getElementById('pbRsTopBtn'); if (b) b.focus({ preventScroll: true });
  };
  // Results opened on a run going: the grade sheet starts at the Next row (no animation)
  function pbRsOpenAtNext() {
    const e = getCurrentArchiveEntry(); if (!pbRsGoing(e) || pbCurrentScreen !== 'results') return;
    const wrap = document.querySelector('#screen-results .pb-table-wrap'), next = document.querySelector('#resultsBody tr.pb-laid-next');
    if (!wrap || !next || !next.offsetParent) return;
    const head = wrap.querySelector('thead'), hh = head ? head.getBoundingClientRect().height : 0;
    const strip = next.previousElementSibling && next.previousElementSibling.dataset.laidStrip ? next.previousElementSibling : next;
    const prev = strip.previousElementSibling, ph = prev && prev.offsetParent ? Math.min(prev.getBoundingClientRect().height, 60) : 0;
    wrap.scrollTop = Math.max(0, Math.round(strip.getBoundingClientRect().top - wrap.getBoundingClientRect().top + wrap.scrollTop - hh - ph));
  }
  window.pbRsOpenAtNext = pbRsOpenAtNext;
  setInterval(() => { try { if (pbCurrentScreen !== 'results') return; const e = getCurrentArchiveEntry(), scr = document.getElementById('screen-results'), top = document.getElementById('pbRsTop'); if (scr && top && (scr.classList.contains('pb-rs-going') !== (pbRsGoing(e) && pbRsTopOpenFor !== e.id) || top.hidden === pbRsGoing(e))) pbRsTopPaint(e); } catch (x) {} }, 1000); // an End Run that didn't redraw
  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function (name) {
    if (name !== 'results') return;
    pbRsTopOpenFor = null;
    try { pbRsTopPaint(getCurrentArchiveEntry()); } catch (e) {}
    setTimeout(() => { try { pbRsOpenAtNext(); } catch (e) {} }, 60);
  });
  function renderResultsTable(entry) {
    try { pbRsTopPaint(entry); } catch (e) { console.error(e); } /* field_nov22 F1 */
    try { pbGsClose(); } catch (e) {} /* r15.47 gsdots */''')
p.save()
