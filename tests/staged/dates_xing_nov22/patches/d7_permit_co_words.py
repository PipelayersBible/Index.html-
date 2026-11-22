# dates_xing_nov22 d7: the confined space permit told every state that 25 ppm CO is "the Cal/OSHA limit". The 25 ppm
# default stays (the strictest; federal OSHA's PEL is 50 ppm, NIOSH 35). Cal/OSHA is named only on a California job
# (the permit's job number -> the job's state; no state known: the plain words).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
OLD_L = 'Maximum CO (ppm) — blank uses 25 ppm, the Cal/OSHA limit (stricter than NIOSH’s 35 and federal OSHA’s 50)'
NEW_L = 'Maximum CO (ppm) — blank uses 25 ppm (the strictest limit; federal OSHA’s is 50)'
p.rep('<label for="cpMaxCO">' + OLD_L + '</label>', '<label for="cpMaxCO">' + NEW_L + '</label>')
p.rep('"' + OLD_L + '":"CO máximo (ppm) — en blanco usa 25 ppm, el límite de Cal/OSHA (más estricto que los 35 de NIOSH y los 50 de OSHA federal)"',
      '"' + NEW_L + '":"CO máximo (ppm) — en blanco usa 25 ppm (el límite más estricto; el de OSHA federal es 50)"')
p.rep("""        if (cm !== null && cm > 25) loose.push('maximum CO ' + cm + ' ppm is above the Cal/OSHA limit of 25 ppm'); }""",
"""        if (cm !== null && cm > 25) { let ca = false; try { const n = String((document.getElementById('cpJobNumber') || {}).value || '').trim(), s = n && typeof window.pbSrJobState === 'function' ? window.pbSrJobState(n) : null; ca = !!(s && s.how !== 'default' && s.code === 'CA'); } catch (e) { ca = false; }
          loose.push('maximum CO ' + cm + ' ppm is above ' + (ca ? 'the Cal/OSHA limit of 25 ppm' : '25 ppm, the strictest limit (federal OSHA’s is 50)')); } } /* dates_xing_nov22: Cal/OSHA only on a California job */""")
p.save()
