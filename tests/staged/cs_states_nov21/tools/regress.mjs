// regress.mjs <state.mjs> <kb.json> <out.json> : the 127 existing text cases (ask_state_nov20/tools/cases_all.json): share of must-facts in the excerpts.
import fs from "node:fs";
const [stateMod, kbFile, outFile] = process.argv.slice(2);
const R = await import(new URL("../work/retrieval.mjs", import.meta.url)), S = await import(new URL(stateMod, "file://" + process.cwd() + "/"));
globalThis.__PLAIN_MIN = Number(process.env.PLAIN_MIN ?? 0);
const cases = JSON.parse(fs.readFileSync("/home/claude/index.html-/tests/staged/ask_state_nov20/tools/cases_all.json", "utf8"));
const { index } = R.buildIndex(JSON.parse(fs.readFileSync(kbFile, "utf8")), "local"), out = {};
for (const c of cases) {
  const r = S.resolveState({ question: c.q, addressState: c.st || null });
  const ss = S.stateSearch(R.search, index, c.q, { k: 6, level: c.level || "pipelayer", topicBoost: [], maxChars: 9e3 }, r, c.q);
  const text = ss.hits.map((h) => h.title + " " + h.text.slice(0, 1800)).join("\n"), m = c.must || [];
  out[c.id] = { s: m.length ? m.filter((x) => { try { return new RegExp(x.replace(/\\[my]/gi, "\\b"), "i").test(text); } catch { return false; } }).length / m.length : 1, ids: ss.hits.map((h) => h.id), chars: text.length };
}
fs.writeFileSync(outFile, JSON.stringify(out));
console.log(`127 text cases: all facts ${Object.values(out).filter((x) => x.s === 1).length}/${cases.length}`);
