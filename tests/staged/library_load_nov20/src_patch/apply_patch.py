# apply_patch.py <src_in> <src_out> : library_load_nov20 changes on top of the ask_state build (b7ad788e3a62 source), with or without the
# ask_shelf patch applied first (ask_shelf_nov20/src_patch/apply_patch.py). Exact-once replacements.
#  1 kb.ts        : on the TEST function only (PB_ASK_SLOT === "next") the staged library (src_patch/kb_overlay.ts) is laid over the live
#                   rows in the worker's memory. No library row on the server changes; the live function reads the active version, as before.
#  2 retrieval.ts : an emergency worded the way a crew words it ("confused and stumbling", "caved in on a guy") counts as an injury question,
#                   so first-aid chunks are not ranked down for it.
#  3 ask.ts       : plain-language chunks beside verbatim OSHA text (the ask_state build's optional switch) default to 2 instead of off.
import sys, os, shutil
src, out = sys.argv[1], sys.argv[2]
if os.path.exists(out): shutil.rmtree(out)
shutil.copytree(src, out)
def rep(f, old, new):
    p = os.path.join(out, f); s = open(p).read(); assert s.count(old) == 1, (f, old[:60], s.count(old)); open(p, 'w').write(s.replace(old, new))

REPLY = 'const REPLY_RULE = ' + __import__('json').dumps(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reply_rule.txt')).read().strip()) + ';\n' + 'const pbTrimHits = (hits) => { const v = Number((globalThis.__pbKnobs || {}).verbatimMax) || 0; return v ? hits.map((h) => (h.verbatim && h.text.length > v ? { ...h, text: h.text.slice(0, v) + " \\u2026" } : h)) : hits; };\n'
# 1 ---- kb.ts + kb_overlay.ts (the overlay file is written by tools/mk_overlay.py from out/rows_changed.jsonl)
ov = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kb_overlay.ts')
shutil.copy(ov, os.path.join(out, 'kb_overlay.ts'))
rep('kb.ts', 'import { decodeIndex, encodeIndex } from "./_shared/kb_codec.ts";', """import { decodeIndex, encodeIndex } from "./_shared/kb_codec.ts";
import { OVERLAY } from "./kb_overlay.ts";
// library_load: on the TEST function only, the staged library is laid over the live rows in memory. Nothing is written to the
// server's library and the live function never takes this path. replace = by the id of the live chunk; add = new chunks.
function withOverlay(byLib) {
  const where = new Map();
  for (const lib of Object.keys(byLib)) byLib[lib].forEach((c, i) => where.set(c?.id, [lib, i]));
  let replaced = 0, missing = 0, added = 0;
  for (const [oldId, e] of Object.entries(OVERLAY.replace || {})) {
    const at = where.get(oldId);
    if (!at) { missing++; continue; }
    if (at[0] === e.lib) byLib[at[0]][at[1]] = e.chunk;
    else byLib[at[0]][at[1]] = null, (byLib[e.lib] ||= []).push(e.chunk);
    replaced++;
  }
  const have = new Set();
  for (const lib of Object.keys(byLib)) { byLib[lib] = byLib[lib].filter(Boolean); for (const c of byLib[lib]) have.add(c.id); }
  for (const e of OVERLAY.add || []) if (!have.has(e.chunk.id)) (byLib[e.lib] ||= []).push(e.chunk), have.add(e.chunk.id), added++;
  console.log(JSON.stringify({ ai: "kb_overlay", rev: OVERLAY.rev, replaced, missing, added }));
  return added;
}
const overlayOn = () => globalThis.PB_ASK_SLOT === "next" && OVERLAY && OVERLAY.rev;""")
rep('kb.ts', """        const boot = await admin.rpc("pb_ai_kb_boot", {}),""", """        const lay = overlayOn(), boot = lay ? { error: "overlay: build from rows" } : await admin.rpc("pb_ai_kb_boot", {}),""")
rep('kb.ts', """          const built = buildIndex(await legacyRows(admin, act), String(act.built || "")).index;
          if (built.N !== act.n) throw new Error(`got ${built.N} of ${act.n} rows`);""", """          const rows = await legacyRows(admin, act), nLive = Object.values(rows).reduce((s, v) => s + v.length, 0);
          if (nLive !== act.n) throw new Error(`got ${nLive} of ${act.n} rows`);
          const extra = lay ? withOverlay(rows) : 0, built = buildIndex(rows, String(act.built || "")).index;
          if (built.N !== act.n + extra) throw new Error(`got ${built.N} of ${act.n + extra} rows`);
          lay && (how = "overlay " + OVERLAY.rev);""")
rep('kb.ts', 'KB_VERSION = String(act.version),', 'KB_VERSION = String(act.version) + (lay ? "+" + OVERLAY.rev : ""),')

# 2 ---- retrieval.ts
rep('_shared/retrieval.ts', '|electrocut\\w*|shocked|lightning|struck|sintoma', '|electrocut\\w*|shocked|lightning|struck|confus\\w*|stumbl\\w*|disorient\\w*|slurr\\w*|unresponsive|not breathing|stopped breathing|caved|cave[- ]?in on|trapped|engulf\\w*|dig (him|her|them) out|pull (him|her|them) out|sintoma')

# 2b: emergencies worded as a crew words them: first-aid chunks come first (x1.6), and the words reach the chunks ("confused" = "confusion")
rep('_shared/retrieval.ts', '''      !injury && String(row[3]).trim().toLowerCase() === "first aid" && (s *= .5),''',
    '''      String(row[3]).trim().toLowerCase() === "first aid" && (s *= emergency ? 1.6 : injury ? 1 : .5),''')
rep('_shared/retrieval.ts', '''    injury = isInjuryQuestion(query);
  let qt = tokenize(query);''', '''    injury = isInjuryQuestion(query),
    emergency = EMERG_RX.test(String(query || "").toLowerCase());
  let qt = tokenize(query);''')
rep('_shared/retrieval.ts', '''function isInjuryQuestion(q) {''', '''// a person in trouble right now, in crew words (narrower than INJURY_RX, which also matches "cut" and "eyes")
const EMERG_RX = /\\b(confus\\w*|stumbl\\w*|disorient\\w*|slurr\\w*|unresponsive|not breathing|stopped breathing|pass(ed)? out|unconscious|caved|cave[- ]?in on|collapsed on|buried|trapped|pinned under|engulf\\w*|dig (him|her|them) out|pull (him|her|them) out|bleeding|seizure\\w*|heat ?stroke|electrocut\\w*|got shocked|heart attack|not responding|won'?t wake)\\b/;
function isInjuryQuestion(q) {''')
rep('_shared/retrieval.ts', '''    [.6, ["purveyor", "supplier", "utility"]],''', '''    [.6, ["purveyor", "supplier", "utility"]],
    [.8, ["confused", "confusion", "disoriented"]],
    [.6, ["stumbling", "dizziness", "slurred"]],
    [.8, ["hospital", "hospitalization", "hospitalized"]],
    [.7, ["fine", "penalty", "penalties"]],''')

# 3 ---- ask.ts
rep('ask.ts', 'globalThis.__PLAIN_MIN = Number(Deno.env.get("AI_ASK_PLAIN_MIN") || 0);', 'globalThis.__PLAIN_MIN = Number(Deno.env.get("AI_ASK_PLAIN_MIN") || 2);')
# 4 ---- ask.ts: the per-question reply reminder (last thing the model reads). The Nov 20 trial showed the LENGTH paragraph in the long
#        prompt is not followed; this is Tommy's rule next to the question: answer first, short, one named offer on a complicated subject.
rep('ask.ts', """? "\\nREPLY LENGTH FOR THIS ONE: the first sentence is the answer. Then at most 3 \\"- \\" lines, each one short sentence. Under 100 words in all (a how-to may use numbered steps, under 160 words). No quote longer than one sentence. Nothing after that except, for a safety rule, the one line that their competent person decides on site.\"""",
    '? "\\n" + (globalThis.__pbReply || REPLY_RULE)')
# 5 ---- ask.ts: the reply rule and three excerpt knobs can be tried from pb_ai.prompt_overrides without a new build
#        (extra elements in the teacher_v2 / teacher_v2@next EDITS list; none = built-in)
rep('ask.ts', '    STAKE_GLOSSARY = applyOverride(STAKE_GLOSSARY_BUILTIN, pick("stake_glossary"));', '''    STAKE_GLOSSARY = applyOverride(STAKE_GLOSSARY_BUILTIN, pick("stake_glossary"));
    // library_load: the prompt row's EDITS list may also carry {"reply_rule": "<text>"} and {"knobs": {"exChars": 9000, "verbatimMax": 1800}}
    // (the table only allows the two prompt names, so these ride in the same row; applyOverride ignores them)
    globalThis.__pbReply = null, globalThis.__pbKnobs = {};
    try {
      const row = pick("teacher_v2");
      if (typeof row == "string" && row.startsWith("EDITS")) for (const e of JSON.parse(row.slice(5))) {
        if (e && typeof e.reply_rule == "string" && e.reply_rule.length > 20) globalThis.__pbReply = e.reply_rule;
        if (e && e.knobs && typeof e.knobs == "object") globalThis.__pbKnobs = e.knobs;
      }
    } catch {}''')
rep('ask.ts', 'mergeExcerpts(phone, hits, 9e3)', 'mergeExcerpts(phone, pbTrimHits(hits), Number((globalThis.__pbKnobs || {}).exChars) || 9e3)')
rep('ask.ts', 'globalThis.__PLAIN_MIN = Number(', REPLY + 'globalThis.__PLAIN_MIN = Number(')
# 6 ---- state.ts: a state under federal OSHA (no state plan for private crews): the federal rule IS the rule; no "the library has no <state> rule" line
rep('state.ts', """before answering.` : "";""", """before answering.` : ` ${name} has no state OSHA plan for private crews: on a safety rule (trench, confined space, fall protection, silica) federal OSHA IS ${name}'s rule, so give it plainly and do not say the library lacks a ${name} rule.`;""")
print('patched', out)
