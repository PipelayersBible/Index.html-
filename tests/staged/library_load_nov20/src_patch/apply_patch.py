# apply_patch.py <src_in> <src_out> : library_load_nov20 changes on top of the ask_state build (b7ad788e3a62 source). Exact-once replacements.
#  1 kb.ts        : on the TEST function only (PB_ASK_SLOT === "next") the library version comes from the row "kb@next" in pb_ai.prompt_overrides
#                   ({"version","n","rev"}); the worker reloads when that row changes (checked at most once a minute). Live reads the active version, as before.
#  2 retrieval.ts : an emergency worded the way a crew words it ("confused and stumbling", "caved in on a guy") counts as an injury question,
#                   so first-aid chunks are not ranked down for it.
#  3 ask.ts       : plain-language chunks beside verbatim OSHA text (the ask_state build's optional switch) default to 2 instead of off.
import sys, os, shutil
src, out = sys.argv[1], sys.argv[2]
if os.path.exists(out): shutil.rmtree(out)
shutil.copytree(src, out)
def rep(f, old, new):
    p = os.path.join(out, f); s = open(p).read(); assert s.count(old) == 1, (f, old[:60], s.count(old)); open(p, 'w').write(s.replace(old, new))

# 1 ---- kb.ts
rep('kb.ts', 'let KB = null, KB_VERSION = "", KB_RETRY_AT = 0, KB_LOADING = null, KB_SAVING = null;',
 '''let KB = null, KB_VERSION = "", KB_RETRY_AT = 0, KB_LOADING = null, KB_SAVING = null;
// library_load: the test function reads its own library version. Pointer row "kb@next" = {"version":"<12 hex>","n":<rows>,"rev":"<any>"}.
let NEXT_PTR = null, NEXT_RAW = "", NEXT_AT = 0, NEXT_LOADED = "";
async function nextPointer(admin) {
  if (globalThis.PB_ASK_SLOT !== "next") return null;
  if (Date.now() - NEXT_AT < 6e4) return NEXT_PTR;
  NEXT_AT = Date.now();
  try {
    const { data, error } = await Promise.race([admin.rpc("pb_ai_prompt_overrides", {}), new Promise((r) => setTimeout(() => r({ data: null, error: "timeout" }), 2500))]);
    if (error || !Array.isArray(data)) return NEXT_PTR;
    const raw = String(data.find((x) => x && x.name === "kb@next")?.text || "");
    if (raw === NEXT_RAW) return NEXT_PTR;
    let p = null;
    try { p = JSON.parse(raw); } catch {}
    NEXT_RAW = raw, NEXT_PTR = p && /^[0-9a-f]{12}$/.test(String(p.version)) && Number.isInteger(p.n) && p.n > 0 ? { version: String(p.version), n: p.n, rev: String(p.rev || "") } : null;
  } catch {}
  return NEXT_PTR;
}''')
rep('kb.ts', '''function kb(admin) {
  return KB
    ? Promise.resolve(KB)''', '''function kb(admin) {
  return globalThis.PB_ASK_SLOT === "next" ? kbNext(admin) : kbLive(admin);
}
async function kbNext(admin) {
  const p = await nextPointer(admin), key = p ? p.version + "/" + p.n + "/" + p.rev : "";
  if (key !== NEXT_LOADED && !KB_LOADING) KB = null, KB_VERSION = "", KB_RETRY_AT = 0, NEXT_LOADED = key; // the pointer moved: load that library
  return kbLive(admin, p);
}
function kbLive(admin, ptr) {
  return KB
    ? Promise.resolve(KB)''')
rep('kb.ts', '''        const boot = await admin.rpc("pb_ai_kb_boot", {}),''', '''        const boot = ptr ? { error: "next pointer" } : await admin.rpc("pb_ai_kb_boot", {}),''')
rep('kb.ts', '''        else {
          const { data, error } = await admin.rpc("pb_ai_kb_active", {});''', '''        else if (ptr) act = { version: ptr.version, n: ptr.n, built: ptr.rev }, how = "next";
        else {
          const { data, error } = await admin.rpc("pb_ai_kb_active", {});''')
rep('kb.ts', 'KB_VERSION = String(act.version),', 'KB_VERSION = String(act.version) + (ptr && ptr.rev ? "." + ptr.rev : ""),')

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
print('patched', out)
