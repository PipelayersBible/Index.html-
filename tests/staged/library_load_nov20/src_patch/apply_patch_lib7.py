# apply_patch_lib7.py <src_in> <src_out> : lib7 changes (Tommy, Nov 20 14:47) on top of apply_patch.py's output. Exact-once replacements.
#  A ask.ts      : a continuation turn ("yes", "go on", "the table please") searches with the thread's ORIGINAL question + the part the last
#                  answer offered (so the first turn's cards come back and the offered table/list is pulled in), and the model is told to
#                  deliver that part in full. General, not per topic.
#  B state.ts    : STRICTEST rule: the state lines tell the model to give the stricter of the state and federal rule and name its source;
#                  never a weaker rule because it is the state's; never name another state. The job state's first card and the best general
#                  card go first (so the federal side is not cut by the 10,000-character excerpt limit).
#  C prompts_v2  : the two by-jurisdiction paragraphs (air limits; labor law) say the same: the stricter rule wins.
#  D ask.ts      : the go/no-go rule-only line: stricter rule first; 20 ft and deeper = registered professional engineer.
#  E gonogo.ts   : apply_patch_guardsplit.py (run first; it is also the minimal build's fix)
#  F ask.ts      : built-in reply rule = src_patch/reply_rule.txt (v7), via apply_patch.py (unchanged mechanism).
import sys, os, shutil
src, out = sys.argv[1], sys.argv[2]
if os.path.exists(out): shutil.rmtree(out)
shutil.copytree(src, out)
def rep(f, old, new, n=1):
    p = os.path.join(out, f); s = open(p).read(); assert s.count(old) == n, (f, old[:70], s.count(old)); open(p, 'w').write(s.replace(old, new))

# ---------------- A: continuation turns ----------------
rep('ask.ts', 'globalThis.__PLAIN_MIN = Number(', r'''// lib7 (Tommy, Nov 20: "fix that 2 left out tables and prevent it from happening in the future with other topics"):
// a continuation turn has no topic of its own. It searches with the thread's ORIGINAL question plus the part the last answer offered,
// so the first turn's cards come back (same search words) and the offered table or list is found; the model is told to deliver it.
const CONT_START = /^\s*(y(es|eah|ep|up|a|ea)?|yess+|sure|ok(ay)?|k|please|pls|go (on|ahead)|keep going|continue|more|the rest|rest of it|all of it|show me|give me|send (it|me)|let'?s (see|have)|i do|i would|that would help|definitely|absolutely|of course|sounds good|go for it|do it|please do|si|sí|claro|dale)\b/i;
const OFFER_LEAD = /^\s*(do you )?(want|need|should i|would you like)\b/i;
export function continuationOf(q, history) {
  const h = Array.isArray(history) ? history : [];
  if (!h.length) return null;
  const t = String(q || "").trim(), words = t.split(/\s+/).filter(Boolean).length;
  const lastA = String(h[0]?.a || h[0]?.body || "");
  const lastLine = lastA.trim().split(/\n/).map((x) => x.replace(/^[-*\s]+/, "").trim()).filter(Boolean).pop() || "";
  const offer = /\?\s*$/.test(lastLine) && OFFER_LEAD.test(lastLine) ? lastLine : "";
  if (!(words <= 8 && CONT_START.test(t)) && !(offer && words <= 3 && !/\?\s*$/.test(t))) return null;
  let orig = "";
  for (const x of h) { const qq = String(x?.q || "").trim(); if (qq && !(qq.split(/\s+/).length <= 8 && CONT_START.test(qq))) { orig = qq; break; } }
  if (!orig) return null;
  const part = offer.replace(OFFER_LEAD, "").replace(/^\s*(me to )?(give|show|list|go through|walk you through)?\s*(you )?(the rest|more|the details)?\s*(on|of|for)?\s*[:,-]?\s*/i, "").replace(/\?\s*$/, "").trim();
  return { orig: orig.slice(0, 300), part: part.slice(0, 200), q: [part, orig.slice(0, 300)].filter(Boolean).join(" ") };
}
globalThis.__PLAIN_MIN = Number(''')
rep('ask.ts', '''    earlier = earlierBlock(hist),''', '''    earlier = earlierBlock(hist),
    cont = continuationOf(q, body.history),
    qSearch = cont ? cont.q + " " + q : q, // lib7: what the library is searched with (a continuation searches its thread's topic)''')
rep('ask.ts', 'shelfSearch(s.admin, q, st.code, { ...SHELF_FIRST, index: kbP })', 'shelfSearch(s.admin, qSearch, st.code, { ...SHELF_FIRST, index: kbP })', 2)
rep('ask.ts', '''        ? stateSearch(search, index, intent?.search ? q + " " + intent.search : q, {''', '''        ? stateSearch(search, index, intent?.search ? qSearch + " " + intent.search : qSearch, {''')
rep('ask.ts', '''          stats: kst,
        }, st, q)''', '''          stats: kst,
        }, st, cont ? cont.q : q)''')
rep('ask.ts', '''        // v28: the length rule again, last, where the model follows it best''', '''        cont ? "CONTINUATION: this message accepts what your last answer offered" + (cont.part ? ` (\\"${cleanUntrusted(cont.part, 200)}\\")` : "") + `, on the question \\"${cleanUntrusted(cont.orig, 300)}\\". Give that part now, in full and from the excerpts: every row of a table, every item of a list, every step, with the numbers. Do not repeat what the last answer said and do not start over. If no excerpt has it, say in one line which document has it; never say it did not come through.` : "",
        // v28: the length rule again, last, where the model follows it best''')

# ---------------- B: state.ts, strictest rule ----------------
rep('state.ts', '''    if (dependent === "plan") return `${head} ${name} runs its own OSHA plan, which can be stricter than federal OSHA, and the library has no ${name} rule for this question. Answer with the federal rule as usual, then add one short line that says this is the federal rule, the library does not have ${name}'s own rule for it, and to confirm with ${name}'s OSHA plan. Never give another state's number as theirs. Do not ask which state.`;''',
'''    if (dependent === "plan") return `${head} ${name} runs its own OSHA plan, which must be at least as protective as federal OSHA and can be stricter, and the library has no ${name} rule for this question. Give the federal rule as the minimum, then one short line: ${name}'s plan can be stricter, confirm with ${name}'s OSHA plan. Never give another state's number or name another state. Do not ask which state.`;''')
rep('state.ts', '''Use it only if the answer changes by state (811 rules, a state OSHA plan, breaks, pay or heat rules, state specs); then answer for ${name} and never give another state's number as theirs.''',
'''Use it only if the answer changes by state (811 rules, a state OSHA plan, breaks, pay or heat rules, state specs); then give the STRICTEST rule that applies in ${name} (the state's or the federal one, whichever protects the crew more) and say in a few words where it comes from; never give another state's number or name another state.''')
rep('state.ts', '''    return `${head}${plan} Answer for ${name}: lead with the direct answer. Where an excerpt gives ${name}'s own rule or number, lead with it and name the state; give the federal rule beside it in one short clause when there is one. The state must not make the answer longer: its rule takes the place of a general point, it is not added on top, so keep the usual short length. Never give another state's number as theirs.''',
'''    return `${head}${plan} Answer for ${name}: lead with the direct answer. STRICTEST RULE: where ${name}'s own rule and a federal rule (OSHA, MUTCD, EPA) both apply and differ, the answer is the STRICTER one (more protective for the crew and the public), with its source named in a few words: "${name} requires ... (stricter than federal ...)" or "Federal OSHA requires ... (stricter than ${name}'s ...)". If they are the same, say so in a few words. If you cannot tell which is stricter, give both in one short line each and say to follow the stricter. Never give a weaker rule because it is ${name}'s, and never drop a stricter federal rule. A rule only the state has (811 tickets, state specs) is simply ${name}'s rule. The state must not make the answer longer: keep the usual short length. Never give another state's number or name another state, not even as an example.''')
# the job state's first card AND the best general (federal) card lead the excerpts, so neither side falls off the 10,000-character cut
rep('state.ts', '''  out.sort((a, b) => (Number(ownFirst.has(b.id)) - Number(ownFirst.has(a.id))) || b.score - a.score);
''', '''  out.sort((a, b) => (Number(ownFirst.has(b.id)) - Number(ownFirst.has(a.id))) || b.score - a.score);
  if (ownFirst.size && out.length > 2 && ownFirst.has(out[1].id)) { // lib7: strictest rule needs both sides: own card 1, best general card 2
    const g = out.findIndex((h) => !ownFirst.has(h.id));
    if (g > 1) out.splice(1, 0, out.splice(g, 1)[0]);
  }
''')

# ---------------- C: prompts_v2.ts ----------------
rep('prompts_v2.ts', '''and say which one applies to the job in view (its state in job data or the CURRENT RUN; with no job in view, give both and say which state each is for).''',
'''and for the job in view (its state in job data or the CURRENT RUN) lead with the STRICTER of the two and say where it comes from; with no job in view, give both and say which state each is for.''')
rep('prompts_v2.ts', '''Give that state's rule, add the federal rule only where it changes the answer, never mix in other states,''',
'''Give the STRICTER of that state's rule and the federal rule (the one that gives the worker more) and say which it is in a few words, never mix in other states,''')

# ---------------- D: go/no-go rule-only line ----------------
rep('ask.ts', '''give the federal rule and, where an excerpt has it, the job state's own rule), what that rule allows''',
'''give the federal rule and, where an excerpt has it, the job state's own rule, leading with the STRICTER of the two), what that rule allows''')
rep('ask.ts', '''Never say their trench, space or readings are safe, OK or adequate. End with one line''',
'''At 20 ft deep or more, sloping, benching and the protective system must be designed by a registered professional engineer (Table B-1 covers less than 20 ft). Never say their trench, space or readings are safe, OK or adequate. End with one line''')

# ---------------- E: gonogo.ts sentence split: in apply_patch_guardsplit.py (also in the minimal build) ----------------
print('lib7 patched', out)
