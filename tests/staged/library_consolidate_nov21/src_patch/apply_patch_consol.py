# apply_patch_consol.py <src_in> <src_out> [overlay.json]   (library_consolidate_nov21, Nov 21 2026)
# On top of the LIVE source d881cb695137 (library_load_nov20/work/b7/src10live). Exact-once replacements.
#  A state.ts : trench / excavation and 811 questions with a known job state ALWAYS get
#               (1) the job state's own exception card for that topic when it has one (sp-<st>-trench-* ; dig-<st>-* or ca-dig-alert-* for 811),
#               (2) the by-state table card that lists the state (trench: osha-pl-trench-states-1 / -2; 811: fed-811-wait-1, -ticketlife-1
#                   or -zone-1, picked by what the question asks, wait by default).
#               Extends the lib8 own-plan forcing (that one only fired when no own card made it). The cards are added beside the general
#               excerpts (never push them out), at most 2,600 characters. A forced card counts as the state's own card, so the "plan" line
#               ("the library has no <state> rule") is not used when the table says what the state does. Strictest rule still wins (stateLines).
#  B kb.ts    : the test-function overlay can also REMOVE chunks by id (OVERLAY.remove), so ai-next can run the consolidated library
#               (rows deleted live by the promotion SQL). Live builds carry an empty overlay (rev "") and never take this path.
#  C kb_overlay.ts : optional 3rd argument = overlay JSON {rev, base, replace, add, remove}; without it the overlay stays as in src_in.
import sys, os, shutil, json
src, out = sys.argv[1], sys.argv[2]
ov = sys.argv[3] if len(sys.argv) > 3 else None
if os.path.exists(out): shutil.rmtree(out)
shutil.copytree(src, out)
def rep(f, old, new, n=1):
    p = os.path.join(out, f); s = open(p).read(); assert s.count(old) == n, (f, old[:70], s.count(old)); open(p, 'w').write(s.replace(old, new))

# ---------------- A: topic cards ----------------
rep('state.ts', '''  // The general excerpts are exactly what the plain search gives once other states' chunks are out. The job state's own''',
'''  // consolidate (Nov 21): trench and 811 questions always carry the job state's exception card (if any) and the by-state table card.
  const forced = code && !EMERGENCY.test(qs0) ? topicCards(search, index, qq, opts, code, qs0, own, qTop) : [];
  // The general excerpts are exactly what the plain search gives once other states' chunks are out. The job state's own''')
rep('state.ts', '''  // Plain words beside the rule text: OPTIONAL, off by default.''',
'''  let fchars = 0;
  for (const h of forced) {
    if (seen.has(h.id) || fchars + h.text.length > FORCED_CHARS) continue;
    seen.add(h.id), out.push(h), fchars += h.text.length;
  }
  // Plain words beside the rule text: OPTIONAL, off by default.''')
rep('state.ts', '''  let plainN = out.filter((h) => h.lib === "field" && !chunkStates(h).length).length, plainChars = 0, plain = 0;''',
'''  let plainN = out.filter((h) => h.lib === "field" && !chunkStates(h).length && !forced.some((x) => x.id === h.id)).length, plainChars = 0, plain = 0;''')
rep('state.ts', '''  const ownFirst = new Set(EMERGENCY.test(String(question || "")) ? [] : own.map((h) => h.id));''',
'''  const ownFirst = new Set(EMERGENCY.test(String(question || "")) ? [] : own.map((h) => h.id).concat(forced.filter((h) => h.exc).map((h) => h.id)));''')
rep('state.ts', '''  const ownN = out.filter((h) => own.some((x) => x.id === h.id)).length, dep = stateDependent(question, wide);''',
'''  const ownN = out.filter((h) => own.some((x) => x.id === h.id) || forced.some((x) => x.id === h.id)).length, dep = stateDependent(question, wide);''')
rep('state.ts', '''  return { hits: out, dropped: wide.slice(0, k).filter((h) => !keep(h)).length, own: ownN, plain, dependent: thin ? "plan" : dep };
}''', '''  return { hits: out, dropped: wide.slice(0, k).filter((h) => !keep(h)).length, own: ownN, plain, dependent: thin ? "plan" : dep, forced: forced.map((h) => h.id) };
}
// consolidate (Nov 21): which topic a question is on, and the cards it always carries for the job state.
export const TRENCH_TOPIC = /\\b(trench(es|ing)?|excavat(e|es|ed|ing|ions?)|shor(e|ed|ing)|shields?|trench box(es)?|cave-?ins?|protective systems?)\\b/i;
export const DIG_TOPIC = /\\b(811|one[- ]?call|locates?|locate (ticket|request|marks?)|locators?|dig ?(ticket|law|alert)|tickets?|tolerance zone|hand[- ]?dig\\w*|white[- ]?lin\\w*|positive response|call before you dig|blue ?stakes?|miss ?dig|miss utility|gopher state|julie|sunshine ?811|diggers hotline|okie ?811|dig ?safe|utility marks?)\\b/i;
const TRENCH_TABLES = ["osha-pl-trench-states-1", "osha-pl-trench-states-2"];
const DIG_TABLES = [["fed-811-zone-1", /\\b(tolerance|hand[- ]?dig\\w*|how close|caution zone|inch(es)?|vacuum|pothol\\w*|soft dig\\w*|by hand)\\b/i],
  ["fed-811-ticketlife-1", /\\b(good for|expir\\w*|valid|ticket life|last(s)?|renew\\w*|updat\\w*|extend\\w*|refresh\\w*|how many days .*ticket)\\b/i],
  ["fed-811-wait-1", /\\b(wait\\w*|how (long|soon)|before (i|we|you) (can )?dig|when can|notice|ahead|hours|working days|business days|start digging)\\b/i]];
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
      if (t && new RegExp(`\\\\b${name}\\\\b`).test(t.text.replace(/West Virginia/g, code === "WV" ? "West Virginia" : ""))) { outC.push(t); break; }
    }
  }
  if (DIG_TOPIC.test(q)) {
    const re = code === "CA" ? /^(dig-ca-|ca-dig-alert-)/ : new RegExp(`^dig-${lc}-(?!locatable)`);
    if (!has(re)) { const h = best(re, "811 dig law ticket"); h && outC.push({ ...h, score: Math.max(h.score, sc), exc: !0 }); }
    const pick = (DIG_TABLES.find(([, rx]) => rx.test(q)) || DIG_TABLES[2])[0], t = docHit(index, pick, sc, !1);
    t && outC.push(t);
  }
  return outC;
}''')

# ---------------- B: overlay removals (test function only) ----------------
rep('kb.ts', '''  const have = new Set();
  for (const lib of Object.keys(byLib)) { byLib[lib] = byLib[lib].filter(Boolean); for (const c of byLib[lib]) have.add(c.id); }''',
'''  // consolidate: chunks the promotion SQL deletes are dropped here too (by id)
  const gone = new Set(OVERLAY.remove || []);
  let removed = 0;
  for (const lib of Object.keys(byLib)) byLib[lib] = byLib[lib].map((c) => c && gone.has(c.id) ? (removed++, null) : c);
  const have = new Set();
  for (const lib of Object.keys(byLib)) { byLib[lib] = byLib[lib].filter(Boolean); for (const c of byLib[lib]) have.add(c.id); }''')
rep('kb.ts', '''  console.log(JSON.stringify({ ai: "kb_overlay", rev: OVERLAY.rev, replaced, missing, added }));
  return added;''', '''  console.log(JSON.stringify({ ai: "kb_overlay", rev: OVERLAY.rev, replaced, missing, added, removed }));
  return added - removed;''')

# ---------------- C: overlay content ----------------
if ov:
    o = json.load(open(ov))
    open(os.path.join(out, 'kb_overlay.ts'), 'w').write('// consolidate (library_consolidate_nov21): trench + 811 consolidation laid over the live rows on the test function only (ai-next). Live builds carry an empty overlay.\nexport const OVERLAY = ' + json.dumps(o, ensure_ascii=False) + ';\n')
print('consolidate patch applied ->', out)
