#!/usr/bin/env python3
# runsetup 01: a foreman's New Run no longer fills "Pipelayer name" with the foreman's own name.
# Critic Nov 19 #6: saPipelayer = the signed-in foreman, right above "Foreman: <same name>": a wrong name on the record.
# New rule, on a FOREMAN's phone only (a pipelayer's phone still starts with his own name; an owner/manager phone and a
# phone with no company are unchanged):
#   - the box starts blank, unless the foreman's crew (My crew) is exactly one pipelayer: then it starts with that name;
#   - a name typed, restored from a draft, or on a run being edited/resumed is never touched;
#   - under the box: one-tap names (the crew, the last run's pipelayer, "Me") while the box is blank. A tap is the same as typing it.
# Nothing else changes: the same field saves the same way (blank saves blank, as an emptied box always did).
# Usage: python3 01_pipelayer_prefill.py in.html out.html
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

rep("""    if (!pl.dataset.pbW) { pl.dataset.pbW = '1'; pl.addEventListener('input', () => { pl.dataset.typedGen = String(pbFormGen); }); }
    const g = String(pbFormGen); if (pl.dataset.fillGen === g || pl.dataset.typedGen === g) return;
    const me = String(pbRfMyName(uid) || '').trim(); if (!me) return;
    pl.dataset.fillGen = g;
    if (window._pbResumingFromEntryId) return;
    const cur = String(pl.value || '').trim(), last = String(window._pbLastPl || '').trim();
    if (!cur || cur === last) pl.value = me;
  }""", """    if (!pl.dataset.pbW) { pl.dataset.pbW = '1'; pl.addEventListener('input', () => { pl.dataset.typedGen = String(pbFormGen); setTimeout(() => { try { pbPlFill(); } catch (e) {} }, 0); }); }
    const g = String(pbFormGen), me = String(pbRfMyName(uid) || '').trim();
    /* runsetup 01: a foreman's phone: blank, or the one pipelayer on his crew; never the foreman's own name */
    if (me && pbLvIsForeman(uid) && pbRolesKind(uid) !== 'pipelayer') {
      if (window._pbResumingFromEntryId) { pbPlChips(null); return; } // a run being fixed or resumed keeps its own name
      const lc = (x) => String(x || '').trim().toLowerCase(), last = String(window._pbLastPl || '').trim();
      const known = !!(pbCrew && pbCrew.uid === uid && pbCrew.links), crew = known && Array.isArray(pbCrew.links.my_crew) ? pbCrew.links.my_crew.map(p => String((p && p.name) || '').trim()).filter(Boolean) : [];
      if (pl.dataset.typedGen !== g) {
        if (pl.dataset.plGen !== g) { // first look at this form: a name carried over (not typed for this run) is dropped
          const cur = String(pl.value || '').trim();
          pl.dataset.plGen = g; pl.dataset.plAuto = '';
          if (!cur || cur === last || !pbFormFromBoot) { if (cur) { pl.dataset.plPrev = cur; pl.value = ''; } pl.dataset.plAuto = '1'; }
        }
        if (pl.dataset.plAuto === '1' && crew.length === 1 && pl.value !== crew[0]) pl.value = crew[0]; // the crew list can arrive after the form opens
        if (pl.dataset.plAuto === '1' && crew.length !== 1 && pl.value) pl.value = '';
      }
      { const prev = String(pl.dataset.plPrev || last || '').trim(); pbPlChips({ me: me, crew: crew, last: lc(prev) === lc(me) ? '' : prev }); }
      return;
    }
    pbPlChips(null);
    if (pl.dataset.fillGen === g || pl.dataset.typedGen === g) return;
    if (!me) return;
    pl.dataset.fillGen = g;
    if (window._pbResumingFromEntryId) return;
    const cur = String(pl.value || '').trim(), last = String(window._pbLastPl || '').trim();
    if (!cur || cur === last) pl.value = me;
  }
  // runsetup 01: one-tap pipelayer names under the box while it is blank (a foreman's phone)
  function pbPlChips(o) {
    const pl = document.getElementById('saPipelayer'), row = document.getElementById('pbWhoRow'); let box = document.getElementById('saPlChips');
    const names = []; if (o) { const seen = new Set(), add = (n, t) => { const k = String(n || '').trim().toLowerCase(); if (!k || seen.has(k)) return; seen.add(k); names.push({ n: String(n).trim(), t: t }); }; o.crew.slice(0, 6).forEach(n => add(n, '')); add(o.last, ''); add(o.me, 'Me'); }
    const show = !!(o && pl && row && row.parentNode && !String(pl.value || '').trim() && names.length);
    if (!show) { if (box && !box.hidden) box.hidden = true; return; }
    if (!box) {
      box = document.createElement('div'); box.id = 'saPlChips'; box.className = 'pb-plchips'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Pipelayer: tap a name');
      box.addEventListener('click', (ev) => { const b = ev.target.closest('button[data-n]'); if (!b) return; pl.value = b.dataset.n; pl.dispatchEvent(new Event('input', { bubbles: true })); pl.dispatchEvent(new Event('change', { bubbles: true })); box.hidden = true; });
    }
    if (box.previousElementSibling !== row) row.parentNode.insertBefore(box, row.nextSibling);
    const key = JSON.stringify(names);
    if (box.dataset.k !== key) { box.dataset.k = key; box.innerHTML = '<span class="pb-plchips-l">Pipelayer:</span>' + names.map(x => '<button type="button" class="pb-plchip" data-n="' + escapeHtml(x.n) + '">' + escapeHtml(x.t ? x.t + ' (' + x.n + ')' : x.n) + '</button>').join(''); }
    if (box.hidden) box.hidden = false;
  }""")

# a draft put back on the form, or a cancelled edit's job fields put back: that name is the form's own, never dropped
rep("""      if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!v; else el.value = v;
    });
    try { pbPiAPutAuto(d.pa); }""", """      if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!v; else el.value = v;
    });
    try { const _pl = document.getElementById('saPipelayer'); if (_pl && d.top && 'saPipelayer' in d.top) _pl.dataset.typedGen = String(pbFormGen); } catch (e) {} /* runsetup 01 */
    try { pbPiAPutAuto(d.pa); }""")
rep("""    PB_RC_SA.forEach(id => { const el = document.getElementById(id); if (!el || !(id in o) || el.type === 'checkbox') return; el.value = o[id]; });""", """    PB_RC_SA.forEach(id => { const el = document.getElementById(id); if (!el || !(id in o) || el.type === 'checkbox') return; el.value = o[id]; if (id === 'saPipelayer') el.dataset.typedGen = String(pbFormGen); /* runsetup 01 */ });""")

rep("""#pbApp#pbApp #screen-input #pbRfWhoLine { margin-top: 0; margin-bottom: 0; }""", """#pbApp#pbApp #screen-input #pbRfWhoLine { margin-top: 0; margin-bottom: 0; }
/* runsetup 01: one-tap pipelayer names */
#pbApp#pbApp #screen-input .pb-plchips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 2px 0 10px; }
#pbApp#pbApp #screen-input .pb-plchips[hidden] { display: none; }
#pbApp#pbApp #screen-input .pb-plchips-l { font-size: 14px; color: var(--pb-text-2); }
#pbApp#pbApp #screen-input .pb-plchip { min-height: 44px; padding: 0 14px; border-radius: 22px; border: 1.5px solid var(--pb-text-3); background: var(--pb-surface); color: var(--pb-text); font: inherit; font-size: 15px; font-weight: 600; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }""")
open(out, 'w', encoding='utf-8').write(s)
print('01_pipelayer_prefill ok')
