// emergency.ts (ask_quality_nov22, Nov 22 2026; independent safety review items 1-2): an emergency happening NOW gets a fixed
// answer with no AI round trip. The SAME text is pasted into the app (_src PB_AI_EMERGENCY_*), so a phone with no plan, no
// quota or no signal still shows it. Pure, no imports. Scripts: space (trench / hole / confined space / gas alarm / sewer-gas
// smell: stay out), open (someone down, hurt or overheated in the open: 911, CPR / cooling now), gas (gas line hit or gas
// smell), power (power line contact or shock), line (a line hit and nobody can tell what it is: the power AND the gas steps).
// English and Spanish.
// emergency_nov22 (Nov 22 2026; Spanish review #1 #4 #12 #13 #19, Ask everyday review P1 #2 and P2 C): a machine touching a
// line gets the power steps; many more Spanish phrasings, word-end matching, Spanish guessed from ordinary small words; the
// sewer-gas / rotten-egg smell at a manhole gets the confined-space steps; everyday wording ("down in the trench shooting
// grade", "ran over the lath", "low battery", "nobody hurt", texts / calls) no longer sets it off. When in doubt it still fires.
// Text is lower-cased, apostrophes and accents removed before matching (pbEmgNorm).
export const pbEmgNorm = (q) => String(q || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "");
// a question ABOUT emergencies (training, signs, prevention, "what if") rather than one happening: only the strong triggers fire
const PB_EMG_INFO = /\b(signs? of|symptoms? of|what (are|is) (the )?(signs?|symptoms?)|how (do|can|would) (you|i|we) (know|tell|recognize|spot|prevent|avoid)|prevent\w*|avoid\w*|training|toolbox|tailgate|talk about|safety meeting|in general|hazards? of|risks? of|how (do|can|should|would) (you|i|we) (stop|treat|handle|deal with|care for)|como (se )?(evita|evitar|previene|prevenir|reconoce|reconocer|sabe)|senales? de|sintomas? de|que hago si|que hacer si|que se hace si|platicas?|capacitacion|entrenamiento|en general|riesgos? de|peligros? de|que es (un|una|el|la))\b/;
const PB_EMG_SPACE = /\b(trench\w*|ditch|hole|excavation|the cut|manholes?|mh|vaults?|wet ?wells?|lift stations?|tanks?|pits?|sewers?|confined|catch ?basins?|culverts?|structures?|in there|down there|down in|inside|the box|zanjas?|pozos?|registros?|hoyos?|tanques?|alcantarillas?|bovedas?|espacio confinado|excavacion|adentro|alla abajo)\b/;
// a person (English): "ran over" / "hit by a truck" count only with one
const PB_EMG_WHO = "(him|her|them|me|us|someone|somebody|anyone|anybody|(a |the |my |our |his |her |that )?(guy|guys|man|men|worker|workers|laborer|laborers|pipelayer|pipe layer|operator|flagger|foreman|helper|partner|buddy|entrant|attendant|top ?man|grade ?(checker|man)|kid|brother|son|apprentice|driver|surveyor|inspector|employee|coworker|co-worker|hand|crew ?member))";
// machine parts that can reach a line, and lines that are not power or gas (a water / sewer / fiber line hit is an Ask question)
const PB_EMG_MACH = "(boom|bucket|stick|arm|excavator|hoe|backhoe|crane|truck|machine|dump ?bed|dump truck|mast|pluma|brazo|bote|cucharon|retro|retroexcavadora|excavadora|grua|maquina|troca)";
const PB_EMG_QUAL = /\b(water|sewer|storm|irrigation|sprinkler|fiber|fibre|phone|telephone|tv|comm\w*|drain|grade|string|laser|chalk|paint|agua|drenaje|fibra|telefono|riego)\b/;
// strong: fire even when the question reads like a "what if"
const PB_EMG_CORE = [
  /\b(passed out|pass(ing)? out|unconscious|not breathing|stopped breathing|man down|keeled over|overcome by)\b/,
  // "down" while working ("down in the trench shooting grade", "down at the supply house", "down sick") is not an emergency
  new RegExp("\\b(someone|somebody|he|she|they|guy|man|worker|buddy|partner|entrant|laborer|operator|pipelayer|flagger|crew ?member|my \\w+)\\b.{0,25}\\b((is|are|went|was) down(?!\\s+(at|to|sick|for|on|from|by|here|the (road|street|block|hill)|\\d|with(?! (heat|a heat|a seizure|chest))|(in|inside) (the |a )?(trench|hole|ditch|cut|excavation|manhole|pit|box|vault)\\s*,?\\s*(shooting|setting|laying|grading|grade|rod|checking grade)))|fell (in|down)|collapsed|buried|trapped|pinned)\\b"),
  /\b(cave[- ]?in|trench|wall|side|bank|hole|ditch)\b.{0,20}\b(just )?(collapsed|caved|came down|fell in|gave way|sloughed( off)?)\b/,
  /\b(cave[- ]?in|caved in)\s*!/,
  /\b(dirt|soil|bank|wall|side|spoil|mud|ground|sand|clay)\b.{0,25}\b(came down|fell|sloughed( off)?|slid|slumped|caved|collapsed)\b.{0,25}\b(on|onto|over|around|in on)\b/,
  /\bup to (his|her|their|the guys|my guys) (waist|chest|knees|neck|hips|shoulders)\b/,
  /\b(\d+(\.\d+)?\s*(ppm|%)|(co|h2s|lel)\s+\d+)\b.{0,30}\b(and )?(climbing|rising|going up|spiking|keeps going up)\b/,
  /\b(\d+(\.\d+)?\s*(ppm|%)|(co|h2s|lel|o2)\s+\d+)\b.{0,40}\b(guys?|someone|somebody|he|she|they|entrant|man|worker)\b.{0,10}\b(inside|in there|down there|in the hole|in the manhole|in the vault)\b/,
  /\b(entrant|guy|he|she|worker|man)\b.{0,30}\b(acting (drunk|weird|strange|funny|confused|loopy|dizzy)|slurring|stumbling|cant stand)\b/,
  // gas line hit or gas smell
  /\b(hit|hitting|nicked|nick|cut|broke|broken|ripped|tore|snagged|struck|damaged|punctured|clipped|busted|popped)\b.{0,25}\bgas (line|main|service|pipe|lateral)\b/,
  /\bgas (line|main|service|pipe)\b.{0,25}\b(is |was |got )?(hit|nicked|cut|broke|broken|ripped|blowing|leaking|hissing|damaged|busted)\b/,
  /\b(smell|smells|smelling|smelled)\b.{0,15}\b(gas|natural gas|rotten eggs?|mercaptan)\b/,
  /\bgas (leak|leaking|is leaking|blowing|escaping|coming out)\b/,
  /\b(blowing|hissing|leaking) gas\b/,
  /\bgas\b.{0,15}\b(is |was |keeps )?(blowing|hissing|leaking|escaping|coming out)\b/,
  // power line contact or shock (the contact patterns are in PB_EMG_MACHLINE)
  /\b(electrocuted|got electrocuted|got shocked|was shocked|been shocked|getting shocked|shocked (him|her|them|me)|got zapped|got bit by the line)\b/,
  // medical events happening now
  /\b(cant|cannot|can not) breathe?\b/,
  /\b(having|has|had|is having|think (he|she|they)s? having|going into)\b.{0,15}\b(heart attack|stroke|heat ?stroke|seizure)\b/,
  // run over / backed over: a person, not the lath, the hose or the hydrant
  new RegExp("\\b(run|ran|backed|rolled|drove) over (" + PB_EMG_WHO + "|(his|her|their|my) (leg|legs|foot|feet|arm|hand|ankle))\\b"),
  new RegExp("\\b(" + PB_EMG_WHO + "|he|she|they)\\b.{0,20}\\b(got|was|been|were|get|gets|is|getting) (run|ran|backed|rolled) over\\b"),
  /\b(flagger|guy|worker|laborer|someone|somebody|he|she|operator|pipelayer|man|my \w+)\b.{0,20}\b(got hit|was hit|just got hit|hit by (a|the|our) (car|truck|vehicle|loader|excavator|machine|dozer)|got struck|was struck)\b/,
  /\b(pipe|stick|load|bucket|plate|box|shield|rock|machine|loader|excavator|truck|roller|joint)\b.{0,25}\b(rolled|fell|dropped|landed|swung) (on|over|onto|into)\s+(him|her|them|his|her|my|a guy|the guy|someone|somebody)\b/,
  /\b(crushed|smashed) (his|her|their|my)\b|\b(leg|arm|hand|foot|fingers?|chest) (got |was |is )?(crushed|smashed|pinned)\b/,
  /\b(fell|fallen) (off|from|into|in)\b.{0,40}\b(hit (his|her) head|not moving|cant move|bleeding|knocked out|out cold)\b/,
  /\b(broke|broken|fractured|snapped) (his|her|their|my|a) (leg|arm|back|neck|hip|pelvis|skull|ribs?)\b/,
  // Spanish: trapped, buried, crushed
  /\b(atrapad|enterrad|sepultad|prensad|machucad|aplastad|apachurrad)[oa]s?\b/,
  // Spanish: cave-in ("se nos derrumbo el banco", "se cayo el trench", "se desmorono la zanja", "lo tapo la tierra")
  /\b(derrumb\w*|desmoron\w*|se (nos )?(cayo|vino abajo|vino|colapso|desplomo|hundio))\b.{0,30}\b(zanjas?|pared(es)?|tierra|talud|hoyo|excavacion|banco|orilla|trench|banqueta|encima|compa\w*|adentro)\b/,
  /\b(zanjas?|pared(es)?|tierra|talud|banco|orilla|trench|hoyo|excavacion)\b.{0,20}\b(se (nos )?(cayo|derrumbo|vino abajo|colapso|desmorono|desplomo)|colapso|derrumbo|desmorono)\b/,
  /\b(tierra encima|vino (la )?tierra|lo tapo|la tapo|los tapo|quedo tapad\w*|quedaron tapad\w*|tapad[oa]s? (con|de|por) (la )?tierra|hasta (la|el|las|los) (cintura|rodillas?|pecho|cuello|hombros))\b/,
  /\bse cayo (al|en el|en la|dentro de (la|el|un|una)|a la|adentro del?)\b.{0,12}\b(pozo|hoyo|zanja|registro|manhole|trench|excavacion|alcantarilla|tanque|boveda)\b/,
  // Spanish: not responding, not breathing, passed out
  /\bno (respira|se mueve|despierta|reacciona|puede respirar)\b/,
  /\b(se desmay\w*|desmayad[oa]s?|inconsciente|perdio el conocimiento|esta morad[oa])\b/,
  /\bno lo (oigo|escucho|veo)\b.{0,30}\b(pozo|hoyo|zanja|registro|manhole|adentro|abajo|tanque|boveda)\b/,
  /\b(mare\w*|se quedo dormido|dormido)\b.{0,40}\b(pozo|hoyo|zanja|registro|manhole|adentro|alla abajo|abajo|tanque|boveda)\b|\b(pozo|hoyo|registro|manhole|alla abajo|adentro)\b.{0,30}\b(mare\w*|dormido)\b/,
  // Spanish: bad air (H2S: rotten eggs, sewer smell; low oxygen, high H2S with someone inside)
  /\b(huele|olor|apesta)\b.{0,10}\b(huevos? podridos?|drenaje|cloaca)\b/,
  /\b(h2s|acido sulfhidrico|oxigeno|monoxido|lel|gas(es)?)\b.{0,30}\b(alt[oa]|baj[oa]|subiendo|bajando)\b.{0,40}\b(adentro|dentro|abajo)\b/,
  // Spanish: gas
  /\b(fuga|olor|escape) de gas\b|\bhuele (mucho |fuerte |bien )?a gas\b/,
  /\b(le )?(pegamos|pegaron|pego|golpeamos|golpearon|golpeo|rompimos|rompieron|rompio|reventamos|reventaron|revento|cortamos|cortaron|corto|ponchamos|poncharon|poncho)\b.{0,25}\bgas\b/,
  /\b(le )?dimos (al|a la|a una|a un) (gas|linea de gas|tuberia de gas|tubo de gas)\b/,
  /\b(sale|saliendo|salio|chifla\w*|silba\w*|escapando|se escapa|se sale)\b.{0,15}\bgas\b|\bgas\b.{0,15}\b(sale|saliendo|chifla\w*|silba\w*|escapando)\b/,
  // Spanish: power
  /\b(electrocut\w*|le dio (la )?(luz|corriente|toques?|un toque|una descarga|descarga|un choque|choque)|le dieron toques|choque electrico|descarga electrica|le paso (la )?corriente|toques? electric\w*)\b/,
  /\b(toco|tocaron|tocamos|tocando|toca)\b.{0,25}\b(cables?|alambres?|lineas?)( electric\w*| de (luz|alta|corriente|electricidad))?\b/,
  /\b(pego|pegamos|pegaron|golpeo|golpeamos|engancho|enganchamos)\b.{0,25}\b(cables?|alambres?|lineas?) (electric\w*|de (luz|alta|corriente|electricidad))\b/,
  // Spanish: medical, crush, struck-by
  /\b(se (esta )?ahog\w*|ahogando)\b/,
  /\bdesangr\w*/,
  /\b(infarto|ataque (al corazon|cardiaco|de corazon|epileptico)|le (esta )?(dando|dio) un ataque|convulsion\w*|derrame cerebral)\b/,
  /\b(sangra(ndo)? (mucho|bastante|feo)|mucha sangre|sangra mucho)\b/,
  /\b(atropell\w*|arroll\w*)\b/,
  /\b(le|lo|la|los) (pego|golpeo|aplasto|prenso|machuco|agarro|pesco|arrollo|apachurro) (la|el|un|una) (maquina|excavadora|retro|retroexcavadora|troca|camion|carro|loader|cargador|bote|cucharon|tubo|grua|pluma|vehiculo|trailer|rodillo|compactadora|caja|placa)\b(?!\s+(al|a la|a los|a las)\b)/,
  /\b(machuc|aplast|prens|apachurr)(o|aron|ado|ada|ados|adas|ando)\b/,
  /\ble cayo\b.{0,30}\bencima\b/,
  /\bse (quebro|fracturo|rompio) (la|el|una|un) (pierna|brazo|espalda|cuello|cadera|cabeza|craneo|costillas?)\b/,
  /\b(se corto (feo|muy feo|profundo|mucho|bastante)|cortada (fea|profunda|grande))\b/,
];
// "not responding": a person in danger, not someone ignoring texts or calls about work (see PB_EMG_RESP_SKIP)
const PB_EMG_RESP = [
  /\b(not responding|unresponsive)\b/,
  /\b(isnt|is not|not|wont|will not|stopped|cant get him to|cant get her to)\s+(answering|answer|responding|respond|talking|moving)\b/,
  /\b(cant|cannot|can not|couldnt)\s+(reach|raise|hear|see|wake)\s+(him|her|them|my|the|our)\b/,
  /\bno (answer|response) from\b/,
  /\b(havent|have not|hasnt|has not|we havent|nobody has) (heard from|heard back from|seen|had an answer from)\b/,
  /\bno (responde|contesta)\b/,
];
const PB_EMG_RESP_SKIP = /\b(texts?|texting|text messages?|messages?|emails?|e-mails?|calls?|phone calls?|voicemails?|mensajes?|llamadas?|correos?|whatsapp)\b|\babout (the|a|my|our|his|her|that) (ticket|daily|invoice|schedule|bid|job|plans?|pay|timesheet|order|change order|rfi|submittal|delivery|truck|material)/;
const PB_EMG_RESP_DANGER = /\b(trench\w*|ditch|hole|excavation|manholes?|vaults?|wet ?wells?|lift stations?|tanks?|pits?|sewers?|confined|in there|down there|down in|inside|hurt|injur\w*|fell|fall|collapsed|bleeding|breathing|passed out|down|pozo|zanja|hoyo|registro|adentro|abajo)\b/;
// a gas monitor in alarm: not a low battery, a bump test or calibration (unless someone is inside)
const PB_EMG_ALARM = [
  /\b(gas )?(alarm|monitor|meter|detector|sniffer|4[- ]?gas|four[- ]?gas|multi[- ]?gas)\b.{0,20}\b(going off|is going|went off|alarming|beeping|screaming|in alarm|sounding)\b/,
  /\b(meter|monitor|detector|alarm)s? (is |are )?in alarm\b/,
  /\bgas alarm\b(?!s? (be |is |are )?(set|setting|level|point|at|should))/,
  /\b(h2s|co|lel|o2|oxygen|4[- ]?gas)\s+alarm\b(?!s? (be |is |are )?(set|setting|level|point|at|should))/,
  /\b(suena|sonando|sono|pita|pitando|pito|chilla\w*|en alarma|se activo)\b.{0,25}\b(detector|medidor|monitor|alarma|4 ?gas|cuatro gases|sensor)\b|\b(detector|medidor|monitor|alarma|4 ?gas|cuatro gases|sensor)\b.{0,25}\b(suena|sonando|sono|pita|pitando|pito|chilla\w*|en alarma|se activo)\b/,
];
const PB_EMG_ALARM_SKIP = /\b(low batt\w*|batter(y|ies)|bump(ing)? test\w*|calibrat\w*|charg(e|ing)|bateria|calibr\w*|prueba de (choque|bump)|a que nivel|que nivel|nivel de (la )?alarma|ajust\w*|configur\w*)\b/;
const PB_EMG_INSIDE = /\b(inside|in there|down there|in the (hole|manhole|vault|trench|pit|tank|wet ?well|space)|entrant|adentro|alla abajo|hay (uno|alguien|gente))\b/;
// power line contact and a machine part touching a line: valid unless the line is a water / sewer / fiber line with no power
// word, or they say there was no contact
const PB_EMG_MACHLINE = [
  /\b(hit|hitting|touched|touching|touch|contacted|made contact with|snagged|struck|clipped|caught|tore down|pulled down|brought down|ripped|cut)\b.{0,30}\b(power|electric|electrical|overhead|hot|live|primary|high voltage)\s*(line|lines|wire|wires|cable|service|conductor)s?\b/,
  /\b(boom|bucket|stick|arm|excavator|hoe|backhoe|crane|truck|machine|dump bed)\b.{0,20}\b(touched|touching|hit|contacted|in contact with)\b.{0,20}\b(line|lines|wire|wires)\b/,
  new RegExp("\\b(hit|struck|snagged|caught|clipped|pego|pegamos|pegaron|golpeamos|golpeo|enganchamos|engancho)\\b.{0,25}\\b(lines?|lineas?|wires?|cables?|alambres?)\\b.{0,20}\\b(with|con) (the |a |our |la |el |una |un )?" + PB_EMG_MACH + "\\b"),
  new RegExp("\\b" + PB_EMG_MACH + "\\b.{0,25}\\b(touched|touching|contacted|contacting|in contact with|struck|snagged|caught|clipped|toco|tocaron|tocando|tocamos|pego|golpeo|engancho)\\b.{0,25}\\b(lines?|wires?|cables?|overheads?|primar\\w*|lineas?|alambres?)\\b"),
];
export const PB_EMG_STRONG = [...PB_EMG_CORE, ...PB_EMG_RESP, ...PB_EMG_ALARM, ...PB_EMG_MACHLINE];
// weak: medical / heat signs in the open. Fire unless the question is ABOUT the topic (PB_EMG_INFO).
export const PB_EMG_WEAK = [
  /\b(confused|confusion|delirious|stopped sweating|not sweating|quit sweating|hot dry skin)\b.{0,40}\b(heat|hot|sun|degrees|\d{3}|sweating|confused|throwing up|dizzy)\b/,
  /\b(throwing up|vomiting|puking)\b.{0,20}\b(dizzy|confused|cramping|passed|weak|hot|heat|\d{3})\b/,
  /\b(dizzy|lightheaded)\b.{0,20}\b(throwing up|vomiting|puking|confused|its \d{3}|\d{3} (degrees|out))\b/,
  /\bchest pains?\b/,
  /\b(bleeding (bad|badly|a lot|heavy|heavily|everywhere|out|from)|wont stop bleeding|lots? of blood|blood everywhere|cut (an )?artery)\b/,
  new RegExp("\\b(" + PB_EMG_WHO + "|he|she|they)\\b.{0,25}\\bhit by (a |the |our )?(car|truck|vehicle|driver|motorist)\\b"),
  /\b(fell|fall|fallen) (off|from) (the )?(excavator|machine|ladder|truck|loader|roof|scaffold|trailer)\b/,
  /\b(golpe de calor|insol\w*|no suda|ya no suda|dejo de sudar|esta confundid[oa]|vomitando|dolor de pecho|le duele (mucho )?el pecho|dolor (fuerte )?en el pecho)\b/,
  /\b(vomit\w*|calambres?|mare(ad[oa]s?|o|a)|confundid[oa])\b.{0,30}\b(vomit\w*|calambres?|mare(ad[oa]s?|o|a)|confundid[oa]|calor|sol|sudar|suda)\b/,
  /\bderrumb\w*/,
];
// Spanish words that show up in emergencies (word ends match: "electrocuto", "atropellaron", "desmayo")
const PB_EMG_ES = /\b(zanja|hombre|compa\w*|responde|respir\w*|tapad\w*|quedo|atrapad\w*|desmay\w*|se cayo|fuga|huele|linea|ayuda|alarma|sangr\w*|tierra|pozo|registro|hoyo|atropell\w*|aplast\w*|prensad\w*|machuc\w*|corriente|electrocut(o|ado|ada|aron|ando)|golpe de calor|vomit\w*|dolor de pecho|no suda|medidor|derrumb\w*|enterrad\w*|excavacion|maquina|excavadora|retro|pluma|grua|cables?|alambres?|luz|ahog\w*|infarto|insol\w*|convuls\w*|mare\w*|toques?|descarga|chifl\w*|pegamos|rompimos|golpeamos|encima|adentro|abajo)\b/;
const PB_EMG_ES_SMALL = /\b(el|la|los|las|se|lo|le|les|esta|estan|un|una|al|del|en|de|que|por|con|hay|mi|su|sus|y|muy|mucho|mucha|ya|nos|es|fue|tiene|ahi|alla|aqui|para|pero|porque|esto|eso|puede|pueden)\b/g;
const PB_EMG_EN_SMALL = /\b(the|we|is|my|in|an|of|and|he|she|it|its|to|on|at|our|his|her|was|got|has|have|are|with|from|i|you|they|this|that|what|how|guy|someone|just|into|out|off|up|im|hes|shes|theyre|cant|wont|dont|isnt|going)\b/g;
// Spanish when its ordinary small words (and emergency words) outnumber the English ones
function pbEmgLang(t) {
  const es = (t.match(PB_EMG_ES_SMALL) || []).length + (t.match(new RegExp(PB_EMG_ES.source, "g")) || []).length;
  const en = (t.match(PB_EMG_EN_SMALL) || []).length;
  return es > en ? "es" : "en";
}
// after the fact or about something else (a report deadline, "says he is fine, can he go back to work"): Ask answers it, unless
// something is still happening (not breathing, trapped, an alarm, gas blowing, bleeding)
const PB_EMG_AFTER = /\b(says (hes|he is|shes|she is|they are|theyre|its) (fine|ok|okay|alright|good)|back to work|how (fast|soon|long|many hours) (do|does|did|must|should) (we|i|you|they) (have to )?(report|call|notify)|report (it|this|that|the (hit|damage|strike))|reporting|paperwork|osha (log|300)|300 log|recordable|workers comp|comp claim|fine for|penalt\w*|yesterday|last (week|month)|ago|how (long|soon|fast|many hours) (to|until|before) (report|call|notify)|hospitali[sz]ed|was admitted|went to the (er|hospital|emergency room)|ayer|semana pasada|mes pasado|hace (un|una|dos|tres|unos|unas|\d+) (dias?|semanas?|meses?|anos?)|reportar\w*|papeleo)\b/;
const PB_EMG_NOW = /\b(not breathing|stopped breathing|unconscious|unresponsive|not responding|passed out|trapped|buried|pinned|caved|cave[- ]?in|collapsed|alarm|blowing|leaking|hissing|escaping|electrocut\w*|cant breathe|bleeding|no responde|no respira|atrapad\w*|desmay\w*|enterrad\w*|fuga)\b/;
// nobody hurt, nobody in it, overnight: the cave-in or collapse is over; still an emergency if someone is hurt or trapped now
const PB_EMG_AFTER2 = /\b((nobody|no one|noone|no body) (was |got |is |were |are )?(hurt|injured|in (it|there|the (trench|hole|ditch|excavation)))|(nobody|no one) inside|overnight|last night|over the weekend|nadie (salio |resulto |quedo )?(herido|lastimado)|nadie se lastimo|no hubo heridos|no habia nadie|nadie estaba (adentro|ahi)|anoche|durante la noche)\b/;
const PB_EMG_NOW_HARD = /\b(not breathing|stopped breathing|unconscious|unresponsive|passed out|trapped|buried|pinned|going off|blowing|leaking|hissing|escaping|electrocut\w*|shocked|cant breathe|bleeding|(smells?|smelling) (like )?(gas|rotten)|no responde|no respira|atrapad\w*|desmay\w*|enterrad\w*|sangr\w*|fuga|sonando)\b/;
// "the trench collapsed on the pipe, do we have to relay it": about the pipe when no person is named
const PB_EMG_ONPIPE = /\b(caved|collapsed|came down|fell|sloughed|slid)( in| off)? (on|onto|over|into) (the|our|my) (new |fresh |whole )?(pipe|pipes|line|main|run|bedding|box)\b/;
const PB_EMG_PERSON = new RegExp("\\b(" + PB_EMG_WHO + "|he|she|they)\\b");
// "not leaking", "no leak", "isn't blowing": the gas words are negated, so a nick with no release is an Ask question (report it to the operator)
const PB_EMG_NEG = /\b(not|no|isnt|wasnt|without|never)\s+(leak\w*|blowing|hissing|escaping|gas coming out|smell\w*)\b/g;
// which script
const PB_EMG_GAS = /\b(gas\b.{0,12}\b(blowing|leaking|hissing|escaping)|gas (line|main|service|pipe|lateral|leak|leaking|blowing|escaping)|smell\w*\b.{0,15}\b(gas|rotten eggs?|mercaptan)|(blowing|hissing|leaking) gas|natural gas|fuga de gas|olor de gas|escape de gas|huele (mucho |fuerte |bien )?a gas|huele a huevos? podridos?|(linea|tuberia|tubo) de gas|(pegamos|pegaron|pego|golpeamos|golpearon|golpeo|rompimos|rompieron|rompio|reventamos|reventaron|revento|cortamos|cortaron|corto|ponchamos|poncharon|poncho|dimos)\b.{0,25}\bgas|(sale|saliendo|salio|chifla\w*|silba\w*|escapando|se escapa|se sale)\b.{0,15}\bgas|gas\b.{0,15}\b(sale|saliendo|chifla\w*|silba\w*|escapando))\b/;
// a gas MONITOR (4-gas meter, detector, alarm) is the confined-space case; "the gas meter on the house" is natural gas
const PB_EMG_GAS_METER = /\b(alarm\w*|monitor|detector|sniffer|4[- ]?gas|four[- ]?gas|multi[- ]?gas|lel|h2s|medidor|alarma|sensor|cuatro gases)\b|\bmeters? (is |are )?(going off|went off|in alarm|alarm\w*|beep\w*|read\w*|says|shows)\b/;
// a smell at a sewer, manhole or wet well is usually hydrogen sulfide (H2S): stay out, test, ventilate (not the gas-line steps)
const PB_EMG_SMELL = /\b(smell\w*|stink\w*|odor|huele|olor|apesta)\b/;
const PB_EMG_SEWER = /\b(sewer\w*|manholes?|mh|wet ?wells?|lift stations?|clean ?outs?|vaults?|drenaje|alcantarillas?|cloaca|pozos?|registros?)\b/;
const PB_EMG_POWER_W = /\b(power|electric\w*|overhead\w*|primary|high voltage|wires?|shock\w*|electrocut\w*|zapped|corriente|cables?|luz|alta( tension)?|alambres?|toques?|descarga|voltaje|volts?|kv)\b/;
const PB_EMG_LINE_W = /\b(line|lines|wires?|cables?|conductor\w*|shock\w*|electrocut\w*|zapped|corriente|toco|lineas?|alambres?|overheads?|toques?|descarga|choque|luz)\b/;
const PB_EMG_NOCONTACT = /\b((no|without) contact|(didnt|did not|never|not) (touch|contact|hit)\w*|no (toco|hizo contacto)|sin (tocar|contacto))\b/;
// a high machine part (boom, crane, dump bed) that hits a line hit an overhead line
const PB_EMG_HIGH = /\b(boom|crane|dump ?bed|mast|stick|pluma|grua|brazo)\b.{0,25}\b(hit|struck|snagged|caught|clipped|pego|golpeo|engancho)\b.{0,25}\b(lines?|wires?|cables?|overheads?|lineas?|alambres?)\b/;
// a line hit with nothing to say what it is
const PB_EMG_LINEHIT = /\b(hit|hitting|struck|snagged|nicked|cut|broke|tore|ripped|caught|clipped|pego|pegamos|pegaron|golpeamos|golpeo|rompimos|engancho)\b.{0,30}\b(lines?|lineas?)\b/;
export function pbEmergencyKind(q) {
  const t = pbEmgNorm(q).replace(PB_EMG_NEG, " ");
  if (PB_EMG_AFTER.test(t) && !PB_EMG_NOW.test(t)) return null;
  if ((PB_EMG_AFTER2.test(t) || (PB_EMG_ONPIPE.test(t) && !PB_EMG_PERSON.test(t))) && !PB_EMG_NOW_HARD.test(t)) return null;
  const hit = (a) => a.some((r) => r.test(t));
  const qual = PB_EMG_QUAL.test(t) && !PB_EMG_POWER_W.test(t);
  const strong = hit(PB_EMG_CORE)
    || (hit(PB_EMG_RESP) && !(PB_EMG_RESP_SKIP.test(t) && !PB_EMG_RESP_DANGER.test(t)))
    || (hit(PB_EMG_ALARM) && !(PB_EMG_ALARM_SKIP.test(t) && !PB_EMG_INSIDE.test(t)))
    || (hit(PB_EMG_MACHLINE) && !qual && !PB_EMG_NOCONTACT.test(t));
  const weak = !strong && !PB_EMG_INFO.test(t) && PB_EMG_WEAK.some((r) => r.test(t));
  if (!strong && !weak) return null;
  const lang = pbEmgLang(t);
  const noMeter = !PB_EMG_GAS_METER.test(t);
  const sewerSmell = PB_EMG_SMELL.test(t) && PB_EMG_SEWER.test(t);
  const gasW = /\bgas\b/.test(t.replace(/\b(4|four|multi|cuatro)[- ]?gas(es)?\b/g, " "));
  const gas = noMeter && !sewerSmell && PB_EMG_GAS.test(t);
  const machine = !qual && (hit(PB_EMG_MACHLINE) || PB_EMG_HIGH.test(t));
  const power = (PB_EMG_POWER_W.test(t) && PB_EMG_LINE_W.test(t)) || machine;
  // a machine part touching a line is power; a bucket that "hit the line", with nothing to say what line, or power AND gas: both
  const unclear = !gas && !gasW && !qual && PB_EMG_LINEHIT.test(t) && !(PB_EMG_POWER_W.test(t) && PB_EMG_LINE_W.test(t)) && !PB_EMG_HIGH.test(t) && !/\b(touch\w*|contact\w*|toc[oa]\w*)\b/.test(t);
  const both = (power && (gas || (gasW && noMeter && !sewerSmell))) || (unclear && !sewerSmell);
  const space = !power && !gas && (sewerSmell || PB_EMG_SPACE.test(t) || /\b(alarm|monitor|meter|detector|sniffer|4[- ]?gas|h2s|lel|cave|caved|buried|entrant|attendant|medidor|alarma|atrapad\w*|enterrad\w*|derrumb\w*|desmoron\w*|tapad\w*|tierra|orilla|talud|banco|se cayo (al|en|dentro)|huevos? podridos?|drenaje|dirt|soil|spoils?|bank|slough\w*|up to (his|her|their|the guys|my guys) (waist|chest|knees|neck|hips|shoulders))\b/.test(t));
  return { key: both ? "line" : power ? "power" : gas ? "gas" : space ? "space" : "open", lang };
}
const PB_EMG_ES_911 = "- Si no habla bien inglés: diga primero la dirección y luego «Spanish». El 911 conecta a un intérprete; puede tardar un minuto, no cuelgue.";
export const PB_EMG_TEXT = {
  space: {
    en: "Emergency in a trench, hole or confined space:\n- Call 911 now. Then tell your supervisor / entry supervisor.\n- Stay out and keep everyone out. Do NOT go in after them unless you are a trained, equipped rescuer: untrained rescuers are often the next victims.\n- Gas alarm, or a rotten-egg or sewer smell (often hydrogen sulfide, H2S): everyone out now. Nobody goes back in until the air is tested and ventilated and the entry supervisor says so.\n- Cave-in: keep people and machines back from the edge; more can fall.\n- If a permit is open, press EMERGENCY so the entry team and the permit record know.\n- Send someone to meet the ambulance and lead it in.",
    es: "Emergencia en una zanja, hoyo o espacio confinado:\n- Llame al 911 ahora. Luego avise a su supervisor o al supervisor de entrada.\n- Quédese afuera y no deje entrar a nadie. NO entre a sacarlo si no es un rescatista entrenado y con equipo: los que entran sin entrenamiento muchas veces son las siguientes víctimas.\n- Alarma del medidor de gas, u olor a huevo podrido o a drenaje (casi siempre ácido sulfhídrico, H2S): todos afuera ya. Nadie vuelve a entrar hasta que se mida el aire, se ventile y el supervisor de entrada lo autorice.\n- Derrumbe: mantenga a la gente y las máquinas lejos de la orilla; puede caer más tierra.\n- Si hay un permiso abierto, toque EMERGENCIA para que el equipo de entrada y el registro del permiso lo sepan.\n- Mande a alguien a recibir la ambulancia y a guiarla hasta aquí.\n" + PB_EMG_ES_911,
  },
  open: {
    en: "Emergency:\n- Call 911 now (or have someone call) and send someone to meet the ambulance and lead it in.\n- Not breathing or not responding normally: start CPR and get the AED if there is one.\n- Heat (confused, stopped sweating, throwing up, passed out): start cooling now: shade, soak them with water, ice on neck, armpits and groin. Do not wait for the ambulance.\n- Heavy bleeding: hard, steady pressure on the wound with a cloth and do not let up; if an arm or leg will not stop, a tourniquet 2 to 3 inches above the wound (note the time).\n- Fall, crush or struck by a vehicle: do not move them unless they are in more danger where they are; protect them from traffic and equipment.\n- If they are down in a trench, hole or confined space, do NOT go in: call 911 and keep everyone out.",
    es: "Emergencia:\n- Llame al 911 ahora (o que alguien llame) y mande a alguien a recibir la ambulancia y a guiarla hasta aquí.\n- Si no respira o no responde normal: empiece RCP y traiga el DEA (desfibrilador) si hay uno.\n- Calor (confundido, ya no suda, vomita, se desmayó): empiece a enfriarlo ya: sombra, mójelo con agua, hielo en el cuello, las axilas y la ingle. No espere a la ambulancia.\n- Sangrado fuerte: apriete fuerte y sin soltar sobre la herida con un trapo; si un brazo o una pierna no deja de sangrar, ponga un torniquete 2 a 3 pulgadas (5 a 8 cm) más arriba de la herida (apunte la hora).\n- Caída, aplastado o atropellado: no lo mueva, a menos que corra más peligro donde está; protéjalo del tráfico y de las máquinas.\n- Si está dentro de una zanja, hoyo o espacio confinado, NO entre: llame al 911 y no deje entrar a nadie.\n" + PB_EMG_ES_911,
  },
  gas: {
    en: "Gas line hit or gas smell:\n- Get everyone out and away, upwind. Leave the machine where it is if you can walk away from it.\n- No smoking, no flames, no starting engines or anything that can spark near the gas.\n- Do not try to stop or squeeze off the leak; leave the hole open for the gas company.\n- Call 911 from a safe distance, then the gas company, the line's owner or operator (number on your locate ticket, or call 811).\n- Keep people and traffic back until the fire department or gas company says it is clear.\n- If anyone is down in a trench or hole, do NOT go in after them.",
    es: "Le pegaron a una línea de gas, o huele a gas:\n- Saque a todos y aléjense hacia donde viene el viento (con el viento en la cara). Si puede alejarse de la máquina, déjela donde está.\n- No fumar, nada de fuego, no arrancar motores ni nada que saque chispa cerca del gas.\n- No trate de tapar ni de prensar la fuga; deje el hoyo abierto para la compañía de gas.\n- Llame al 911 desde un lugar seguro; luego a la compañía de gas o al dueño de la línea (el número está en su ticket del 811, o llame al 811).\n- Mantenga a la gente y el tráfico lejos hasta que los bomberos o la compañía de gas digan que ya es seguro.\n- Si alguien está caído dentro de una zanja o un hoyo, NO entre a sacarlo.",
  },
  power: {
    en: "Power line contact:\n- Operator: stay in the cab and do not touch anything metal. Move the machine away from the line only if you can do it safely.\n- Leave the machine only if it is on fire: jump clear with feet together, never touch the machine and the ground at the same time, then shuffle or hop away with feet together.\n- Everyone else: stay far back. The ground around the machine can be live. Do not touch the machine, the person, or anything touching them.\n- Call 911 and the power company to cut the power.\n- Someone shocked and down: do not touch them until the power is off; then start CPR and get the AED if they are not breathing.",
    es: "Contacto con línea eléctrica (cables de luz):\n- Operador: quédese en la cabina y no toque nada de metal. Aleje la máquina de la línea solo si puede hacerlo sin peligro.\n- Bájese de la máquina solo si se está quemando: salte lejos con los pies juntos, nunca toque la máquina y el suelo al mismo tiempo, y aléjese arrastrando los pies o saltando con los pies juntos.\n- Todos los demás: quédense muy lejos. El suelo alrededor de la máquina puede tener corriente. No toquen la máquina, a la persona ni nada que la esté tocando.\n- Llame al 911 y a la compañía de luz para que corten la corriente.\n- Si a alguien le dio la corriente y está tirado: no lo toque hasta que corten la corriente; luego empiece RCP y traiga el DEA si no respira.",
  },
};
// a line hit and nobody can tell what it is: treat it as live power, and as gas if there is any sign of gas
PB_EMG_TEXT.line = {
  en: "Hit a line and not sure what it is: treat it as a live power line until you know, and as a gas line if you smell or hear gas.\n\n" + PB_EMG_TEXT.power.en + "\n\n" + PB_EMG_TEXT.gas.en,
  es: "Le pegaron a una línea y no sabe qué es: trátela como línea eléctrica con corriente hasta saber, y como línea de gas si huele o se oye el gas.\n\n" + PB_EMG_TEXT.power.es + "\n\n" + PB_EMG_TEXT.gas.es,
};
// the line that fits what happened moves up, right under the 911 line (bleeding, heat, a fall or crush)
const PB_EMG_FOCUS = [[/\b(bleed\w*|blood|cut (his|her|their|my)|artery|sangr\w*|desangr\w*|cortad[oa]|se corto)\b/, /^- (Heavy bleeding|Sangrado)/], [/\b(heat|hot|sweat\w*|\d{3}|confused|throwing up|vomit\w*|calor|suda\w*|insol\w*|confundid[oa])\b/, /^- (Heat|Calor)/], [/\b(fell|fall|crush\w*|run over|ran over|backed over|hit by|struck|rolled on|broke|aplast\w*|atropell\w*|prens\w*|machuc\w*|cayo|caida|encima|quebro|fracturo)\b/, /^- (Fall|Ca[ií]da)/]];
export function pbEmergencyText(key, lang, q) {
  const lines = PB_EMG_TEXT[key][lang].split("\n");
  if (key !== "open") return lines.join("\n");
  const t = pbEmgNorm(q);
  for (const [qr, lr] of PB_EMG_FOCUS.slice().reverse()) {
    if (!qr.test(t)) continue;
    const i = lines.findIndex((l) => lr.test(l));
    if (i > 2) lines.splice(2, 0, lines.splice(i, 1)[0]);
  }
  return lines.join("\n");
}
export function pbEmergencyAnswer(q) {
  const k = pbEmergencyKind(q);
  return k ? { kind: "emergency", script: k.key, lang: k.lang, text: pbEmergencyText(k.key, k.lang, q) } : null;
}
