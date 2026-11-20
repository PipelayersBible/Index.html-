# 04 Calculators: opening one of the simple calculators with nothing typed in it puts the cursor in its first box, so
# the next thing is typing (one tap less). Not when it was opened for a run (values filled in), not on Back, not when
# anything is already typed, and not on the confined space ventilation, volume, bedding or rod calculators.
# Usage: python3 04_calc_cursor.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""  (window.pbScreenHooks = window.pbScreenHooks || []).push(function(name) { if (name === 'confinedActive') pbCpDashSafe(); });""",
"""  (window.pbScreenHooks = window.pbScreenHooks || []).push(function(name) { if (name === 'confinedActive') pbCpDashSafe(); });
  (window.pbScreenHooks = window.pbScreenHooks || []).push(function(name, back) { // simplify 04: cursor in the first box of an empty calculator
    const first = { trenchCalc: 'trenchDepth', slopeConvCalc: 'slopeConvVal', fracCalc: 'fracDecIn', bendCalc: 'bendOffset', liftCalc: 'liftDepth', manholeDepthCalc: 'mhRim', pipeWeightCalc: 'pwID', manningCalc: 'manDia' }[name];
    if (!first || back) return;
    const go = () => { try {
      if (pbCurrentScreen !== name || pbModalIsOpen()) return;
      const sc = document.getElementById('screen-' + name), el = document.getElementById(first); if (!sc || !el || el.disabled) return;
      if ([...sc.querySelectorAll('input')].some(i => /^(number|text|tel)$/.test(i.type) && i.value !== '')) return;
      el.focus({ preventScroll: true });
    } catch (e) {} };
    go(); setTimeout(go, 60); // again after an opener that fills the form first (it then stays out)
  });""")
p.save()
