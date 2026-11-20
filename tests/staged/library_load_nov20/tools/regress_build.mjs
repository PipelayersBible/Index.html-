// node tools/regress_build.mjs <kb.json> <out.json> : must-fact share in the excerpts AFTER the 9,000 cut, for the existing eval cases, with the search build in work/
import fs from "node:fs";
const R = await import(new URL("../work/retrieval.mjs", import.meta.url)), S = await import(new URL("../work/state.mjs", import.meta.url));
const cases = JSON.parse(fs.readFileSync(new URL("../../ask_state_nov20/tools/cases_all.json", import.meta.url), "utf8"));
globalThis.__PLAIN_MIN = 2;
const { index } = R.buildIndex(JSON.parse(fs.readFileSync(process.argv[2], "utf8")), "local"), out = {};
for (const c of cases) {
  const r = S.resolveState({ question: c.q, addressState: c.st || null });
  const hits = S.stateSearch(R.search, index, c.q, { k: 6, level: c.level || "pipelayer", topicBoost: [], maxChars: 9e3 }, r, c.q).hits;
  const ex = R.mergeExcerpts([], hits, Number(process.env.EX || 9e3)), text = ex.map((h) => h.title + " " + h.text).join("\n"), m = c.must || [];
  out[c.id] = m.length ? m.filter((x) => { try { return new RegExp(x.replace(/\\[my]/gi, "\\b"), "i").test(text); } catch { return false; } }).length / m.length : 1;
}
fs.writeFileSync(process.argv[3], JSON.stringify(out)); console.log(Object.keys(out).length, "cases;", Object.values(out).filter((v) => v === 1).length, "with every fact");
