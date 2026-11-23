# foremen_job_nov23 f1: "Foremen on this job" on the job page, right under "PMs & supers on this job" (same pattern:
# folded row with the names, Assign/Change Foremen, ticks, Save/Cancel, loads with signal, version check, plain refusals).
# python3 f1_job_foremen.py in.html out.html   (exact-once; on _src/index.html = r17.16)
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'f1')
p = P()
# 1) the section, right after PMs & supers on the job page
p.rep("      + pbPmJobHtml() + '<section class=\"pbp-block\" id=\"pjWhoSec\">",
      "      + pbPmJobHtml() + pbFmJobHtml() /* foremen_job_nov23 */ + '<section class=\"pbp-block\" id=\"pjWhoSec\">")
# 1b) styles: shown only on the Overview tab and drawn as a card, exactly like PMs & supers
p.rep('#pbApp #screen-prodJob.pbx-jobscr #pjBody:not([data-cxtab="overview"]) :is(#pjCxOverview, #pjPmSec, #pjDaily) { display: none; }',
      '#pbApp #screen-prodJob.pbx-jobscr #pjBody:not([data-cxtab="overview"]) :is(#pjCxOverview, #pjPmSec, #pjFmSec, #pjDaily) { display: none; }')
p.rep('#pbApp #screen-prodJob.pbx-jobscr #pjBody #pjPmSec { margin-top: 12px;', '#pbApp #screen-prodJob.pbx-jobscr #pjBody :is(#pjPmSec, #pjFmSec) { margin-top: 12px;')
p.rep('#pbApp #screen-prodJob.pbx-jobscr #pjBody #pjPmSec .pbp-who { margin-top: 8px; }', '#pbApp #screen-prodJob.pbx-jobscr #pjBody :is(#pjPmSec, #pjFmSec) .pbp-who { margin-top: 8px; }')
# 2) loads with the PMs when the job page loads
p.rep("    pbPmJobLoad(); // batch 19 PM: the job's assigned PMs, alongside\n",
      "    pbPmJobLoad(); // batch 19 PM: the job's assigned PMs, alongside\n    pbFmJobLoad(); // foremen_job_nov23: the job's foremen, alongside\n")
# 2b) Edit Job menu: "Foremen" right after "PMs & supers", opening the same editor
p.rep("['pms', 'PMs & supers', 'Who gets this job’s alerts and plan changes'], ",
      "['pms', 'PMs & supers', 'Who gets this job’s alerts and plan changes'], ['fms', 'Foremen', 'Which foremen are on this job'] /* foremen_job_nov23 */, ")
p.rep("    if (what === 'pms') { window.pbCxTab('overview'); if (pbPj.pms) window.pbPmJobEdit(); else pbAlert(pbPj.pmMsg || 'PMs and supers load with signal.', 'PMs & Supers'); at('pjPmSec'); return; }\n",
      "    if (what === 'pms') { window.pbCxTab('overview'); if (pbPj.pms) window.pbPmJobEdit(); else pbAlert(pbPj.pmMsg || 'PMs and supers load with signal.', 'PMs & Supers'); at('pjPmSec'); return; }\n"
      "    if (what === 'fms') { window.pbCxTab('overview'); if (pbPj.fms) window.pbFmJobEdit(); else pbAlert(pbPj.fmMsg || 'Foremen load with signal.', 'Foremen'); at('pjFmSec'); return; } // foremen_job_nov23\n")
# 3) the module, after the PM/super module
p.rep("  // ================= end batch 19 PM (job) =================\n",
      "  // ================= end batch 19 PM (job) =================\n" + open(os.path.join(H, 'foremen.js'), encoding='utf-8').read())
# 4) Spanish (switched off; English is the key)
ES = {
  "Foremen on this job": "Capataces en este trabajo", "Assign Foremen": "Asignar capataces", "Change Foremen": "Cambiar capataces",
  "None assigned": "Ninguno asignado", "None assigned.": "Ninguno asignado.", "Assigned by job number": "Se asignan por número de trabajo",
  "Foremen are assigned by job number.": "Los capataces se asignan por número de trabajo.", "No longer a foreman": "Ya no es capataz",
  "No foremen in the company yet. Add them in Crew members.": "Todavía no hay capataces en la compañía. Agréguelos en Miembros de la cuadrilla.",
  "Only the owner, a PM or a superintendent can take another foreman off this job. You can add foremen, or take yourself off.": "Solo el dueño, un PM o un superintendente puede quitar a otro capataz de este trabajo. Usted puede agregar capataces o quitarse a sí mismo.",
  "No signal. Assigning foremen needs signal.": "Sin señal. Para asignar capataces se necesita señal.", "Foremen": "Capataces",
  "Up to 20 foremen per job.": "Hasta 20 capataces por trabajo.", "Which foremen are on this job": "Qué capataces están en este trabajo", "Foremen load with signal.": "Los capataces se cargan con señal.", "Saved. No foremen on this job.": "Guardado. No hay capataces en este trabajo.",
  "Up to 20 foremen per job (someone else added some meanwhile). Nothing was changed.": "Hasta 20 capataces por trabajo (otra persona agregó algunos mientras tanto). No se cambió nada.",
  "Someone else is changing the foremen on this job right now. Nothing was changed. This is the list as it is now: tick your change again, then Save.": "Otra persona está cambiando los capataces de este trabajo en este momento. No se cambió nada. Esta es la lista como está ahora: marque su cambio otra vez y toque Guardar.",
  "Only the owner, a PM or a superintendent can take another foreman off this job. Nothing was changed.": "Solo el dueño, un PM o un superintendente puede quitar a otro capataz de este trabajo. No se cambió nada.",
  "Someone you picked isn’t a foreman of the company any more. Nothing was changed. Refresh and try again.": "Alguien que eligió ya no es capataz de la compañía. No se cambió nada. Actualice e inténtelo de nuevo.",
  "Assigning foremen isn’t ready on the company server yet.": "Asignar capataces todavía no está listo en el servidor de la compañía.",
  "Assigning foremen isn’t ready on the company server yet. Nothing was changed.": "Asignar capataces todavía no está listo en el servidor de la compañía. No se cambió nada.",
}
PAT = [["^Saved\\. (\\d+) foremen? on this job\\.$", "Guardado. {0} capataz(ces) en este trabajo."]]
DICT = '<script type="application/json" id="pbI18nDict">{"t":{'
_i = p.s.index(DICT) + len(DICT) - len('{"t":{'); _j = p.s.index('</script>', _i)
HAVE = json.loads(p.s[_i:_j].replace('<\\/', '</'))['t']
ent = ''.join(json.dumps(k, ensure_ascii=False) + ':' + json.dumps(v, ensure_ascii=False) + ',' for k, v in ES.items() if k not in HAVE).replace('</', '<\\/')
print('i18n: %d new strings, %d already in the dictionary' % (sum(1 for k in ES if k not in HAVE), sum(1 for k in ES if k in HAVE)))
p.rep(DICT, DICT + ent)
p.rep('"},"p":[', '"},"p":[' + ''.join(json.dumps(x, ensure_ascii=False) + ',' for x in PAT).replace('</', '<\\/'))
p.save()
