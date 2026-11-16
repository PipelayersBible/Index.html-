import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
# label: no "(required)" (Lock asks for the job)
rep("const t = on ? 'Job number (required)' : pbRfHome0.jLab;", "const t = on ? 'Job number' : pbRfHome0.jLab; /* r16.52 */")
rep('<p class="pb-help pb-b3-lead0">From your last run. Check them.</p>', '<p class="pb-help pb-b3-lead0" id="saLastRunNote">From your last run</p>')
# Clear link sits beside the lead line instead of under the notes
rep("if (wrap && !document.getElementById('pbJobReset')) { var b = document.createElement('button'); b.type = 'button'; b.id = 'pbJobReset'; b.className = 'pb-job-reset'; b.textContent = 'Clear job info'; b.addEventListener('click', function () { if (typeof window.pbResetStatsArchiveFields === 'function') window.pbResetStatsArchiveFields(); }); wrap.appendChild(b); }",
    "if (wrap && !document.getElementById('pbJobReset')) { var b = document.createElement('button'); b.type = 'button'; b.id = 'pbJobReset'; b.className = 'pb-job-reset'; b.textContent = 'Clear'; b.addEventListener('click', function () { if (typeof window.pbResetStatsArchiveFields === 'function') window.pbResetStatsArchiveFields(); }); wrap.appendChild(b); }\n"
    "      var lead = document.getElementById('saLastRunNote'), rb = document.getElementById('pbJobReset'); /* r16.52: one line: From your last run · Clear */\n"
    "      if (wrap && lead && rb) { var lr = document.getElementById('pbJobLastRow'); if (!lr) { lr = document.createElement('div'); lr.id = 'pbJobLastRow'; lr.className = 'pb-job-lastrow'; wrap.insertBefore(lr, wrap.firstChild); } if (lead.parentNode !== lr) lr.appendChild(lead); if (rb.parentNode !== lr) lr.appendChild(rb); }")
css = """<style>
/* r16.52: Job details compact: job number | jobsite side by side, Clear beside "From your last run", no empty gaps */
#pbApp#pbApp #screen-input #runStatsSection > .pb-body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 12px; }
#pbApp#pbApp #screen-input #runStatsSection > .pb-body > * { grid-column: 1 / -1; min-width: 0; }
#pbApp#pbApp #screen-input #runStatsSection > .pb-body > .pb-field:has(#saJobNumber),
#pbApp#pbApp #screen-input #runStatsSection > .pb-body > .pb-field:has(#saJobsite) { grid-column: auto; margin-left: 0; margin-right: 0; }
#pbApp#pbApp #screen-input #pbRfWhoLine { margin-top: 0; margin-bottom: 0; }
#pbApp#pbApp #screen-input #saFieldsWrap { margin-top: 0 !important; }
#pbApp#pbApp #screen-input #runStatsSection > .pb-body > .pb-field:has(#saEnableToggle) { margin-bottom: 2px; }
#pbApp#pbApp #screen-input .pb-job-lastrow { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 2px; }
#pbApp#pbApp #screen-input .pb-job-lastrow .pb-b3-lead0 { margin: 0; }
#pbApp#pbApp #screen-input .pb-job-lastrow .pb-job-reset { margin: 0; min-height: 40px; padding: 0 2px; flex: none; }
#pbApp#pbApp #screen-input .pb-jobpair:not(:has(> .pb-field:nth-child(2):not([style*="display: none"]))),
#pbApp#pbApp #screen-input .pb-jobpair:not(:has(> .pb-field:nth-child(1):not([style*="display: none"]))) { grid-template-columns: minmax(0, 1fr); }
#pbApp#pbApp #screen-input #saBeddingMirror:empty { display: none; }
#pbApp#pbApp.pb-text-big #screen-input #runStatsSection > .pb-body > .pb-field:has(#saJobNumber),
#pbApp#pbApp.pb-text-big #screen-input #runStatsSection > .pb-body > .pb-field:has(#saJobsite) { grid-column: 1 / -1; }
</style>
</body>
</html>"""
assert s.rstrip().endswith('</body>\n</html>')
i = s.rstrip().rfind('</body>')
s = s[:i] + css + '\n'
s = s.replace("const PB_APP_BUILD = 'r16.51 · 2026-11-16';", "const PB_APP_BUILD = 'r16.52 · 2026-11-16';")
assert "r16.52 · 2026-11-16" in s
open(out, 'w', encoding='utf-8').write(s)
