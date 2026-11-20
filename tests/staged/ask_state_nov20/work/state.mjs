const US_STATES = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming" };
const CODES = Object.keys(US_STATES);
const BY_LEN = CODES.slice().sort((a, b) => US_STATES[b].length - US_STATES[a].length);
const NAME_RE = new RegExp("\\b(" + BY_LEN.map((c) => US_STATES[c]).join("|") + ")\\b", "g");
const NAME_RE_I = new RegExp(NAME_RE.source, "gi");
const CODE_OF = Object.fromEntries(CODES.map((c) => [US_STATES[c].toLowerCase(), c]));
const okState = (c) => typeof c === "string" && Object.prototype.hasOwnProperty.call(US_STATES, c);
const NOT_A_STATE = /\bWashington,? D\.?C\.?|\b(Mississippi|Missouri|Ohio|Colorado|Delaware|Arkansas|Tennessee|Illinois|Wisconsin|Connecticut|Kansas|Iowa|Minnesota|Columbia|Hudson) (River|Valley|Basin)\b|\bKansas City\b|\bNew York City\b|\bTen States\b|\bWashington (Street|Avenue|Ave|St|Blvd|County)\b/g;
const scrub = (t, keepDC) => String(t || "").replace(NOT_A_STATE, (m) => keepDC && /^Washington/.test(m) && /D\.?C/.test(m) ? "District of Columbia" : " ");
function statesNamed(text, anyCase) {
  const out = [], t = scrub(text, true);
  for (const m of t.matchAll(anyCase ? NAME_RE_I : NAME_RE)) {
    const c = CODE_OF[m[1].toLowerCase()];
    c && !out.includes(c) && out.push(c);
  }
  return out;
}
function questionStates(q) {
  const t = String(q || ""), out = statesNamed(t, true);
  for (const m of t.matchAll(/(?:,\s*|\b(?:in|for|from)\s+)([A-Z]{2})\b(?!\s*[A-Z]{2,})/g)) okState(m[1]) && !out.includes(m[1]) && out.push(m[1]);
  return out;
}
const CUES = [
  ["CA", /\bCal\/OSHA\b|\bGreenbook\b|\bDigAlert\b|\bCaltrans Standard Specifications\b/],
  ["MI", /\bMIOSHA\b/]
];
const ID_RULES = [/^dig-([a-z]{2})$/, /^plan-([a-z]{2})-/, /^emp-state-([a-z]{2})-/, /^emp-([a-z]{2})-/, /^brk-([a-z]{2})$/, /^st-([a-z]{2})$/, /^(ca)-/];
function chunkStates(h) {
  const ex = String(h?.state || "").trim().toUpperCase();
  if (ex) return ex === "US" || ex === "ALL" ? [] : ex.split(/[\s,]+/).filter(okState);
  const id = String(h?.id || ""), title = String(h?.title || ""), topic = String(h?.topic || "");
  for (const r of ID_RULES) {
    const m = id.match(r), c = m && m[1].toUpperCase();
    if (c && okState(c)) return [c];
  }
  const inTopic = statesNamed(topic);
  if (inTopic.length > 2) return [];
  const inTitle = statesNamed(title);
  if (inTopic.length) return inTitle.length && inTitle.length <= 2 ? [.../* @__PURE__ */ new Set([...inTopic, ...inTitle])] : inTopic;
  for (const [c, re] of CUES) if (re.test(topic)) return [c];
  const lead = scrub(title, true).replace(/^[\s"'(\[]+/, "");
  for (const c of BY_LEN) if (lead.startsWith(US_STATES[c]) && !/^[a-z]/.test(lead.slice(US_STATES[c].length))) {
    const rest = lead.slice(US_STATES[c].length);
    if (/^\s*(and|,|\/|&)\s/.test(rest)) {
      const two = statesNamed(lead.slice(0, 60));
      return two.length <= 2 ? two : [];
    }
    if (/^\s+to\s/.test(rest)) return [];
    return [c];
  }
  for (const [c, re] of CUES) {
    const m = lead.match(re);
    if (m && m.index === 0) return [c];
  }
  return [];
}
function keepForState(h, jobState, qStates) {
  const cs = chunkStates(h);
  if (!cs.length) return true;
  if (jobState && cs.includes(jobState)) return true;
  return (qStates || []).some((c) => cs.includes(c));
}
const tenStatesOnly = (h, jobState, q) => jobState === "CA" && /\bTen States\b/i.test(`${h?.title || ""} ${h?.topic || ""} ${h?.source || ""}`) && !/ten states/i.test(String(q || ""));
function resolveState(o) {
  const q = questionStates(o?.question);
  if (q.length === 1) return { code: q[0], how: "question", named: q };
  const app = String(o?.appState || "").toUpperCase(), ah = String(o?.appHow || "");
  if (okState(app) && ah !== "default") return { code: app, how: ah === "company" ? "company" : "job", named: q };
  if (okState(o?.addressState)) return { code: o.addressState, how: "job", named: q };
  if (okState(o?.companyState)) return { code: o.companyState, how: "company", named: q };
  for (const t of o?.earlier || []) {
    const e = questionStates(t);
    if (e.length === 1) return { code: e[0], how: "conversation", named: q };
  }
  if (okState(o?.majorityState)) return { code: o.majorityState, how: "company_jobs", named: q };
  return { code: null, how: q.length > 1 ? "question_many" : "unknown", named: q };
}
function addressState(a) {
  let t = String(a || "").replace(/\s+/g, " ").replace(/,?\s*(u\.?s\.?a?\.?|united states( of america)?)$/i, "").trim();
  if (!t) return null;
  const m = t.match(/(?:^|[\s,])([A-Za-z]{2})\.?,?(?:\s+\d{5}(?:-\d{4})?)?$/);
  if (m && okState(m[1].toUpperCase()) && (m[1] === m[1].toUpperCase() || /,\s*[A-Za-z]{2}\.?,?(\s+\d{5}(-\d{4})?)?$/.test(t))) return m[1].toUpperCase();
  t = t.replace(/,?\s*\d{5}(?:-\d{4})?$/, "").trim().toLowerCase();
  for (const c of BY_LEN) {
    const n = US_STATES[c].toLowerCase();
    if (t === n || t.endsWith(", " + n) || t.endsWith("," + n)) return c;
  }
  return null;
}
const DEPENDS = /\b(811|one[- ]?call|dig ?alert|blue ?stake|miss ?dig|locate (ticket|request|marks?)|dig ticket|ticket (life|good|expire|valid)|marks? (good|valid|expire)|tolerance zone|hand ?dig|white ?lin|call(ed)? in (the )?locates?|(lunch|meal|rest) (break|period)s?|breaks?\b.*\b(crew|guys|hours)|overtime|double ?time|minimum wage|prevailing wage|pay ?(day|check|stub)|final pay|sick (leave|pay|time)|heat (illness|rule|standard|plan)|shade\b|state (law|rule|plan|osha|spec|standard)|my state|this state|our state|here\b.*\b(rule|law|require)|(rule|law|require)\w*\b.*\bhere\b|spec ?book|dot spec|standard spec|water (and|&|\/) ?sewer separation|separation (between|of|from)|flagger (card|cert)|contractor'?s? licen[cs]e|trench permit|excavation permit|annual permit)\b/i;
const EMERGENCY = /\b(911|bleed|caved? ?in|cave-?in|collaps|buried|trapped|not breathing|unconscious|passed out|blowing|gas (leak|smell)|smell gas|hit (a|the) (gas|power|electric)|on fire|electrocut|shock(ed)?|heat ?stroke|seizure|chest pain|amputat|crush)/i;
function stateDependent(q, rawHits) {
  const t = String(q || "");
  if (EMERGENCY.test(t)) return false;
  if (DEPENDS.test(t)) return true;
  return (rawHits || []).slice(0, 6).filter((h) => chunkStates(h).length > 0).length >= 2;
}
function stateSearch(search, index, query, opts, st, question) {
  const k = opts.k || 6, maxChars = opts.maxChars || 9e3, code = st?.code || null, named = st?.named || [];
  const keep = (h) => keepForState(h, code, named) && !tenStatesOnly(h, code, question);
  const wide = search(index, query, { ...opts, k: 400, maxChars: 9e6, stats: opts.stats });
  const kept = wide.filter(keep);
  const top = (kept.find((h) => h.lib !== "osha") || kept[0] || { score: 0 }).score;
  const mine = [code, ...named].filter(Boolean);
  let own = mine.length ? kept.filter((h) => chunkStates(h).some((c) => mine.includes(c))) : [];
  if (code && own.length < 2) {
    const again = search(index, query + " " + US_STATES[code], { ...opts, k: 30, maxChars: 9e6, stats: void 0 }).filter((h) => chunkStates(h).includes(code) && !own.some((x) => x.id === h.id));
    const qs = new Map(wide.map((h) => [h.id, h.score]));
    own = own.concat(again.filter((h) => qs.has(h.id)).map((h) => ({ ...h, score: qs.get(h.id) })));
  }
  const words = subjectWords(question);
  const about = (h) => {
    const t = subjectWords(h.title);
    return words.length > 0 && words.filter((w) => t.includes(w)).length * 2 >= words.length;
  };
  own = own.filter((h) => h.score >= top * OWN_MIN || h.score >= top * OWN_MIN * 0.7 && about(h)).sort((a, b) => b.score - a.score).slice(0, OWN_SLOTS);
  const out = [], seen = /* @__PURE__ */ new Set(), perTitle = /* @__PURE__ */ new Map();
  let chars = 0;
  for (const h of kept) {
    const n = perTitle.get(h.title) || 0;
    if (n >= 2 || chars + h.text.length > maxChars && out.length) continue;
    perTitle.set(h.title, n + 1), seen.add(h.id), out.push(h), chars += h.text.length;
    if (out.length >= k) break;
  }
  let extra = 0;
  for (const h of own) {
    if (seen.has(h.id)) continue;
    if (extra + h.text.length > OWN_CHARS && extra) continue;
    seen.add(h.id), out.push({ ...h, text: h.text.length > OWN_CHARS ? h.text.slice(0, OWN_CHARS) : h.text }), extra += Math.min(h.text.length, OWN_CHARS);
  }
  out.sort((a, b) => b.score - a.score);
  return { hits: out, dropped: wide.slice(0, k).filter((h) => !keep(h)).length, own: out.filter((h) => own.some((x) => x.id === h.id)).length, dependent: stateDependent(question, wide) };
}
const STOP = new Set("what when where which while with without from that this they them their there here have has does into over under about above below after before many much long good need needs must should would could will your ours mine guys crew crews today work working works hour hours rule rules state states apply applies job jobs give gives take takes make makes thing things kind required require requires going want wants know tell says said more most some than then also only just ever every each other another same".split(" "));
const subjectWords = (t) => [...new Set(String(t || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => w.replace(/(ing|es|s)$/, "")).filter((w) => w.length >= 3))];
const OWN_MIN = Number(globalThis.__OWN_MIN || 0.28), OWN_SLOTS = 2, OWN_CHARS = 3e3;
function stateLines(st, dependent) {
  const code = st?.code, name = code ? US_STATES[code] : "";
  if (code) {
    const how = { question: "named in the question", job: "from the job", company: "the company's state", conversation: "named earlier in this conversation", company_jobs: "where most of this company's jobs are" }[st.how] || "from the job";
    return `JOB STATE: ${name} (${code}), ${how}. Answer for ${name}: where an excerpt gives ${name}'s own rule or number, lead with it and name the state; give the federal rule beside it when there is one. Never give another state's number as theirs. If the excerpts have no ${name} rule for this, say in a few words that the library does not have ${name}'s rule for it, give the federal rule, and name who to check with (the state's OSHA plan, 811 center or agency). Do not ask which state.`;
  }
  return dependent ? `JOB STATE: not known, and this answer changes with the state. Give in one or two lines only what is the same in every state (the federal rule, if there is one). Do not give any one state's number as theirs. Then end with exactly one short question: "Which state is the job in?"` : 'JOB STATE: not known. If, and only if, the answer changes with the state, give what is the same everywhere and end with one short question: "Which state is the job in?" Otherwise just answer; do not ask.';
}
export {
  OWN_CHARS,
  OWN_MIN,
  OWN_SLOTS,
  US_STATES,
  addressState,
  chunkStates,
  keepForState,
  okState,
  questionStates,
  resolveState,
  stateDependent,
  stateLines,
  stateSearch,
  statesNamed,
  subjectWords,
  tenStatesOnly
};
