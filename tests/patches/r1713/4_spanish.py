# r17.13 item 3: Spanish for the English added in r17.12 and in items 1-2 of this update. python3 4_spanish.py in.html out.html
# PB_ES_ENABLED stays false: these only sit in the dictionary block (never read while Spanish is off).
# Style: tests/staged/spanish2_nov20/glossary.md (usted, short, US crew words: cuadrilla, trabajo, obra, mandar,
# foreman, tubero, permiso, persona competente, zanja, talud). Left in English on purpose: the Owner Dashboard and the
# owner's billing admin lines (owner only), the 811 state Rules view's state texts (that whole view is English today),
# the Toolbox Talks (the talk library is English today), state names, phone numbers and rule numbers.
# Not checked by a fluent speaker in the trade yet (same as the rest of the Spanish).
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()

T = {
  # ---- r17.12: one device in use (lock screen, two-devices screen, signed out) ----
  'Account In Use': 'Cuenta en uso',
  'In Use on Your Other Device': 'En uso en su otro aparato',
  'Signed In on Two Devices': 'Abierta en dos aparatos',
  'Signed Out': 'Sesión cerrada',
  'Try Now': 'Probar ahora',
  'Try Again': 'Intentar otra vez',
  'Sign In Again': 'Iniciar sesión otra vez',
  'Not Signed In Yet': 'Todavía no ha iniciado sesión',
  'One Used Last': 'El que se usó al último',
  'Other One': 'El otro',
  'Checking…': 'Revisando…',
  'Code for the Home Screen app': 'Código para la app de la pantalla de inicio',
  'Emergency: Call 911': 'Emergencia: llame al 911',
  'Your saved work stays on this device and sends once you use it here.': 'Lo que tiene guardado se queda en este aparato y se manda cuando lo use aquí.',
  'This account is in use on another device right now. Try again in 5 minutes.': 'Esta cuenta se está usando en otro aparato ahorita. Vuelva a intentar en 5 minutos.',
  'This account is already signed in on two devices. To use it here, sign one of them out. Its saved work stays on it and sends when it signs in again.': 'Esta cuenta ya está abierta en dos aparatos. Para usarla aquí, cierre la sesión en uno de ellos. Lo que tenga guardado se queda en ese aparato y se manda cuando vuelva a iniciar sesión.',
  'This account is already signed in on two devices. Log out on one of them, then sign in here.': 'Esta cuenta ya está abierta en dos aparatos. Cierre la sesión en uno de ellos y luego inicie sesión aquí.',
  'Your account was signed in on another device, so this one was signed out. Your saved work is kept and will send when you sign in again.': 'Su cuenta se abrió en otro aparato, así que en este se cerró la sesión. Lo que tenía guardado sigue aquí y se manda cuando vuelva a iniciar sesión.',
  'Your account is now signed in in the Home Screen app, so this page was signed out. Open the app from its icon. Your saved work is kept.': 'Su cuenta ya está abierta en la app de la pantalla de inicio, así que en esta página se cerró la sesión. Abra la app desde su ícono. Lo que tenía guardado sigue aquí.',
  'No answer from the server. Check the signal and try again.': 'El servidor no contesta. Revise la señal y vuelva a intentar.',
  'That took too long. Sign in again.': 'Tardó demasiado. Inicie sesión otra vez.',
  'In use on your other device (phone). You can use this one when that one has been idle for 5 minutes.': 'En uso en su otro aparato (teléfono). Puede usar este cuando ese lleve 5 minutos sin usarse.',
  'In use on your other device (tablet). You can use this one when that one has been idle for 5 minutes.': 'En uso en su otro aparato (tableta). Puede usar este cuando ese lleve 5 minutos sin usarse.',
  'In use on your other device (computer). You can use this one when that one has been idle for 5 minutes.': 'En uso en su otro aparato (computadora). Puede usar este cuando ese lleve 5 minutos sin usarse.',
  'In use on your other device (phone): a confined space permit is open there. You can use this one when that permit is closed.': 'En uso en su otro aparato (teléfono): ahí hay un permiso de espacio confinado abierto. Puede usar este cuando se cierre ese permiso.',
  'In use on your other device (tablet): a confined space permit is open there. You can use this one when that permit is closed.': 'En uso en su otro aparato (tableta): ahí hay un permiso de espacio confinado abierto. Puede usar este cuando se cierre ese permiso.',
  'In use on your other device (phone). You can use this one when that one has been idle for 5 minutes. This permit keeps working here; it backs up to your company once this device is the one in use.': 'En uso en su otro aparato (teléfono). Puede usar este cuando ese lleve 5 minutos sin usarse. Este permiso sigue funcionando aquí; se respalda con su compañía cuando este sea el aparato en uso.',
  'In use on your other device (tablet). You can use this one when that one has been idle for 5 minutes. This permit keeps working here; it backs up to your company once this device is the one in use.': 'En uso en su otro aparato (tableta). Puede usar este cuando ese lleve 5 minutos sin usarse. Este permiso sigue funcionando aquí; se respalda con su compañía cuando este sea el aparato en uso.',
  'In use on your other device': 'En uso en su otro aparato',
  'Try again in 5 minutes': 'Vuelva a intentar en 5 minutos',
  # ---- r17.12: Taper & Cone Spacing ----
  'Taper & Cone Spacing': 'Transición y espaciado de conos',
  'TRAFFIC CONTROL': 'CONTROL DE TRÁFICO',
  'Traffic Control': 'Control de tráfico',
  'Taper, cones, signs, buffer': 'Transición, conos, señales, zona libre',
  'Traffic Control · Taper, cones, signs, buffer': 'Control de tráfico · Transición, conos, señales, zona libre',
  'Taper length, cones, sign spacing and buffer by speed (MUTCD)': 'Largo de la transición, conos, espaciado de señales y zona libre según la velocidad (MUTCD)',
  'Minimums from the national manual (MUTCD)': 'Mínimos del manual nacional (MUTCD)',
  'Not a traffic control plan. The approved plan or permit comes first.': 'No es un plan de control de tráfico. Primero va el plan o permiso aprobado.',
  'Posted speed (mph)': 'Velocidad marcada (mph)',
  'Taper type': 'Tipo de transición',
  'Merging (lane closed)': 'De cierre (carril cerrado)',
  'Shifting (no merge)': 'De desvío (sin cierre)',
  'Shoulder closed': 'Acotamiento cerrado',
  'Flagger (one lane, two-way)': 'Banderero (un carril, dos sentidos)',
  'Downstream (end of the work)': 'De salida (al final del trabajo)',
  'Lane width closed or shifted (ft)': 'Ancho del carril cerrado o desviado (ft)',
  'Shoulder width closed (ft)': 'Ancho del acotamiento cerrado (ft)',
  'Road type (for sign spacing)': 'Tipo de calle (para el espaciado de señales)',
  'Pick the road type': 'Escoja el tipo de calle',
  'City street, low speed': 'Calle de ciudad, baja velocidad',
  'City street, high speed': 'Calle de ciudad, alta velocidad',
  'Rural road': 'Camino rural',
  'Expressway / freeway': 'Autopista / freeway',
  'Job state': 'Estado del trabajo',
  'Not set (national numbers)': 'Sin escoger (números nacionales)',
  'Pick the state to check for its own rule.': 'Escoja el estado para revisar su propia regla.',
  'From the current job.': 'Del trabajo actual.',
  'From your company.': 'De su compañía.',
  'Where this phone is now.': 'Donde está este teléfono ahora.',
  'Where the numbers come from': 'De dónde salen los números',
  'Your competent person / traffic control plan decides on site. Follow the approved TCP if there is one.': 'Su persona competente o el plan de control de tráfico decide en la obra. Siga el TCP aprobado si hay uno.',
  'Pick a taper type.': 'Escoja un tipo de transición.',
  'Enter a posted speed from 20 to 75 mph.': 'Ponga una velocidad marcada de 20 a 75 mph.',
  'Enter a lane or shoulder width from 1 to 30 ft.': 'Ponga un ancho de carril o acotamiento de 1 a 30 ft.',
  'Merging taper length': 'Largo de la transición de cierre',
  'Shifting taper length': 'Largo de la transición de desvío',
  'Shoulder taper length': 'Largo de la transición de acotamiento',
  'One-lane, two-way taper length': 'Largo de la transición de un carril, dos sentidos',
  'Downstream taper length': 'Largo de la transición de salida',
  'Cones in the taper': 'Conos en la transición',
  'Cone spacing along the work': 'Espaciado de conos a lo largo del trabajo',
  'Buffer space': 'Zona libre',
  'Advance warning signs': 'Señales de aviso previo',
  'Pick road type': 'Escoja tipo de calle',
  'Pick the road type above. Sign spacing depends on it.': 'Escoja arriba el tipo de calle. El espaciado de señales depende de eso.',
  '50 ft minimum, 100 ft maximum.': '50 ft mínimo, 100 ft máximo.',
  'No more than this (2 × the speed), along the buffer and the work. Closer at night, on curves, or where drivers cut in.': 'No más que esto (2 × la velocidad), a lo largo de la zona libre y del trabajo. Más juntos de noche, en curvas o donde los carros se meten.',
  'Empty road before the work. No trucks, material or equipment in it.': 'Calle vacía antes del trabajo. Sin camiones, material ni equipo ahí.',
  'National MUTCD numbers. Your state may have its own manual with different numbers.': 'Números nacionales del MUTCD. Su estado puede tener su propio manual con otros números.',
  'California rule:': 'Regla de California:',
  'Alaska rule:': 'Regla de Alaska:',
  'California:': 'California:',
  'Alaska:': 'Alaska:',
  'Massachusetts:': 'Massachusetts:',
  'Checked Nov 20, 2026. Speeds between table rows use the next row up.': 'Revisado el 20 nov 2026. Las velocidades entre filas de la tabla usan la fila de arriba.',
  'Taper length: MUTCD 11th Edition (FHWA, Dec 2023, with Revision 1, Dec 2025), Section 6B.08, Tables 6B-3 and 6B-4. L = W × S² ÷ 60 at 40 mph or less, L = W × S at 45 mph or more. Shifting ½ L, shoulder ⅓ L (rounded up).': 'Largo de la transición: MUTCD 11.ª edición (FHWA, dic 2023, con la Revisión 1, dic 2025), Sección 6B.08, Tablas 6B-3 y 6B-4. L = W × S² ÷ 60 a 40 mph o menos, L = W × S a 45 mph o más. Desvío ½ L, acotamiento ⅓ L (redondeado hacia arriba).',
  'Cone spacing: Section 6K.01, no more than 1 × the speed in feet in a taper and 2 × along the work. One-lane two-way and downstream tapers: 50 to 100 ft, devices about 20 ft apart (Section 6B.08).': 'Espaciado de conos: Sección 6K.01, no más de 1 × la velocidad en pies en la transición y 2 × a lo largo del trabajo. Transiciones de un carril en dos sentidos y de salida: 50 a 100 ft, conos a unos 20 ft (Sección 6B.08).',
  'Sign spacing A, B, C: Section 6B.04, Table 6B-1. The road agency decides what is low or high speed.': 'Espaciado de señales A, B, C: Sección 6B.04, Tabla 6B-1. La agencia de la calle decide qué es baja o alta velocidad.',
  'Buffer: Section 6B.06 and Table 6B-2 (stopping sight distance). The same distances may place a flagger station (Section 6D.06).': 'Zona libre: Sección 6B.06 y Tabla 6B-2 (distancia de visibilidad para frenar). Las mismas distancias sirven para ubicar al banderero (Sección 6D.06).',
  'California: CA MUTCD 2026 (Caltrans, Jan 18, 2026), Table 6B-1 sets city street sign spacing by speed. Its taper table (6B-3(CA)) matches the national formula.': 'California: CA MUTCD 2026 (Caltrans, 18 ene 2026), la Tabla 6B-1 fija el espaciado de señales en calles de ciudad según la velocidad. Su tabla de transiciones (6B-3(CA)) es igual a la fórmula nacional.',
  'Alaska: 2026 Alaska Traffic Manual Supplement (eff. Jan 20, 2026), Table 6B-1 (city low speed = 40 mph or less), 6D.01, 6D.02. Massachusetts: Amendments to the MUTCD 11th Edition (Jan 2026), 6C.05, 6D.01, 6D.05, 6D.06, 6K.01. Both read through a summary; check the state manual.': 'Alaska: Suplemento 2026 del Manual de Tráfico de Alaska (vigente desde el 20 ene 2026), Tabla 6B-1 (baja velocidad en ciudad = 40 mph o menos), 6D.01, 6D.02. Massachusetts: Enmiendas al MUTCD 11.ª edición (ene 2026), 6C.05, 6D.01, 6D.05, 6D.06, 6K.01. Los dos se leyeron en un resumen; revise el manual del estado.',
  # ---- r17.12: Monthly / Yearly plan buttons and the plan lines a crew member sees ----
  'Company Plan': 'Plan de la compañía',
  'My Own Plan': 'Mi propio plan',
  'Get My Own Plan': 'Sacar mi propio plan',
  'Monthly': 'Mensual',
  'Yearly': 'Anual',
  # ---- r17.12: Ask state card, "Answered for", State field ----
  'Which state does your company work in?': '¿En qué estado trabaja su compañía?',
  'Which state do you work in?': '¿En qué estado trabaja?',
  'For 811 rules, trench rules and Ask answers. A job in another state uses its own.': 'Para las reglas del 811, las reglas de zanjas y las respuestas de Preguntar. Un trabajo en otro estado usa las suyas.',
  'Another state': 'Otro estado',
  'Pick a state': 'Escoja un estado',
  'Pick the state': 'Escoja el estado',
  'State for your answers': 'Estado para sus respuestas',
  'Which state is the job in?': '¿En qué estado es el trabajo?',
  'My state': 'Mi estado',
  'State': 'Estado',
  'Change': 'Cambiar',
  'No state in City, State. Pick it so 811 rules, trench rules and Ask answers fit this job.': 'No hay estado en Ciudad, estado. Escójalo para que las reglas del 811, las reglas de zanjas y las respuestas de Preguntar sean las de este trabajo.',
  # ---- r17.13 items 1-2: injury line, trench by the job's state ----
  'Report a serious injury': 'Reportar una lesión grave',
  'The company reports it to OSHA (1-800-321-6742) within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye (29 CFR 1904.39).': 'La compañía lo reporta a OSHA (1-800-321-6742): en 8 horas si hay una muerte, y en 24 horas por una hospitalización, una amputación o la pérdida de un ojo (29 CFR 1904.39).',
  'The company reports it: within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye (OSHA 1-800-321-6742). Some states want 8 hours for any serious injury. The job’s state isn’t known: report within 8 hours to be safe.': 'La compañía lo reporta: en 8 horas si hay una muerte, y en 24 horas por una hospitalización, una amputación o la pérdida de un ojo (OSHA 1-800-321-6742). Algunos estados piden 8 horas para cualquier lesión grave. No se sabe el estado del trabajo: por si acaso, repórtelo en 8 horas.',
  'The company reports it to Cal/OSHA within 8 hours for any serious injury or illness, or a death (8 CCR 342).': 'La compañía lo reporta a Cal/OSHA en 8 horas por cualquier lesión o enfermedad grave, o una muerte (8 CCR 342).',
  'The company reports it to L&I (1-800-423-7233) within 8 hours for a death or any hospital stay, and within 24 hours for an amputation or a lost eye (WAC 296-27-031).': 'La compañía lo reporta a L&I (1-800-423-7233) en 8 horas si hay una muerte o cualquier hospitalización, y en 24 horas por una amputación o la pérdida de un ojo (WAC 296-27-031).',
  'The company reports it to Utah OSHA (801-530-6901) within 8 hours for a death or any serious injury, including a hospital stay, an amputation or a lost eye (R614-1-5).': 'La compañía lo reporta a Utah OSHA (801-530-6901) en 8 horas si hay una muerte o cualquier lesión grave, como una hospitalización, una amputación o la pérdida de un ojo (R614-1-5).',
  'The company reports it to Alaska OSH within 8 hours for a death, a hospital stay, an amputation or a lost eye (AS 18.60.058).': 'La compañía lo reporta a Alaska OSH en 8 horas si hay una muerte, una hospitalización, una amputación o la pérdida de un ojo (AS 18.60.058).',
  'The company reports it to HIOSH (808-586-9102) within 8 hours for a death, and within 24 hours for a hospital stay, an amputation (fingertips count), a lost eye, or property damage over $25,000 (HAR 12-52.1-1).': 'La compañía lo reporta a HIOSH (808-586-9102) en 8 horas si hay una muerte, y en 24 horas por una hospitalización, una amputación (también la punta de un dedo), la pérdida de un ojo o daños a la propiedad de más de $25,000 (HAR 12-52.1-1).',
  'The company reports it to Oregon OSHA within 8 hours for a death or a catastrophe, and within 24 hours for a hospital stay, an amputation (fingertips count) or a lost eye (OAR 437-001-0704).': 'La compañía lo reporta a Oregon OSHA en 8 horas si hay una muerte o una catástrofe, y en 24 horas por una hospitalización, una amputación (también la punta de un dedo) o la pérdida de un ojo (OAR 437-001-0704).',
  'The company reports it to MIOSHA within 8 hours for a death (1-800-858-0397), and within 24 hours for a hospital stay, an amputation or a lost eye (1-844-464-6742) (R 408.22139).': 'La compañía lo reporta a MIOSHA en 8 horas si hay una muerte (1-800-858-0397), y en 24 horas por una hospitalización, una amputación o la pérdida de un ojo (1-844-464-6742) (R 408.22139).',
  'The company reports it to VOSH within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye (Va. Code 40.1-51.1).': 'La compañía lo reporta a VOSH en 8 horas si hay una muerte, y en 24 horas por una hospitalización, una amputación o la pérdida de un ojo (Va. Code 40.1-51.1).',
  'The company reports it to Kentucky OSH or OSHA (1-800-321-6742) within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye (803 KAR 2:181).': 'La compañía lo reporta a Kentucky OSH o a OSHA (1-800-321-6742) en 8 horas si hay una muerte, y en 24 horas por una hospitalización, una amputación o la pérdida de un ojo (803 KAR 2:181).',
  'Washington rule (WAC 296-155 Part N)': 'Regla de Washington (WAC 296-155 Parte N)',
  'Same slopes as OSHA’s table, but no short-term Type A (0.5:1). Use Type A 0.75:1. Your competent person decides on site. State from the current job.': 'Los mismos taludes que la tabla de OSHA, pero sin Tipo A de corto plazo (0.5:1). Use Tipo A 0.75:1. Su persona competente decide en la obra. Estado tomado del trabajo actual.',
  'Same slopes as OSHA’s table, but no short-term Type A (0.5:1). Use Type A 0.75:1. Your competent person decides on site. State from where this phone is.': 'Los mismos taludes que la tabla de OSHA, pero sin Tipo A de corto plazo (0.5:1). Use Tipo A 0.75:1. Su persona competente decide en la obra. Estado tomado de donde está este teléfono.',
  'The job’s state isn’t known (no state on the job, no phone location). Federal OSHA and most states: protective system from 5 ft. Washington: from 4 ft.': 'No se sabe el estado del trabajo (el trabajo no tiene estado y el teléfono no tiene ubicación). OSHA federal y la mayoría de los estados: sistema de protección desde 5 ft. Washington: desde 4 ft.',
}

PATS = [
  # one device
] + [x for k, es, art in (('Phone', 'teléfono', 'el'), ('Tablet', 'tableta', 'la'), ('Computer', 'computadora', 'la')) for x in (
  [r'^Sign Out the ' + k + r'( \(used .+?\))?$', 'Cerrar sesión en ' + art + ' ' + es + '{0:t}'],
  [r'^Sign Out the ' + k + r' Used Last( \(used .+?\))?$', 'Cerrar sesión en ' + art + ' ' + es + ' que se usó al último{0:t}'],
  [r'^Sign Out the Other ' + k + r'( \(used .+?\))?$', 'Cerrar sesión en ' + ('el otro ' if art == 'el' else 'la otra ') + es + '{0:t}'])] + [
  [r'^Sign Out the One Used Last$', 'Cerrar sesión en el que se usó al último'],
  [r'^Sign Out the Other One$', 'Cerrar sesión en el otro'],
  [r'^\(used just now\)$', '(usado hace un momento)'],
  [r'^\(used (\d+) min ago\)$', '(usado hace {0} min)'],
  [r'^\(used (\d+) h ago\)$', '(usado hace {0} h)'],
  [r'^\(used (\d+) days ago\)$', '(usado hace {0} días)'],
  [r'^Unlocks by itself in (\d+:\d\d)$', 'Se desbloquea solo en {0}'],
  [r'^Let this send before you switch\. (.+?)$', 'Deje que esto se mande antes de cambiar. {0:t}'],
  [r'^Not sent yet: (.+?)\. It sends when this account logs in here again\.$', 'Falta mandar: {0}. Se manda cuando esta cuenta vuelva a iniciar sesión aquí.'],
  [r'^Signed in as (.+?) — (.+?) at (.+?)$', 'Sesión iniciada como {0} — {1:t} en {2}'],
  [r'^Signed in as (.+?)\.$', 'Sesión iniciada como {0}.'],
  [r'^In the Home Screen app, tap <1>Paste Join Code</1> \(or type the code\)\. It works once, for 15 minutes\. Don’t send it to anyone: it signs in to your account\.( This page is signed out when you sign in there\.)?$', 'En la app de la pantalla de inicio, toque <1>Pegar código</1> (o escriba el código). Sirve una vez, por 15 minutos. No se lo mande a nadie: abre su cuenta.{0:t}'],
  [r'^This page is signed out when you sign in there\.$', 'Esta página cierra la sesión cuando usted la abra allá.'],
  # taper
  [r'^(\d+) cones$', '{0} conos'],
  [r'^(\d+) to (\d+) cones$', '{0} a {1} conos'],
  [r'^About (\d+) ft apart\.$', 'A unos {0} ft uno del otro.'],
  [r'^(\d+) ft apart \(no more than (\d+) ft: 1 × the speed\)\.$', 'A {0} ft uno del otro (no más de {1} ft: 1 × la velocidad).'],
  [r'^About (\d+) ft apart \(no more than (\d+) ft: 1 × the speed\)\.$', 'A unos {0} ft uno del otro (no más de {1} ft: 1 × la velocidad).'],
  [r'^50 to 100<1> ft</1>$', '50 a 100<1> ft</1>'],
  [r'^At least this long\. (L = W × S(?:² ÷ 60)? = [^.]+ ft)\.$', 'Por lo menos así de largo. {0}.'],
  [r'^At least this long\. (L = W × S(?:² ÷ 60)? = [^.]+ ft)\. Shifting: ½ L\.$', 'Por lo menos así de largo. {0}. Desvío: ½ L.'],
  [r'^At least this long\. (L = W × S(?:² ÷ 60)? = [^.]+ ft)\. Shoulder: ⅓ L\.$', 'Por lo menos así de largo. {0}. Acotamiento: ⅓ L.'],
  [r'^Empty road before the work \((\d+) mph row\)\. No trucks, material or equipment in it\.$', 'Calle vacía antes del trabajo (fila de {0} mph). Sin camiones, material ni equipo ahí.'],
  [r'^Empty road before the work\. No trucks, material or equipment in it\. Flagger station: about ([\d,]+) ft ahead of the work\.$', 'Calle vacía antes del trabajo. Sin camiones, material ni equipo ahí. Lugar del banderero: a unos {0} ft antes del trabajo.'],
  [r'^Empty road before the work \((\d+) mph row\)\. No trucks, material or equipment in it\. Flagger station: about ([\d,]+) ft ahead of the work\.$', 'Calle vacía antes del trabajo (fila de {0} mph). Sin camiones, material ni equipo ahí. Lugar del banderero: a unos {1} ft antes del trabajo.'],
  [r'^A: taper to 1st sign ([\d,]+) ft\. B: 1st to 2nd ([\d,]+) ft\. C: 2nd to 3rd ([\d,]+) ft\. First sign ([\d,]+) ft before the taper \((?:city street, low speed|city street, high speed|rural road|expressway / freeway)\)\.$', 'A: de la transición a la 1.ª señal {0} ft. B: de la 1.ª a la 2.ª {1} ft. C: de la 2.ª a la 3.ª {2} ft. La primera señal {3} ft antes de la transición.'],
  [r'^A: taper to 1st sign ([\d,]+) ft\. B: 1st to 2nd ([\d,]+) ft\. C: 2nd to 3rd ([\d,]+) ft\. First sign ([\d,]+) ft before the taper \((California|Alaska), city street at (\d+) mph\)\.$', 'A: de la transición a la 1.ª señal {0} ft. B: de la 1.ª a la 2.ª {1} ft. C: de la 2.ª a la 3.ª {2} ft. La primera señal {3} ft antes de la transición ({4}, calle de ciudad a {5} mph).'],
  [r'^<1>California rule:</1> city street sign spacing by speed \(CA MUTCD 2026, Table 6B-1\)\. Tapers and buffer are the same as the national numbers\.$', '<1>Regla de California:</1> espaciado de señales en calles de ciudad según la velocidad (CA MUTCD 2026, Tabla 6B-1). Las transiciones y la zona libre son iguales a los números nacionales.'],
  [r'^<1>California:</1> same as the national numbers here \(CA MUTCD 2026\)\. City street sign spacing goes by speed in California\.$', '<1>California:</1> aquí es igual a los números nacionales (CA MUTCD 2026). En California, el espaciado de señales en calles de ciudad va según la velocidad.'],
  [r'^<1>Alaska rule:</1> on city streets 40 mph or less is low speed \(100 ft\), 45 mph or more is high speed \(350 ft\) \(2026 Alaska Traffic Manual Supplement, Table 6B-1\)\. Flaggers on state highways must be certified \(Std\. Spec\. 643\)\. Paddle at least 24 in wide with 8 in letters, except local roads 25 mph or less\. Check the state manual\.$', '<1>Regla de Alaska:</1> en calles de ciudad, 40 mph o menos es baja velocidad (100 ft) y 45 mph o más es alta velocidad (350 ft) (Suplemento 2026 del Manual de Tráfico de Alaska, Tabla 6B-1). Los bandereros en carreteras del estado deben estar certificados (Std. Spec. 643). Paleta de por lo menos 24 in de ancho con letras de 8 in, menos en calles locales de 25 mph o menos. Revise el manual del estado.'],
  [r'^<1>Alaska:</1> sign spacing same as the national table\. Flaggers on state highways must be certified \(Std\. Spec\. 643\)\. Paddle at least 24 in wide with 8 in letters, except local roads 25 mph or less\. Check the state manual\.$', '<1>Alaska:</1> espaciado de señales igual a la tabla nacional. Los bandereros en carreteras del estado deben estar certificados (Std. Spec. 643). Paleta de por lo menos 24 in de ancho con letras de 8 in, menos en calles locales de 25 mph o menos. Revise el manual del estado.'],
  [r'^<1>Massachusetts:</1> flaggers must be MassDOT certified, carry an airhorn, and use two-way radios when working together\. Cones at least 36 in tall \(MA Amendments to the MUTCD, Jan 2026\)\. Tapers and sign spacing here are the national numbers\. Check the state manual\.$', '<1>Massachusetts:</1> los bandereros deben estar certificados por MassDOT, traer una bocina de aire y usar radios cuando trabajan juntos. Conos de por lo menos 36 in de alto (Enmiendas de MA al MUTCD, ene 2026). Aquí las transiciones y el espaciado de señales son los números nacionales. Revise el manual del estado.'],
  [r'^National MUTCD numbers\. (.+?) may have its own manual or supplement with different numbers; check it\.$', 'Números nacionales del MUTCD. {0} puede tener su propio manual o suplemento con otros números; revíselo.'],
  [r'^(\d+) tools? for “(.+?)”$', '{0} herramienta(s) para “{1}”'],
  # plans
  [r'^Monthly (\$[\d,.]+)$', 'Mensual {0}'],
  [r'^Yearly (\$[\d,.]+)$', 'Anual {0}'],
  [r'^Yearly (\$[\d,.]+), save (\$[\d,.]+)$', 'Anual {0}, ahorra {1}'],
  [r'^My Own Plan: Monthly (\$[\d,.]+)$', 'Mi propio plan: Mensual {0}'],
  [r'^My Own Plan: Yearly (\$[\d,.]+)(, save \$[\d,.]+)?$', 'Mi propio plan: Anual {0}{1:t}'],
  [r'^, save (\$[\d,.]+)$', ', ahorra {0}'],
  [r'^Request sent: yearly, (\$[\d,.]+) a year \((\$[\d,.]+) a month\), plus applicable tax\. You’ll get an email with how to pay\.$', 'Solicitud mandada: anual, {0} al año ({1} al mes), más los impuestos que apliquen. Le llegará un correo con cómo pagar.'],
  [r'^Request sent: monthly, (\$[\d,.]+) a month, plus applicable tax\. You’ll get an email with how to pay\.$', 'Solicitud mandada: mensual, {0} al mes, más los impuestos que apliquen. Le llegará un correo con cómo pagar.'],
  # Ask
  [r'^Answered for (.+?)\.$', 'Respondido para {0}.'],
  [r'^Answered for (.+?)\. Next answers: (.+?)\.$', 'Respondido para {0}. Las siguientes respuestas: {1}.'],
  [r'^Your own plan is (\$[\d,.]+) a month, or (\$[\d,.]+) for a year \((\$[\d,.]+) a month, save (\$[\d,.]+)\), plus applicable tax\.$', 'Su propio plan cuesta {0} al mes, o {1} al año ({2} al mes, ahorra {3}), más los impuestos que apliquen.'],
  [r'^You’re no longer part of (.+?)\. Would you like your own plan\? It’s (\$[\d,.]+) a month, or (\$[\d,.]+) for a year \((\$[\d,.]+) a month, save (\$[\d,.]+)\), plus applicable tax\.$', 'Ya no es parte de {0}. ¿Quiere su propio plan? Cuesta {1} al mes, o {2} al año ({3} al mes, ahorra {4}), más los impuestos que apliquen.'],
  [r'^Use (Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)$', 'Usar {0}'],
  [r'^(.+?) \(company state\)$', '{0} (estado de la compañía)'],
  # r17.13: injury line (job book: one mixed piece; emergency panel: the line in its own span; Rules view: "Call 911 first. ...")
  [r'^The company reports it to (.+?) within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye\. We haven’t checked (.+?)’s own rule: report within 8 hours to be safe\.$', 'La compañía lo reporta a {0} en 8 horas si hay una muerte, y en 24 horas por una hospitalización, una amputación o la pérdida de un ojo. No hemos revisado la regla propia de {1}: por si acaso, repórtelo en 8 horas.'],
  [r'^<1>Report a serious injury</1> Call 911 first\. (.+?)$', '<1>Reportar una lesión grave</1> Primero llame al 911. {0:t}'],
  [r'^<1>Report a serious injury</1> <2>(.+?)</2>$', '<1>Reportar una lesión grave</1> <2>{0:t}</2>'],
  [r'^Call 911 first\. (The company reports it.+?)$', 'Primero llame al 911. {0:t}'],
]

a = '<script type="application/json" id="pbI18nDict">'
i = p.s.index(a) + len(a); j = p.s.index('</script>', i)
raw = p.s[i:j]; D = json.loads(raw)
dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
assert dump(D) == raw, 'dictionary does not round-trip'
import re
for k, v in T.items():
    assert k not in D['t'] or D['t'][k] == v, 'already in the dictionary with other Spanish: ' + k
    D['t'][k] = v
have = {x[0] for x in D['p']}
for pat, es in PATS:
    re.compile(pat); assert pat not in have, pat
    D['p'].append([pat, es])
p.s = p.s[:i] + dump(D) + p.s[j:]
p.save()
print('spanish: +%d strings, +%d patterns' % (len(T), len(PATS)))
