# apply_patch_q.py <src dir in> <src dir out>: ask_quality_nov22 code changes on the live 4776ad1c5afb source.
# Every replacement is exact-once (asserted). Sections:
#  S1 emergency (safety review 1-2): new emergency.ts (4 scripts, EN/ES, wider triggers); safety.ts localAnswer uses it first.
#  S2 state (review 3): street names / "from <State>" / "company in <State>" are not the state; with a job state known, a state
#     named in passing does not replace it (it is kept as a second state).
#  S3 no state known (review 4): trench / confined space / air / injury reporting questions count as state-dependent.
#  S4 guard (review 5): when the go/no-go checker fails, verdict sentences are stripped by word match (fail safe).
#  later sections appended below.
import os, re, shutil, sys
SRC, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
if os.path.exists(OUT): shutil.rmtree(OUT)
shutil.copytree(SRC, OUT)
def rd(f): return open(os.path.join(OUT, f)).read()
def wr(f, s): open(os.path.join(OUT, f), 'w').write(s)
def rep(f, a, b, n=1):
    s = rd(f); c = s.count(a)
    assert c == n, f"{f}: expected {n} got {c}: {a[:90]!r}"
    wr(f, s.replace(a, b))

# ---- S1 emergency
shutil.copy(os.path.join(HERE, 'emergency.ts'), os.path.join(OUT, 'emergency.ts'))
rep('safety.ts', 'function localAnswer(q) {\n  const t = String(q).toLowerCase().replace(/[’\']/g, "");\n  return PB_AI_EMERGENCY_RX.some((r) => r.test(t))',
    'import { pbEmergencyAnswer } from "./emergency.ts";\nfunction localAnswer(q) {\n  const em = pbEmergencyAnswer(q); // ask_quality_nov22: 4 scripts (space / open / gas / power), EN + ES\n  if (em) return em;\n  const t = String(q).toLowerCase().replace(/[’\']/g, "");\n  return PB_AI_EMERGENCY_RX.some((r) => r.test(t))')
rep('ask.ts', '      kind: local.kind,\n', '      kind: local.kind,\n      script: local.script,\n      lang: local.lang,\n')
# state.ts emergency words (no state question asked in an emergency)
rep('state.ts', 'const EMERGENCY = /\\b(911|bleed|caved? ?in|cave-?in|collaps|buried|trapped|not breathing|unconscious|passed out|blowing|gas (leak|smell)|smell gas|hit (a|the) (gas|power|electric)|on fire|electrocut|shock(ed)?|heat ?stroke|seizure|chest pain|amputat|crush)/i;',
    'const EMERGENCY = /\\b(911|bleed|caved? ?in|cave-?in|collaps|buried|trapped|pinned|not breathing|unconscious|unresponsive|passed out|blowing|gas (leak|smell)|smell gas|hit (a|the) (gas|power|electric)|(touched|contacted) (a|the) (power|overhead|electric)|on fire|electrocut|shock(ed)?|heat ?stroke|seizure|chest pain|amputat|crush|run over|alarm (went|is going|going) off|in alarm|atrapad|desmay|no responde|no respira|fuga de gas)/i;')

# ---- S2 state named in passing
rep('state.ts', 'const NOT_A_STATE = /\\bWashington,? D\\.?C\\.?|',
    '// ask_quality_nov22 (review 3): street and road names, "from <State>", "company in <State>", plates are not the job\'s state\nconst ST_ALT = "Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming";\nconst NOT_A_STATE_Q = new RegExp("\\\\b(" + ST_ALT + ")\\\\s+(Ave(nue)?|St(reet)?|Rd|Road|Blvd|Boulevard|Dr(ive)?|Hwy|Highway|Way|Ln|Lane|Pl(ace)?|Ct|Court|Pkwy|Parkway|Cir(cle)?|Ter(race)?|Trl|Trail|Pike|Plates?|plates?|tags?)\\\\b\\\\.?|\\\\b(is|are|was|were|came|moved|guys?|crew|foreman|operator|laborer|pipelayer|he\'?s|she\'?s|they\'?re|we\'?re|i\'?m)\\\\s+(originally\\\\s+|all\\\\s+)?from\\\\s+(" + ST_ALT + ")\\\\b|\\\\b(company|office|shop|yard|headquarters|hq|outfit|contractor|we\'?re|we are)\\\\s+(is\\\\s+|are\\\\s+)?(based\\\\s+)?(in|out of)\\\\s+(" + ST_ALT + ")\\\\b", "gi");\nconst NOT_A_STATE = /\\bWashington,? D\\.?C\\.?|')
rep('state.ts', 'export function questionStates(q) {\n  const t = String(q || ""), out = statesNamed(t, !0);',
    'export function questionStates(q) {\n  const t = String(q || "").replace(NOT_A_STATE_Q, " "), out = statesNamed(t, !0);')
rep('state.ts', 'export function resolveState(o) {\n  const q = questionStates(o?.question);\n  if (q.length === 1) return { code: q[0], how: "question", named: q };\n  const app = String(o?.appState || "").toUpperCase(), ah = String(o?.appHow || ""), appOk = okState(app);',
    'export function resolveState(o) {\n  const q = questionStates(o?.question);\n  const app = String(o?.appState || "").toUpperCase(), ah = String(o?.appHow || ""), appOk = okState(app);\n  // ask_quality_nov22 (review 3): with the job\'s state known, a different state named only in passing does not replace it;\n  // the job state leads and the named one stays in `named` (its cards may still show). Plain about-that-state wording switches.\n  const jobKnown = appOk && (ah === "phone" || ah === "picked" || ah === "address" || ah === "job") ? app : okState(o?.addressState) ? o.addressState : null;\n  if (q.length === 1 && jobKnown && q[0] !== jobKnown && !aboutState(o?.question, q[0])) return { code: jobKnown, how: "job", named: [jobKnown, q[0]] };\n  if (q.length === 1) return { code: q[0], how: "question", named: q };')
rep('state.ts', '// state from the end of an address:',
    '// Does the question ask ABOUT this state ("in Oregon", "Oregon\'s rule", "for an Oregon job", "does Oregon ...", "Oregon OSHA")?\nexport function aboutState(question, code) {\n  const n = US_STATES[code];\n  if (!n) return !1;\n  if (Q_ALIASES.some(([c, re]) => c === code && re.test(String(question || "")))) return !0; // its 811 center / agency named\n  const t = String(question || "").replace(NOT_A_STATE_Q, " "), N = n.replace(/ /g, "\\\\s+");\n  if (new RegExp("\\\\b(in|for|at|on|under|per|about|across|throughout|within|to|into|of)\\\\s+(the\\\\s+state\\\\s+of\\\\s+|an?\\\\s+|the\\\\s+|my\\\\s+|our\\\\s+|this\\\\s+)?" + N + "\\\\b", "i").test(t)) return !0;\n  if (new RegExp("\\\\b" + N + "(\'s|s\'|\\\\s+state)?\\\\s+(rules?|laws?|requirements?|regs?|regulations?|osha|plan|811|one[- ]?call|tickets?|jobs?|projects?|work|dot|specs?|standards?|limits?|code|version|manual|mutcd|supplement|heat|trench|wage|pay|breaks?|permits?|license|says|requires?|uses?|follows?|has|have|does|do|is|allow\\\\w*|counts?)\\\\b", "i").test(t)) return !0;\n  if (new RegExp("\\\\b(does|do|is|are|did|will|would|can|should|how does|what does)\\\\s+" + N + "\\\\b", "i").test(t)) return !0;\n  return new RegExp("^\\\\W*" + N + "\\\\b", "i").test(t) || new RegExp("\\\\b" + N + "\\\\s*[?!.]?\\\\s*$", "i").test(t);\n}\n// state from the end of an address:')

# ---- S3 no state known: safety rule questions depend on the state
rep('state.ts', '|trench permit|excavation permit|annual permit)\\b/i;',
    '|trench permit|excavation permit|annual permit)\\b/i;\n// ask_quality_nov22 (review 4): with NO state known, safety-rule questions also change with the state (WA trench at 4 ft, CA permit, state air limits, state reporting times)\nconst DEPENDS_SAFETY = /\\b((trench\\w*|excavat\\w*)\\b.{0,40}\\b(box|shor\\w*|shield|slop\\w*|bench\\w*|protect\\w*|deep|depth|permit|cave)\\w*|(how deep|what depth|at what depth)\\b.{0,30}\\b(trench|excavat\\w*|box|shor\\w*|protect\\w*)|shor(e|ing)|trench box|shields?|slop(e|ed|ing) (the |a |my |our )?(trench|cut|walls?|sides?|bank|excavation|hole|ditch)|sloping|benching|type [abc] soil|cave[- ]?ins?|protective system|confined space|permit[- ]required|manhole entry|vault entry|enter(ing)? (a |the )?(manhole|vault|wet ?well|tank|pit)|(co|h2s|lel|oxygen|o2|carbon monoxide|hydrogen sulfide)\\b.{0,20}\\b(limit|level|ppm|percent|%|alarm|reading)|(limit|level|alarm)s?\\b.{0,15}\\b(co|h2s|lel|oxygen|carbon monoxide|hydrogen sulfide)|report\\w*\\b.{0,30}\\b(injur\\w*|hospital\\w*|amputat\\w*|death|fatalit\\w*|accident|incident)|(injur\\w*|hospital\\w*|amputat\\w*|death|fatalit\\w*)\\b.{0,30}\\breport\\w*|heat|fall protection|flaggers?|traffic control)\\b/i;')
rep('state.ts', '    ? "JOB STATE: not known, and this answer changes with the state. Give in one or two lines only what is the same in every state (the federal rule, if there is one). Do not give any one state\'s number as theirs. Then end with exactly one short question: \\"Which state is the job in?\\""',
    '    ? "JOB STATE: not known, and this answer changes with the state. Give in one or two lines only what is the same in every state (the federal rule, if there is one, as the MINIMUM: say in a few words that some states set a stricter rule). Do not give any one state\'s number as theirs. Then end with exactly one short question: \\"Which state is the job in?\\""')

# ---- S4 guard fail-safe
rep('gonogo.ts', '  if (!v || typeof v.decides != "boolean") {\n    return {\n      text: text + `\n\n` + SAFETY_LINE,',
    '  if (!v || typeof v.decides != "boolean") {\n    // ask_quality_nov22 (review 5): the checker failed or timed out. Fail safe: sentences that read as a go/no-go verdict are\n    // taken out by word match (on entry, readings and trench protection answers), then the safety line is added.\n    const fs = failSafeStrip(text);\n    if (fs.n) return { text: fs.text + `\n\n` + SAFETY_LINE, table, replaced: "sentences", appended: !0, checked: !1 };\n    return {\n      text: text + `\n\n` + SAFETY_LINE,')
rep('gonogo.ts', 'function splitForCheck(t, max = ANSWER_PART_CHARS) {',
    '''// verdict sentences: "it is safe / fine / ok", "you can go in / enter", "readings are good / within limits", "you do not need a box"
const VERDICT_RX = /\\b(you(\\s+are|'re|re)?|it(\\s+is|'s|s)?|that(\\s+is|'s|s)?|this(\\s+is)?|the (trench|space|hole|ditch|excavation|manhole|vault|air|atmosphere|box|shield|shoring|slope|cut|readings?|levels?)|your (trench|space|hole|box|shield|shoring|slope|cut|readings?|levels?|air)|(those|these|the|your) (numbers|readings|levels))\\b[^.!?\\n]{0,40}\\b(is|are|looks?|seems?|sounds?)\\s+(safe|fine|ok|okay|good|acceptable|adequate|enough|sufficient|within (the |safe |acceptable )?(limits?|range)|in range|good to go|clear)\\b|\\b(you|they|he|she|the crew|your crew|your guys)\\s+(can|may|could)\\s+(safely\\s+)?(go in|go down|enter|get in|start (the )?entry|proceed|go ahead)\\b|\\b(safe|ok|okay|fine|good|clear(ed)?)\\s+(to|for)\\s+(enter|entry|go in|go down|get in|work in)\\b|\\bgood to go\\b|\\b(you|they|the crew)\\s+(do not|don't|dont|does not|doesn't|doesnt)\\s+need\\s+(a |any |the )?(box|trench box|shoring|shield|sloping|protection|protective system|permit|monitor\\w*|air test\\w*|attendant)\\b|\\bno (box|shoring|shield|protection|permit) (is )?(needed|required) (here|for (this|your))\\b/i;
function failSafeStrip(text) {
  const hits = splitSentences(text).filter((s) => VERDICT_RX.test(s));
  let out = text, said = !1;
  for (const s of [...new Set(hits)]) out = out.split(s).join(said ? "" : INLINE_LINE), said = !0;
  return { text: out.replace(/[ \\t]{2,}/g, " ").replace(/\\n{3,}/g, "\\n\\n").trim(), n: hits.length };
}
function splitForCheck(t, max = ANSWER_PART_CHARS) {''')
rep('gonogo.ts', '  splitForCheck,\n};', '  splitForCheck,\n  failSafeStrip,\n};')
rep('state.ts', 'export function stateDependent(q, rawHits) {\n  const t = String(q || "");\n  if (EMERGENCY.test(t)) return !1;\n  if (DEPENDS.test(t)) return !0;',
    'export function stateDependent(q, rawHits, code) {\n  const t = String(q || "");\n  if (EMERGENCY.test(t)) return !1;\n  if (DEPENDS.test(t)) return !0;\n  if (!code && DEPENDS_SAFETY.test(t)) return !0;')
rep('state.ts', 'dep = stateDependent(question, wide);', 'dep = stateDependent(question, wide, code);')
print('S1-S4 ok')

# ---- S5 routing (step 2): office questions that ask what a rule / spec / best practice says ("how much cover do we need",
#      "how long do we keep the SWPPP reports", "how many times can I renew my ticket") went to MODE business analysis, which drops
#      the job state line and the reply rule. A knowledge word now keeps them in normal Ask unless the question clearly asks about
#      the company's own records (a job number, a time window, "did we", "our crews", a ranking or comparison).
rep('route.ts', 'function isAnalysisQuestion(q) {\n  if (A_HOWTO.test(q) || A_RULE.test(q)) return !1;',
    '''const A_KNOW = /\\b(need(ed|s)?|have to|has to|must|should|supposed to|can (i|we|you|they|my|our)|before (we|i|you) (can|have to|need)|minimum|maximum|max|min|spec\\w*|standard|code|cover|bedding|bury|buried|depth|deep|how (deep|far|close|wide|thick|often|soon)|distance|spacing|psi|pressure|air test|test(ed|ing)? (at|for|before|after)|velocity|notify|report|keep (the|our|these|those|my)?\\s*\\w*\\s*(records?|reports?|logs?|permits?|payroll)|retain|renew\\w*|update (my|the|a) ticket|placards?|hazmat|epa|dot|swppp|best (way|bedding|backfill|practice|method)|sit in the sun|sun|uv|wait (before|after|for))\\b/i,
  A_DATA = /\\b(jobs?\\s+\\d|job\\s+#|\\d{2,4}-\\d{2,4}|this (week|month|quarter|year)|last (week|month|quarter|year)|(past|last) (\\d+|two|three|four|few|couple( of)?) (days|weeks|months)|ytd|year to date|so far|to date|since (monday|tuesday|wednesday|thursday|friday|the start|we started)|did (we|our|my|they|he|she)|have (we|our|they) (laid|done|put|used|logged|called|had)|we('ve| have) (laid|done|put|used|logged|called|had)|our (crews|foremen|pipelayers|production|footage|numbers|runs|delays|hours|downtime)|[A-Z][a-z]+'s (crew|guys)|per (day|week|month|man[- ]?hour|crew|foreman)|compare|comparison|versus|vs\\.?|trend|rank(ing)?|on track|behind schedule)\\b/i;
function isAnalysisQuestion(q) {
  if (A_HOWTO.test(q) || A_RULE.test(q)) return !1;
  if (A_KNOW.test(q) && !A_DATA.test(q)) return !1; // ask_quality_nov22: a rule / spec question, not the company's own numbers''')
print('S5 ok')

# ---- S6 routing: a photo of a STAKE, paint marks or a ticket with "station", "invert", "cut sheet" or "IE" in the question went to the
#      plan reader (no job state line, no reply rule, no web search, the expensive model with thinking). Only plan sheets go there now.
rep('photos.ts', 'function isPlanQuestion(photos, texts) {\n  return photos.length\n    ? photos.some((p) => p.zoom && !p.detail) ? !0 : PLAN_RX.test(String(texts[0] || ""))\n    : !1;\n}',
    '''const STAKE_Q = /\\b(stakes?|lath|hubs?|guard ?stakes?|paint|marks?|markings?|flags?|whiskers?|tickets?|locates?|811|offset|o\\/s|grade ?board|cut(?! ?sheets?)|fill)\\b/i,
  PLAN_STRONG = /\\b(plans?|plan sheets?|drawings?|blue ?prints?|takeoff|take-off|floor plan|site plan|grading plan|profile( view| sheet)?|sheets?|details?|callouts?|foundation|footings?|slab)\\b/i;
function isPlanQuestion(photos, texts) {
  if (!photos.length) return !1;
  if (photos.some((p) => p.zoom && !p.detail)) return !0;
  const t = String(texts[0] || "");
  return PLAN_RX.test(t) && !(STAKE_Q.test(t) && !PLAN_STRONG.test(t)); // ask_quality_nov22: stake / paint / ticket photos stay in Ask
}''')
print('S6 ok')

# ---- S7 search words (step 2): short letter abbreviations ("L/O", "O/S", "C/L") were dropped as single letters, so "what does L/O mean"
#      never reached the stake symbol card; field words: "tab data", "positive response", "re-mark", "hold-down".
rep('_shared/retrieval.ts', '    [/\\bend run\\b/g, "endrun"],\n  ],',
    '''    [/\\bend run\\b/g, "endrun"],
    // ask_quality_nov22: field words
    [/\\btab(?:ulated)? data\\b/g, "tabdata"],
    [/\\bpositive responses?\\b/g, "positiveresponse"],
    [/\\bre-mark(s|ed|ing)?\\b/g, "remark"],
    [/\\bhold[- ]?downs?\\b/g, "holddown"],
  ],''')
rep('_shared/retrieval.ts', '    [.7, ["fine", "penalty", "penalties"]],\n  ],',
    '''    [.7, ["fine", "penalty", "penalties"]],
    [.7, ["remark", "relocate", "refresh"]],
    [.6, ["holddown", "flotation", "buoyancy", "uplift"]],
    [.6, ["positiveresponse", "response"]],
  ],''')
rep('_shared/retrieval.ts', 'const out = [], rx = /(\\d+\\+\\d+(?:\\.\\d+)?)|(\\d{4}\\.\\d+[a-z]?)|(\\d+\\/[a-z]{1,3})|([a-z0-9_]+)/g;',
    'const out = [], rx = /(\\d+\\+\\d+(?:\\.\\d+)?)|(\\d{4}\\.\\d+[a-z]?)|(\\d+\\/[a-z]{1,3})|\\b([a-z]{1,2}\\/[a-z]{1,2})\\b|([a-z0-9_]+)/g; // ask_quality_nov22: "l/o", "o/s", "c/l" kept as one token')
rep('_shared/retrieval.ts', '    const w = m[4];\n    STOP.has(w)',
    '    if (m[4]) {\n      out.push(m[4].replace("/", "_"));\n      continue;\n    }\n    const w = m[5];\n    STOP.has(w)')
print('S7 ok')

# ---- S8 answer text (step 3, read 180+ answers): (a) a quote split off on its own line ('"at least two (2) ... commencing"\n the dig',
#      AR / IL / DE 811 answers; 'FO = fiber optic\n is a ...'): text blocks with no citations and nothing between them were joined with a
#      line break even mid-sentence; now a block that continues a sentence is glued on. (b) prompt words leaking into answers:
#      "Line 1: ...", "(excerpts 2, 6)", "[excerpt 3]" are taken out.
rep('ask.ts', '    out += !any ? t : gap || /^\\s*[*_#>\\s]*TYPE\\s*[*_]*\\s*:/i.test(t) ? (/\\n\\s*$/.test(out) ? "\\n" : "\\n\\n") + t.replace(/^[ \\t]+/, "") : cited ? t : "\\n" + t;',
    '    out += !any ? t : gap || /^\\s*[*_#>\\s]*TYPE\\s*[*_]*\\s*:/i.test(t) ? (/\\n\\s*$/.test(out) ? "\\n" : "\\n\\n") + t.replace(/^[ \\t]+/, "") : cited ? t : !/[.!?:\\n]["\\u201d\\u2019)\\]]*\\s*$/.test(out) && /^[ \\t]*[a-z(,;\\u2014-]/.test(t) ? t : "\\n" + t; // ask_quality_nov22: a sentence that runs on is glued')
rep('ask.ts', '    let answer = joinAnswerBlocks(final ? final.content || [] : []);',
    '    let answer = cleanLeaks(joinAnswerBlocks(final ? final.content || [] : []));')
rep('ask.ts', 'export const isStall = (t) => {',
    '''// ask_quality_nov22: words from the prompt that must never show in an answer
export function cleanLeaks(t) {
  return String(t || "")
    .replace(/(^|\\n)([ \\t]*(?:[-*\\u2022][ \\t]*)?)(?:\\*\\*)?line ?1(?:\\*\\*)?[ \\t]*[:.\\-\\u2014][ \\t]*/gi, "$1$2")
    .replace(/[ \\t]*\\((?:see |from |per )?(?:the )?excerpts?[ \\t]+[\\d, and&]+\\)/gi, "")
    .replace(/[ \\t]*\\[(?:see |from |per )?(?:the )?excerpts?[ \\t]+[\\d, and&]+\\]/gi, "")
    .replace(/,?[ \\t]+(?:per|see|from)[ \\t]+excerpts?[ \\t]+\\d+(?:[ \\t]*(?:,|and)[ \\t]*\\d+)*/gi, "");
}
export const isStall = (t) => {''')
# (c) the state line asked the model to say "the library does not have <state>'s rule": users read "library" as jargon; say "not confirmed"
rep('state.ts', 'If the excerpts have no ${name} rule for this, say in a few words that the library does not have ${name}\'s rule for it, give the federal rule, and name who to check with (the state\'s OSHA plan, 811 center or agency).',
    'If the excerpts have no ${name} rule for this, give the federal rule as the minimum and say in a few words that ${name}\'s own rule is not confirmed and who to confirm it with (the state\'s OSHA plan, 811 center or agency); never use the words "library", "libraries" or "excerpts".')
rep('state.ts', 'and the library has no ${name} rule for this question. Give the federal rule as the minimum, then one short line: ${name}\'s plan can be stricter, confirm with ${name}\'s OSHA plan.',
    'and no excerpt gives ${name}\'s own rule for this question. Give the federal rule as the minimum, then one short line: ${name}\'s plan can be stricter, confirm with ${name}\'s OSHA plan (never the words "library" or "excerpts").')
print('S8 ok')

# ---- S9 built-in reply rule v8 -> v9 (src_patch/reply_rule_v9.txt). The prompt row's reply_rule element overrides it, so the row
#      changes too (sql/30_prompt_row_v9_next.sql for the test function, promotion/32_prompt_row_v9_live.sql for live).
import json as _json, re as _re
_s = rd('ask.ts'); _m = _re.search(r'const REPLY_RULE = (".*?");\n', _s)
assert _m and _s.count('const REPLY_RULE = ') == 1
_v9 = open(os.path.join(HERE, 'reply_rule_v9.txt')).read()
wr('ask.ts', _s[:_m.start(1)] + _json.dumps(_v9, ensure_ascii=False) + _s[_m.end(1):])
print('S9 ok')

# ---- S10 injury reporting (step 1 national + exception + table): with the job state known (not an emergency), a reporting question
#      carries the state's own sp-<st>-report card (if it has one) and the by-state table osha-pl-report-states-1 (every state on it).
rep('state.ts', 'export const FORCED_CHARS = 2600;',
    'export const FORCED_CHARS = 2600;\n// ask_quality_nov22\nexport const REPORT_TOPIC = /\\b(report\\w*|notify\\w*|call (osha|the state|cal\\/osha|l&i))\\b.{0,50}\\b(injur\\w*|hurt|hospital\\w*|admitted|amputat\\w*|death|fatal\\w*|died|killed|accident|incident|er|emergency room|eye|finger\\w*)\\b|\\b(injur\\w*|hospital\\w*|admitted|amputat\\w*|death|fatal\\w*|died|accident|incident|emergency room|\\ber\\b)\\b.{0,50}\\b(report\\w*|notify\\w*|call (osha|the state))\\b|\\b(do i|do we|have to|need to) call osha\\b/i;')
rep('state.ts', '  if (DIG_TOPIC.test(q)) {\n    const re = code === "CA"',
    '''  if (REPORT_TOPIC.test(q) && !DIG_TOPIC.test(q)) {
    const re = new RegExp(`^sp-${lc}-report`);
    if (!has(re)) { const h = best(re, "injury reporting hospitalization report hours"); h && outC.push({ ...h, score: Math.max(h.score, sc), exc: !0 }); }
    const t = docHit(index, "osha-pl-report-states-1", sc, !1);
    t && outC.push(t);
  }
  if (DIG_TOPIC.test(q)) {
    const re = code === "CA"''')
print('S10 ok')
