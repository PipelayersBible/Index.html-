// search_probe.mjs <moddir> <kb.json> : the Ask everyday review's search examples (A ticket, B off-topic state card, D trench,
// G Spanish) through the build's own search (no model calls). Prints the first card, whether the long state instructions would
// be sent (own > 0 or dependent), the forced cards, and the card ids. Each question raw and with helper-style keywords.
import fs from "node:fs";
const [modDir, kbFile] = process.argv.slice(2);
const abs = (p) => new URL(p, "file://" + process.cwd() + "/");
const R = await import(abs(modDir + "/retrieval.mjs")), S = await import(abs(modDir + "/state.mjs"));
globalThis.__PLAIN_MIN = 2;
const { index } = R.buildIndex(JSON.parse(fs.readFileSync(kbFile, "utf8")), "local");
const C = JSON.parse(fs.readFileSync(new URL("./search_cases.json", import.meta.url), "utf8"));
const out = [];
for (const c of C) {
  for (const mode of ["raw", "kw"]) {
    if (mode === "kw" && !c.kw) continue;
    const r = S.resolveState({ question: c.q, addressState: c.st || null });
    const sq = (mode === "kw" ? c.q + " " + c.kw : c.q) + (S.esSearchWords ? S.esSearchWords(c.q) : "");
    const ss = S.stateSearch(R.search, index, sq, { k: 6, level: "pipelayer", topicBoost: [], maxChars: 9e3 }, r, c.q);
    const ids = ss.hits.map((h) => h.id), first = ss.hits[0] || {};
    const long = !!(ss.own || ss.dependent);
    const want = c.want ? new RegExp(c.want) : null, bad = c.bad ? new RegExp(c.bad) : null;
    const okW = want ? ids.some((i) => want.test(i)) : true, okB = bad ? !ids.slice(0, c.badTop || 1).some((i) => bad.test(i)) : true;
    out.push({ id: c.id, mode, first: first.id, long, own: ss.own, dep: ss.dependent, forced: ss.forced, ids, okW, okB });
    console.log(`${(okW && okB) ? "ok  " : "MISS"} ${c.id.padEnd(5)} ${mode.padEnd(3)} ${c.st || "--"} first=${String(first.id).padEnd(34)} long=${long ? "Y" : "n"} own=${ss.own} dep=${ss.dependent} forced=${ss.forced.join(",")} | ${c.q}`);
  }
}
if (process.argv[4]) fs.writeFileSync(process.argv[4], JSON.stringify(out));
