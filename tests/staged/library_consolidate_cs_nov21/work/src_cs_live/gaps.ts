import { stem } from "./_shared/retrieval.ts";
const GAP_PER_TERM = 3.2,
  GAP_LIBS = ["app", "field", "osha"],
  NOT_IN_KB_RX =
    /\b(?:the )?app[\u2019']?s (?:libraries|library|education pages) (?:don[\u2019']?t|do not|doesn[\u2019']?t|does not) cover\b|\bnot (?:covered )?in the (?:app[\u2019']?s|in-app) (?:libraries|library|knowledge)\b|\b(?:las bibliotecas|la biblioteca) de la (?:app|aplicaci[o\u00F3]n) no (?:cubren|cubre|incluyen|incluye)\b/i,
  REFUSAL_RX =
    /\b(?:I (?:can|only) (?:only )?(?:help|answer) (?:with )?(?:questions about )?(?:pipe|pipeline|civil|construction|this company)|only (?:help|answer) (?:with )?(?:pipe|pipeline|civil|construction)|I can[\u2019']?t (?:write|fill|sign|help with that)|I won[\u2019']?t (?:write|fill|sign)|outside what (?:I|this app) (?:can|covers?)|not something I can help with)\b/i,
  SPANISH_RX =
    /[\u00BF\u00A1\u00F1]|\b(?:qu[e\u00E9]|c[o\u00F3]mo|cu[a\u00E1]nt[oa]s?|d[o\u00F3]nde|por qu[e\u00E9]|para|tubo|tuber[i\u00ED]a|zanja|pozo|necesito|tenemos|hay)\b/i,
  isSpanish = (q) =>
    (String(q).match(new RegExp(SPANISH_RX.source, "gi")) || []).length >= 2 ||
    /[\u00BF\u00A1]/.test(q),
  SHORT_REPLY_WORDS = 8;
function isFollowUp(q, hist) {
  const prev = Array.isArray(hist) ? hist[0] : null;
  return !!prev && String(prev.a || "").trim().length > 0 &&
    String(q).trim().split(/\s+/).length <= SHORT_REPLY_WORDS;
}
function weakRetrieval(st) {
  return !st || !st.nTyped
    ? !1
    : GAP_LIBS.every((l) => (st.best[l] || 0) / st.nTyped < GAP_PER_TERM);
}
function gapReason(g) {
  return g.data || g.replacedAll || g.toolOk || g.cited.includes("doc")
    ? null
    : NOT_IN_KB_RX.test(g.text)
    ? "model_said_not_in_kb"
    : g.followUp || !weakRetrieval(g.stats) ||
        g.cited.some((k) => k === "kb" || k === "app_page") ||
        isSpanish(g.q) || REFUSAL_RX.test(g.text)
    ? null
    : "low_retrieval";
}
function topicHint(st, hits) {
  const r = (n) => Math.round(n * 100) / 100, best = {};
  for (const l of GAP_LIBS) best[l] = r(st?.best[l] || 0);
  return {
    ids: hits.slice(0, 3).map((h) => String(h.id).slice(0, 80)),
    libs: [...new Set(hits.slice(0, 3).map((h) => h.lib))],
    best,
    top: r(hits[0]?.score || 0),
    per_term: st?.nTyped ? r(Math.max(0, ...GAP_LIBS.map((l) => st.best[l] || 0)) / st.nTyped) : 0,
    cover: r(st?.cover || 0),
  };
}
const FIRST_NAMES =
    "aaron adam adrian alan albert alberto alejandro alex alexander alfredo alicia allen alvaro amanda amber amy ana andre andrea andres andrew andy angel angela angelica anna anthony antonio armando arturo ashley austin barbara ben benjamin beto betty billy blake bobby brad bradley brandon brenda brian brittany bruce bryan caleb cameron carl carla carlos carmen carol caroline cassandra cesar charles charlie chris christian christina christine christopher cindy cody colton connor cory courtney craig crystal curtis cynthia dakota dan dana daniel danny darrell darren dave david dean debbie deborah dennis derek diana diego dillon dominic don donald donna doug douglas dustin dylan eddie edgar eduardo edward efrain elena elizabeth emily emmanuel enrique eric erica erik ernesto esteban ethan eugene evan felipe fernando francisco gabriel gary gerardo gilbert gloria greg gregory guillermo gustavo heather hector heidi henry hernan hugo ignacio isaac isaiah ivan jacob jaime jake james jamie jared jasmine jason javier jeff jeffrey jennifer jeremy jerry jesse jessica jesus jim jimmy joe joel joey john johnny jon jonathan jorge jose joseph josh joshua juan julian julie julio justin karen katherine kathy keith kelly ken kenneth kevin kim kimberly kristen kyle larry laura lauren leo leonardo leslie linda lisa logan lorenzo lucas luis luke manuel marco marcos maria mario marisol martha martin marvin mary mateo matt matthew maurice megan melissa michael michelle miguel mike misael mitchell monica nancy natalie nathan nicholas nick nicole noah noe octavio omar oscar pablo pam patricia patrick paul pedro peter phil philip rachel rafael ramiro ramon randy raul rebecca refugio ricardo richard rick ricky robert roberto rodrigo roger ronald ronnie ruben russell ryan salvador sam samantha samuel sandra santiago sara sarah scott sean sergio seth shane shannon sharon shawn stephanie stephen steve steven susan tammy tanner taylor teresa terry thomas tim timothy tina todd tom tommy tony travis trevor troy tyler valerie vanessa vicente victor vince vincent walter wayne wesley william xavier yolanda zachary zach mary maria jose andres nunez dwayne deshawn lakeisha tyrone jamal darnell latoya keisha shaquille dmitri oleg igor sergei vladimir chuy pancho paco nacho lalo tono pepe chema chava chente chuyito beto checo lupe toni kiko quique rigo tavo neto tito chalo goyo moy poncho"
      .split(" "),
  AMBIG_NAMES =
    "will bill mark grant chase pat jack dale cliff drew wade gage hunter rich ray art frank gene earl lane dusty buck bob chuck memo bo ace red shorty tiny junior chico flaco gordo guero"
      .split(" "),
  SURNAMES =
    "smith johnson williams jones garcia miller davis rodriguez martinez hernandez lopez gonzalez gonzales wilson anderson jackson perez thompson harris sanchez ramirez lewis robinson walker torres nguyen flores adams nelson rivera campbell mitchell roberts gomez phillips evans diaz edwards collins reyes stewart morris morales murphy rogers gutierrez ortiz cooper peterson richardson watson chavez bennett mendoza ruiz hughes alvarez castillo sanders patel myers foster jimenez vasquez castro romero herrera medina aguilar vargas guzman salazar soto delgado contreras dominguez estrada navarro rios silva espinoza villa sandoval orozco ochoa ibarra cervantes cardenas kowalski kowalczyk nowak okafor okonkwo obrien oconnor tran pham huynh nunez fuentes acosta pena marquez bautista lozano zamora"
      .split(" "),
  AMBIG_SUR =
    "brown white green gray grey young king wood long price cook hall hill reed ward brooks baker carter parker turner wright scott moore clark allen bell black stone rush"
      .split(" "),
  NAME_SET = new Set([...FIRST_NAMES, ...SURNAMES]),
  AMBIG_SET = new Set([...AMBIG_NAMES, ...AMBIG_SUR]),
  CAL = new Set(
    "monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december"
      .split(" "),
  ),
  APP_WORDS = new Set(
    "osha cfr mutcd ask run setup quick new end lock home more reports calculators tools education records daily report job jobs plan crew foreman pipelayer super pm company office confined space trench box permit emergency lenker engineer engineers architect architects rod rods type class schedule sdr dr pvc hdpe dip rcp vcp cmp awwa astm aashto greenbook caltrans adot txdot dot epa ansi aci nfpa iso app manhole station invert flowline grade hub stake offset cut fill north south east west street avenue road"
      .split(" "),
  ),
  COMMON = new Set(
    "a an the and or of to in on at for is are was were be been do does did what whats how why when where which who whom can could i you my we it its this that these those with from by if then than vs me your our us should would will about there here need needs get got use used using mean means tell explain much many any some all as into out up so not no yes just also please thanks thank hey hi hello im ive id ill dont doesnt isnt arent wasnt werent didnt cant couldnt wouldnt shouldnt wont hasnt havent hadnt aint lets whos wheres theres thats heres hows ok okay well now today tomorrow yesterday tonight he she they them his her hers their theirs him ours yours mine one two three four five six seven eight nine ten first second last next every each other another more most less same such very too only still even again ever never always sometimes maybe both either neither after before during since while until because though although yeah yep nope sure guys folks everyone someone anyone nobody somebody anybody something anything nothing give show find help check let make take put say said see look go going went come coming know think want try call ask per via el la los las un una unos unas que como cuando donde por para es son esta estan hay ya si mi mis tu tus su sus yo nosotros ellos se lo le les del al en con sin pero mas muy cual cuales cuanto cuanta cuantos cuantas porque hola gracias bueno buenas necesito necesitamos tenemos tengo puedo podemos debo debemos hacer hago quiero dice dijo ayuda oye senor senora companero"
      .split(" "),
  ),
  fold = (w) => w.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase(),
  PERSON_AFTER = new Set(
    "said says say told tells telling asked asks fell falls fallen got gets is was isnt wasnt went passed signed wants wanted thinks thought called calls needs needed hurt collapsed fainted dice dijo se esta quiere cayo cree firmo"
      .split(" "),
  ),
  PERSON_BEFORE = new Set(
    "ask asked tell told call called text texted named foreman super supervisor superintendent operator partner buddy helper laborer pipelayer inspector senor senora don dona companero compa jefe mr mrs ms dr"
      .split(" "),
  ),
  GENERIC_TRADE = new Set(
    "road roads heavy general new civil highway building commercial residential site utility underground pipeline sewer water storm street bridge trench concrete asphalt our their this that local city county state private public"
      .split(" "),
  ),
  kbKnown = (ix) => (w) => !!ix && !!ix.t[stem(w.toLowerCase())],
  esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  UNIT = String
    .raw`(?:ft|feet|foot|inch|inches|lf|%|psi|gpm|cfs|yd|yds|yards?|cy|lbs?|pounds?|tons?|degrees?|deg|mph|ppm|hours?|hrs?|days?|minutes?|mins?|weeks?|months?|years?|mm|cm|m|gal|gallons?|kips?|sticks?|joints?|pieces?)\b`,
  SFX_CI = String
    .raw`(?:st|ave|rd|blvd|ln|ct|pkwy|hwy|cir|trl|street|avenue|boulevard|parkway|highway)\b\.?`,
  NOT_STREET = new Set(
    "or and the at on of to in by for a an is was from with near off past".split(" "),
  ),
  SFX_CAP = String
    .raw`(?:Dr\b\.?|(?:Road|Drive|Lane|Way|Court|Place|Circle|Terrace|Trail|Loop|Pike|Row|Square)\b)`;
function scrub(input, max = 500, known = () => !1, extra = {}) {
  let s = String(input ?? "").normalize("NFKC").replace(
    /[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060-\u2064\ufeff]/g,
    " ",
  );
  const lit = (xs, tag) => {
    for (
      const x of [
        ...new Set((xs || []).map((v) => String(v || "").trim()).filter((v) => v.length >= 2)),
      ].sort((a, b) => b.length - a.length)
    ) s = s.replace(new RegExp("(?<![A-Za-z0-9])" + esc(x) + "(?![A-Za-z0-9])", "gi"), tag);
  };
  lit(
    ((xs) =>
      (xs || []).flatMap((c) => {
        const v = String(c || "").trim();
        if (!v) return [];
        const bare = v.replace(
          /[,.]?\s+(?:llc|l\.l\.c\.?|inc\.?|incorporated|co\.?|corp\.?|corporation|company|ltd\.?|lp|llp)$/i,
          "",
        ).trim();
        return [
          v,
          bare.length >= 4 ? bare : "",
          bare.replace(/\s+/g, "").length >= 6 ? bare.replace(/\s+/g, "") : "",
        ].filter(Boolean);
      }))(extra.company),
    "[company]",
  ),
    lit(extra.jobs, "[job]"),
    lit(extra.places, "[place]"),
    s = s.replace(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi, "[url]").replace(
      /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
      "[email]",
    ).replace(
      /\b[A-Za-z0-9._%+-]+\s*(?:\sat\s|\(at\)|\[at\]|\{at\})\s*[A-Za-z0-9-]+(?:\s*(?:\.|\sdot\s|\(dot\)|\[dot\]|\{dot\})\s*[A-Za-z0-9-]+)*?\s*(?:\.|\sdot\s|\(dot\)|\[dot\]|\{dot\})\s*(?:com|net|org|us|gov|edu|io|co|biz|info)\b/gi,
      "[email]",
    ).replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[number]").replace(
      /\b(?:(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)[\s-]+){4,}(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/gi,
      "[phone]",
    ).replace(/(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\b\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/g, "[phone]")
      .replace(/\b\d{10,11}\b/g, "[phone]").replace(
        new RegExp(String.raw`\b\d{3}[-. ]\d{4}\b(?!\s*` + UNIT + ")", "g"),
        "[phone]",
      ).replace(
        /\b((?:license |licence )?plate\s*(?:#|no\.?|number)?\s*)(?:[A-Z]{2}\s)?[A-Z0-9][A-Z0-9 -]{3,7}[A-Z0-9]\b/gi,
        "$1[plate]",
      ).replace(
        /\b(?=[A-Z0-9]{6,8}\b)(?=(?:[A-Z]*\d){2})(?=(?:\d*[A-Z]){2})[A-Z0-9]{6,8}\b/g,
        "[plate]",
      ).replace(
        /\b([A-Z]{3})[ -](\d{3,4})\b/g,
        (m, a) =>
          /^(?:SDR|PVC|DIP|RCP|VCP|CMP|HDPE|ASTM|AWWA|PSI|GPM|CFS|OSHA|CFR|DOT|EPA|ACI|ADA|SCH|ANSI|NFPA|ISO|ACP|CIP|PCC|HMA|ABC)$/
              .test(a)
            ? m
            : "[plate]",
      ).replace(/-?\b\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b/g, "[location]").replace(
        /\bp\.?\s?o\.?\s+box\s+\d+/gi,
        "[address]",
      ).replace(
        /\b((?:at|on|near|corner of|off)\s+(?:the\s+)?)(?:\p{Lu}[\p{L}\p{M}'\u2019.-]*|\d{1,3}(?:st|nd|rd|th))(?:\s+\p{Lu}[\p{L}\p{M}'\u2019.-]*)?\s+(?:and|&|y|\/)\s+(?:\p{Lu}[\p{L}\p{M}'\u2019.-]*|\d{1,3}(?:st|nd|rd|th))(?:\s+\p{Lu}[\p{L}\p{M}'\u2019.-]*)?/gu,
        "$1[street]",
      ).replace(
        /\b((?:at|on|near|off)\s+)\d{1,6}\s+(?:[NSEW]\.?\s+)?\p{Lu}[\p{L}\p{M}'\u2019.-]+(?:\s+\p{Lu}[\p{L}\p{M}'\u2019.-]+){0,2}(?:\s+(?:N|S|E|W|NE|NW|SE|SW)\b\.?)?/gu,
        "$1[address]",
      ).replace(
        new RegExp(
          String.raw`\b\d{1,6}[A-Za-z]?\s+(?!` + UNIT +
            String.raw`)(?:[NSEW]\.?\s+)?(?:[A-Za-z0-9.'\u2019-]+\s+){0,3}` + SFX_CI +
            String.raw`(?:\s+(?:N|S|E|W|NE|NW|SE|SW)\b\.?)?`,
          "gi",
        ),
        "[address]",
      ).replace(
        new RegExp(
          String.raw`\b\d{1,6}[A-Za-z]?\s+(?!` + UNIT +
            String.raw`)(?:[NSEW]\.?\s+)?(?:[A-Za-z0-9.'\u2019-]+\s+){0,3}` + SFX_CAP +
            String.raw`(?:\s+(?:N|S|E|W|NE|NW|SE|SW)\b\.?)?`,
          "g",
        ),
        "[address]",
      ).replace(
        new RegExp(String.raw`\b(?:\d{1,3}(?:st|nd|rd|th)|[A-Z][a-z]+)\s+` + SFX_CI, "gi"),
        (m) => NOT_STREET.has(m.split(/\s+/)[0].toLowerCase()) ? m : "[street]",
      ).replace(
        new RegExp(String.raw`\b(?:\d{1,3}(?:st|nd|rd|th)|[A-Z][a-z]+)\s+` + SFX_CAP, "g"),
        "[street]",
      ).replace(
        /\b(?:hwy|highway|sr|route|rte|county road|cr|fm)\s*-?\s*\d{1,4}\b|\b(?:I|US)-\d{1,3}\b/gi,
        "[street]",
      ).replace(
        /\b(?:job|project|proj|contract|bid|w\.?o\.?|work order|p\.?o\.?|ticket|locate|dig ?alert|811)\s*(?:no\.?|number|num|#)?\s*[:#]?\s*(?=[A-Za-z0-9-]*\d)[A-Za-z0-9][A-Za-z0-9-]{2,}/gi,
        (m) => m.replace(/[:#]?\s*(?=[A-Za-z0-9-]*\d)[A-Za-z0-9][A-Za-z0-9-]{2,}$/, " [job]"),
      ).replace(new RegExp(String.raw`\b\d{2,4}-\d{3,5}\b(?!\s*` + UNIT + ")", "g"), "[job]")
      .replace(/#\s?\d{3,}\b/g, "[job]").replace(/\b[A-Za-z]{0,3}\d{6,}\b/g, "[number]").replace(
        /\b(?:sta\.?\s*)?\d{1,4}\+\d{2}(?:\.\d+)?\b/gi,
        "[station]",
      ).replace(/\b(?:MH|SSMH|SDMH|CB|JB|WV|FH|ARV|VLT)[\s-]?#?\d{1,4}[A-Z]?\b/gi, "[structure]")
      .replace(
        /\b(?:manhole|inlet|vault|catch basin|structure)\s+(?:no\.?\s*|#\s?)?\d{1,4}[A-Z]?\b/gi,
        (m) => m.replace(/\s+(?:no\.?\s*|#\s?)?\d{1,4}[A-Z]?$/, " [structure]"),
      ),
    s = s.replace(
      /(?<![\p{L}\p{M}])(?:\p{Lu}[\p{L}\p{M}&'\u2019.-]*\s+){1,3}(?:Construction|Constructors|Excavating|Excavation|Contracting|Contractors|Paving|Underground|Utilities|Plumbing|Engineering|Builders|Company|Co\.|Corp\.?|Inc\.?|LLC|L\.L\.C\.?|Ltd\.?)(?![\p{L}\p{M}])/gu,
      (m) =>
        /^(?:The|A|An|Our|My|Your|Their|For|With|At|On|Ask|Tell|Call|What|How|Is|Does|Do|Can)\s/
            .test(m)
          ? m.split(/\s+/)[0] + " [company]"
          : "[company]",
    ).replace(
      /(?<![\p{L}\p{M}])([\p{L}\p{M}'\u2019-]+)\s+(?:inc|llc|corp|co\.|excavating|contracting|contractors|constructors)(?![\p{L}\p{M}])/giu,
      (m, w) => COMMON.has(fold(w).replace(/['\u2019]/g, "")) ? m : "[company]",
    ).replace(
      /(?<![\p{L}\p{M}])(for|with|from|by|sub(?:bing)? for)\s+([\p{L}\p{M}'\u2019-]+)\s+(construction|paving|plumbing|engineering|utilities|underground)(?![\p{L}\p{M}])/giu,
      (m, a, w) => COMMON.has(fold(w)) || GENERIC_TRADE.has(fold(w)) ? m : a + " [company]",
    ),
    s = s.replace(
      /(?<![\p{L}\p{M}])(?:Mr|Mrs|Ms|Miss|Dr|Sr|Sra|Srta|Don|Do\u00F1a|Se\u00F1or|Se\u00F1ora)\.?\s+\p{Lu}[\p{L}\p{M}'\u2019-]+/gu,
      "[name]",
    ).replace(
      /(?<![\p{L}\p{M}])([Mm]y name is|[Nn]amed|[Cc]alled|[Tt]his is|[Ss]igned|[Ss]oy|[Mm]e llamo|[Ss]e llama)\s+([\p{L}\p{M}][\p{L}\p{M}'\u2019-]*)/gu,
      (m, a, w) => COMMON.has(fold(w)) || /^\p{Ll}/u.test(w) && known(fold(w)) ? m : a + " [name]",
    );
  const toks = [...s.matchAll(/[\p{L}\p{M}]+(?:['\u2019-][\p{L}\p{M}]+)*/gu)].map((m) => ({
      w: m[0],
      i: m.index,
    })
    ),
    look = (w) => {
      const f = fold(w);
      return {
        plain: f.replace(/['\u2019-]/g, ""),
        poss: f.replace(/['\u2019]s$/, ""),
        parts: f.split("-"),
      };
    },
    isCommon = (w) => {
      const b = look(w);
      return COMMON.has(b.plain) || COMMON.has(b.poss) || CAL.has(b.poss) ||
        APP_WORDS.has(b.poss) || /n['\u2019]t$/i.test(w);
    },
    isUnknown = (w) => {
      if (isCommon(w)) return !1;
      const b = look(w);
      return !known(b.poss) && !known(b.plain) &&
        !(b.parts.length > 1 && b.parts.every((p) => COMMON.has(p) || known(p)));
    },
    gap = (a, z) => /^[\s,]*$/.test(s.slice(a.i + a.w.length, z.i)),
    hits = [];
  toks.forEach((t, k) => {
    if (s[t.i - 1] === "[" && s[t.i + t.w.length] === "]") return;
    const b = look(t.w),
      cap = /^\p{Lu}[\p{Ll}\p{M}]/u.test(t.w),
      allCaps = t.w.length > 1 && t.w === t.w.toUpperCase(),
      next = toks[k + 1] && gap(t, toks[k + 1]) ? look(toks[k + 1].w).plain : "",
      prev = toks[k - 1] && gap(toks[k - 1], t) ? look(toks[k - 1].w).plain : "";
    let name = !1;
    NAME_SET.has(b.poss) || NAME_SET.has(b.plain) || b.parts.some((p) =>
        p.length > 2 && NAME_SET.has(p)
      ) ||
      /^[od]['\u2019][\p{L}\p{M}]{2,}$/iu.test(t.w) && !/^o['\u2019]clock$/i.test(t.w)
      ? name = !0
      : cap
      ? AMBIG_SET.has(b.poss)
        ? name = !sentenceStart(s, t.i) || PERSON_AFTER.has(next) || PERSON_BEFORE.has(prev)
        : name = isUnknown(t.w)
      : allCaps ||
        (name = (isUnknown(t.w) || AMBIG_SET.has(b.poss)) &&
          (PERSON_AFTER.has(next) || PERSON_BEFORE.has(prev))),
      name && hits.push({ i: t.i, n: t.w.length });
  });
  for (const h of hits.reverse()) s = s.slice(0, h.i) + "[name]" + s.slice(h.i + h.n);
  return s = s.replace(/\[name\](?:[\s-]*(?:,|and|y|&)?[\s-]*\[name\])+/g, "[name]").replace(
    /\[company\](?:\s+\[company\])+/g,
    "[company]",
  ).replace(/[ \t]{2,}/g, " ").replace(
    /\s*\n\s*/g,
    `
`,
  ).trim(),
    s.length > max && (s = s.slice(0, max - 1).replace(/\s+\S*$/, "") + "\u2026"),
    s;
}
function sentenceStart(s, off) {
  const before = s.slice(0, off).replace(/[\s"'\u201C\u2018(\u00BF\u00A1-]+$/, "");
  return !before || /[.!?:\n]$/.test(before);
}
const enc = new TextEncoder(),
  b64u = (b) =>
    btoa(String.fromCharCode(...b)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_"),
  unb64u = (s) =>
    Uint8Array.from(
      atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)),
      (c) => c.charCodeAt(0),
    );
let keyP = null, keyFor = "";
async function tokenKey() {
  const env = (k) => {
      const D = globalThis.Deno;
      return D ? D.env.get(k) : globalThis.process?.env?.[k];
    },
    secret = env("AI_FEEDBACK_SECRET") || env("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!secret) throw new Error("no secret");
  return (!keyP || keyFor !== secret) && (keyFor = secret,
    keyP = (async () => {
      const root = await crypto.subtle.importKey(
          "raw",
          enc.encode(secret),
          { name: "HMAC", hash: "SHA-256" },
          !1,
          ["sign"],
        ),
        derived = new Uint8Array(
          await crypto.subtle.sign("HMAC", root, enc.encode("pb-ai-answer-token-v1")),
        );
      return await crypto.subtle.importKey("raw", derived, { name: "HMAC", hash: "SHA-256" }, !1, [
        "sign",
      ]);
    })()),
    keyP;
}
const sig = async (body, uid) =>
    new Uint8Array(
      await crypto.subtle.sign("HMAC", await tokenKey(), enc.encode(body + "." + uid)),
    ),
  TOKEN_TTL_S = 24 * 3600;
async function makeToken(p, uid, now = Date.now()) {
  const body = b64u(
    enc.encode(
      JSON.stringify({
        v: 1,
        i: crypto.randomUUID(),
        e: Math.floor(now / 1e3) + TOKEN_TTL_S,
        ...p,
      }),
    ),
  );
  return body + "." + b64u(await sig(body, uid));
}
async function readToken(tok, uid, now = Date.now()) {
  const m = /^([A-Za-z0-9_-]{20,12000})\.([A-Za-z0-9_-]{43})$/.exec(String(tok || ""));
  if (!m || !uid) return null;
  let want, got;
  try {
    want = await sig(m[1], uid), got = unb64u(m[2]);
  } catch {
    return null;
  }
  if (got.length !== want.length) return null;
  let d = 0;
  for (let i = 0; i < want.length; i++) d |= want[i] ^ got[i];
  if (d !== 0) return null;
  let p;
  try {
    p = JSON.parse(new TextDecoder().decode(unb64u(m[1])));
  } catch {
    return null;
  }
  return !p || p.v !== 1 || typeof p.i != "string" || typeof p.e != "number"
    ? null
    : p.e * 1e3 < now
    ? "expired"
    : p;
}
const asUuid = (s) => /^[0-9a-f-]{36}$/i.test(s) ? s : null;
async function putGap(admin, uid, row) {
  try {
    const { data, error } = await admin.rpc("pb_ai_gap_put", {
      p_uid: uid,
      p_source: row.source,
      p_reason: row.reason,
      p_question: row.question,
      p_topic: row.topic || {},
      p_answer: row.answer,
      p_note: row.note,
      p_level: row.level,
      p_kb_version: row.kb_version || null,
      p_ref: row.ref ? asUuid(row.ref) : null,
    });
    return error || !data
      ? { ok: !1, error: "unavailable" }
      : data.ok
      ? { ok: !0, dup: !!data.dup }
      : { ok: !1, error: String(data.error || "refused") };
  } catch {
    return { ok: !1, error: "unavailable" };
  }
}
async function feedback(body, uid, admin, known = () => !1) {
  const tok = String(body?.answer_id || "");
  if (!tok || tok.length > 12100) return [400, { error: "bad_request", message: "Bad request." }];
  const p = await readToken(tok, uid);
  if (p === "expired") return [410, { error: "expired", message: "Too old to send." }];
  if (!p) return [403, { error: "not_yours", message: "Couldn\u2019t send that." }];
  const data = p.m === "data",
    sx = p.s && typeof p.s == "object" ? p.s : {},
    arr = (x) => Array.isArray(x) ? x.slice(0, 60).map((v) => String(v ?? "").slice(0, 120)) : [],
    note = data || body?.note == null ? "" : scrub(String(body.note).slice(0, 400), 200, known, {
      company: arr(sx.c),
      jobs: arr(sx.j),
      places: arr(sx.p),
    }),
    r = await putGap(admin, uid, {
      source: "not_right",
      reason: data ? "not_right_data" : "not_right",
      question: data ? null : p.q || null,
      answer: data || p.m === "docs" ? null : p.x || null,
      note: note || null,
      topic: data ? {} : p.t || {},
      level: p.l,
      kb_version: p.k,
      ref: p.i,
    });
  return console.log(
    JSON.stringify({
      ai: "gap",
      source: "not_right",
      ok: r.ok,
      dup: !!r.dup,
      error: r.error || null,
    }),
  ),
    r.ok
      ? [200, { ok: !0 }]
      : r.error === "rate"
      ? [429, { error: "rate", message: "That\u2019s the limit for today." }]
      : [503, { error: "unavailable", message: "Couldn\u2019t send. Try again." }];
}
async function gapsSummary(admin, days) {
  try {
    const { data, error } = await admin.rpc("pb_ai_gaps_summary", {
      p_days: Math.min(Math.max(Math.floor(days) || 30, 1), 365),
    });
    return error || !data?.ok
      ? {
        ok: !1,
        status: 503,
        error: "gaps_unavailable",
        message: "Couldn\u2019t read the gap log. Is sql/97 applied?",
      }
      : data;
  } catch {
    return {
      ok: !1,
      status: 503,
      error: "gaps_unavailable",
      message: "Couldn\u2019t read the gap log.",
    };
  }
}
function later(p) {
  const er = globalThis.EdgeRuntime;
  if (er && typeof er.waitUntil == "function") {
    try {
      return er.waitUntil(p), null;
    } catch {}
  }
  return p;
}
const escRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  JOBNO_RX =
    /\b\d{2,4}-\d{3,5}\b(?!\s*(?:ft|feet|foot|inch|inches|lf|%|psi|yd|yds|yards?|cy|lbs?|tons?|hours?|hrs?|days?|minutes?|mins?|gal|gallons?)\b)/i;
function namesOwnJob(q, jobs) {
  return JOBNO_RX.test(q) ? !0 : jobs.some((j) => {
    const id = String(j?.[0] ?? "").trim();
    return id.length >= 2 &&
      new RegExp("(?<![A-Za-z0-9])" + escRx(id) + "(?![A-Za-z0-9])", "i").test(q);
  });
}
async function gapStep(g) {
  const cited = g.sources.map((x) => String(x?.kind || "")),
    followUp = isFollowUp(g.q, g.history || []),
    reason = gapReason({
      q: g.q,
      level: g.level,
      stats: g.stats,
      hits: g.hits,
      text: g.text,
      cited,
      data: g.data,
      replacedAll: g.replacedAll,
      toolOk: g.toolOk,
      followUp,
    }),
    logQ = followUp ? String(g.history[0].q || "").slice(0, 300) + " -> " + g.q : g.q,
    known = kbKnown(g.index),
    extra = {
      company: [g.company],
      jobs: [g.curJob, ...g.jobs.flatMap((j) => [j?.[0], j?.[1]])].map((x) => String(x ?? "")),
      places: g.jobs.map((j) => String(j?.[2] ?? "").replace(/,?\s*[A-Z]{2}\s*$/, "")),
    },
    topic = topicHint(g.stats, g.hits);
  let token = null;
  if (!g.replacedAll) {
    const m = g.data ? "data" : cited.includes("doc") || g.docsInPrompt ? "docs" : "kb",
      cap = (xs) =>
        [...new Set(xs.map((x) => x.trim().slice(0, 120)).filter((x) => x.length >= 2))].slice(
          0,
          60,
        ),
      sx = { c: cap(extra.company || []), j: cap(extra.jobs || []), p: cap(extra.places || []) };
    try {
      token = await makeToken({
        m,
        l: g.level,
        k: g.kbv,
        q: m === "data" ? "" : scrub(logQ, 500, known, extra),
        x: m === "kb" ? scrub(g.text, 600, known, extra) : "",
        t: m === "data" ? {} : topic,
        s: sx,
      }, g.uid);
    } catch {
      token = null;
    }
  }
  const pending = reason
    ? putGap(g.admin, g.uid, {
      source: "auto",
      reason,
      question: scrub(logQ, 500, known, extra),
      topic,
      answer: null,
      note: null,
      level: g.level,
      kb_version: g.kbv,
    }).then((r) =>
      console.log(
        JSON.stringify({
          ai: "gap",
          source: "auto",
          reason,
          ok: r.ok,
          dup: !!r.dup,
          error: r.error || null,
        }),
      )
    )
    : null;
  return { token, reason, pending };
}
export {
  feedback,
  GAP_LIBS,
  GAP_PER_TERM,
  gapReason,
  gapsSummary,
  gapStep,
  isFollowUp,
  isSpanish,
  kbKnown,
  later,
  makeToken,
  namesOwnJob,
  NOT_IN_KB_RX,
  putGap,
  readToken,
  REFUSAL_RX,
  scrub,
  SHORT_REPLY_WORDS,
  TOKEN_TTL_S,
  topicHint,
  weakRetrieval,
};
