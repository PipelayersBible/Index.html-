# p3_spanish_rows.py <in.html> <out.html> (emergency_nov22, Spanish review #2): the Spanish for the words around the emergency
# answer and every "Ask can't answer" message, added to the app's Spanish table (pbI18nDict). Spanish is switched off today;
# strings only. The English keys are read from the page itself (PB_AI_MSG), so they match exactly. New rows go first in the
# table; none of these keys was in it before (checked).
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
msg = p.s[p.s.index('  const PB_AI_MSG = {'):p.s.index('\n  };', p.s.index('  const PB_AI_MSG = {'))]
def en(k):
    m = re.search(r"\n    " + k + r": (?:\(\) => )?'((?:[^'\\]|\\.)*)'", msg)
    assert m, k
    return m.group(1).encode().decode('unicode_escape').encode('latin-1').decode('utf-8')
ES = {
    'plan': 'La IA es parte de los planes pagados (Individual o Contractor). El plan de este teléfono no la incluye. ¿Emergencia? Llame al 911.',
    'offline': 'No hay señal. La IA necesita conexión: no se mandó nada. Los tramos, las calculadoras y los permisos siguen funcionando sin señal. ¿Emergencia? Llame al 911.',
    'signedOut': 'Inicie sesión para usar la IA. Su sesión está cerrada en este teléfono o ya se venció. ¿Emergencia? Llame al 911.',
    'noClient': 'Ahorita no se puede conectar para iniciar sesión, así que no se puede usar la IA. Revise su señal e intente otra vez. ¿Emergencia? Llame al 911.',
    'daily': 'Ya llegó al límite de hoy. Se renueva mañana. ¿Emergencia? Llame al 911.',
    'busy': 'La IA está ocupada ahorita. Intente otra vez en un minuto. ¿Emergencia? Llame al 911.',
    'unavailable': 'La IA no está disponible ahorita. Intente más tarde. ¿Emergencia? Llame al 911.',
    'timeout': 'La IA tardó demasiado. Revise su señal e intente otra vez. ¿Emergencia? Llame al 911.',
    'network': 'No se pudo conectar con la IA. Revise su señal e intente otra vez. ¿Emergencia? Llame al 911.',
    'incomplete': 'No se pudo terminar de buscar eso. Intente otra vez. ¿Emergencia? Llame al 911.',
    'dropped': 'Se perdió la conexión antes de que terminara la respuesta. ¿Emergencia? Llame al 911.',
    'betaEnded': 'Terminó la prueba beta, así que la IA está apagada hasta que su compañía empiece un plan. Todo lo demás sigue funcionando. ¿Emergencia? Llame al 911.',
}
rows = {
    'Emergency': 'Emergencia',
    'No permit is open: this dials the emergency number.': 'No hay permiso abierto: esto marca el número de emergencia.',
    'Declares the emergency on the open permit and dials.': 'Declara la emergencia en el permiso abierto y marca.',
    'Emergency: see above.': 'Emergencia: vea arriba.',
    'Nothing was sent to AI.': 'No se mandó nada a la IA.',
    'Answered by the app · no AI used': 'Respondido por la app · sin IA',
    'Not an emergency? Send to Ask': '¿No es una emergencia? Mandar la pregunta',
}
for k, v in ES.items():
    rows[en(k)] = v
d = json.loads(re.search(r'<script type="application/json" id="pbI18nDict">(.*?)</script>', p.s, re.S).group(1))
for k in rows: assert k not in d['t'], ('already in the table', k)
pats = [['^EMERGENCY · Call (.+?)$', 'EMERGENCIA · Llamar al {0}'], ['^(.+?) Emergency\\? Call 911\\.$', '{0:t} ¿Emergencia? Llame al 911.']]
for a, _ in pats: assert a not in [x[0] for x in d['p']]
j = lambda o: json.dumps(o, ensure_ascii=False).replace('</', '<\\/')
p.rep('<script type="application/json" id="pbI18nDict">{"t":{', '<script type="application/json" id="pbI18nDict">{"t":{' + j(rows)[1:-1] + ',')
p.rep('},"p":[', '},"p":[' + j(pats)[1:-1] + ',')
p.save()
