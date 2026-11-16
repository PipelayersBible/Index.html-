import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:80])
    s = s.replace(a, b)

# ---- who ran it: pipelayer = the signed-in person; foreman = the company's foremen ----
rep("return { pipelayer: p ? me : '', crew: p ? fm : f ? me : '', crewFrom: pk ? 'pick' : p ? 'link' : 'account' };",
    "return { pipelayer: p ? me : '', crew: p ? fm : f ? (pbFmPicked(uid) || me) : '', crewFrom: pk ? 'pick' : p ? 'link' : f && pbFmShown() ? 'pick' : 'account', me: me };")
rep("if (k === 'pipelayer') return A.pipelayer || (enabled ? typed : '');",
    "if (k === 'pipelayer') return typed || A.pipelayer; /* r16.53: the box (filled with the signed-in name) is the pipelayer */")
rep("hide(cc, on); hide(pl, !!(A && A.pipelayer)); hide(cr, !!(A && (A.crew || A.crewFrom === 'pick')));",
    "hide(cc, on); hide(pl, false); hide(cr, !!(A && (A.crew || A.crewFrom === 'pick'))); /* r16.53: the pipelayer box always shows */")
rep("const txt = A ? [A.pipelayer ? 'Pipelayer: ' + A.pipelayer + ' (your account)' : '', A.crew && A.crewFrom !== 'pick' ? ",
    "const txt = A ? [A.crew && A.crewFrom !== 'pick' ? ")
rep("      if (typeof window.pbAfApply === 'function') window.pbAfApply(tf); /* r15.48 access: the foreman picker */\n",
    "      if (typeof window.pbAfApply === 'function') window.pbAfApply(tf); /* r15.48 access: the foreman picker */\n"
    "      try { pbFmApply(A); pbPlFill(A); pbWhoRow(A, tf); } catch (e) { console.error('r16.53 who', e); }\n")
rep("  window.pbRfSetupApply = pbRfSetupApply;\n", r"""  window.pbRfSetupApply = pbRfSetupApply;
  // r16.53: a foreman's own runs: Foreman is a list of the company's foremen (pb_prod_crew_links 'foremen'), the account
  // first chosen; a name on the run only (the server routes nothing for a foreman's run).
  function pbFmList(uid) { const L = pbCrew && pbCrew.uid === uid && pbCrew.links && pbCrew.links.role === 'foreman' && Array.isArray(pbCrew.links.foremen) ? pbCrew.links.foremen.filter(f => f && f.id) : null; return L && L.length ? L : null; }
  function pbFmShown() { const w = document.getElementById('saFmPickWrap'); return !!(w && !w.hidden); }
  function pbFmPicked(uid) { const w = document.getElementById('saFmPickWrap'), el = w && !w.hidden && w.querySelector('select'); if (!el || !el.value) return ''; const f = (pbFmList(uid) || []).find(x => String(x.id) === el.value); return f ? String(f.name || (f.me ? pbRfMyName(uid) : '')) : ''; }
  function pbFmApply(A) {
    const uid = pbArchiveOwnerUid, isF = !!(A && pbLvIsForeman(uid)), L = isF ? pbFmList(uid) : null, cr = document.getElementById('saCrew');
    let w = document.getElementById('saFmPickWrap');
    if (!L || !cr) { if (w && !w.hidden) w.hidden = true; if (isF && !(pbCrew && pbCrew.links) && navigator.onLine !== false) { try { Promise.resolve(pbCrewLoad(uid)).catch(() => null); } catch (e) {} } return; }
    if (!w) {
      w = document.createElement('div'); w.id = 'saFmPickWrap'; w.className = 'pb-field';
      w.innerHTML = '<label for="saFmPick">Foreman</label><select id="saFmPick"></select>';
      const tf0 = (document.getElementById('saEnableToggle') || {}).closest && document.getElementById('saEnableToggle').closest('.pb-field'); if (tf0 && tf0.parentNode) tf0.parentNode.insertBefore(w, tf0);
      w.querySelector('select').addEventListener('change', (ev) => { const f = (pbFmList(pbArchiveOwnerUid) || []).find(x => String(x.id) === ev.target.value); cr.value = f ? String(f.name || (f.me ? pbRfMyName(pbArchiveOwnerUid) : '')) : ''; ev.target.dataset.crv = cr.value; try { pbRfSetupApply(); } catch (e) {} });
    }
    if (w.hidden) w.hidden = false;
    const sel = w.querySelector('select'), nm = (f) => String(f.name || (f.me ? pbRfMyName(uid) : '') || 'Foreman (no name yet)'), key = JSON.stringify(L.map(f => [f.id, nm(f)]));
    if (sel.dataset.k !== key) { const cur = sel.value; sel.dataset.k = key; sel.innerHTML = L.map(f => '<option value="' + escapeHtml(String(f.id)) + '">' + escapeHtml(nm(f)) + '</option>').join(''); if (cur && L.some(f => String(f.id) === cur)) sel.value = cur; else sel.dataset.crv = '\u0000'; }
    // the form's own value (the last run's, a resumed draft's, a run being fixed) chooses; else the account
    if (sel.dataset.crv !== cr.value) {
      const t = String(cr.value || '').trim().toLowerCase(), m = (t && L.find(f => nm(f).toLowerCase() === t)) || L.find(f => f.me) || L[0];
      sel.value = String(m.id); cr.value = nm(m) === 'Foreman (no name yet)' ? '' : nm(m); sel.dataset.crv = cr.value;
    }
  }
  // r16.53: Pipelayer starts as whoever is signed in (a new run; the last run's name is replaced, a typed one is kept)
  function pbPlFill(A) {
    const pl = document.getElementById('saPipelayer'), uid = pbArchiveOwnerUid; if (!pl || !uid || uid === 'shared') return;
    if (!pl.dataset.pbW) { pl.dataset.pbW = '1'; pl.addEventListener('input', () => { pl.dataset.typedGen = String(pbFormGen); }); }
    const g = String(pbFormGen); if (pl.dataset.fillGen === g || pl.dataset.typedGen === g) return;
    const me = String(pbRfMyName(uid) || '').trim(); if (!me) return;
    pl.dataset.fillGen = g;
    if (window._pbResumingFromEntryId) return;
    const cur = String(pl.value || '').trim(), last = String(window._pbLastPl || '').trim();
    if (!cur || cur === last) pl.value = me;
  }
  // r16.53: Foreman | Pipelayer side by side under the job, shown whether or not Stats is on (they go with the run)
  function pbWhoRow(A, tf) {
    const pl = document.getElementById('saPipelayer'), cr = document.getElementById('saCrew'), fS = (document.getElementById('saJobsite') || {}).closest && document.getElementById('saJobsite').closest('.pb-field');
    const fp = pl && pl.closest('.pb-field'), fc = cr && cr.closest('.pb-field'), wrap = document.getElementById('saFieldsWrap'); if (!fp || !fc || !wrap) return;
    let row = document.getElementById('pbWhoRow');
    if (!A) {
      if (row) { const nf = (document.getElementById('saNotes') || {}).closest && document.getElementById('saNotes').closest('.pb-field'); if (fc.parentNode === row) wrap.insertBefore(fc, nf || null); if (fp.parentNode === row) wrap.insertBefore(fp, nf || null); row.remove(); }
      return;
    }
    if (!row) { row = document.createElement('div'); row.id = 'pbWhoRow'; row.className = 'pb-jobpair pb-whorow'; }
    const at = fS && fS.parentNode === tf.parentNode ? fS.nextSibling : tf;
    if (row.parentNode !== tf.parentNode || (at !== row && row.nextSibling !== tf && fS && row.previousSibling !== fS)) tf.parentNode.insertBefore(row, at);
    const fm = [document.getElementById('saFmPickWrap'), document.getElementById('saForemanPickWrap')].find(x => x && !x.hidden) || fc;
    [document.getElementById('saFmPickWrap'), document.getElementById('saForemanPickWrap')].forEach(x => { if (x && x.hidden && x.parentNode === row) tf.parentNode.insertBefore(x, tf); });
    if (fm.parentNode !== row || row.firstElementChild !== fm) row.insertBefore(fm, row.firstChild);
    if (fm !== fc && fc.parentNode === row) wrap.insertBefore(fc, wrap.firstChild);
    if (fp.parentNode !== row) row.appendChild(fp);
    const vis = [...row.children].filter(c => !c.hidden && c.style.display !== 'none').length;
    row.classList.toggle('one', vis < 2);
    const old = fc.parentNode && fc.parentNode.classList && fc.parentNode.classList.contains('pb-jobpair') && fc.parentNode !== row ? fc.parentNode : null; if (old && !old.children.length) old.remove();
  }
""")
rep("    document.getElementById('saPipelayer').value = lastSaPipelayer || '';\n",
    "    document.getElementById('saPipelayer').value = lastSaPipelayer || '';\n    window._pbLastPl = lastSaPipelayer || ''; /* r16.53: replaced by the signed-in name */\n")
# pipelayer's picker: a short note only when it says something new
rep("const t = !cur ? 'Pick the foreman this run’s report goes to.' : cur.id === PB_AF_NONE ? 'Your run report goes to the office only.' : 'Your run report goes to this foreman.';",
    "const t = !cur ? 'Pick the foreman this run’s report goes to.' : cur.id === PB_AF_NONE ? 'Your run report goes to the office only.' : ''; /* r16.53 */ note.hidden = !t;")
# r16.48 pair: the who row holds them now
rep("if (fp && fc && !(fp.parentNode.classList && fp.parentNode.classList.contains('pb-jobpair'))) {",
    "if (fp && fc && !document.getElementById('pbWhoRow') && !(fp.parentNode.classList && fp.parentNode.classList.contains('pb-jobpair'))) {")
# r16.48 ordering hands over to the sub-cards
rep("      if (grp && pipe && grp.nextElementSibling !== pipe) grp.parentNode.insertBefore(pipe, grp.nextElementSibling);\n      if (pipe && bed && pipe.nextElementSibling !== bed) pipe.parentNode.insertBefore(bed, pipe.nextElementSibling);\n",
    "      if (typeof window.pbSubCards === 'function') window.pbSubCards(); /* r16.53: Job details, Pipe details, Intervals, Trench design */\n")
# Job details summary (closed): the job number and name only
rep("""    var parts = [];
    if (on()) {
      if (val('saJobNumber')) parts.push('Job ' + val('saJobNumber'));
      if (val('saJobsite')) parts.push(val('saJobsite'));
      if (val('saCostCode')) parts.push('cost code ' + val('saCostCode'));
      if (val('saCrew')) parts.push(val('saCrew'));
      if (val('statsType')) parts.push(val('statsType'));
      if (!parts.length) parts.push('Tracking on, no job entered');
    } else parts.push('Not tracked — tap to add the job, crew or notes');
    if (val('runBedding')) parts.push('bedding ' + val('runBedding') + ' ft');
    if (val('runTrenchWidth')) parts.push('trench ' + val('runTrenchWidth') + ' ft');
    var sh = (document.querySelector('#runJobGroup [id$="ShadeThk"]') || {}).value || '';
    if (String(sh).trim()) parts.push('shading ' + String(sh).trim() + ' ft');
    return parts.join(' · ');""", """    var parts = []; /* r16.53: closed, it shows the job number and name only */
    if (val('saJobNumber')) parts.push('Job ' + val('saJobNumber'));
    if (val('saJobsite')) parts.push(val('saJobsite'));
    return parts.join(' · ') || 'No job entered';""")
# Trench design (closed): bedding, shading, trench width
rep("""    var p = [], b = val('#runBedding'), sh = val('#runBeddingSection [id$="ShadeThk"]'), tw = val('#runTrenchWidth'), pm = txt('#pbm3Sel1pipe');
    if (b) p.push('Bedding ' + b + ' ft'); if (sh) p.push('Shading ' + sh + ' ft'); if (tw) p.push('Trench ' + tw + ' ft'); if (pm) p.push(pm);""",
"""    var p = [], b = val('#runBedding'), sh = val('#runBeddingSection [id$="ShadeThk"]'), tw = val('#runTrenchWidth'); /* r16.53 */
    if (b) p.push('Bedding ' + b + ' ft'); if (sh) p.push('Shading ' + sh + ' ft'); if (tw) p.push('Width ' + tw + ' ft');""")
rep("<span class=\"pb-subrow-t\">Bedding, Shading &amp; Materials</span>", "<span class=\"pb-subrow-t\">Trench design</span>")

tail = r"""<!-- r16.53:subcards -->
<script>
// r16.53: Job & Pipe holds four sub-cards that open and close: Job details, Pipe details, Intervals, Trench design.
// Display only: it moves elements and writes no value; a card opens itself for a field that is flagged or gets focus.
(function () {
  'use strict';
  function v(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }
  function t(id) { var e = document.getElementById(id); return e && e.value && e.selectedIndex >= 0 ? e.options[e.selectedIndex].text : ''; }
  function sums() {
    var pe = document.getElementById('runPipeType'), p = [], id = t('runIdSel'), ty = pe && pe.selectedOptions && pe.selectedOptions[0] ? pe.selectedOptions[0].text : '', wt = v('runWT'), ll = v('layLen');
    if (id && v('runIdSel')) p.push(id); ty = String(ty || '').replace(/\s*\(auto\)\s*$/i, ''); if (ty && !/^(select|\u2014|choose)/i.test(ty)) p.push(ty);
    var a = document.getElementById('runPipeGroupSum'); if (a) { var s = p.join(' · ') || 'Not set'; if (a.textContent !== s) a.textContent = s; }
    var b = document.getElementById('runIntGroupSum'); if (b) { var iv = v('interval'), u = document.getElementById('layUse'), dv = { joints: 'Joints only', halves: 'Halves', quarters: 'Quarters' }[v('layDiv')] || ''; var s2 = (iv ? 'Every ' + iv + ' ft' : 'Not set') + (u && u.checked && dv ? ' \u00b7 ' + dv : ''); if (b.textContent !== s2) b.textContent = s2; }
  }
  function card(id, title, sumId) {
    var d = document.getElementById(id); if (d) return d;
    d = document.createElement('details'); d.className = 'pb-subrow pb-subcard'; d.id = id; d.open = true;
    d.innerHTML = '<summary><span class="pb-subrow-t">' + title + '</span><span class="pb-subrow-sum" id="' + sumId + '">Not set</span></summary>';
    d.addEventListener('focusin', function (ev) { if (!d.open && ev.target && !ev.target.closest('summary')) d.open = true; }, true);
    new MutationObserver(function () { if (!d.open && d.querySelector('[aria-invalid="true"]')) d.open = true; }).observe(d, { subtree: true, attributes: true, attributeFilter: ['aria-invalid'] });
    d.addEventListener('toggle', sums);
    return d;
  }
  var wired = false;
  function apply() {
    try {
      var grp = document.getElementById('runJobGroup'), pipe = document.getElementById('runPipeSection'), bed = document.getElementById('runBedRow'), iv = document.getElementById('interval');
      if (!grp || !pipe) return;
      var pc = card('runPipeGroup', 'Pipe details', 'runPipeGroupSum');
      if (pipe.parentNode !== pc) pc.appendChild(pipe);
      var ic = null;
      if (iv) {
        ic = card('runIntGroup', 'Intervals', 'runIntGroupSum');
        var body = ic.querySelector('.pb-body');
        if (!body) { var sec = document.createElement('div'); sec.className = 'pb-section'; body = document.createElement('div'); body.className = 'pb-body'; sec.appendChild(body); ic.appendChild(sec); }
        var f = iv.closest('.pb-field'); if (f && f.parentNode !== body) body.appendChild(f);
        var chk = document.getElementById('layUse'), lc = chk && chk.closest('.pb-lay-check'), dw = document.getElementById('layDivWrap'), md = document.getElementById('layMode');
        [lc, dw, md].forEach(function (x) { if (x && x.parentNode !== body) body.appendChild(x); });
      }
      var order = [grp, pc, ic, bed].filter(Boolean);
      for (var i = 1; i < order.length; i++) if (order[i - 1].nextElementSibling !== order[i]) order[i - 1].parentNode.insertBefore(order[i], order[i - 1].nextElementSibling);
      if (!wired) { wired = true; var scr = document.getElementById('screen-input'); if (scr) { scr.addEventListener('input', sums); scr.addEventListener('change', sums); } }
      sums();
    } catch (e) { console.error('r16.53 subcards', e); }
  }
  window.pbSubCards = apply;
  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function (name) { if (name === 'input') setTimeout(apply, 0); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(apply, 60); }); else setTimeout(apply, 60);
})();
</script>
<style>
/* r16.53: the four sub-cards look alike: Job details takes the sub-card look the Trench design card already had */
#pbApp#pbApp #screen-input #runSecJob > details.pb-jobgrp { margin: 12px 16px 12px 16px; background: var(--pb-raised); border-radius: 12px; border-top: 0; }
#pbApp#pbApp #screen-input #runSecJob > details.pb-jobgrp > summary { min-height: 52px; padding: 6px 40px 6px 14px; }
#pbApp#pbApp #screen-input #runSecJob > details.pb-jobgrp > summary::after { right: 16px; width: 9px; height: 9px; }
#pbApp#pbApp #screen-input #runSecJob > details.pb-jobgrp .pb-jobgrp-title { color: var(--pb-text); font-size: 15px; flex: 0 1 auto; }
#pbApp#pbApp #screen-input #runSecJob > details.pb-jobgrp .pb-jobgrp-sum { font-size: 14px; font-weight: 400; color: var(--pb-text-2); flex: 1 1 0; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#pbApp#pbApp #screen-input #runSecJob > details.pb-jobgrp > .pb-section { border-top: 0; }
#pbApp#pbApp #screen-input #runSecJob > details.pb-jobgrp > .pb-section > .pb-body { padding: 0 14px 14px 14px; }
#pbApp#pbApp #screen-input #runSecJob > details.pb-jobgrp .pb-runsec-jobline { display: none; }
#pbApp#pbApp #screen-input .pb-subcard > .pb-section > .pb-body { padding: 0 14px 14px 14px; }
#pbApp#pbApp #screen-input .pb-subcard .pb-field { margin-left: 0; margin-right: 0; }
#pbApp#pbApp #screen-input #runIntGroup .pb-field { margin-bottom: 8px; }
#pbApp#pbApp #screen-input #runIntGroup .pb-lay-check { min-height: 40px; }
#pbApp#pbApp #screen-input #runIntGroup .pb-lay-mode:empty { display: none; }
#pbApp#pbApp #screen-input #runSecJob .pb-lay-help { display: none; }
#pbApp#pbApp #screen-input [id^="pbm3Part"] { display: none !important; } /* r16.53: the pipe material pick added nothing here */
#pbApp#pbApp #screen-input #runIntGroup input { max-width: 220px; }
#pbApp#pbApp #screen-input #runSecJob details[open] > summary .pb-subrow-sum { display: none; }
#pbApp#pbApp #screen-input .pb-whorow.one { grid-template-columns: minmax(0, 1fr); }
#pbApp#pbApp #screen-input .pb-whorow > .pb-field { margin-bottom: 12px; }
#pbApp#pbApp.pb-text-big #screen-input .pb-whorow { grid-template-columns: minmax(0, 1fr); }
</style>
</body>
</html>"""
i = s.rstrip().rfind('</body>')
s = s[:i] + tail + '\n'
s = s.replace("const PB_APP_BUILD = 'r16.52 · 2026-11-16';", "const PB_APP_BUILD = 'r16.53 · 2026-11-16';")
assert "r16.53 · 2026-11-16" in s
open(out, 'w', encoding='utf-8').write(s)
