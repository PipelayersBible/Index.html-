import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:90])
    s = s.replace(old, new)
# wording
rep("""<input type="checkbox" id="saEnableToggle" style="width:auto;" onchange="pbToggleStatsArchiveFields()"> Track extra details for this run</label>""",
    """<input type="checkbox" id="saEnableToggle" style="width:auto;" onchange="pbToggleStatsArchiveFields()"> <span id="saEnableLabel">Add job info and count in Stats</span></label>""")
rep("""<p class="pb-help" id="saDisabledNote" style="margin:4px 0 0 0;">Off: saved, but not counted in Stats.</p>""",
    """<p class="pb-help" id="saDisabledNote" style="margin:4px 0 0 0;">Off: saved without job info.</p>""")
rep("""<p class="pb-help pb-b3-lead0">Carried over from your last run. Check them.</p>""",
    """<p class="pb-help pb-b3-lead0">From your last run. Check them.</p>""")
rep("""const t = on ? 'Off: the run is still saved and its report still goes to ' + pbRfToWhom(pbArchiveOwnerUid) + ', but it isn’t counted in Stats. Turn on to add the pipe type or notes.' : pbRfHome0.note;""",
    """const t = on ? 'Off: still saved and sent, not counted in Stats.' : pbRfHome0.note; { const L = document.getElementById('saEnableLabel'); const lt = on ? 'Count in Stats and add notes' : 'Add job info and count in Stats'; if (L && L.textContent !== lt) L.textContent = lt; } /* r16.48 */""")
# summaries: the rod unit is now in Points & Instrument
rep("""    set('runSecJobSum', [job || 'Job not entered', rod, idTxt,""", """    set('runSecJobSum', [job || 'Job not entered', idTxt,""")
rep("""    const pts = [pbRunSecPoint('start', 'Start')];""", """    const pts = [rod, pbRunSecPoint('start', 'Start')]; // r16.48: the rod unit sits in this section now""")
rep("""      opt.push('Extra details on' + (ty ? ' (' + ty + ')' : ', pipe type not chosen'));
    } else opt.push('Extra details off');""", """      opt.push('Counted in Stats' + (ty ? ' (' + ty + ')' : ''));
    } else opt.push('Not counted in Stats');""")
LAYOUT = r"""<!-- r16.48:runsetup-layout -->
<script>
// r16.48: Run Setup's Job & Pipe, organized: Job details, then Pipe, then Bedding / Shading / Materials; the Rod Unit
// opens Points & Instrument. Display only: it moves elements and writes no value.
(function () {
  'use strict';
  function apply() {
    try {
      var grp = document.getElementById('runJobGroup'), pipe = document.getElementById('runPipeSection'), bed = document.getElementById('runBedRow');
      if (grp && pipe && grp.nextElementSibling !== pipe) grp.parentNode.insertBefore(pipe, grp.nextElementSibling);
      if (pipe && bed && pipe.nextElementSibling !== bed) pipe.parentNode.insertBefore(bed, pipe.nextElementSibling);
      var rod = document.getElementById('rodToggle'), rodSec = rod && rod.closest('.pb-section'), pts = document.getElementById('runSecPoints');
      if (rodSec && pts && rodSec.parentNode !== pts) { var sm = pts.querySelector(':scope > summary'); if (sm) pts.insertBefore(rodSec, sm.nextSibling); }
      var st = document.getElementById('statsType'), sf = st && st.closest('.pb-field'); if (sf && sf.style.display !== 'none') sf.style.display = 'none'; // Pipe > Pipe type is the one (they mirror)
      var pl = document.getElementById('saPipelayer'), cr = document.getElementById('saCrew'), fp = pl && pl.closest('.pb-field'), fc = cr && cr.closest('.pb-field');
      if (fp && fc && !(fp.parentNode.classList && fp.parentNode.classList.contains('pb-jobpair'))) { var pr = document.createElement('div'); pr.className = 'pb-jobpair'; fc.parentNode.insertBefore(pr, fc); pr.appendChild(fc); pr.appendChild(fp); }
      var wrap = document.getElementById('saFieldsWrap');
      if (wrap && !document.getElementById('pbJobReset')) { var b = document.createElement('button'); b.type = 'button'; b.id = 'pbJobReset'; b.className = 'pb-job-reset'; b.textContent = 'Clear job info'; b.addEventListener('click', function () { if (typeof window.pbResetStatsArchiveFields === 'function') window.pbResetStatsArchiveFields(); }); wrap.appendChild(b); }
      var sc = document.getElementById('screen-input'), ack = false; try { ack = localStorage.getItem('pbAiPrivacyAck') === '1'; } catch (e) {}
      if (sc) sc.classList.toggle('pb-ai-acked', ack);
    } catch (e) { console.error('r16.48 layout', e); }
  }
  window.pbRunSetupLayout = apply;
  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function (name) { if (name === 'input') setTimeout(apply, 0); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(apply, 50); }); else setTimeout(apply, 50);
  document.addEventListener('click', function () { setTimeout(apply, 400); }, true);
})();
</script>
<style>
#pbApp#pbApp #screen-input.pb-ai-acked .pb-ai-privacy { display: none; } /* r16.48: said once, at the first AI use */
#pbApp#pbApp #screen-input #runSecPoints > .pb-section:has(#rodToggle) { margin-top: 0; }
</style>
</body>"""
idx = s.rfind('</body>')
assert idx > 0
s = s[:idx] + LAYOUT + s[idx + len('</body>'):]
open(out, 'w', encoding='utf-8').write(s)
