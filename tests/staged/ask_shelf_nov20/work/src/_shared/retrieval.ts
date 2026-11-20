const STOP = new Set(
    "a an the and or of to in on at for is are was were be been do does did what whats how why when where which who whom can could i you my we it its this that these those with from by if then than vs me your our us should would will about there here need needs get got use used using mean means tell explain much many any some all as into out up so not no yes just also please thanks thank hey hi im ive dont doesnt isnt arent whats hows ok okay"
      .split(" "),
  ),
  PHRASES = [
    [/\btrench(?:ing)? (?:box(?:es)?|shields?)\b/g, "trenchbox"],
    [/\bcompetent persons?\b/g, "competentperson"],
    [/\bqualified persons?\b/g, "qualifiedperson"],
    [/\bregistered professional engineers?\b/g, "professionalengineer"],
    [/\bpermit[- ]required confined spaces?\b/g, "permitspace confinedspace"],
    [/\bconfined spaces?\b/g, "confinedspace"],
    [/\bentry supervisors?\b/g, "entrysupervisor"],
    [/\bcave[- ]?ins?\b/g, "cavein"],
    [/\bflow ?lines?\b/g, "flowline"],
    [/\bcut ?sheets?\b/g, "cutsheet"],
    [/\bgrade ?sheets?\b/g, "cutsheet"],
    [/\bprotective systems?\b/g, "protectivesystem"],
    [/\bsupport systems?\b/g, "supportsystem"],
    [/\bhydrogen sulfide\b/g, "h2s"],
    [/\bcarbon monoxide\b/g, "co_gas"],
    [/\blower (?:explosive|flammable) limit\b/g, "lel"],
    [/\bductile iron\b/g, "dip"],
    [/\breinforced concrete pipe\b/g, "rcp"],
    [/\bvitrified clay\b/g, "vcp"],
    [/\bthrust blocks?\b/g, "thrustblock"],
    [/\bdig ?alert\b/g, "digalert"],
    [/\bone[- ]call\b/g, "digalert"],
    [/\btraffic control\b/g, "trafficcontrol"],
    [/\bdaily reports?\b/g, "dailyreport"],
    [/\bfield tickets?\b/g, "fieldticket"],
    [/\bdelivery tickets?\b/g, "fieldticket"],
    [/\bcost codes?\b/g, "costcode"],
    [/\bman[- ]?hours?\b/g, "manhour"],
    [/\btype (a|b|c) soils?\b/g, "type$1soil"],
    [/\bstable rock\b/g, "stablerock"],
    [/\bspoil piles?\b/g, "spoil"],
    [/\bjob plan\b/g, "jobplan"],
    [/\bquick run\b/g, "quickrun"],
    [/\bnew run\b/g, "newrun"],
    [/\bend run\b/g, "endrun"],
  ],
  IRREGULAR = {
    kept: "keep",
    dug: "dig",
    laid: "lay",
    set: "set",
    cut: "cut",
    ran: "run",
    went: "go",
    held: "hold",
    built: "build",
    fell: "fall",
    fallen: "fall",
    worn: "wear",
    shut: "shut",
    bent: "bend",
    deeper: "deep",
    deepest: "deep",
    wider: "wide",
    widest: "wide",
  };
function stem(w) {
  if (IRREGULAR[w]) return IRREGULAR[w];
  if (w.length <= 3 || /\d/.test(w) || w.includes("_")) return w;
  let s = w;
  s.endsWith("sses") || /(ch|sh|x|z)es$/.test(s)
    ? s = s.slice(0, -2)
    : s.endsWith("ies") && s.length > 4
    ? s = s.slice(0, -3) + "y"
    : s.endsWith("ss") ||
      s.endsWith("s") && !s.endsWith("us") && !s.endsWith("is") && (s = s.slice(0, -1));
  const vowel = (x) => /[aeiouy]/.test(x);
  s.endsWith("eed")
    ? s.length > 5 && (s = s.slice(0, -1))
    : s.endsWith("ing") && vowel(s.slice(0, -3)) && s.length > 5
    ? s = fix(s.slice(0, -3))
    : s.endsWith("ed") && vowel(s.slice(0, -2)) && s.length > 4 && (s = fix(s.slice(0, -2)));
  for (
    const [suf, rep] of [
      ["ational", "ate"],
      ["ization", "ize"],
      ["fulness", "ful"],
      ["iveness", "ive"],
      ["ation", "ate"],
      ["ments", "ment"],
      ["ment", ""],
      ["ness", ""],
      ["ally", "al"],
      ["ly", ""],
    ]
  ) {
    if (s.endsWith(suf) && s.length - suf.length >= 4) {
      s = s.slice(0, -suf.length) + rep;
      break;
    }
  }
  return s;
  function fix(x) {
    return /(at|bl|iz)$/.test(x)
      ? x + "e"
      : /([^aeiouylsz])\1$/.test(x)
      ? x.slice(0, -1)
      : x.length <= 4 && /[^aeiou][aeiou][^aeiouwxy]$/.test(x)
      ? x + "e"
      : x;
  }
}
const SYN_GROUPS = [
    [.8, ["invert", "flowline", "fl", "ie", "inv"]],
    [.8, ["manhole", "mh"]],
    [.7, ["trenchbox", "shield"]],
    [.5, ["shore", "shoring", "supportsystem", "hydraulic"]],
    [.4, ["protectivesystem", "shoring", "trenchbox", "slope", "bench"]],
    [.5, ["trench", "excavation", "excavate", "ditch"]],
    [.7, ["cavein", "collapse"]],
    [.6, ["confinedspace", "permitspace"]],
    [.5, ["atmosphere", "atmospheric", "air", "gas"]],
    [.9, ["o2", "oxygen"]],
    [.9, ["lel", "lfl", "flammable", "combustible"]],
    [.9, ["co_gas", "co"]],
    [.6, ["grade", "slope", "fall"]],
    [.6, ["bedding", "embedment", "haunch"]],
    [.6, ["compaction", "compact", "density", "proctor"]],
    [.6, ["dewater", "wellpoint"]],
    [.7, ["stake", "hub", "lath"]],
    [.8, ["station", "sta"]],
    [.6, ["offset", "os"]],
    [.7, ["delay", "standby"]],
    [.8, ["dip", "di"]],
    [.6, ["hdpe", "poly", "polyethylene"]],
    [.6, ["pvc", "c900", "sdr35", "sdr"]],
    [.7, ["digalert", "811", "locate", "usa"]],
    [.7, ["ladder", "egress"]],
    [.7, ["excavator", "backhoe", "trackhoe", "hoe"]],
    [.6, ["compactor", "wacker", "jumpingjack", "roller"]],
    [.6, ["rigging", "sling", "lift", "crane", "hoist"]],
    [.6, ["trafficcontrol", "flagger", "mutcd"]],
    [.7, ["production", "footage", "lf"]],
    [.5, ["type_asoil", "type_bsoil", "type_csoil", "soil"]],
    [.7, ["spoil", "excavated", "pile"]],
    [.5, ["spoil", "material"]],
    [.9, ["deep", "depth"]],
    [.6, ["edge", "lip"]],
    [.8, ["separation", "separate", "clearance", "spacing"]],
    [.7, ["horizontal", "parallel", "lateral"]],
    [.6, ["vertical", "crossing", "cross"]],
    [.8, ["sleeve", "casing", "encasement", "encase", "encased"]],
    [.8, ["64572", "title22", "ccr", "waterworks", "ddw"]],
    [.6, ["sewer", "sanitary", "wastewater"]],
    [.5, ["water", "potable", "waterline", "watermain", "drinking"]],
    [.6, ["purveyor", "supplier", "utility"]],
  ],
  SYN = new Map();
for (const [w, g] of SYN_GROUPS) {
  const keys = g.map(norm1);
  for (const a of keys) {
    for (const b of keys) {
      if (a !== b) {
        const list = SYN.get(a) || [], at = list.find((x) => x[0] === b);
        at ? at[1] = Math.max(at[1], w) : list.push([b, w]), SYN.set(a, list);
      }
    }
  }
}
function norm1(w) {
  return stem(w.replace(/^type([abc])soil$/, "type_$1soil"));
}
function tokenize(text) {
  let t = String(text || "").toLowerCase().replace(/[\u2018’\u02bc`]/g, "'").replace(
    /[\u201c\u201d]/g,
    '"',
  ).replace(
    /[\u2010-\u2015]/g,
    "-",
  ).replace(/(\d)\s*(?:'|ft\b|feet\b|foot\b)/g, "$1 ft ").replace(
    /(\d)\s*(?:"|in\b|inch(?:es)?\b)/g,
    "$1 in ",
  );
  for (const [rx2, rep] of PHRASES) t = t.replace(rx2, rep);
  t = t.replace(/\btype([abc])soil\b/g, "type_$1soil");
  const out = [], rx = /(\d+\+\d+(?:\.\d+)?)|(\d{4}\.\d+[a-z]?)|(\d+\/[a-z]{1,3})|([a-z0-9_]+)/g;
  let m;
  for (; m = rx.exec(t);) {
    if (m[1]) {
      out.push(m[1]);
      continue;
    }
    if (m[2]) {
      out.push(m[2]), out.push(m[2].split(".")[0]);
      continue;
    }
    if (m[3]) {
      out.push(m[3]), out.push(m[3].split("/")[1]);
      continue;
    }
    const w = m[4];
    STOP.has(w) || /^\d+$/.test(w) && w.length < 3 && w !== "811" || w.length < 2 ||
      out.push(stem(w));
  }
  return out;
}
const REG_RX =
    /\b(osha|cfr|1926|1910|regulation|regs?|standard|required|require|requirement|rule|rules|law|legal|compliance|comply|citation|cited|must|shall|allowed|competent person|subpart|permit[- ]required|appendix|maximum allowable|how deep before|feet deep|ft deep)\b/i,
  RULEY_RX =
    /\b(have to|has to|need to|needs to|need a|need an|supposed to|minimum|maximum|max|min|how far|how deep|how close|how often|how long|how high|before (we|i|you) (need|have)|at least|no more than|allowed)\b/i,
  SAFETY_RX =
    /\b(trench\w*|shor(e|ing)|excavat\w*|cave[- ]?ins?|confined|permits?|entr(y|ant|ants)|attendants?|atmospher\w*|lel|h2s|oxygen|o2|gas(es)?|ventilat\w*|rescue|competent person|protective system|benching|sloping|trench box|shield|spoils?|ladders?|egress|ppe|hard hat|harness|fall protection|silica|noise|lockout|crane|rigging|sling|traffic|flagger|barricade|first aid)\b/i;
function isSafetyTopic(q) {
  return SAFETY_RX.test(String(q || ""));
}
function isRegulatory(q) {
  const t = String(q || "");
  return REG_RX.test(t) || RULEY_RX.test(t) && SAFETY_RX.test(t);
}
const INJURY_RX =
  /\b(hurt\w*|injur\w*|bleed\w*|blood\w*|cut|cuts|burn\w*|broke\w*|fractur\w*|sprain\w*|pass(ed|es|ing)? out|unconscious|faint\w*|collaps\w*|buried|pinned|crush\w*|heat (stroke|exhaustion)|cramp\w*|hypotherm\w*|frostbit\w*|shock\w*|cpr|aed|chok\w*|sting\w*|bite|bitten|bites|snake\w*|spider\w*|allerg\w*|eyes?|seizure\w*|stroke|heart attack|first[- ]aid|911|ambulance\w*|poison\w*|herid\w*|sangr\w*|quemad\w*|desmay\w*|atrapad\w*|picadura\w*|mordedura\w*|ojos?|primeros auxilios|symptom\w*|sick|dizz\w*|nause\w*|vomit\w*|overcome|exposed|exposure|h2s|hydrogen sulfide|carbon monoxide|co poisoning|electrocut\w*|shocked|lightning|struck|sintoma\w*|mareo\w*|intoxica\w*|electrocuta\w*)\b/;
function isInjuryQuestion(q) {
  return INJURY_RX.test(
    String(q || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
  );
}
const HINTS = [[
    /^(?=.*\b(how deep|depth|deep|feet|ft)\b)(?=.*\b(trench|excavat|ditch|hole))(?=.*\b(protect|shor|box|shield|slop|bench|need|require))/i,
    ["cavein", "stablerock", "protectivesystem", "examination"],
    1,
  ], [
    /^(?=.*\b(how far|distance|back from|setback|close to)\b)(?=.*\b(spoil|pile|dirt|material|equipment))/i,
    ["edge", "excavate", "material"],
    .5,
  ], [
    /^(?=.*\b(how often|every day|daily|each shift|after (a )?rain))(?=.*\b(inspect|check|look))/i,
    ["inspection", "competentperson", "shift"],
    .5,
  ], [
    /^(?=.*\b(air|gas|atmosphere|monitor|sniffer|test))(?=.*\b(how often|interval|continuous|before entry))/i,
    ["atmospher", "test", "monitor", "continuous"],
    .5,
  ], [
    /^(?=.*\b(water|potable|waterline|water ?main|domestic|reclaimed|recycled|purple)\b)(?=.*\b(sewer|sanitary|storm|wastewater|ss|sd)\b)(?=.*\b(separat\w*|clearance|apart|distance|far|close|parallel|cross\w*|over|under|above|below|sleeve|casing|encase\w*|10 ?ft|1 ?ft|ten feet|one foot|title 22|64572|ccr|waterworks)\b)/i,
    ["separation", "horizontal", "vertical", "crossing", "encasement", "64572", "waterworks"],
    .6,
  ], [
    /^(?=.*\b(horizontal|vertical)\b)(?=.*\b(separat\w*|clearance|distance))/i,
    ["separation", "water", "sewer", "crossing", "64572"],
    .6,
  ], [
    /^(?=.*\b(air|gas|atmospher\w*|o2|oxygen|lel|lfl|h2s|co|ppm|meter|monitor)\b)(?=.*\b(limits?|levels?|thresholds?|acceptable|allowed|permissible|pel|read|reading|readings|what should)\b)/i,
    ["cal", "title", "federal", "permissible", "limit", "1926.1204", "5157"],
    .5,
  ]],
  INTENT = new Set(["osha", "cfr", "say", "said"]),
  IDF_REF = Number(globalThis.__pbIdfRef) || 4e3,
  STATS = new WeakMap();
function libStats(ix) {
  let st = STATS.get(ix);
  if (!st) {
    const n = {}, len = {};
    ix.docs.forEach((row, d) => {
      const l = String(row[1]);
      n[l] = (n[l] || 0) + 1, len[l] = (len[l] || 0) + ix.dl[d];
    });
    const avgdl = {};
    for (const l in n) avgdl[l] = len[l] / n[l] || 1;
    st = { n, avgdl }, STATS.set(ix, st);
  }
  return st;
}
function search(ix, query, o = {}) {
  const k = o.k ?? 6,
    k1 = 1.2,
    b = .75,
    reg = o.regulatory ?? isRegulatory(query),
    safety = isSafetyTopic(query),
    injury = isInjuryQuestion(query);
  let qt = tokenize(query);
  if (reg) {
    const rest = qt.filter((t) => !INTENT.has(t));
    rest.length && (qt = rest);
  }
  if (o.stats && (o.stats.best = {}, o.stats.cover = 0, o.stats.nTyped = 0), !qt.length) return [];
  const w = new Map();
  for (const t of qt) w.set(t, 1);
  for (const t of qt) {
    for (const [s, sw] of SYN.get(t) || []) {
      (!w.has(s) || w.get(s) < sw) && w.get(s) !== 1 && w.set(s, sw);
    }
  }
  for (const [rx, terms, hw] of HINTS) {
    if (rx.test(query)) {
      for (const h of terms.map(stem)) (!w.has(h) || w.get(h) < hw) && w.set(h, hw);
    }
  }
  const scores = new Map(), matched = new Map(), st = libStats(ix);
  for (const [term, qw] of w) {
    const p = ix.t[term];
    if (!p) continue;
    const dfLib = {};
    for (let i = 1; i < p.length; i += 2) {
      const l = ix.docs[p[i]][1];
      dfLib[l] = (dfLib[l] || 0) + 1;
    }
    const idfLib = {};
    for (const l in dfLib) {
      idfLib[l] = Math.log(1 + Math.max(0, IDF_REF - dfLib[l]) / (dfLib[l] + .5));
    }
    for (let i = 1; i < p.length; i += 2) {
      const d = p[i],
        tf = p[i + 1],
        l = ix.docs[d][1],
        s = idfLib[l] * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * ix.dl[d] / st.avgdl[l])) * qw;
      scores.set(d, (scores.get(d) || 0) + s),
        qw === 1 && matched.set(d, (matched.get(d) || 0) + 1);
    }
  }
  const typedSet = new Set(qt),
    nTyped = typedSet.size,
    topic = (o.topicBoost || []).map((x) => x.toLowerCase()),
    hits = [];
  for (const [d, s0] of scores) {
    const row = ix.docs[d], lib = row[1], roles = String(row[8] || "");
    if (o.lib && lib !== o.lib || roles && o.level && !roles.split(",").includes(o.level)) continue;
    let s = s0 * (.6 + .4 * ((matched.get(d) || 0) / nTyped));
    lib === "osha" && (s *= reg ? 1.6 : safety ? 1.15 : .85);
    const tt = new Set(row[9] !== void 0 ? String(row[9]).split(" ") : tokenize(String(row[2])));
    let inTitle = 0;
    for (const q of typedSet) {
      (tt.has(q) || (SYN.get(q) || []).some(([x, xw]) => xw >= .7 && tt.has(x))) && inTitle++;
    }
    s *= 1 + .5 * (inTitle / nTyped);
    const conf = String(row[7] || "");
    conf === "low" && (s *= .8),
      !injury && String(row[3]).trim().toLowerCase() === "first aid" && (s *= .5),
      topic.length && topic.some((t) =>
        String(row[3]).toLowerCase().includes(t) || String(row[2]).toLowerCase().includes(t)
      ) && (s *= 1.3),
      hits.push({
        doc: d,
        id: row[0],
        lib,
        title: row[2],
        topic: row[3],
        text: row[4],
        source: row[5],
        url: row[6] || "",
        conf,
        score: s,
        verbatim: lib === "osha",
        state: row[10] || "",
      });
  }
  if (hits.sort((a, b2) => b2.score - a.score || a.doc - b2.doc), o.stats) {
    o.stats.nTyped = nTyped,
      o.stats.cover = hits.length ? (matched.get(hits[0].doc) || 0) / nTyped : 0;
    for (const h of hits) h.lib in o.stats.best || (o.stats.best[h.lib] = h.score);
  }
  const out = [], perTitle = new Map();
  let chars = 0;
  for (const h of hits) {
    const n = perTitle.get(h.title) || 0;
    if (
      !(n >= 2) && !(o.maxChars && chars + h.text.length > o.maxChars && out.length) &&
      (perTitle.set(h.title, n + 1), out.push(h), chars += h.text.length, out.length >= k)
    ) break;
  }
  if (reg && !o.lib && !out.some((h) => h.lib === "osha")) {
    const best = hits.find((h) => h.lib === "osha");
    best && (out.length >= k && out.pop(), out.push(best));
  }
  return out;
}
function mergeExcerpts(phone, hits, maxChars = 9e3) {
  const out = [];
  let chars = 0;
  const seen = new Set();
  for (const p of (phone || []).slice(0, 5)) {
    const text = String(p.text || "").replace(/\s+/g, " ").slice(0, 900);
    text &&
      (out.push({
        n: out.length + 1,
        kind: "app_page",
        title: String(p.title || p.page || "Education page").slice(0, 160),
        text,
        page: p.page,
        caution: p.caution,
        article: p.article,
        anchor: p.anchor,
      }),
        seen.add(String(p.title || "").toLowerCase().trim()),
        chars += text.length);
  }
  for (const h of hits) {
    if (h.lib === "app" && seen.has(h.title.toLowerCase().trim())) continue;
    const text = h.text.length > 1800 ? h.text.slice(0, 1800) + " \u2026" : h.text;
    chars + text.length > maxChars && out.length ||
      (out.push({
        n: out.length + 1,
        kind: "kb",
        title: h.title,
        text,
        lib: h.lib,
        source: h.source,
        url: h.url,
        verbatim: h.verbatim,
        id: h.id,
      }),
        chars += text.length);
  }
  return out;
}
function excerptBlock(ex) {
  return ex.length
    ? ex.map((x) => {
      const tag = x.kind === "app_page"
        ? `app page: ${x.page || x.title}`
        : x.verbatim
        ? `OSHA VERBATIM: ${x.source}`
        : `${x.lib} library: ${x.source}`;
      return `[${x.n}] (${tag}) ${x.title}: ${x.text}${
        x.caution ? " (page note: " + x.caution + ")" : ""
      }`;
    }).join(`
`)
    : "(no excerpts matched this question)";
}
function buildIndex(byLib, built = new Date().toISOString()) {
  const problems = [],
    docs = [],
    dl = [],
    post = new Map(),
    ids = new Set(),
    roleOk = new Set(["individual", "pipelayer", "foreman", "office"]);
  for (const lib of Object.keys(byLib).sort()) {
    for (const c of byLib[lib]) {
      if (
        !c || typeof c.id != "string" || !c.id || typeof c.text != "string" || !c.text.trim() ||
        typeof c.title != "string"
      ) {
        problems.push(`${lib}: bad chunk ${JSON.stringify(c && c.id)}`);
        continue;
      }
      if (ids.has(c.id)) {
        problems.push(`${lib}: duplicate id ${c.id}`);
        continue;
      }
      ids.add(c.id);
      const norm = (r) =>
          r === "super" || r === "pm" || r === "company" || r === "manager" ? "office" : r,
        raw = Array.isArray(c.roles) ? c.roles.map((r) => norm(String(r))) : [],
        roles = [...new Set(raw.filter((r) => roleOk.has(r)))];
      raw.length !== raw.filter((r) => roleOk.has(r)).length &&
        problems.push(`${lib}: ${c.id} unknown role in ${JSON.stringify(c.roles)}`);
      const d = docs.length;
      docs.push([
        c.id,
        lib,
        c.title,
        c.topic || "",
        c.text,
        c.source || "",
        c.url || "",
        c.confidence || "",
        roles.join(","),
        [...new Set(tokenize(c.title))].join(" "),
        typeof c.state == "string" ? c.state.trim().toUpperCase().slice(0, 40) : "",
      ]);
      const toks = [
        ...tokenize(c.title),
        ...tokenize(c.title),
        ...tokenize(c.topic || ""),
        ...tokenize(c.text),
      ];
      dl.push(toks.length);
      const tf = new Map();
      for (const t2 of toks) tf.set(t2, (tf.get(t2) || 0) + 1);
      for (const [t2, n] of tf) {
        const p = post.get(t2) || [];
        p.push(d, n), post.set(t2, p);
      }
    }
  }
  const t = {};
  for (const [term, p] of post) t[term] = [p.length / 2, ...p];
  const N = docs.length, avgdl = N ? dl.reduce((a, x) => a + x, 0) / N : 1;
  return {
    index: { v: 1, built, libs: Object.keys(byLib).sort(), N, avgdl, docs, dl, t },
    problems,
  };
}
const UNJOIN = {
  trenchbox: "trench box",
  competentperson: "competent person",
  qualifiedperson: "qualified person",
  professionalengineer: "professional engineer",
  permitspace: "permit space",
  confinedspace: "confined space",
  entrysupervisor: "entry supervisor",
  cavein: "cave",
  flowline: "flowline",
  cutsheet: "cutsheet",
  protectivesystem: "protective system",
  supportsystem: "support system",
  co_gas: "carbon monoxide",
  thrustblock: "thrust block",
  digalert: "locate 811",
  trafficcontrol: "traffic control",
  dailyreport: "daily report",
  fieldticket: "ticket",
  costcode: "cost code",
  manhour: "man hour",
  type_asoil: "type a soil",
  type_bsoil: "type b soil",
  type_csoil: "type c soil",
  stablerock: "stable rock",
  jobplan: "job plan",
  quickrun: "quick run",
  newrun: "new run",
  endrun: "end run",
};
function queryGroups(q, maxGroups = 12) {
  const out = [], seen = new Set();
  for (const t of tokenize(q)) {
    if (seen.has(t)) continue;
    seen.add(t);
    const words = [t, ...(SYN.get(t) || []).filter(([, w]) => w >= .7).map(([s]) => s)].map((w) =>
      UNJOIN[w] || w
    ).join(" ").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) =>
      w.length >= 2 && !STOP.has(w)
    );
    if (
      words.length && out.push([...new Set(words)].slice(0, 6).join(" ")), out.length >= maxGroups
    ) break;
  }
  return out;
}
function areaWords(q) {
  return [
    ...new Set(
      String(q || "").toLowerCase().replace(/[^a-z ]+/g, " ").split(/\s+/).filter((w) =>
        w.length >= 3 && !STOP.has(w)
      ),
    ),
  ].slice(0, 20);
}
export {
  areaWords,
  buildIndex,
  excerptBlock,
  isInjuryQuestion,
  isRegulatory,
  isSafetyTopic,
  mergeExcerpts,
  queryGroups,
  search,
  stem,
  tokenize,
};
