import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.86: the job's Materials: fittings the app counted on this phone's runs for the job, above the list (so a fitting
# isn't recorded again by hand)
rep("""    h += pbMatTkHtml(job, list); // feat_takeoff""", """    h += pbMatTkHtml(job, list); // feat_takeoff
    try { h += pbMatFitCountedHtml(job); } catch (e) { console.error(e); } // r16.86""")
rep("""  function pbMatSectionHtml() {""", """  function pbMatFitCountedHtml(job) {
    const jk = String(job.job_number || '').trim().toLowerCase(); if (!jk || typeof window.pbFitCount !== 'function') return '';
    const runs = (typeof runArchive !== 'undefined' ? runArchive : []).filter(e => e && e.kind === 'run' && String(e.jobNumber || '').trim().toLowerCase() === jk);
    const by = new Map(); let mj = 0, n = 0, nr = 0;
    runs.forEach(e => { const C = window.pbFitCount(e); if (!C.total) return; nr++; C.items.forEach(g => { const k = g.name.toLowerCase(), x = by.get(k) || { name: g.name, n: 0 }; x.n += g.n; by.set(k, x); n += g.n; }); if (C.kind === 'mj') mj += C.joints; });
    if (!n) return '';
    return '<div class="pbm-fitcounted" id="pjMatFitCounted" style="margin:0 0 12px;padding:10px 12px;border:1px solid var(--pb-divider);border-radius:12px;"><strong>Already counted by the app</strong><p class="pbp-dim" style="margin:2px 0 6px;">Fittings on ' + nr + ' run' + (nr === 1 ? '' : 's') + ' for this job on this phone (laid ones, where laid marks are used). Don\\u2019t record these again by hand.</p><ul style="margin:0 0 0 18px;padding:0;">'
      + [...by.values()].map(x => '<li>' + escapeHtml(x.n + ' \\u00d7 ' + x.name) + '</li>').join('') + (mj ? '<li>' + mj + ' MJ accessory kit' + (mj === 1 ? '' : 's') + ' (gland, gasket, bolts)</li>' : '') + '</ul></div>';
  }
  window.__pbMatFitHtml = (j) => pbMatFitCountedHtml(j); // tests
  function pbMatSectionHtml() {""")
open(out, 'w', encoding='utf-8').write(s); print('ok')
