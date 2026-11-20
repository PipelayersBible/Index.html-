# declutter 01: Home, every role. One small layer at the end of the page (CSS + a script that only adds classes and
# re-orders whole rows); no feature, id or handler is removed.
#  - order by role: a pipelayer gets Start work above his "Yours" rows; a foreman keeps crew status / daily report first,
#    Crew runs today first in his rows, and Start work in the order he uses it (permit, records, then runs)
#  - a crew card with no number (dash or 0) becomes one short line; cards with a number stay big
#  - optional notices (the yellow ones, the notifications / Home Screen offer) are one sideways row: one card showing,
#    swipe / arrows / dots, moves on by itself every 7 s (not while touched, typing, off screen or "reduce motion").
#    Anything about unsaved work, an open permit, people still checked in, dig tickets, or a red card stays a full
#    card above the row (Tommy, Nov 19)
#  - "New" tile is named "New record" (the company Home already calls it that); "Work without a run" is not listed twice
#  - text a crew reads on Home is at least 14 px
from _rep import P
p = P()

# the Home tile that opens the New sheet: one name for it everywhere (company Home: "New record")
p.rep('''<div><div class="name">New</div><div class="sub" id="homeTileNewSub"></div></div>''',
      '''<div><div class="name">New record</div><div class="sub" id="homeTileNewSub"></div></div>''')

# shorter second lines, so a row is one or two lines at 14 px
p.rep('''<div class="sub" id="homeCrewViewSub">Read-only grade sheets from your crew&rsquo;s phones</div>''',
      '''<div class="sub" id="homeCrewViewSub">Your crew&rsquo;s grade sheets, read-only</div>''')
p.rep('''<div class="name">Confined Space Permit</div><div class="sub">Start a new confined space entry permit</div>''',
      '''<div class="name">Confined Space Permit</div><div class="sub">Start an entry permit</div>''')
p.rep('''<div class="sub">Footage, photos and a note: for laser crews or work not set up as a run</div>''',
      '''<div class="sub">Footage, photos and a note. For laser crews.</div>''')

# notices: the page renders the always-show cards and the optional cards into two lists inside #homeAttentionList
# (every "#homeAttentionList .pb-home-att" style and handler keeps working); the offer card sits in the same row
p.rep('''    <div id="homeAttentionList"></div>
    </div>
    <div id="homePushCard"></div>''',
      '''    <div id="homeAttentionList"><div id="dcAlwaysList"></div><div id="dcRowWrap" hidden><div id="dcRow" role="region" aria-roledescription="carousel" aria-label="Notices" tabindex="0"><div id="dcOptList"></div><div id="homePushCard"></div></div><div id="dcNav" role="group" aria-label="Choose a notice" hidden></div></div></div>
    </div>''')
p.rep('''        const out = items.map(x => x.ngRaw ? x.ngRaw : ''',
      '''        const dcOpt = (x) => !!(x && x.info && !x.ngRaw && !/^(locates|permitUnsaved|closeout|runsUnsaved|notePhotos|runWork|crewIn)$/.test(String(x.id))); /* declutter 01: these go in the sideways row */
        const dcMap = (L) => L.map(x => x.ngRaw ? x.ngRaw : ''')
p.rep('''        pbSetHtml(list, out);
      }
      { const pc = document.getElementById('homePushCard');''',
      '''        const out = dcMap(items.filter(x => !dcOpt(x))), outOpt = dcMap(items.filter(dcOpt));
        const dcA = document.getElementById('dcAlwaysList'), dcO = document.getElementById('dcOptList');
        if (dcA && dcO) { pbSetHtml(dcA, out); pbSetHtml(dcO, outOpt); } else pbSetHtml(list, out + outOpt);
      }
      { const pc = document.getElementById('homePushCard');''')
# the offer card's buttons are not "an alert card opened a page" (it was outside the list before)
p.rep('''const card = b.closest('#homeAttentionList .pb-home-att'), uid = pbArchiveOwnerUid;''',
      '''const card = b.closest('#homeAttentionList .pb-home-att:not(.push)'), uid = pbArchiveOwnerUid;''')

CSS = r'''
<style id="dcHomeStyle">
/* declutter 01 (Nov 19): Home */
/* text a crew reads: 14 px floor on Home */
#pbApp#pbApp #screen-home :is(.pbx-sub, .pb-home-tile .sub, .pb-home-job .k, .pb-beta-chip, .pb-beta-line, .pbx-stat, .pb-home-more) { font-size: 14px; }
#pbApp#pbApp #screen-home :is(.pbx-job-num, .pbx-pct-k, .pbx-flag, .pbx-meta, .pbx-leg-n, .pbx-overpct) { font-size: 14px; }
#pbApp#pbApp #screen-home .pbx-sub { line-height: 1.3; }
/* crew / company cards: wrap instead of a fixed 3-column grid, so short lines can sit beside each other */
#pbApp#pbApp #screen-home .pbx-pulse { display: flex; flex-wrap: wrap; }
#pbApp#pbApp #screen-home .pbx-pulse[hidden] { display: none; }
#pbApp#pbApp #screen-home .pbx-pulse > .pbx-now { flex: 1 1 100%; }
#pbApp #screen-home .pbx-pulse .pbx-pair { display: contents; }
#pbApp#pbApp #screen-home .pbx-pulse .pbx-act { flex: 1 1 calc(33.33% - 8px); min-width: 100px; }
/* a card with a number: icon and number on one line, so the card is a third shorter */
#pbApp#pbApp:not(.pb-text-big) #screen-home .pbx-pulse .pbx-act:not(.dc-zero) { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; align-content: start; column-gap: 10px; row-gap: 2px; min-height: 0; }
#pbApp#pbApp:not(.pb-text-big) #screen-home .pbx-pulse .pbx-act:not(.dc-zero) .pbx-act-ic { margin-bottom: 4px; }
#pbApp#pbApp:not(.pb-text-big) #screen-home .pbx-pulse .pbx-act:not(.dc-zero) :is(.pbx-lbl, .pbx-sub) { grid-column: 1 / -1; }
/* a card with nothing to count: one short line (still opens the same list) */
#pbApp#pbApp #screen-home .pbx-pulse .pbx-act.dc-zero { order: 5; flex: 1 1 calc(50% - 8px); display: grid; grid-template-columns: 24px minmax(0, 1fr); column-gap: 10px; row-gap: 0; align-items: center; min-height: 52px; padding: 7px 12px; box-shadow: none; }
#pbApp#pbApp #screen-home .pbx-pulse .dc-zero .pbx-act-ic { grid-row: 1 / span 2; width: 24px; height: 24px; margin: 0; background: none; }
#pbApp#pbApp #screen-home .pbx-pulse .pbx-act.dc-zero .pbx-num { display: none; }
#pbApp#pbApp #screen-home .pbx-pulse .dc-zero .pbx-lbl { grid-column: 2; }
#pbApp#pbApp #screen-home .pbx-pulse .dc-zero .pbx-sub { grid-column: 2; }
#pbApp#pbApp #screen-home .pbx-pulse > .pbx-now.dc-zero { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; padding: 10px 12px 10px 18px; box-shadow: none; }
#pbApp#pbApp #screen-home .pbx-pulse > .pbx-now.dc-zero .pbx-now-h { gap: 6px; }
#pbApp#pbApp #screen-home .pbx-pulse > .pbx-now.dc-zero .pbx-now-h { flex: 0 0 auto; align-self: center; }
#pbApp#pbApp #screen-home .pbx-pulse > .pbx-now.dc-zero .pbx-num { font-size: 16px; }
#pbApp#pbApp #screen-home .pbx-pulse > .pbx-now.dc-zero .pbx-now-n { display: inline-flex; align-items: baseline; gap: 5px; }
#pbApp#pbApp #screen-home .pbx-pulse > .pbx-now.dc-zero :is(.pbx-sub, .pbx-now-empty) { flex: 1 1 auto; margin: 0; font-size: 14px; text-align: right; }
#pbApp#pbApp.pb-text-big #screen-home .pbx-pulse .pbx-act { flex-basis: 100%; }
@media (min-width: 1024px) {
  html.pb-cx.pbx-wide #pbApp#pbApp #screen-home .pbx-pulse > .pbx-now { flex: 1.5 1 300px; }
  html.pb-cx.pbx-wide #pbApp#pbApp #screen-home .pbx-pulse > .pbx-now.dc-zero { flex: 1 1 100%; }
  html.pb-cx.pbx-wide #pbApp#pbApp #screen-home .pbx-pulse .pbx-act { flex: 1 1 180px; }
  html.pb-cx.pbx-wide #pbApp#pbApp #screen-home .pbx-pulse .pbx-act.dc-zero { flex: 0 1 calc(25% - 9px); }
}
/* optional notices: one sideways row, one card showing; always-show notices stay full cards above it */
#pbApp #dcRowWrap[hidden], #pbApp #dcNav[hidden] { display: none; }
#pbApp #dcRow { display: flex; gap: 16px; margin: 10px 16px 0 16px; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; scrollbar-width: none; -webkit-overflow-scrolling: touch; border-radius: 14px; }
#pbApp #dcRow::-webkit-scrollbar { display: none; }
#pbApp #dcRow:focus-visible { outline: none; box-shadow: var(--pb-ring); }
#pbApp #dcRow > * { display: contents; }
#pbApp#pbApp#pbApp #dcRow > * > * { flex: 0 0 100%; box-sizing: border-box; min-width: 0; margin: 0; scroll-snap-align: start; scroll-snap-stop: always; }
#pbApp #dcNav { display: flex; align-items: center; justify-content: center; gap: 2px; margin: 2px 16px 0 16px; }
#pbApp #dcNav button { -webkit-appearance: none; appearance: none; display: inline-flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; margin: 0; padding: 0; border: 0; background: transparent; color: var(--pb-text-2); font: inherit; font-size: 22px; line-height: 1; cursor: pointer; border-radius: 10px; }
#pbApp #dcNav button:focus-visible { outline: none; box-shadow: var(--pb-ring); }
#pbApp #dcNav .dc-dot { min-width: 28px; }
#pbApp #dcNav .dc-dot::before { content: ""; width: 9px; height: 9px; border-radius: 50%; background: var(--pb-divider); border: 1px solid var(--pb-text-2); box-sizing: border-box; }
#pbApp #dcNav .dc-dot[aria-current="true"]::before { width: 11px; height: 11px; background: var(--pb-text); border-color: var(--pb-text); }
#pbApp #dcNav .dc-count { min-width: 44px; font-size: 14px; color: var(--pb-text-2); text-align: center; }
/* "Work without a run" has its own Home row: not listed again in the New record sheet opened from that Home */
#pbApp#pbApp #screen-home.dc-norun #archiveNoRunBtn { display: none !important; }
</style>
'''

JS = r'''
<script id="dcHomeScript">
/* declutter 01 (Nov 19): Home order by role, short lines for empty cards, one notice at a time. Adds classes and moves
   whole rows only; every id, handler and show/hide rule of the page stays as it was. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var scr = $('screen-home'); if (!scr) return;
  var busy = false;
  // shown by the page's own rules (ignores this layer's fold)
  function on(el) {
    for (var e = el; e && e !== scr; e = e.parentElement) { if (e.hidden || (e.style && e.style.display === 'none')) return false; }
    return !!el;
  }
  function cls(el, c, v) { if (el && el.classList.contains(c) !== !!v) el.classList.toggle(c, !!v); }
  function txt(el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function orderIn(box, ids) {
    if (!box) return; var want = ids.map($).filter(function (e) { return e && e.parentElement === box; });
    var kids = Array.prototype.filter.call(box.children, function (e) { return want.indexOf(e) >= 0; });
    for (var i = 0; i < want.length; i++) if (kids[i] !== want[i]) { want.forEach(function (e) { box.appendChild(e); }); return; }
  }
  var START0 = ['homeTileNewRun', 'homeTileQuickRun', 'homeTileNoRun', 'homeTileNewPermit', 'homeTileNew'];
  var START_FM = ['homeTileNew', 'homeTileNoRun', 'homeTileNewPermit', 'homeTileQuickRun', 'homeTileNewRun']; // Tommy, Nov 19
  var MINE0 = ['homeProdMine', 'homeInspMine', 'homeCrewView'], MINE_FM = ['homeCrewView', 'homeProdMine', 'homeInspMine'];
  function role() {
    if (scr.classList.contains('pb-coh-on')) return 'co';
    var fp = $('homeFmPulse'); return fp && !fp.hidden ? 'fm' : 'pl';
  }
  function order(r) {
    var mine = $('homeMine'), head = $('homeStartHead'), sc = $('homeShortcuts');
    if (mine && head && sc && mine.parentElement === scr && head.parentElement === scr && sc.parentElement === scr) {
      var before = r === 'pl' ? sc : head; // a pipelayer starts runs: Start work first, his own rows after it
      if (mine.nextElementSibling !== before) scr.insertBefore(mine, before);
    }
    orderIn($('homeStart'), r === 'fm' ? START_FM : START0);
    orderIn(mine, r === 'fm' ? MINE_FM : MINE0);
  }
  function zero() {
    var list = scr.querySelectorAll('#homeFmPulse .pbx-act, #homeFmPulse .pbx-now, #homeCxPulse .pbx-act, #homeCxPulse .pbx-now');
    Array.prototype.forEach.call(list, function (el) {
      var nums = Array.prototype.map.call(el.querySelectorAll('.pbx-num'), txt);
      var z = !el.classList.contains('hot') && !el.classList.contains('emerg') && nums.every(function (n) { return n === '' || n === '0' || n === '–' || n === '-'; });
      cls(el, 'dc-zero', z);
    });
  }
  // Optional notices (dcOptList: the yellow ones, and the notifications / Home Screen offer) sit in one sideways row:
  // one card showing, swipe or the arrows / dots for the next, and it moves on by itself every 7 s. It stops moving
  // while it is touched, hovered or holds the focus, while a text box has the cursor, when Home is not on screen, and
  // for "reduce motion". Every card stays in the page (screen readers read each one; its own buttons work). The row is
  // as tall as its tallest card, so Home does not jump. This script never writes inside the page-rendered lists.
  var row = $('dcRow'), wrap = $('dcRowWrap'), nav = $('dcNav'), idx = 0, nShown = -1, holdUntil = 0, touching = false, over = false;
  var rm = null; try { rm = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) {}
  function reduce() { return !!(rm && rm.matches); }
  function slides() { return row ? Array.prototype.slice.call(row.querySelectorAll(':scope > * > *')) : []; }
  function step() { var s = slides(); return s.length > 1 ? s[1].offsetLeft - s[0].offsetLeft : (row ? row.clientWidth : 0); }
  function paint(n) {
    if (!nav) return;
    if (n !== nShown) {
      nShown = n; var h = '<button type="button" id="dcPrev" aria-label="Previous notice">‹</button>';
      for (var i = 0; i < n; i++) h += '<button type="button" class="dc-dot" data-i="' + i + '" aria-label="Notice ' + (i + 1) + ' of ' + n + '"></button>';
      h += '<button type="button" id="dcNext" aria-label="Next notice">›</button>'; nav.innerHTML = h;
    }
    Array.prototype.forEach.call(nav.querySelectorAll('.dc-dot'), function (d, i) { var c = i === idx ? 'true' : 'false'; if (d.getAttribute('aria-current') !== c) d.setAttribute('aria-current', c); });
    var lab = 'Notices: ' + (n ? (idx + 1) + ' of ' + n : 'none'); if (row.getAttribute('aria-label') !== lab) row.setAttribute('aria-label', lab);
  }
  function go(i, byUser, instant) {
    var n = slides().length; if (!n) return; idx = ((i % n) + n) % n;
    if (byUser) holdUntil = Date.now() + 2 * rotateMs();
    var left = idx * step();
    try { row.scrollTo({ left: left, behavior: (instant || reduce()) ? 'auto' : 'smooth' }); } catch (e) { row.scrollLeft = left; }
    paint(n);
  }
  function rotateMs() { var t = +window.__dcRotateMs; return t > 0 ? t : 3000; /* Tommy, Nov 19: every 3 seconds */ }
  function typing() { var a = document.activeElement; return !!(a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)); }
  function onScreen() {
    if (document.hidden || !scr.classList.contains('active') || !row || !row.getClientRects().length) return false;
    var r = row.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight;
  }
  function paused() { return reduce() || touching || over || typing() || Date.now() < holdUntil || !onScreen() || (row && row.contains(document.activeElement)) || (nav && nav.contains(document.activeElement)) || !!document.querySelector('body.rpf-sheet-open, .pb-modal-overlay.active'); }
  window.pbDcNotices = { go: function (i) { go(i, true); }, state: function () { return { n: slides().length, i: idx, paused: paused(), reduce: reduce() }; } };
  if (row && wrap && nav) {
    var st = null;
    row.addEventListener('scroll', function () { clearTimeout(st); st = setTimeout(function () { var w = step(); if (w > 0) { var i = Math.round(row.scrollLeft / w); if (i !== idx) { idx = i; paint(slides().length); } } }, 90); }, { passive: true });
    ['touchstart', 'pointerdown'].forEach(function (ev) { row.addEventListener(ev, function () { touching = true; }, { passive: true }); });
    ['touchend', 'touchcancel', 'pointerup', 'pointercancel'].forEach(function (ev) { window.addEventListener(ev, function () { if (touching) { touching = false; holdUntil = Date.now() + 2 * rotateMs(); } }, { passive: true }); });
    wrap.addEventListener('mouseenter', function () { over = true; }); wrap.addEventListener('mouseleave', function () { over = false; });
    row.addEventListener('keydown', function (e) { if (e.target !== row) return; if (e.key === 'ArrowRight') { go(idx + 1, true); e.preventDefault(); } else if (e.key === 'ArrowLeft') { go(idx - 1, true); e.preventDefault(); } });
    nav.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
      if (b.id === 'dcPrev') go(idx - 1, true); else if (b.id === 'dcNext') go(idx + 1, true); else if (b.dataset.i) go(+b.dataset.i, true);
    });
    (function tick() { setTimeout(function () { try { if (slides().length > 1 && !paused()) go(idx + 1); } catch (e) {} tick(); }, rotateMs()); })();
  }
  function notices() {
    if (!row || !wrap || !nav) return;
    var n = slides().length;
    if (wrap.hidden !== !n) wrap.hidden = !n;
    if (nav.hidden !== (n < 2)) nav.hidden = n < 2;
    if (!n) { idx = 0; nShown = -1; return; }
    if (idx > n - 1) idx = n - 1;
    var want = idx * step(); if (Math.abs(row.scrollLeft - want) > 2 && !touching && n !== nShown) { try { row.scrollTo({ left: want, behavior: 'auto' }); } catch (e) { row.scrollLeft = want; } }
    paint(n);
  }
  function sync() {
    if (busy) return; busy = true;
    try {
      var r = role();
      cls(scr, 'dc-co', r === 'co'); cls(scr, 'dc-fm', r === 'fm'); cls(scr, 'dc-pl', r === 'pl');
      order(r); zero(); notices();
      var nr = $('homeTileNoRun'); cls(scr, 'dc-norun', !!(nr && nr.style.display !== 'none' && nr.getClientRects().length));
    } catch (e) { try { console.error('declutter home:', e); } catch (e2) {} }
    busy = false;
  }
  window.pbDcHomeSync = sync;
  var mo = new MutationObserver(function () { if (!busy) { sync(); mo.takeRecords(); } });
  mo.observe(scr, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
  try { if (Array.isArray(window.pbScreenHooks)) window.pbScreenHooks.push(function (name) { if (name === 'home') sync(); }); } catch (e) {}
  sync();
})();
</script>
'''
p.rep('''  window.pbLiveCam = { ok: ok, open: open };
})();
</script>
</body>''', '''  window.pbLiveCam = { ok: ok, open: open };
})();
</script>
''' + CSS + JS + '''</body>''')
p.save()
