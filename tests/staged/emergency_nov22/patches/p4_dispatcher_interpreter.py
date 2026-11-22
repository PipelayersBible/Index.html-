# p4_dispatcher_interpreter.py <in.html> <out.html> (emergency_nov22, Spanish review #19): under "Read this to the dispatcher" ("Lea esto
# al operador del 911 (está en inglés)") a Spanish-only line: say the address first, then "Spanish"; 911 brings in an interpreter, it can
# take a minute, don't hang up. Shown only when the app is in Spanish (html[lang=es]); Spanish is switched off today.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""text-transform:uppercase; color:var(--hazard);">Read this to the dispatcher</p>
      <div class="pb-emergency-script" id="cpEmergencyScript"></div>
""", """text-transform:uppercase; color:var(--hazard);">Read this to the dispatcher</p>
      <p class="cp-disp-es" lang="es" data-noi18n>Si no habla bien inglés: diga primero la dirección y luego «Spanish». El 911 conecta a un intérprete; puede tardar un minuto, no cuelgue.</p>
      <div class="pb-emergency-script" id="cpEmergencyScript"></div>
""")
p.rep("""<style id="pbI18nCss">
""", """<style id="pbI18nCss">
.cp-disp-es { display: none; }
html[lang="es"] .cp-disp-es { display: block; margin: 0 16px 8px 16px; font-size: 14px; font-weight: 600; color: var(--hazard); }
""")
p.save()
