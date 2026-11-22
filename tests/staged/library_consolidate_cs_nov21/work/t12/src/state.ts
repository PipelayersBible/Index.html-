// state.ts (staged Nov 20 2026, ask_state_nov20): Ask is always state-aware.
// One place for: which state the job is in, which state(s) a library chunk belongs to, and what to keep for a job.
// A chunk's jurisdiction comes from the chunk itself (explicit `state` field, id, topic, leading words of the title),
// never from its source line or the first characters of its text. General / federal chunks show in every state.
// Pure functions, no imports: the same file runs in the edge function and in the local retrieval check.

export const US_STATES = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming" };
const CODES = Object.keys(US_STATES);
// longest names first, so "West Virginia" is taken before "Virginia" and "District of Columbia" before anything else
const BY_LEN = CODES.slice().sort((a, b) => US_STATES[b].length - US_STATES[a].length);
const NAME_RE = new RegExp("\\b(" + BY_LEN.map((c) => US_STATES[c]).join("|") + ")\\b", "g");
const NAME_RE_I = new RegExp(NAME_RE.source, "gi");
const CODE_OF = Object.fromEntries(CODES.map((c) => [US_STATES[c].toLowerCase(), c]));
export const okState = (c) => typeof c === "string" && Object.prototype.hasOwnProperty.call(US_STATES, c);

// Names that contain a state's name but are not the state.
const NOT_A_STATE = /\bWashington,? D\.?C\.?|\b(Mississippi|Missouri|Ohio|Colorado|Delaware|Arkansas|Tennessee|Illinois|Wisconsin|Connecticut|Kansas|Iowa|Minnesota|Columbia|Hudson) (River|Valley|Basin)\b|\bKansas City\b|\bNew York City\b|\bTen States\b|\bWashington (Street|Avenue|Ave|St|Blvd|County)\b/g;
const scrub = (t, keepDC) => String(t || "").replace(NOT_A_STATE, (m) => (keepDC && /^Washington/.test(m) && /D\.?C/.test(m) ? "District of Columbia" : " "));

// Every state named in a piece of text (case-sensitive: chunk titles and topics are written in title case).
export function statesNamed(text, anyCase) {
  const out = [], t = scrub(text, !0);
  for (const m of t.matchAll(anyCase ? NAME_RE_I : NAME_RE)) { const c = CODE_OF[m[1].toLowerCase()]; c && !out.includes(c) && out.push(c); }
  return out;
}

// The state(s) a QUESTION names: full names in any case, or a two-letter code written in capitals right after a comma,
// "in" or "for" ("Reno, NV", "in TX"). A bare "OR", "IN", "OK", "ME", "HI" is a word, not a state.
// Names that belong to exactly one state: its 811 center, its safety agency, its DOT. (Not "Blue Stake": Arizona and Utah both use it.)
const Q_ALIASES = [["CA", /\bdig ?alert\b|\bcal[/ -]?osha\b|\bcaltrans\b|\bgreenbook\b/i], ["MI", /\bmiss ?dig\b|\bmiosha\b/i], ["MN", /\bgopher state\b/i], ["IL", /\bJULIE\b/], ["FL", /\bsunshine ?811\b/i], ["WI", /\bdiggers hotline\b/i], ["OK", /\bokie ?811\b/i], ["OH", /\boups\b|\bohio ?811\b/i], ["WA", /\bwsdot\b/i], ["TX", /\btexas ?811\b|\btceq\b/i]];
export function questionStates(q) {
  const t = String(q || ""), out = statesNamed(t, !0);
  for (const [c, re] of Q_ALIASES) re.test(t) && !out.includes(c) && out.push(c);
  for (const m of t.matchAll(/(?:,\s*|\b(?:in|for|from)\s+)([A-Z]{2})\b(?!\s*[A-Z]{2,})/g)) okState(m[1]) && !out.includes(m[1]) && out.push(m[1]);
  return out;
}

// Rule makers that belong to one state. Read from the TOPIC, or from the first words of the title, only.
const CUES = [
  ["CA", /\bCal\/OSHA\b|\bGreenbook\b|\bDigAlert\b|\bCaltrans Standard Specifications\b/],
  ["MI", /\bMIOSHA\b/],
];
const ID_RULES = [/^dig-([a-z]{2})$/, /^plan-([a-z]{2})-/, /^emp-state-([a-z]{2})-/, /^emp-([a-z]{2})-/, /^brk-([a-z]{2})$/, /^st-([a-z]{2})$/, /^(ca)-/];

// The state(s) a library chunk belongs to. [] = general or federal: shown in every state.
// h: { id, title, topic, state? }   (state: "TX", "KS,MO", or "US" for "general, whatever the title says")
export function chunkStates(h) {
  const ex = String(h?.state || "").trim().toUpperCase();
  if (ex) return ex === "US" || ex === "ALL" ? [] : ex.split(/[\s,]+/).filter(okState);
  const id = String(h?.id || ""), title = String(h?.title || ""), topic = String(h?.topic || "");
  for (const r of ID_RULES) { const m = id.match(r), c = m && m[1].toUpperCase(); if (c && okState(c)) return [c]; }
  const inTopic = statesNamed(topic);
  if (inTopic.length > 2) return []; // a topic that lists states is a comparison: general
  const inTitle = statesNamed(title);
  if (inTopic.length) return inTitle.length && inTitle.length <= 2 ? [...new Set([...inTopic, ...inTitle])] : inTopic;
  for (const [c, re] of CUES) if (re.test(topic)) return [c];
  // The title: only when it STARTS with the state ("Texas: which spec books...", "Michigan trench rules..."). A state
  // further along a title is an example ("21A base (Virginia VDOT)", "Regional US geology: Texas, Great Plains...").
  const lead = scrub(title, !0).replace(/^[\s"'(\[]+/, "");
  for (const c of BY_LEN) if (lead.startsWith(US_STATES[c]) && !/^[a-z]/.test(lead.slice(US_STATES[c].length))) {
    const rest = lead.slice(US_STATES[c].length);
    if (/^\s*(and|,|\/|&)\s/.test(rest)) { const two = statesNamed(lead.slice(0, 60)); return two.length <= 2 ? two : []; }
    if (/^\s+to\s/.test(rest)) return []; // "Alabama to Kentucky": a range table
    return [c];
  }
  for (const [c, re] of CUES) { const m = lead.match(re); if (m && m.index === 0) return [c]; }
  return [];
}

// Keep a chunk for this job? General chunks: always. A state's chunk: only on a job in that state, or when the
// question names that state. With no state known and none named, one state's rules are never offered as "the" rule.
export function keepForState(h, jobState, qStates) {
  const cs = chunkStates(h);
  if (!cs.length) return !0;
  if (jobState && cs.includes(jobState)) return !0;
  return (qStates || []).some((c) => cs.includes(c));
}
// "Ten States Standards" is a Great Lakes / Upper Mississippi book: not offered on California jobs unless asked (v25 rule, kept).
export const tenStatesOnly = (h, jobState, q) => jobState === "CA" && /\bTen States\b/i.test(`${h?.title || ""} ${h?.topic || ""} ${h?.source || ""}`) && !/ten states/i.test(String(q || ""));

// Which state is this question for? First hit wins:
//  1 a state the question names (or an 811 center / agency that belongs to one state)
//  2 the state the app sent for THIS job (picked on the phone, picked for the company's job, the job address)
//  3 the job's state on the server (picked for the job, else its address)
//  4 a state named in the last few questions of this conversation (a follow-up stays on it)
//  5 the company's own state (from the app or the server)
//  6 the last job on this phone that has a state, else the state this person told Ask before (both sent by the app)
//  7 the state most of the company's jobs are in.        Nothing: { code: null } and Ask asks, once, when it matters.
// The app's own "California when nothing says" fallback (how = "default") is never taken as knowledge.
export function resolveState(o) {
  const q = questionStates(o?.question);
  if (q.length === 1) return { code: q[0], how: "question", named: q };
  const app = String(o?.appState || "").toUpperCase(), ah = String(o?.appHow || ""), appOk = okState(app);
  if (appOk && (ah === "phone" || ah === "picked" || ah === "address" || ah === "job")) return { code: app, how: "job", named: q };
  if (okState(o?.addressState)) return { code: o.addressState, how: "job", named: q };
  for (const t of (o?.earlier || []).slice(0, 3)) { const e = questionStates(t); if (e.length === 1) return { code: e[0], how: "conversation", named: q }; }
  if (appOk && ah === "company") return { code: app, how: "company", named: q };
  if (okState(o?.companyState)) return { code: o.companyState, how: "company", named: q };
  if (appOk && ah === "last_job") return { code: app, how: "last_job", named: q };
  if (appOk && ah === "here") return { code: app, how: "here", named: q }; // where the phone is (photo stamp place, last 12 hours)
  if (appOk && ah === "told") return { code: app, how: "told", named: q };
  if (okState(o?.majorityState)) return { code: o.majorityState, how: "company_jobs", named: q };
  return { code: null, how: q.length > 1 ? "question_many" : "unknown", named: q };
}
// state from the end of an address: "Phoenix, AZ", "Phoenix, AZ 85004", "Boise, Idaho"
export function addressState(a) {
  let t = String(a || "").replace(/\s+/g, " ").replace(/,?\s*(u\.?s\.?a?\.?|united states( of america)?)$/i, "").trim();
  if (!t) return null;
  const m = t.match(/(?:^|[\s,])([A-Za-z]{2})\.?,?(?:\s+\d{5}(?:-\d{4})?)?$/);
  if (m && okState(m[1].toUpperCase()) && (m[1] === m[1].toUpperCase() || /,\s*[A-Za-z]{2}\.?,?(\s+\d{5}(-\d{4})?)?$/.test(t))) return m[1].toUpperCase();
  t = t.replace(/,?\s*\d{5}(?:-\d{4})?$/, "").trim().toLowerCase();
  for (const c of BY_LEN) { const n = US_STATES[c].toLowerCase(); if (t === n || t.endsWith(", " + n) || t.endsWith("," + n)) return c; }
  return null;
}

// Does the answer change with the state? Used only when NO state is known, to decide whether to ask.
const DEPENDS = /\b(811|one[- ]?call|dig ?alert|blue ?stake|miss ?dig|locate (ticket|request|marks?)|dig ticket|ticket (life|good|expire|valid)|marks? (good|valid|expire)|tolerance zone|hand ?dig|white ?lin|call(ed)? in (the )?locates?|(lunch|meal|rest) (break|period)s?|breaks?\b.*\b(crew|guys|hours)|overtime|double ?time|minimum wage|prevailing wage|pay ?(day|check|stub)|final pay|sick (leave|pay|time)|heat (illness|rule|standard|plan)|shade\b|state (law|rule|plan|osha|spec|standard)|my state|this state|our state|here\b.*\b(rule|law|require)|(rule|law|require)\w*\b.*\bhere\b|spec ?book|dot spec|standard spec|water (and|&|\/) ?sewer separation|separation (between|of|from)|flagger (card|cert)|contractor'?s? licen[cs]e|trench permit|excavation permit|annual permit)\b/i;
const EMERGENCY = /\b(911|bleed|caved? ?in|cave-?in|collaps|buried|trapped|not breathing|unconscious|passed out|blowing|gas (leak|smell)|smell gas|hit (a|the) (gas|power|electric)|on fire|electrocut|shock(ed)?|heat ?stroke|seizure|chest pain|amputat|crush)/i;
export function stateDependent(q, rawHits) {
  const t = String(q || "");
  if (EMERGENCY.test(t)) return !1;
  if (DEPENDS.test(t)) return !0;
  // the library itself says so: 2 or more of the best hits are one state's own rule
  return (rawHits || []).slice(0, 6).filter((h) => chunkStates(h).length > 0).length >= 2;
}

// First search for a job: the normal search, with other states' chunks taken out, and the job state's own chunks for
// this question given a place (they often lose to federal text and to other states' look-alike chunks).
// search(index, query, opts) is the build's own search; nothing about scoring changes for general chunks.
export function stateSearch(search, index, query, opts, st, question) {
  const k = opts.k || 6, maxChars = opts.maxChars || 9e3, code = st?.code || null, named = st?.named || [];
  const keep = (h) => keepForState(h, code, named) && !tenStatesOnly(h, code, question);
  const wide = search(index, query, { ...opts, k: 400, maxChars: 9e6, stats: opts.stats });
  const kept = wide.filter(keep);
  // a short follow-up ("yes", "go on") has no subject of its own: then the intent's words (which carry the earlier topic) are used
  const qq = question && question !== query && subjectWords(question).length >= 2 ? question : query;
  const qWide = qq !== query ? search(index, qq, { ...opts, k: 400, maxChars: 9e6, stats: void 0 }).filter(keep) : kept;
  const qTop = (qWide.find((h) => h.lib !== "osha") || qWide[0] || { score: 0 }).score;
  // relevance yardstick for a state's chunk: the best plain-language (non-OSHA-text) hit. Verbatim OSHA text is weighted
  // up for rule questions, and a state's chunk should not have to beat that to be shown beside it.
  const top = (kept.find((h) => h.lib !== "osha") || kept[0] || { score: 0 }).score;
  const mine = [code, ...named].filter(Boolean);
  let own = mine.length ? qWide.filter((h) => chunkStates(h).some((c) => mine.includes(c))) : [];
  if (code && own.length < 2) { // the question's own words did not reach the state's chunk: look again with the state's name
    const again = search(index, qq + " " + US_STATES[code], { ...opts, k: 30, maxChars: 9e6, stats: void 0 })
      .filter((h) => chunkStates(h).includes(code) && !own.some((x) => x.id === h.id));
    const qs = new Map(qWide.map((h) => [h.id, h.score]));
    own = own.concat(again.filter((h) => qs.has(h.id)).map((h) => ({ ...h, score: qs.get(h.id) })));
  }
  // relevant enough to show: scores near the best plain hit, or is plainly about the same thing (its title shares a
  // subject word with the question) and scores at least half of that
  const words = subjectWords(question);
  const about = (h) => { const t = subjectWords(h.title); return words.length > 0 && words.filter((w) => t.includes(w)).length * 2 >= words.length; };
  own = own.filter((h) => h.score >= qTop * OWN_MIN || (h.score >= qTop * OWN_MIN * 0.7 && about(h)))
    .sort((a, b) => b.score - a.score).slice(0, OWN_SLOTS);
  // lib8: an own-plan state, a safety-rule question, and none of the state's cards made it: add the state's plan card
  // (sp-<st>-trench-* first for trench words, else sp-<st>-who-1), so the answer can name the plan as the source.
  const qs0 = String(question || ""), REPORT_Q = /\b(report\w*|hospital\w*|amputat\w*|fatal\w*|notify osha)\b/i, HEAT_Q = /\b(heat|shade|hot)\b/i;
  if (code && !own.length && PLAN_STATES.includes(code) && (SAFETY_RULE.test(qs0) || REPORT_Q.test(qs0) || HEAT_Q.test(qs0)) && !EMERGENCY.test(qs0)) {
    const lc = code.toLowerCase(), kind = REPORT_Q.test(qs0) ? "report" : HEAT_Q.test(qs0) ? "heat" : /\b(confined|permit.required|permit spaces?|manhole entry)\b/i.test(qs0) ? "confined"
      : /\b(trench|excavat|shor|shield|box|protective|cave|spoil|slop|bench|ladder)/i.test(qs0) ? "trench" : "";
    // the state's card for this kind of rule first (sp-<st>-report-*, -heat-*, -confined-*, -trench-*), else its who-enforces card
    const rank = (h) => kind && new RegExp(`^sp-${lc}-${kind}`).test(h.id) ? 0 : new RegExp(`^sp-${lc}-who-`).test(h.id) ? 1 : 9;
    const pc = search(index, qq + " " + US_STATES[code] + " state OSHA plan", { ...opts, k: 80, maxChars: 9e6, stats: void 0 })
      .filter((h) => rank(h) < 9 && keep(h)).sort((a, b) => rank(a) - rank(b) || b.score - a.score)[0];
    pc && (own = [{ ...pc, score: Math.max(pc.score, qTop * OWN_MIN) }]);
  }
  // consolidate (Nov 21): trench and 811 questions always carry the job state's exception card (if any) and the by-state table card.
  const forced = code && !EMERGENCY.test(qs0) ? topicCards(search, index, qq, opts, code, qs0, own, qTop) : [];
  // The general excerpts are exactly what the plain search gives once other states' chunks are out. The job state's own
  // chunks that are not already among them are ADDED (at most OWN_SLOTS, OWN_CHARS), so nothing general is pushed out.
  const out = [], seen = new Set(), perTitle = new Map();
  let chars = 0;
  for (const h of kept) {
    const n = perTitle.get(h.title) || 0;
    if (n >= 2 || (chars + h.text.length > maxChars && out.length)) continue;
    perTitle.set(h.title, n + 1), seen.add(h.id), out.push(h), chars += h.text.length;
    if (out.length >= k) break;
  }
  let extra = 0;
  for (const h of own) {
    if (seen.has(h.id)) continue;
    if (extra + h.text.length > OWN_CHARS && extra) continue;
    seen.add(h.id), out.push({ ...h, text: h.text.length > OWN_CHARS ? h.text.slice(0, OWN_CHARS) : h.text }), extra += Math.min(h.text.length, OWN_CHARS);
  }
  let fchars = 0;
  for (const h of forced) {
    if (seen.has(h.id) || fchars + h.text.length > FORCED_CHARS) continue;
    seen.add(h.id), out.push(h), fchars += h.text.length;
  }
  // Plain words beside the rule text: OPTIONAL, off by default. When verbatim OSHA text and app tables take the first places, the best general
  // field-library chunks are added too (up to PLAIN_MIN in all). Same for every state, so no state leans on its own chunks for it.
  const PLAIN_MIN = Number(globalThis.__PLAIN_MIN ?? 0) || 0; // off unless the edge secret AI_ASK_PLAIN_MIN is set (see NOTES: optional)
  let plainN = out.filter((h) => h.lib === "field" && !chunkStates(h).length && !forced.some((x) => x.id === h.id)).length, plainChars = 0, plain = 0;
  for (const h of kept) {
    if (plainN >= PLAIN_MIN) break;
    if (h.lib !== "field" || seen.has(h.id) || chunkStates(h).length || h.score < top * 0.6) continue;
    if (plainChars + h.text.length > OWN_CHARS && plainChars) continue;
    seen.add(h.id), out.push({ ...h, text: h.text.length > OWN_CHARS ? h.text.slice(0, OWN_CHARS) : h.text }), plainChars += Math.min(h.text.length, OWN_CHARS), plainN++, plain++;
  }
  const ownFirst = new Set(EMERGENCY.test(String(question || "")) ? [] : own.map((h) => h.id).concat(forced.filter((h) => h.exc).map((h) => h.id)));
  out.sort((a, b) => (Number(ownFirst.has(b.id)) - Number(ownFirst.has(a.id))) || b.score - a.score);
  if (ownFirst.size && out.length > 2 && ownFirst.has(out[1].id)) { // lib7: strictest rule needs both sides: own card 1, best general card 2
    const g = out.findIndex((h) => !ownFirst.has(h.id));
    if (g > 1) out.splice(1, 0, out.splice(g, 1)[0]);
  }
  // A state that runs its own OSHA plan, a safety-rule question, and nothing of that state's own anywhere near the
  // question: the federal rule is all the library has, and the answer must say so (dependent = "plan", see stateLines).
  const ownN = out.filter((h) => own.some((x) => x.id === h.id) || forced.some((x) => x.id === h.id)).length, dep = stateDependent(question, wide);
  // lib8: an own-plan state with no card of its own for a safety rule always gets the "plan" line (was: only when the question
  // did not look state-dependent, so "depth for a trench box" in Indiana got the general line and named no state)
  const thin = !ownN && PLAN_STATES.includes(code) && SAFETY_RULE.test(String(question || "")) && !EMERGENCY.test(String(question || ""));
  return { hits: out, dropped: wide.slice(0, k).filter((h) => !keep(h)).length, own: ownN, plain, dependent: thin ? "plan" : dep, forced: forced.map((h) => h.id) };
}
// consolidate (Nov 21): which topic a question is on, and the cards it always carries for the job state.
export const TRENCH_TOPIC = /\b(trench(es|ing)?|excavat(e|es|ed|ing|ions?)|shor(e|ed|ing)|shields?|trench box(es)?|cave-?ins?|protective systems?)\b/i;
export const DIG_TOPIC = /\b(811|one[- ]?call|locates?|locate (ticket|request|marks?)|locators?|dig ?(ticket|law|alert)|tickets?|tolerance zone|hand[- ]?dig\w*|white[- ]?lin\w*|positive response|call before you dig|blue ?stakes?|miss ?dig|miss utility|gopher state|julie|sunshine ?811|diggers hotline|okie ?811|dig ?safe|utility marks?)\b/i;
const TRENCH_TABLES = ["osha-pl-trench-states-1", "osha-pl-trench-states-2"];
// consolidate_cs (Nov 21): confined space questions carry the job state's confined space card (if any) and the state table card.
export const CS_TOPIC = /\b(confined[- ]spaces?|permit[- ]required|permit[- ]spaces?|entry permits?|entrants?|entry supervisors?|attendants?|(4|four)[- ]gas|gas (monitor|meter|detector)s?|subpart aa|1926\.12\d\d|1910\.146)\b/i;
const CS_SPACE = /\b(manholes?|vaults?|wet ?wells?|lift stations?|sewers?|tanks?|pits?|culverts?|large pipes?|inside (the|a) pipe)\b/i;
const CS_ACT = /\b(enter\w*|entry|go(ing)? (in|into|down)|get(ting)? (in|into|down)|climb\w*|inside|lel|lfl|o2|oxygen|h2s|hydrogen sulfide|carbon monoxide|co (level|limit|reading)s?|gas|air (in|inside)|atmospher\w*|ventilat\w*|blower|rescue|retrieval|tripod|winch|harness|911)\b/i;
const CS_GAS = /\b(lel|lfl|o2|oxygen|h2s|hydrogen sulfide)\b/i, CS_ENTER = /\b(enter\w*|entry|go(ing)? (in|down)|get(ting)? in)\b/i;
export const csTopic = (q) => CS_TOPIC.test(q) || (CS_SPACE.test(q) && CS_ACT.test(q)) || (CS_GAS.test(q) && CS_ENTER.test(q));
const CS_TABLES = ["osha-pl-cs-states-1", "osha-pl-cs-states-2"];
const DIG_TABLES = [["fed-811-zone-1", /\b(tolerance|hand[- ]?dig\w*|how close|caution zone|inch(es)?|vacuum|pothol\w*|soft dig\w*|by hand)\b/i],
  ["fed-811-ticketlife-1", /\b(good for|expir\w*|valid|ticket life|last(s)?|renew\w*|updat\w*|extend\w*|refresh\w*|how many days .*ticket)\b/i],
  ["fed-811-wait-1", /\b(wait\w*|how (long|soon)|before (i|we|you) (can )?dig|when can|notice|ahead|hours|working days|business days|start digging)\b/i]];
export const FORCED_CHARS = 2600;
function docHit(index, id, score, exc) {
  const d = index?.docs ? index.docs.findIndex((r) => r[0] === id) : -1;
  if (d < 0) return null;
  const row = index.docs[d];
  return { doc: d, id: row[0], lib: row[1], title: row[2], topic: row[3], text: row[4], source: row[5], url: row[6] || "", conf: String(row[7] || ""), score, verbatim: row[1] === "osha", state: row[10] || "", exc };
}
export function topicCards(search, index, qq, opts, code, question, own, qTop) {
  const name = US_STATES[code], lc = code.toLowerCase(), q = String(question || ""), outC = [];
  const has = (re) => own.some((h) => re.test(h.id));
  const best = (re, extra) => search(index, qq + " " + name + " " + extra, { ...opts, k: 60, maxChars: 9e6, stats: void 0 })
    .filter((h) => re.test(h.id) && chunkStates(h).includes(code))[0];
  const sc = Math.max(qTop * OWN_MIN, 0.01);
  if (TRENCH_TOPIC.test(q)) {
    const re = new RegExp(`^sp-${lc}-trench`);
    if (!has(re)) { const h = best(re, "trench excavation protective system"); h && outC.push({ ...h, score: Math.max(h.score, sc), exc: !0 }); }
    // the table card that names the state (each state is on exactly one of them)
    for (const id of TRENCH_TABLES) {
      const t = docHit(index, id, sc, !1);
      if (t && new RegExp(`\\b${name}\\b`).test(t.text.replace(/West Virginia/g, code === "WV" ? "West Virginia" : ""))) { outC.push(t); break; }
    }
  }
  if (csTopic(q)) {
    const re = new RegExp(`^sp-${lc}-confined`);
    if (!has(re)) { const h = best(re, "confined space permit entry"); h && outC.push({ ...h, score: Math.max(h.score, sc), exc: !0 }); }
    for (const id of CS_TABLES) {
      const t = docHit(index, id, sc, !1);
      if (t && new RegExp(`\\b${name}\\b`).test(t.text.replace(/West Virginia/g, code === "WV" ? "West Virginia" : ""))) { outC.push(t); break; }
    }
  }
  if (DIG_TOPIC.test(q)) {
    const re = code === "CA" ? /^(dig-ca-|ca-dig-alert-)/ : new RegExp(`^dig-${lc}-(?!locatable)`);
    if (!has(re)) { const h = best(re, "811 dig law ticket"); h && outC.push({ ...h, score: Math.max(h.score, sc), exc: !0 }); }
    const pick = (DIG_TABLES.find(([, rx]) => rx.test(q)) || DIG_TABLES[2])[0], t = docHit(index, pick, sc, !1);
    t && outC.push(t);
  }
  return outC;
}
const STOP = new Set("what when where which while with without from that this they them their there here have has does into over under about above below after before many much long good need needs must should would could will your ours mine guys crew crews today work working works hour hours rule rules state states apply applies job jobs give gives take takes make makes thing things kind required require requires going want wants know tell says said more most some than then also only just ever every each other another same".split(" "));
export const subjectWords = (t) => [...new Set(String(t || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => w.replace(/(ing|es|s)$/, "")).filter((w) => w.length >= 3))];
export const OWN_MIN = 0.28, OWN_SLOTS = 2, OWN_CHARS = 3000;
// questions a state OSHA plan can answer differently from federal OSHA (Washington protects a trench at 4 ft, not 5)
const SAFETY_RULE = /\b(trench(es)?|excavations?|shor(e|ed|ing)|shields?|trench box(es)?|protective systems?|cave-?ins?|spoils?|ladders?|confined spaces?|permit spaces?|entry permits?|atmospher\w*|gas (monitor|meter|test)\w*|fall protection|guardrails?|harness(es)?|silica|lock ?out|tag ?out|competent person|osha)\b/i;

// States whose own OSHA plan covers private-sector crews (osha.gov/stateplans, read 2026-11-20 by ask_nationwide_nov20).
export const PLAN_STATES = "AK AZ CA HI IN IA KY MD MI MN NV NM NC OR SC TN UT VT VA WA WY".split(" ");
// The lines the model reads. Short, and the same words every time.
// consolidate_cs (Nov 21): business-analysis answers skip stateLines and the reply rule; when the job state is known they still must not
// name or compare other states (the excerpts can hold a by-state table card).
export function analysisStateLine(st) {
  const code = st?.code;
  return code ? `JOB STATE: ${US_STATES[code]} (${code}). If the answer uses any rule or legal number from the excerpts, give only ${US_STATES[code]}'s, from its own line; never name another state, give another state's number or compare with other states, "elsewhere" or "most states".` : "";
}
export function stateLines(st, dependent, own) {
  const code = st?.code, name = code ? US_STATES[code] : "";
  if (code) {
    const how = { question: "named in the question", job: "from the job", company: "the company's state", conversation: "named earlier in this conversation", company_jobs: "where most of this company's jobs are", last_job: "from the last job on this phone", told: "the state this person gave Ask before", here: "where this phone is" }[st.how] || "from the job";
    const head = `JOB STATE: ${name} (${code}), ${how}.`;
    if (dependent === "plan") return `${head} ${name} runs its own OSHA plan, which must be at least as protective as federal OSHA and can be stricter, and the library has no ${name} rule for this question. Give the federal rule as the minimum, then one short line: ${name}'s plan can be stricter, confirm with ${name}'s OSHA plan. Never give another state's number or name another state. Do not ask which state.`;
    // most questions do not change with the state: say so, so the state is not dragged into pipe math or a fitting question
    if (!dependent && !own) return `${head} Use it only if the answer changes by state (811 rules, a state OSHA plan, breaks, pay or heat rules, state specs); then give the STRICTEST rule that applies in ${name} (the state's or the federal one, whichever protects the crew more) and say in a few words where it comes from; never give another state's number or name another state. Otherwise answer as usual, at the usual short length, and do not mention the state. Do not ask which state.`;
    const plan = PLAN_STATES.includes(code) ? ` ${name} runs its own OSHA plan, which can be stricter than federal OSHA: if this is a safety-rule question and no excerpt gives ${name}'s rule, search_knowledge once with "${name}" and the topic before answering. On a safety rule name ${name}'s plan as the source in line 1 even when it matches federal, e.g. "(${name}'s OSHA plan, same as federal 29 CFR 1926.652)".` : ` ${name} has no state OSHA plan for private crews, so on a safety rule the federal OSHA rule applies: give it as the answer with no words about which agency covers ${name}, and do not say the library lacks a ${name} rule.`;
    return `${head}${plan} Answer for ${name}: lead with the direct answer. STRICTEST RULE: where ${name}'s own rule and a federal rule (OSHA, MUTCD, EPA) both apply and differ, the answer is the STRICTER one (more protective for the crew and the public), with its source named in a few words: "${name} requires ... (stricter than federal ...)" or "Federal OSHA requires ... (stricter than ${name}'s ...)". If they are the same, add no sentence about it (at most "(same as federal)" inside line 1). If you cannot tell which is stricter, give both in one short line each and say to follow the stricter. Never give a weaker rule because it is ${name}'s, and never drop a stricter federal rule. Compare only the SAME requirement on both sides (a depth, a limit, a deadline both rules set); a rule only the state has (811 notice and ticket life, state specs, a state DOT manual) is simply ${name}'s rule: give it with no federal comparison. The state must not make the answer longer: keep the usual short length. Never give another state's number or name another state, not even as an example. If the excerpts have no ${name} rule for this, say in a few words that the library does not have ${name}'s rule for it, give the federal rule, and name who to check with (the state's OSHA plan, 811 center or agency). Do not ask which state.`;
  }
  return dependent
    ? "JOB STATE: not known, and this answer changes with the state. Give in one or two lines only what is the same in every state (the federal rule, if there is one). Do not give any one state's number as theirs. Then end with exactly one short question: \"Which state is the job in?\""
    : "JOB STATE: not known. If, and only if, the answer changes with the state, give what is the same everywhere and end with one short question: \"Which state is the job in?\" Otherwise just answer; do not ask. In an emergency never ask: give the steps.";
}
