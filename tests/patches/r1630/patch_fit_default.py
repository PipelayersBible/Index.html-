import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(s.count(a),a[:90]); s=s.replace(a,b)
# r16.30 (Tommy, Nov 15): ticking "This hub is a fitting" no longer assumes a Wye (and a wye's laying length).
# The fitting starts as "Choose…" with no laying length until a type is picked.
rep("""  var PB_FIT_TYPES = [['wye', 'Wye'],""", """  var PB_FIT_TYPES = [['', 'Choose\\u2026'], ['wye', 'Wye'],""")
rep("""    if (t) t.value = fit && PB_FIT_TYPES.some(x => x[0] === fit.type) ? fit.type : 'wye';""",
"""    if (t) t.value = fit && fit.type && PB_FIT_TYPES.some(x => x[0] === fit.type) ? fit.type : '';""")
# A stake read by AI that names a fitting (AP, BEND, WYE, TEE, 45°...) sets the hub's fitting the same way a cutsheet row does
rep("""      plan.forEach(x => { if (onlyEmpty && x.cur !== null) return; const el = document.getElementById(x.id); if (el) { el.classList.add('pb-ai-filled');""",
"""      let fitNote = '';
      try {
        const on = document.getElementById(prefix + 'FitOn'), ty = document.getElementById(prefix + 'FitType'), inf = document.getElementById(prefix + 'FitInfo');
        const fit = on && !on.checked && ty && typeof window.pbCutsheetFitOf === 'function' ? window.pbCutsheetFitOf([p.vals.offset, p.vals.line, p.thought && p.thought.line, p.other].filter(Boolean).join(' ')) : null;
        if (fit) {
          on.checked = true; on.dispatchEvent(new Event('change', { bubbles: true }));
          ty.value = fit.type; if (inf) inf.value = fit.info || '';
          ty.dispatchEvent(new Event('change', { bubbles: true }));
          [on, ty, inf].forEach(el => { if (el) { el.classList.add('pb-ai-filled'); el.addEventListener('input', () => el.classList.remove('pb-ai-filled'), { once: true }); el.addEventListener('change', () => el.classList.remove('pb-ai-filled'), { once: true }); } });
          fitNote = ' Fitting: ' + pbFitWord(fit.type) + (fit.info ? ' (' + fit.info + ')' : '') + '.';
        }
      } catch (e) { console.error(e); }
      plan.forEach(x => { if (onlyEmpty && x.cur !== null) return; const el = document.getElementById(x.id); if (el) { el.classList.add('pb-ai-filled');""")
rep("""'Filled: ' + filled + '. Check the outlined boxes against the stake.' + pbStakeAiUnsure(p));""",
"""'Filled: ' + filled + '.' + fitNote + ' Check the outlined boxes against the stake.' + pbStakeAiUnsure(p));""")
open(sys.argv[2],'w').write(s); print('ok')
