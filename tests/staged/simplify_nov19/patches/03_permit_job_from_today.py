# 03 Entry Permit: a blank "Job number (optional)" takes the Current job (as before); with no Current job chosen it now
# takes the one job this phone ran today (the same rule the field ticket uses; two jobs today: left blank). Still marked
# auto, so an untouched value is not "typed". Usage: python3 03_... in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""    const n = cj && cj.job_number ? String(cj.job_number).trim() : '';
    if (!n || el.value.trim() !== '') return;
    el.value = n; el.dataset.cpAuto = n; el.classList.add('pb-cp-auto');""", """    let n = cj && cj.job_number ? String(cj.job_number).trim() : '';
    if (!n) { try { // simplify 03: else the one job this phone ran today
      const day = (t) => { const d = new Date(t); return isNaN(d) ? '' : d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }, td = day(Date.now());
      const js = (Array.isArray(runArchive) ? runArchive : []).filter(e => e && e.kind === 'run' && String(e.jobNumber || '').trim() && day(e.runStartTime || e.lockTime) === td).map(e => String(e.jobNumber).trim());
      if (js.length && new Set(js.map(x => x.toLowerCase())).size === 1) n = js[js.length - 1];
    } catch (e) {} }
    if (!n || el.value.trim() !== '') return;
    el.value = n; el.dataset.cpAuto = n; el.classList.add('pb-cp-auto');""")
p.save()
