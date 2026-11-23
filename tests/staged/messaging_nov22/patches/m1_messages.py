# messaging_nov22 m1: company messages in the app (Home card, Messages, Chat, Chat info, Message settings, outbox, alerts link).
# python3 m1_messages.py in.html out.html   (exact-once; on r1716_candidate/work/A/index.src.html)
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'design_nov22', 'patches'))
from _rep import P
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'm1')
rd = lambda n: open(os.path.join(H, n), encoding='utf-8').read()
p = P()

# 1) styles (before the light theme, which only redefines the variables used here)
p.rep('\n<style id="pbLightTheme">', '\n<style id="pbMsgCss">\n' + rd('messages.css') + '</style>\n<style id="pbLightTheme">')
# 2) the four screens, after Account & Settings
p.rep('  <!-- NOTIFICATIONS (batch 13, P): push notifications for this phone', rd('screens.html') + '  <!-- NOTIFICATIONS (batch 13, P): push notifications for this phone')
# 3) the Home card (everyone in a company: crew Home and the company Home)
p.rep('<div id="homeTalkCard" hidden></div><!-- feat_talks: Toolbox talk today -->',
      '<div id="homeTalkCard" hidden></div><!-- feat_talks: Toolbox talk today -->\n    <div id="homeMsgCard" hidden></div><!-- messaging_nov22: Messages, unread count -->')
# 4) Settings > Notifications: a Messages row (alerts, quiet hours; the company's retention for the company account)
NOTIF = '<span class="sub" id="settingsNotifSub">On this phone</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>'
p.rep(NOTIF, NOTIF + '\n          <button type="button" class="pb-edu-row pb-tool-row" id="settingsMsgBtn" data-ic="bell" hidden onclick="pbMsgOpenSettings()"><span class="pb-tool-ic" aria-hidden="true"></span><span class="tx"><span class="name">Messages</span><span class="sub">Message alerts, quiet hours</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>')
# 5) the message store and outbox are kept like Records (IndexedDB, photos stored apart)
p.rep("const pbBigKey = (key) => /(^|:)runArchive$/.test(String(key || ''));",
      "const pbBigKey = (key) => /(^|:)(runArchive|pbMsgStore|pbMsgOut)$/.test(String(key || '')); // messaging_nov22: the message store and outbox too")
# 6) the module, at the end of the main script
p.rep('  window.__pbMainInit = Date.now(); /* r15.56 boot watchdog', rd('messages.js') + '  window.__pbMainInit = Date.now(); /* r15.56 boot watchdog')

# 7) Spanish (switched off; English is the key). Message text itself is never translated (data-noi18n).
ES = {
  "Messages": "Mensajes", "New message": "Mensaje nuevo", "Settings": "Ajustes", "Message settings": "Ajustes de mensajes", "Job chat": "Chat del trabajo",
  "Direct message": "Mensaje directo", "Job number": "Número de trabajo", "Open": "Abrir", "Messages are company records. For an emergency, call.": "Los mensajes son registros de la compañía. En una emergencia, llame.",
  "Info": "Info", "Show earlier messages": "Ver mensajes anteriores", "Editing your message": "Editando su mensaje", "Cancel": "Cancelar", "Photo": "Foto",
  "Add a photo": "Agregar una foto", "Message": "Mensaje", "Send": "Enviar", "Save": "Guardar", "Chat info": "Información del chat",
  "Alerts on this account": "Avisos en esta cuenta", "Message alerts": "Avisos de mensajes", "Show message words on the lock screen": "Mostrar las palabras del mensaje en la pantalla bloqueada",
  "Off: the alert only says who wrote and in which chat.": "Apagado: el aviso solo dice quién escribió y en qué chat.", "Quiet hours": "Horas de silencio", "From": "Desde", "To": "Hasta",
  "In the job's time. Alerts wait until quiet hours end. Mute one chat from its Info.": "En la hora del trabajo. Los avisos esperan a que terminen las horas de silencio. Silencie un chat desde su Info.",
  "Company": "Compañía", "Keep messages": "Guardar mensajes", "Forever": "Para siempre", "Delete after 13 months": "Borrar después de 13 meses",
  "Each job chat is also saved as one archive file when it closes. Download it from the chat's Info.": "Cada chat de trabajo también se guarda en un archivo cuando se cierra. Descárguelo desde la Info del chat.",
  "Message alerts, quiet hours": "Avisos de mensajes, horas de silencio", "Job chats and direct messages": "Chats de trabajo y mensajes directos",
  "Job chats": "Chats de trabajo", "Direct messages": "Mensajes directos", "Waiting to start": "Esperando para empezar", "New chat": "Chat nuevo", "Waiting for signal": "Esperando señal",
  "No messages yet. Tap New message.": "Todavía no hay mensajes. Toque Mensaje nuevo.", "No messages yet": "Todavía no hay mensajes", "Log in to see messages.": "Inicie sesión para ver los mensajes.",
  "No signal. Showing what this phone has.": "Sin señal. Se muestra lo que tiene este teléfono.", "Loading messages…": "Cargando mensajes…", "Log in to use Messages.": "Inicie sesión para usar Mensajes.",
  "No signal.": "Sin señal.", "Type the job number below.": "Escriba el número de trabajo abajo.", "Loading…": "Cargando…",
  "That person is not in your company.": "Esa persona no está en su compañía.", "The company account is not active, so new chats cannot start.": "La cuenta de la compañía no está activa, así que no se pueden empezar chats nuevos.",
  "The chat could not be opened. Try again.": "No se pudo abrir el chat. Inténtelo de nuevo.", "You are no longer in this chat.": "Ya no está en este chat.",
  "No signal. Messages you write wait on this phone and send when there is signal.": "Sin señal. Los mensajes que escriba esperan en este teléfono y se envían cuando haya señal.",
  "This chat starts when the first message is sent.": "Este chat empieza cuando se envíe el primer mensaje.", "Pipelayers are not in this chat. Change it in Info.": "Los tuberos no están en este chat. Cámbielo en Info.",
  "You deleted this message": "Usted borró este mensaje", "Message deleted": "Mensaje borrado", "Edited": "Editado", "Message options": "Opciones del mensaje", "Sending…": "Enviando…", "Remove": "Quitar",
  "This chat is closed. The office can reopen it in Info.": "Este chat está cerrado. La oficina lo puede abrir de nuevo en Info.", "You can read this chat but not write in it.": "Puede leer este chat pero no escribir en él.",
  "Open photo": "Abrir foto", "Close": "Cerrar", "Photo Not Added": "Foto no agregada", "That file couldn’t be read as a photo, so it wasn’t added.": "Ese archivo no se pudo leer como foto, así que no se agregó.",
  "Up to 6 photos in one message.": "Hasta 6 fotos en un mensaje.", "Photos": "Fotos", "That message is too long (4,000 characters at most).": "Ese mensaje es muy largo (4,000 caracteres como máximo).",
  "Not Saved": "No guardado", "This phone could not save the message (storage full?). It was not sent. Copy your text before leaving.": "Este teléfono no pudo guardar el mensaje (¿memoria llena?). No se envió. Copie su texto antes de salir.",
  "Remove this unsent message from this phone? It was never sent.": "¿Quitar de este teléfono este mensaje sin enviar? Nunca se envió.", "Remove Unsent Message": "Quitar mensaje sin enviar", "Keep": "Guardar",
  "Edit": "Editar", "Delete": "Borrar", "Your message. You can change it for 24 hours.": "Su mensaje. Lo puede cambiar durante 24 horas.", "Your message.": "Su mensaje.",
  "No signal. Changes to a sent message need signal. Try again when you have signal.": "Sin señal. Para cambiar un mensaje enviado se necesita señal. Inténtelo cuando tenga señal.",
  "Not Changed": "No se cambió", "A message can be changed for 24 hours after it was sent.": "Un mensaje se puede cambiar durante 24 horas después de enviarlo.",
  "A message can’t be empty. Delete it instead.": "Un mensaje no puede estar vacío. Bórrelo.", "The change could not be saved. Try again.": "No se pudo guardar el cambio. Inténtelo de nuevo.",
  "Delete this message? Everyone in the chat sees \"Message deleted\". The company keeps the original in its records.": "¿Borrar este mensaje? Todos en el chat verán \"Mensaje borrado\". La compañía guarda el original en sus registros.",
  "Delete Message": "Borrar mensaje", "No signal. Try again when you have signal.": "Sin señal. Inténtelo cuando tenga señal.", "Not Deleted": "No se borró",
  "The message could not be deleted. Try again.": "No se pudo borrar el mensaje. Inténtelo de nuevo.", "No signal. Chat info needs signal.": "Sin señal. La información del chat necesita señal.",
  "Chat info could not be loaded. Try again.": "No se pudo cargar la información del chat. Inténtelo de nuevo.", "Office": "Oficina", "Foreman": "Capataz", "Pipelayer": "Tubero",
  "Take off": "Sacar", "Not in it now": "No está ahora", "Add": "Agregar", "Add a person": "Agregar a una persona", "Pipelayers": "Tuberos", "Include pipelayers": "Incluir a los tuberos",
  "Pipelayers on this job are in this chat.": "Los tuberos de este trabajo están en este chat.", "Pipelayers are not in this chat.": "Los tuberos no están en este chat.",
  "Pipelayers see": "Los tuberos ven", "From when added": "Desde que los agregaron", "Whole chat": "Todo el chat", "Pipelayers see: the whole chat.": "Los tuberos ven: todo el chat.",
  "Pipelayers see: messages from when they were added.": "Los tuberos ven: los mensajes desde que los agregaron.", "Foremen on this job and the office are always in.": "Los capataces de este trabajo y la oficina siempre están.",
  "Foremen on this job and the office are always in. Only the office changes this.": "Los capataces de este trabajo y la oficina siempre están. Solo la oficina cambia esto.",
  "Mute this chat": "Silenciar este chat", "No alerts from this chat on your phone. Messages still arrive.": "Sin avisos de este chat en su teléfono. Los mensajes siguen llegando.",
  "Archive": "Archivo", "The whole chat in one file (text and photos) to keep. Saved by itself when the chat closes.": "Todo el chat en un archivo (texto y fotos) para guardar. Se guarda solo cuando el chat se cierra.",
  "Failed": "Falló", "Being made": "Haciéndose", "Download": "Descargar", "Save archive now": "Guardar archivo ahora", "Reopen chat": "Abrir el chat de nuevo", "Close chat": "Cerrar el chat",
  "Changes": "Cambios", "Only the office (company account, managers, PMs and supers) can change this.": "Solo la oficina (cuenta de la compañía, gerentes, PMs y superintendentes) puede cambiar esto.",
  "The office is always in job chats.": "La oficina siempre está en los chats de trabajo.", "Too many archives today. Try tomorrow.": "Demasiados archivos hoy. Inténtelo mañana.",
  "That could not be changed. Try again.": "Eso no se pudo cambiar. Inténtelo de nuevo.", "Added": "Agregado", "Take Off Chat": "Sacar del chat", "Take Off": "Sacar", "Everyone is in.": "Todos están.",
  "The archive is being made. It shows here with a Download button in a few minutes.": "Se está haciendo el archivo. Aparece aquí con un botón Descargar en unos minutos.",
  "Close this chat? Nobody can write in it until the office reopens it. An archive file of the whole chat is saved.": "¿Cerrar este chat? Nadie puede escribir hasta que la oficina lo abra de nuevo. Se guarda un archivo de todo el chat.",
  "Close Chat": "Cerrar el chat", "Keep Open": "Dejar abierto", "No signal. Downloading needs signal.": "Sin señal. Para descargar se necesita señal.", "The archive could not be opened. Try again.": "No se pudo abrir el archivo. Inténtelo de nuevo.",
  "No signal. Not saved yet: change it again when you have signal.": "Sin señal. Todavía no se guardó: cámbielo de nuevo cuando tenga señal.", "Saved.": "Guardado.", "Not saved. Try again.": "No se guardó. Inténtelo de nuevo.",
  "No signal. Not changed.": "Sin señal. No se cambió.", "Only the company account or a manager can change this.": "Solo la cuenta de la compañía o un gerente puede cambiar esto.", "Not changed. Try again.": "No se cambió. Inténtelo de nuevo.",
  "Delete messages, photos and chat archives after 13 months? Anything older than 13 months is deleted for good every day after this, for the whole company.": "¿Borrar mensajes, fotos y archivos de chat después de 13 meses? Todo lo que tenga más de 13 meses se borra para siempre cada día desde ahora, para toda la compañía.",
  "Delete After 13 Months": "Borrar después de 13 meses",
  "Direct messages are company records.": "Los mensajes directos son registros de la compañía.", "Direct messages (company records)": "Mensajes directos (registros de la compañía)",
  "Direct messages between people in the company. You can save and download a thread as an archive file; you cannot read it here. Each download is logged and the two people see it in the chat’s Changes.": "Mensajes directos entre personas de la compañía. Puede guardar y descargar una conversación como archivo; aquí no la puede leer. Cada descarga queda registrada y las dos personas la ven en los Cambios del chat.",
  "No direct messages yet.": "Todavía no hay mensajes directos.", "Save archive": "Guardar archivo", "Could not be loaded. Try again.": "No se pudo cargar. Inténtelo de nuevo.",
  "Only the company account can save direct messages.": "Solo la cuenta de la compañía puede guardar mensajes directos.", "Only the office can download this archive.": "Solo la oficina puede descargar este archivo.",
  "Everyone assigned to this job is in, with the company account and managers.": "Todos los asignados a este trabajo están, con la cuenta de la compañía y los gerentes.",
  "Nobody is assigned to this job, so the foremen who worked it in the last 120 days are in.": "Nadie está asignado a este trabajo, así que están los capataces que trabajaron en él en los últimos 120 días.",
  "No foremen are listed on the job page, so foremen with open inspections, crew runs or dailies on this job are in.": "No hay capataces anotados en la página del trabajo, así que están los capataces con inspecciones abiertas, tramos de cuadrilla o reportes diarios en este trabajo.",
  "The foremen assigned to this job are in.": "Están los capataces asignados a este trabajo.", "No PM or super is assigned to this job, so every PM and super is in.": "No hay PM ni superintendente asignado a este trabajo, así que están todos los PMs y superintendentes.",
  "The PMs and supers assigned to this job are in.": "Están los PMs y superintendentes asignados a este trabajo.", "The company account and managers are always in.": "La cuenta de la compañía y los gerentes siempre están.",
  "Only the office changes this.": "Solo la oficina cambia esto.",
  "Only the office or a foreman assigned to this job can start its chat.": "Solo la oficina o un capataz asignado a este trabajo puede empezar su chat.", "Keep Forever": "Guardar para siempre", "Closed after 120 days with no message": "Cerrado después de 120 días sin mensajes",
}
PAT = [
  ["^(\\d+) unread$", "{0} sin leer"],
  ["^(\\d+) messages? waiting for signal$", "{0} mensaje(s) esperando señal"],
  ["^People in this chat \\((\\d+)\\)$", "Personas en este chat ({0})"],
  ["^Not sent: (.+)$", "No se envió: {0}"],
  ["^Message from (.+?)\\. As the office you can delete it\\.$", "Mensaje de {0}. Como oficina lo puede borrar."],
  ["^Take (.+?) off this chat\\? They stop seeing it at once\\. The office can add them back\\.$", "¿Sacar a {0} de este chat? Dejan de verlo enseguida. La oficina los puede agregar de nuevo."],
  ["^(.+?) will be in the chat when Include pipelayers is on\\.$", "{0} estará en el chat cuando Incluir a los tuberos esté encendido."],
  ["^You can read this chat but not write: (.+)\\.$", "Puede leer este chat pero no escribir: {0}."],
  ["^Closed · (.+)$", "Cerrado · {0}"], ["^Muted · (.+)$", "Silenciado · {0}"],
]
DICT = '<script type="application/json" id="pbI18nDict">{"t":{'
_i = p.s.index(DICT) + len(DICT) - len('{"t":{'); _j = p.s.index('</script>', _i)
HAVE = json.loads(p.s[_i:_j].replace('<\\/', '</'))['t']   # keys the dictionary already has keep their Spanish (no duplicates)
ent = ''.join(json.dumps(k, ensure_ascii=False) + ':' + json.dumps(v, ensure_ascii=False) + ',' for k, v in ES.items() if k not in HAVE).replace('</', '<\\/')
print('i18n: %d new strings, %d already in the dictionary' % (sum(1 for k in ES if k not in HAVE), sum(1 for k in ES if k in HAVE)))
p.rep(DICT, DICT + ent)
pat = ''.join(json.dumps(x, ensure_ascii=False) + ',' for x in PAT).replace('</', '<\\/')
p.rep('"},"p":[', '"},"p":[' + pat)
p.save()
