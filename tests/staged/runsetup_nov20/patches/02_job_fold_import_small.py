#!/usr/bin/env python3
# runsetup 02: Run Setup opens on what this run needs.
#  (a) Job details starts CLOSED on a new run whose job is already filled in (from the current job or the last run). Its
#      closed line says the job, and who the pipelayer is ("no pipelayer yet" when blank). One tap opens it. It still
#      opens by itself for a flagged field or focus, stays open when there is no job yet, on Edit Run Data / a resumed
#      run / a draft, and for an account that chose to keep it open (the remembered choice from batch 14 R3).
#  (b) Import Cutsheet (and Reuse Pipe Settings) are compact buttons at their own width, not a full-width bar.
# Display only: no field, value or saved record changes.
# Usage: python3 02_job_fold_import_small.py in.html out.html
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# (a) start state
rep("""  function startState() { return !(jobFilled() && pref() === 'closed'); }""",
    """  function jobShown() { var j = document.getElementById('saJobNumber'); return !!(val('saJobNumber') || val('saJobsite')) && (on() || !!(j && !j.closest('#saFieldsWrap'))); } /* runsetup 02: a company run keeps its job with Stats off */
  function freshForm() { try { return !!(window.pbJobGrpIsFreshForm && window.pbJobGrpIsFreshForm()); } catch (e) { return false; } }
  function startState() { if (jobFilled() && pref() === 'closed') return false; return !(freshForm() && jobShown() && pref() !== 'open'); } /* runsetup 02: a new run that already has its job starts with the line, not the boxes */""")
rep("""    if (val('saJobsite')) parts.push(val('saJobsite'));
    return parts.join(' · ') || 'No job entered';""",
    """    if (val('saJobsite')) parts.push(val('saJobsite'));
    if (parts.length) { var plEl = document.getElementById('saPipelayer'), plF = plEl && plEl.closest('.pb-field'); if (plEl && plF && plF.style.display !== 'none') parts.push(val('saPipelayer') ? 'Pipelayer ' + val('saPipelayer') : 'no pipelayer yet'); } /* runsetup 02 */
    return parts.join(' · ') || 'No job entered';""")
# the line is refreshed when the app fills the boxes without an event (prefill, the 3 s who-refresh)
rep("""  window.pbJobGrpNewRun = function () { setOpen(startState()); };""",
    """  window.pbJobGrpNewRun = function () { setOpen(startState()); };
  setInterval(function () { try { var sc = document.getElementById('screen-input'); if (sc && sc.classList.contains('active')) render(); } catch (e) {} }, 1500); /* runsetup 02 */""")

# CSS: the closed line may wrap (job + pipelayer), and (b) the compact import row
rep("""#screen-input .pb-runsec-alts .pb-btn { flex: 1 1 150px; width: auto; margin: 0; min-height: 44px; text-transform: none; font-size: 14px; letter-spacing: 0.01em; }""",
    """#screen-input .pb-runsec-alts .pb-btn { flex: 1 1 150px; width: auto; margin: 0; min-height: 44px; text-transform: none; font-size: 14px; letter-spacing: 0.01em; }
/* runsetup 02: compact, at their own width */
#pbApp#pbApp #screen-input .pb-runsec-alts { padding: 8px 16px 0 16px; justify-content: flex-start; }
#pbApp#pbApp #screen-input .pb-runsec-alts .pb-btn { flex: 0 1 auto; min-height: 44px; padding: 0 14px; border-radius: 22px; box-shadow: none; background: transparent; border: 1.5px solid var(--pb-text-3); color: var(--pb-text); font-weight: 600; }
#pbApp#pbApp #screen-input #runSecJob > details.pb-jobgrp:not([open]) > summary { flex-wrap: wrap; row-gap: 0; padding-top: 8px; padding-bottom: 8px; }
#pbApp#pbApp #screen-input #runSecJob > details.pb-jobgrp:not([open]) .pb-jobgrp-sum { flex: 1 1 100%; white-space: normal; overflow: visible; text-overflow: clip; overflow-wrap: anywhere; line-height: 1.35; }""")
open(out, 'w', encoding='utf-8').write(s)
print('02_job_fold_import_small ok')
