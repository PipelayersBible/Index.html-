# apply_patch_cs.py <src_in> <src_out> [overlay.json]   (library_consolidate_cs_nov21, Nov 21 2026)
# On top of the LIVE source e661cb967ceb (= library_consolidate_nov21/work/src_live: d881 + apply_patch_consol.py, empty overlay).
# Exact-once replacements.
#  A state.ts : confined space questions with a known job state ALWAYS get (1) the job state's own confined space card when it has one
#               (sp-<st>-confined-*) and none of its cards made it, (2) the state table card that names the state (osha-pl-cs-states-1 / -2).
#               Same mechanism as the trench / 811 forcing (topicCards, FORCED_CHARS, exception card sorts with the own cards).
#               A manhole / vault / wet well only counts with an entry or air word ("invert at the upstream manhole" is pipe math).
#  B route.ts : a rule question about 811 / locate tickets ("How long is my locate ticket good for?") is NOT business analysis.
#               The office-level analysis route (A_METRIC "tickets" + A_AGG "how long" + A_OWN "my") sent it to MODE: business analysis,
#               which drops the JOB STATE line and the reply rule (v8: no other-state / "elsewhere" comparisons) while the 811 table card
#               listing every state was in the excerpts: the Cleveland answer compared with California and Iowa.
#  C ask.ts   : defence in depth: an analysis-mode answer with a known job state gets one line (stateLines is still skipped there):
#               only the job state's rule, never another state. The non-analysis path (and its strictest-rule wording) is untouched.
#  D kb_overlay.ts : optional 3rd argument = overlay JSON {rev, base, replace, add, remove} (test function only).
import sys, os, shutil, json
src, out = sys.argv[1], sys.argv[2]
ov = sys.argv[3] if len(sys.argv) > 3 else None
if os.path.exists(out): shutil.rmtree(out)
shutil.copytree(src, out)
def rep(f, old, new, n=1):
    p = os.path.join(out, f); s = open(p).read(); assert s.count(old) == n, (f, old[:70], s.count(old)); open(p, 'w').write(s.replace(old, new))

# ---------------- A: confined space forcing ----------------
rep('state.ts', '''const TRENCH_TABLES = ["osha-pl-trench-states-1", "osha-pl-trench-states-2"];''',
'''const TRENCH_TABLES = ["osha-pl-trench-states-1", "osha-pl-trench-states-2"];
// consolidate_cs (Nov 21): confined space questions carry the job state's confined space card (if any) and the state table card.
export const CS_TOPIC = /\\b(confined[- ]spaces?|permit[- ]required|permit[- ]spaces?|entry permits?|entrants?|entry supervisors?|attendants?|(4|four)[- ]gas|gas (monitor|meter|detector)s?|subpart aa|1926\\.12\\d\\d|1910\\.146)\\b/i;
const CS_SPACE = /\\b(manholes?|vaults?|wet ?wells?|lift stations?|sewers?|tanks?|pits?|culverts?|large pipes?|inside (the|a) pipe)\\b/i;
const CS_ACT = /\\b(enter\\w*|entry|go(ing)? (in|into|down)|get(ting)? (in|into|down)|climb\\w*|inside|lel|lfl|o2|oxygen|h2s|hydrogen sulfide|carbon monoxide|co (level|limit|reading)s?|gas|air (in|inside)|atmospher\\w*|ventilat\\w*|blower|rescue|retrieval|tripod|winch|harness|911)\\b/i;
const CS_GAS = /\\b(lel|lfl|o2|oxygen|h2s|hydrogen sulfide)\\b/i, CS_ENTER = /\\b(enter\\w*|entry|go(ing)? (in|down)|get(ting)? in)\\b/i;
export const csTopic = (q) => CS_TOPIC.test(q) || (CS_SPACE.test(q) && CS_ACT.test(q)) || (CS_GAS.test(q) && CS_ENTER.test(q));
const CS_TABLES = ["osha-pl-cs-states-1", "osha-pl-cs-states-2"];''')
rep('state.ts', '''  if (DIG_TOPIC.test(q)) {
    const re = code === "CA" ?''', '''  if (csTopic(q)) {
    const re = new RegExp(`^sp-${lc}-confined`);
    if (!has(re)) { const h = best(re, "confined space permit entry"); h && outC.push({ ...h, score: Math.max(h.score, sc), exc: !0 }); }
    for (const id of CS_TABLES) {
      const t = docHit(index, id, sc, !1);
      if (t && new RegExp(`\\\\b${name}\\\\b`).test(t.text.replace(/West Virginia/g, code === "WV" ? "West Virginia" : ""))) { outC.push(t); break; }
    }
  }
  if (DIG_TOPIC.test(q)) {
    const re = code === "CA" ?''')
# analysis-mode state line (used by ask.ts, C)
rep('state.ts', '''export function stateLines(st, dependent, own) {''',
'''// consolidate_cs (Nov 21): business-analysis answers skip stateLines and the reply rule; when the job state is known they still must not
// name or compare other states (the excerpts can hold a by-state table card).
export function analysisStateLine(st) {
  const code = st?.code;
  return code ? `JOB STATE: ${US_STATES[code]} (${code}). If the answer uses any rule or legal number from the excerpts, give only ${US_STATES[code]}'s, from its own line; never name another state, give another state's number or compare with other states, "elsewhere" or "most states".` : "";
}
export function stateLines(st, dependent, own) {''')

# ---------------- B: 811 rule questions are not business analysis ----------------
rep('route.ts', '''  A_RULE =
    /\\b(shor(e|ing)|''', '''  A_RULE =
    /\\b(good for|expir\\w*|valid|ticket life|tolerance zone|hand[- ]?dig\\w*|positive response|white[- ]?lin\\w*|dig law|one[- ]?call law|811 (law|rules?)|wait\\w* (before|to) dig|how (long|many days) (do|does|must|should|before) (i|we|you|they)\\b.{0,30}\\b(wait|call|dig)|(call|calling) (811|in (the |my |a )?locates?) (before|ahead)|before (i|we|you) (can )?dig|laws?|rules?|regulations?|shor(e|ing)|''')

# ---------------- C: ask.ts analysis-mode state line ----------------
rep('ask.ts', '''import { addressState, okState, resolveState, stateLines, stateSearch } from "./state.ts";''',
'''import { addressState, analysisStateLine, okState, resolveState, stateLines, stateSearch } from "./state.ts";''')
rep('ask.ts', '''        analysis || plan ? "" : stateLines(st, ss.dependent === "plan" && shelfOwn ? !0 : ss.dependent, ss.own + shelfOwn),''',
'''        plan ? "" : analysis ? analysisStateLine(st) : stateLines(st, ss.dependent === "plan" && shelfOwn ? !0 : ss.dependent, ss.own + shelfOwn),''')

# ---------------- D: overlay content ----------------
if ov:
    o = json.load(open(ov))
    open(os.path.join(out, 'kb_overlay.ts'), 'w').write('// consolidate_cs (library_consolidate_cs_nov21): confined space consolidation laid over the live rows on the test function only (ai-next). Live builds carry an empty overlay.\nexport const OVERLAY = ' + json.dumps(o, ensure_ascii=False) + ';\n')
print('consolidate_cs patch applied ->', out)
