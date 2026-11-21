# apply_patch_lib8.py <src_in> <src_out> : lib8 fixes (fifth helper, Nov 20 evening) on top of the live source
# (work/b7/src8live = live 8b7042f9dfee). Exact-once replacements.
#  A state.ts : own-plan states (KY, IN, IA, VT, WY, ...) on a safety-rule question: when the question's words do not reach the
#               state's plan card, the state's plan card (sp-<st>-trench-* / sp-<st>-who-1) is added as the state's card, so the
#               answer can name the plan as its source (sa10 Louisville). When the state has no plan card at all, the "plan"
#               line is used (federal minimum + one line: the state's plan can be stricter) instead of the general line.
#               The own-state line asks for the plan named in line 1 even when the rules match.
#  B ask.ts   : web-search answers: text blocks are joined with a paragraph break where a search sat between them or where a
#               block starts with "TYPE:", the model's lead-in before the TYPE line is dropped when it is a stall, and the
#               stall clean-up only drops the stall LINES of a first paragraph (a headline in the same paragraph is kept).
#  C guard.ts : a quote that is word for word in an excerpt the model was given (any card, e.g. a state card quoting its own
#               rule) is not removed as a made-up OSHA quote (lib-sc-sp-1 "[quote removed ...]").
#  D ask.ts   : built-in reply rule = src_patch/reply_rule.txt (v8) (same mechanism as apply_patch.py: the REPLY_RULE constant).
import sys, os, shutil, re
src, out = sys.argv[1], sys.argv[2]
if os.path.exists(out): shutil.rmtree(out)
shutil.copytree(src, out)
def rep(f, old, new, n=1):
    p = os.path.join(out, f); s = open(p).read(); assert s.count(old) == n, (f, old[:70], s.count(old)); open(p, 'w').write(s.replace(old, new))

# ---------------- A: own-plan states ----------------
rep('state.ts', '''    .sort((a, b) => b.score - a.score).slice(0, OWN_SLOTS);
''', '''    .sort((a, b) => b.score - a.score).slice(0, OWN_SLOTS);
  // lib8: an own-plan state, a safety-rule question, and none of the state's cards made it: add the state's plan card
  // (sp-<st>-trench-* first for trench words, else sp-<st>-who-1), so the answer can name the plan as the source.
  if (code && !own.length && PLAN_STATES.includes(code) && SAFETY_RULE.test(String(question || "")) && !EMERGENCY.test(String(question || ""))) {
    const lc = code.toLowerCase(), trenchQ = /\\b(trench|excavat|shor|shield|box|protective|cave|spoil|slop|bench|ladder)/i.test(String(question || ""));
    const rank = (h) => new RegExp(`^sp-${lc}-trench`).test(h.id) ? (trenchQ ? 0 : 2) : new RegExp(`^sp-${lc}-who-`).test(h.id) ? 1 : 9;
    const pc = search(index, qq + " " + US_STATES[code] + " state OSHA plan", { ...opts, k: 80, maxChars: 9e6, stats: void 0 })
      .filter((h) => rank(h) < 9 && keep(h)).sort((a, b) => rank(a) - rank(b) || b.score - a.score)[0];
    pc && (own = [{ ...pc, score: Math.max(pc.score, qTop * OWN_MIN) }]);
  }
''')
rep('state.ts', '''  const thin = !dep && !ownN && PLAN_STATES.includes(code) && SAFETY_RULE.test(String(question || "")) && !EMERGENCY.test(String(question || ""))
    && !kept.some((h) => chunkStates(h).includes(code) && h.score >= top * OWN_MIN * 0.5);''',
'''  // lib8: an own-plan state with no card of its own for a safety rule always gets the "plan" line (was: only when the question
  // did not look state-dependent, so "depth for a trench box" in Indiana got the general line and named no state)
  const thin = !ownN && PLAN_STATES.includes(code) && SAFETY_RULE.test(String(question || "")) && !EMERGENCY.test(String(question || ""));''')
rep('state.ts', '''search_knowledge once with "${name}" and the topic before answering.` :''',
'''search_knowledge once with "${name}" and the topic before answering. On a safety rule name ${name}'s plan as the source in line 1 even when it matches federal, e.g. "(${name}'s OSHA plan, same as federal 29 CFR 1926.652)".` :''')

# ---------------- B: web-search answer text ----------------
rep('ask.ts', '''    // web search answers come split into many text blocks at each citation; those join with nothing between
    let answer = finalText.map((c) => c.text).join(finalText.some((c) => Array.isArray(c.citations) && c.citations.length) ? "" : `
`);''', '''    // web search answers come split into many text blocks at each citation; those join with nothing between.
    // lib8: but a block after a search (a non-text block between) or a block that starts with "TYPE:" starts a new paragraph,
    // and a stall lead-in before the TYPE line ("... so I'll check the web.") is dropped (sw1, lib-us-osha-94).
    let answer = joinAnswerBlocks(final ? final.content || [] : []);''')
rep('ask.ts', '''      const paras = String(parsed.text || "").trim().split(/\\n\\s*\\n/);
      while (paras.length > 1 && isStall(paras[0]) && paras.slice(1).join(" ").length > 40) paras.shift();''',
'''      const paras = String(parsed.text || "").trim().split(/\\n\\s*\\n/);
      // lib8: a first paragraph of several lines loses only its leading stall lines (its headline stays)
      for (let lines; paras.length && (lines = paras[0].split("\\n")).length > 1 && isStall(lines[0]) && lines.slice(1).join(" ").trim().length > 20;) paras[0] = lines.slice(1).join("\\n");
      while (paras.length > 1 && isStall(paras[0]) && !paras[0].includes("\\n") && paras.slice(1).join(" ").length > 40) paras.shift();''')
rep('ask.ts', '''export const isStall = (t) => {''', '''// lib8: the final answer's text blocks, joined (see the call site)
export function joinAnswerBlocks(content) {
  const blocks = Array.isArray(content) ? content : [];
  const cited = blocks.some((c) => c?.type === "text" && Array.isArray(c.citations) && c.citations.length);
  let out = "", gap = !1, any = !1;
  for (const c of blocks) {
    if (c?.type !== "text") { any && (gap = !0); continue; }
    const t = String(c.text || "");
    out += !any ? t : gap || /^\\s*[*_#>\\s]*TYPE\\s*[*_]*\\s*:/i.test(t) ? (/\\n\\s*$/.test(out) ? "\\n" : "\\n\\n") + t.replace(/^[ \\t]+/, "") : cited ? t : "\\n" + t;
    any = !0, gap = !1;
  }
  // text before the TYPE line that is only a lead-in ("The libraries don't give it, so I'll check the web.") goes
  const m = out.match(/(^|\\n)[ \\t]*[*_#>]*[ \\t]*TYPE[ \\t]*[*_]*[ \\t]*:[^\\n]*/i);
  if (m && m.index > 0) {
    const pre = out.slice(0, m.index).trim();
    pre && pre.length < 500 && isStall(pre) && (out = out.slice(m.index).replace(/^\\n+/, ""));
  }
  return out;
}
export const isStall = (t) => {''')

# ---------------- C: quote check ----------------
rep('guard.ts', '''      if (inAll(q, hay)) return "ok";
      if (oshaAttributed(whole, offset, src)) return "bad";''', '''      if (inAll(q, hay)) return "ok";
      // lib8: word for word in an excerpt the model was given (a state card quoting its own rule): not a made-up quote
      if (anyText.length && inAll(q, anyText)) return "ok";
      if (oshaAttributed(whole, offset, src)) return "bad";''')
rep('guard.ts', '''    qn = opts.question ? norm(opts.question) : "",''', '''    qn = opts.question ? norm(opts.question) : "",
    anyText = Object.values(opts.cites || {}).filter((c) => c && c.text).map((c) => norm(c.text)),''')

# ---------------- D: built-in reply rule ----------------
rr = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reply_rule.txt')).read().strip()
p = os.path.join(out, 'ask.ts'); s = open(p).read()
m = re.search(r'const REPLY_RULE = (`(?:[^`\\]|\\.)*`);', s)
assert m, 'REPLY_RULE not found'
s = s[:m.start(1)] + '`' + rr.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${') + '`' + s[m.end(1):]
open(p, 'w').write(s)
print('lib8 patch applied ->', out)
