# declutter 01: Home, every role. One small layer at the end of the page (CSS + a script that only adds classes and
# re-orders whole rows); no feature, id or handler is removed.
#  - order by role: a pipelayer gets Start work above his "Yours" rows; a foreman keeps crew status / daily report first,
#    Crew runs today first in his rows, and Start work in the order he uses it (permit, records, then runs)
#  - a crew card with no number (dash or 0) becomes one short line; cards with a number stay big
#  - at most one optional notice at a time; the rest fold into one "Also: ..." line (tap = show all). Anything about
#    unsaved work, an open permit, people still checked in, or dig tickets is never folded
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
#pbApp#pbApp #screen-home .pbx-pulse .pbx-act:not(.dc-zero) { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; align-content: start; column-gap: 10px; row-gap: 2px; min-height: 0; }
#pbApp#pbApp #screen-home .pbx-pulse .pbx-act:not(.dc-zero) .pbx-act-ic { margin-bottom: 4px; }
#pbApp#pbApp #screen-home .pbx-pulse .pbx-act:not(.dc-zero) :is(.pbx-lbl, .pbx-sub) { grid-column: 1 / -1; }
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
/* one notice at a time: the rest fold into one line */
#pbApp#pbApp #screen-home .dc-fold { display: none !important; }
#pbApp #dcAlso { display: flex; align-items: center; gap: 8px; width: auto; min-height: 44px; margin: 8px 16px 0 16px; padding: 6px 12px; border: 1px dashed var(--pb-divider); border-radius: 10px; background: transparent; color: var(--pb-text-2); font: inherit; font-size: 14px; line-height: 1.3; text-align: left; cursor: pointer; -webkit-appearance: none; appearance: none; }
#pbApp #dcAlso[hidden] { display: none; }
#pbApp #dcAlso .dc-also-t { flex: 1 1 auto; min-width: 0; color: var(--pb-text); }
#pbApp #dcAlso .dc-also-go { flex: 0 0 auto; font-weight: 650; color: var(--pb-brand-text, var(--pb-text)); }
#pbApp #dcAlso:focus-visible { outline: none; box-shadow: var(--pb-ring); }
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
  var openAll = false, busy = false;
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
  var START_FM = ['homeTileNewPermit', 'homeTileNew', 'homeTileNoRun', 'homeTileNewRun', 'homeTileQuickRun'];
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
  // Notices. "always": never folded. The others: the first one shows (only when no "always" one is up), the rest fold.
  var ALWAYS_ATT = /^homeAttention_(locates|permitUnsaved|closeout|runsUnsaved|notePhotos|runWork|crewIn)$/;
  function notices() {
    var always = 0, opt = [];
    var add = function (el, title) { if (el && on(el) && (el.children.length || txt(el))) opt.push({ el: el, t: title || txt(el.querySelector('.t')) || txt(el).slice(0, 40) }); };
    if (on($('pbSessionUnreadableBannerHome'))) always++;
    var bl = $('pbBetaLine'); if (bl && on(bl) && bl.classList.contains('ended')) always++;
    add($('homeCrewInvite'), 'Company invitation');
    Array.prototype.forEach.call(scr.querySelectorAll('#homeAttentionList > .pb-home-att'), function (el) {
      if (!el.classList.contains('info') || ALWAYS_ATT.test(el.id)) { always++; cls(el, 'dc-fold', false); } else add(el);
    });
    add($('homePlanAlerts'), 'Plan changes');
    add($('homeTalkCard'), 'Toolbox talk today');
    add($('homePushCard'));
    var keep = always ? 0 : 1, folded = [];
    opt.forEach(function (o, i) { var f = !openAll && i >= keep; cls(o.el, 'dc-fold', f); if (f) folded.push(o.t); });
    var b = $('dcAlso');
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.id = 'dcAlso'; b.hidden = true;
      b.innerHTML = '<span class="dc-also-t"></span><span class="dc-also-go">Show</span>';
      b.onclick = function () { openAll = true; sync(); };
      var at = $('homeAttention'); if (at && at.parentElement === scr) scr.insertBefore(b, at.nextSibling); else return;
    }
    if (!folded.length && opt.length < 2) openAll = false;
    var t = folded.length ? 'Also: ' + folded.join(' · ') : '';
    var te = b.firstChild; if (te.textContent !== t) te.textContent = t;
    if (b.hidden !== !folded.length) b.hidden = !folded.length;
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
  try { if (Array.isArray(window.pbScreenHooks)) window.pbScreenHooks.push(function (name) { if (name === 'home') { openAll = false; sync(); } }); } catch (e) {}
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
