const pbEmNorm = (q) => String(q || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "");
const PB_EM_INFO = /\b(signs? of|symptoms? of|what (are|is) (the )?(signs?|symptoms?)|how (do|can|would) (you|i|we) (know|tell|recognize|spot|prevent|avoid)|prevent\w*|avoid\w*|training|toolbox|tailgate|talk about|safety meeting|in general|hazards? of|risks? of)\b/;
const PB_EM_SPACE = /\b(trench\w*|ditch|hole|excavation|the cut|manholes?|mh|vaults?|wet ?wells?|lift stations?|tanks?|pits?|sewers?|confined|catch ?basins?|culverts?|structures?|in there|down there|down in|inside|the box|zanja|pozo|registro|hoyo|tanque|alcantarilla|boveda|espacio confinado|adentro|alla abajo)\b/;
const PB_EM_STRONG = [
  /\b(passed out|pass(ing)? out|unconscious|not responding|unresponsive|not breathing|stopped breathing|man down|keeled over|overcome by)\b/,
  /\b(isnt|is not|not|wont|will not|stopped|cant get him to|cant get her to)\s+(answering|answer|responding|respond|talking|moving)\b/,
  /\b(cant|cannot|can not|couldnt)\s+(reach|raise|hear|see|wake)\s+(him|her|them|my|the|our)\b/,
  /\bno (answer|response) from\b/,
  /\b(havent|have not|hasnt|has not|we havent|nobody has) (heard from|heard back from|seen|had an answer from)\b/,
  /\b(someone|somebody|he|she|they|guy|man|worker|buddy|partner|entrant|laborer|operator|pipelayer|flagger|crew ?member|my \w+)\b.{0,25}\b(is down|are down|went down|fell (in|down)|collapsed|buried|trapped|pinned)\b/,
  /\b(cave[- ]?in|trench|wall|side|bank|hole|ditch)\b.{0,20}\b(just )?(collapsed|caved|came down|fell in|gave way|sloughed( off)?)\b/,
  /\b(cave[- ]?in|caved in)\s*!/,
  /\b(dirt|soil|bank|wall|side|spoil|mud|ground|sand|clay)\b.{0,25}\b(came down|fell|sloughed( off)?|slid|slumped|caved|collapsed)\b.{0,25}\b(on|onto|over|around|in on)\b/,
  /\bup to (his|her|their|the guys|my guys) (waist|chest|knees|neck|hips|shoulders)\b/,
  /\b(gas )?(alarm|monitor|meter|detector|sniffer|4[- ]?gas|four[- ]?gas|multi[- ]?gas)\b.{0,20}\b(going off|is going|went off|alarming|beeping|screaming|in alarm|sounding)\b/,
  /\b(meter|monitor|detector|alarm)s? (is |are )?in alarm\b/,
  /\bgas alarm\b(?!s? (be |is |are )?(set|setting|level|point|at|should))/,
  /\b(h2s|co|lel|o2|oxygen|4[- ]?gas)\s+alarm\b(?!s? (be |is |are )?(set|setting|level|point|at|should))/,
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
  // power line contact or shock
  /\b(hit|hitting|touched|touching|touch|contacted|made contact with|snagged|struck|clipped|caught|tore down|pulled down|brought down|ripped|cut)\b.{0,30}\b(power|electric|electrical|overhead|hot|live|primary|high voltage)\s*(line|lines|wire|wires|cable|service|conductor)s?\b/,
  /\b(boom|bucket|stick|arm|excavator|hoe|backhoe|crane|truck|machine|dump bed)\b.{0,20}\b(touched|touching|hit|contacted|in contact with)\b.{0,20}\b(line|lines|wire|wires)\b/,
  /\b(electrocuted|got electrocuted|got shocked|was shocked|been shocked|getting shocked|shocked (him|her|them|me)|got zapped|got bit by the line)\b/,
  // medical events happening now
  /\b(cant|cannot|can not) breathe?\b/,
  /\b(bleeding (bad|badly|a lot|heavy|heavily|everywhere|out|from)|wont stop bleeding|lots? of blood|blood everywhere|cut (an )?artery)\b/,
  /\b(having|has|had|is having|think (he|she|they)s? having|going into)\b.{0,15}\b(heart attack|stroke|heat ?stroke|seizure)\b/,
  /\b(run over|ran over|backed over)\b/,
  /\b(flagger|guy|worker|laborer|someone|somebody|he|she|operator|pipelayer|man|my \w+)\b.{0,20}\b(got hit|was hit|just got hit|hit by (a|the|our) (car|truck|vehicle|loader|excavator|machine|dozer)|got struck|was struck)\b/,
  /\b(pipe|stick|load|bucket|plate|box|shield|rock|machine|loader|excavator|truck|roller|joint)\b.{0,25}\b(rolled|fell|dropped|landed|swung) (on|over|onto|into)\s+(him|her|them|his|her|my|a guy|the guy|someone|somebody)\b/,
  /\b(crushed|smashed) (his|her|their|my)\b|\b(leg|arm|hand|foot|fingers?|chest) (got |was |is )?(crushed|smashed|pinned)\b/,
  /\b(fell|fallen) (off|from|into|in)\b.{0,40}\b(hit (his|her) head|not moving|cant move|bleeding|knocked out|out cold)\b/,
  // Spanish
  /\b(atrapad[oa]s?|enterrad[oa]s?|sepultad[oa]s?)\b/,
  /\b(se (cayo|derrumbo|vino abajo|colapso|desplomo)|derrumbe)\b.{0,25}\b(zanja|pared|tierra|talud|hoyo|excavacion)\b|\b(zanja|pared|tierra|talud)\b.{0,15}\b(se (cayo|derrumbo|vino abajo|colapso))\b/,
  /\bno (responde|respira|contesta|se mueve)\b/,
  /\b(se desmayo|desmayad[oa]|inconsciente|esta desmayad[oa])\b/,
  /\b(fuga|olor) de gas\b|\bhuele a gas\b|\b(pegamos|golpeamos|rompimos|reventamos|cortamos)\b.{0,20}\b(linea|tuberia|tubo) de gas\b/,
  /\b(electrocut\w*|le dio (la )?corriente|toco (la |el )?(linea|cable)s?( electric\w*| de luz)?)\b/,
  /\b(sangra(ndo)? mucho|mucha sangre|lo atropell\w*|la atropell\w*|lo aplast\w*|la aplast\w*)\b/,
  /\balarma\b.{0,20}\b(sono|sonando|esta sonando|se activo)\b|\b(medidor|detector)\b.{0,15}\b(en alarma|sonando)\b/
];
const PB_EM_WEAK = [
  /\b(confused|confusion|delirious|stopped sweating|not sweating|quit sweating|hot dry skin)\b.{0,40}\b(heat|hot|sun|degrees|\d{3}|sweating|confused|throwing up|dizzy)\b/,
  /\b(throwing up|vomiting|puking)\b.{0,20}\b(dizzy|confused|cramping|passed|weak|hot|heat|\d{3})\b/,
  /\b(dizzy|lightheaded)\b.{0,20}\b(throwing up|vomiting|puking|confused|its \d{3}|\d{3} (degrees|out))\b/,
  /\bchest pains?\b/,
  /\bhit by (a |the )?(car|truck|vehicle|driver|motorist)\b/,
  /\b(fell|fall|fallen) (off|from) (the )?(excavator|machine|ladder|truck|loader|roof|scaffold|trailer)\b/,
  /\b(golpe de calor|no suda|esta confundid[oa]|vomitando|dolor de pecho)\b/
];
const PB_EM_ES = /\b(zanja|hombre|companero|esta|responde|atrapad|desmay|se cayo|fuga|huele|linea|ayuda|alarma|sangr|tierra|pozo|registro|atropell|aplast|corriente|electrocut|golpe de calor|vomitando|dolor de pecho|no suda|medidor)\b/;
const PB_EM_AFTER = /\b(says (hes|he is|shes|she is|they are|theyre|its) (fine|ok|okay|alright|good)|back to work|how (fast|soon|long|many hours) (do|does|did|must|should) (we|i|you|they) (have to )?(report|call|notify)|report (it|this|that|the (hit|damage|strike))|reporting|paperwork|osha (log|300)|300 log|recordable|workers comp|comp claim|fine for|penalt\w*|yesterday|last (week|month)|ago)\b/;
const PB_EM_NOW = /\b(not breathing|stopped breathing|unconscious|unresponsive|not responding|passed out|trapped|buried|pinned|caved|cave[- ]?in|collapsed|alarm|blowing|leaking|hissing|escaping|electrocut\w*|cant breathe|bleeding|no responde|no respira|atrapad\w*|desmay\w*|enterrad\w*|fuga)\b/;
function pbEmergencyKind(q) {
  const t = pbEmNorm(q);
  if (PB_EM_AFTER.test(t) && !PB_EM_NOW.test(t)) return null;
  const strong = PB_EM_STRONG.some((r) => r.test(t)), weak = !strong && !PB_EM_INFO.test(t) && PB_EM_WEAK.some((r) => r.test(t));
  if (!strong && !weak) return null;
  const lang = PB_EM_ES.test(t) && !/\b(the|we|is|my|in)\b/.test(t) ? "es" : "en";
  const power = /\b(power|electric\w*|overhead|primary|high voltage|wires?|shock\w*|electrocut\w*|zapped|corriente|cable|luz)\b/.test(t) && /\b(line|lines|wires?|cable|conductor|shock\w*|electrocut\w*|zapped|corriente|toco|linea)\b/.test(t) && !/\bgas\b/.test(t);
  const gas = !power && /\b(gas (line|main|service|pipe|lateral|leak|leaking|blowing|escaping)|smell\w*\b.{0,15}\b(gas|rotten eggs?|mercaptan)|(blowing|hissing|leaking) gas|natural gas|fuga de gas|olor de gas|huele a gas|(linea|tuberia|tubo) de gas)\b/.test(t) && !/\b(alarm|monitor|meter|detector|4[- ]?gas|lel|h2s)\b/.test(t);
  const space = !power && !gas && (PB_EM_SPACE.test(t) || /\b(alarm|monitor|meter|detector|sniffer|4[- ]?gas|h2s|lel|cave|caved|buried|entrant|attendant|medidor|alarma|atrapad|enterrad|derrumb|se cayo)\b/.test(t));
  return { key: power ? "power" : gas ? "gas" : space ? "space" : "open", lang };
}
const PB_EM_TEXT = {
  space: {
    en: "Emergency in a trench, hole or confined space:\n- Call 911 now. Then tell your supervisor / entry supervisor.\n- Stay out and keep everyone out. Do NOT go in after them unless you are a trained, equipped rescuer: untrained rescuers are often the next victims.\n- Cave-in: keep people and machines back from the edge; more can fall.\n- If a permit is open, press EMERGENCY so the entry team and the permit record know.\n- Send someone to meet the ambulance and lead it in.",
    es: "Emergencia en una zanja, hoyo o espacio confinado:\n- Llame al 911 ahora. Luego avise a su supervisor / supervisor de entrada.\n- Quedese afuera y no deje entrar a nadie. NO entre a sacarlo si no es un rescatista entrenado y equipado: los que entran sin entrenamiento suelen ser las siguientes victimas.\n- Derrumbe: mantenga a la gente y las maquinas lejos del borde; puede caer mas tierra.\n- Si hay un permiso abierto, toque EMERGENCIA para que el equipo y el registro del permiso lo sepan.\n- Mande a alguien a recibir la ambulancia y guiarla."
  },
  open: {
    en: "Emergency:\n- Call 911 now (or have someone call) and send someone to meet the ambulance and lead it in.\n- Not breathing or not responding normally: start CPR and get the AED if there is one.\n- Heat (confused, stopped sweating, throwing up, passed out): start cooling now: shade, soak them with water, ice on neck, armpits and groin. Do not wait for the ambulance.\n- Heavy bleeding: press hard on the wound with a cloth and keep pressing.\n- Fall, crush or struck by a vehicle: do not move them unless they are in more danger where they are; protect them from traffic and equipment.\n- If they are down in a trench, hole or confined space, do NOT go in: call 911 and keep everyone out.",
    es: "Emergencia:\n- Llame al 911 ahora (o que alguien llame) y mande a alguien a recibir la ambulancia y guiarla.\n- Si no respira o no responde normal: empiece RCP y traiga el DEA si hay uno.\n- Calor (confundido, ya no suda, vomita, se desmayo): empiece a enfriarlo ya: sombra, mojelo con agua, hielo en cuello, axilas e ingle. No espere a la ambulancia.\n- Sangrado fuerte: apriete fuerte la herida con un trapo y no suelte.\n- Caida, aplastado o atropellado: no lo mueva a menos que corra mas peligro donde esta; protejalo del trafico y las maquinas.\n- Si esta dentro de una zanja, hoyo o espacio confinado, NO entre: llame al 911 y no deje entrar a nadie."
  },
  gas: {
    en: "Gas line hit or gas smell:\n- Get everyone out and away, upwind. Leave the machine where it is if you can walk away from it.\n- No smoking, no flames, no starting engines or anything that can spark near the gas.\n- Do not try to stop or squeeze off the leak, and do not bury or backfill it.\n- Call 911 from a safe distance, then the gas company, the line's owner or operator (number on your locate ticket, or call 811).\n- Keep people and traffic back until the fire department or gas company says it is clear.\n- If anyone is down in a trench or hole, do NOT go in after them.",
    es: "Linea de gas golpeada u olor a gas:\n- Saque a todos y alejense, contra el viento. Deje la maquina donde esta si puede alejarse de ella.\n- No fumar, no llamas, no arrancar motores ni nada que haga chispa cerca del gas.\n- No intente parar ni apretar la fuga, y no la entierre ni la tape.\n- Llame al 911 desde un lugar seguro, luego a la compania de gas, la duena u operadora de la linea (numero en su ticket de localizacion, o llame al 811).\n- Mantenga a la gente y el trafico lejos hasta que los bomberos o la compania de gas digan que esta seguro.\n- Si alguien esta caido dentro de una zanja o hoyo, NO entre a sacarlo."
  },
  power: {
    en: "Power line contact:\n- Operator: stay in the cab and do not touch anything metal. Move the machine away from the line only if you can do it safely.\n- Leave the machine only if it is on fire: jump clear with feet together, never touch the machine and the ground at the same time, then shuffle or hop away with feet together.\n- Everyone else: stay far back. The ground around the machine can be live. Do not touch the machine, the person, or anything touching them.\n- Call 911 and the power company to cut the power.\n- Someone shocked and down: do not touch them until the power is off; then start CPR and get the AED if they are not breathing.",
    es: "Contacto con linea electrica:\n- Operador: quedese en la cabina y no toque nada de metal. Aleje la maquina de la linea solo si puede hacerlo sin peligro.\n- Salga de la maquina solo si se esta quemando: salte lejos con los pies juntos, nunca toque la maquina y el suelo al mismo tiempo, y alejese arrastrando los pies o saltando con los pies juntos.\n- Todos los demas: mantenganse muy lejos. El suelo alrededor de la maquina puede tener corriente. No toquen la maquina, a la persona ni nada que la toque.\n- Llame al 911 y a la compania de luz para que corten la corriente.\n- Si alguien recibio la descarga y esta caido: no lo toque hasta que corten la corriente; luego empiece RCP y traiga el DEA si no respira."
  }
};
function pbEmergencyAnswer(q) {
  const k = pbEmergencyKind(q);
  return k ? { kind: "emergency", script: k.key, lang: k.lang, text: PB_EM_TEXT[k.key][k.lang] } : null;
}
export {
  PB_EM_STRONG,
  PB_EM_TEXT,
  PB_EM_WEAK,
  pbEmNorm,
  pbEmergencyAnswer,
  pbEmergencyKind
};
