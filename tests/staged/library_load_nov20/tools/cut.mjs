// Free check WITH the 9,000-char excerpt cut (mergeExcerpts) modelled. node tools/cut.mjs <kb.json> <cases.jsonl> [mode] [ids...]
// mode: base (score order, as installed) | ownfirst (job-state cards first)
import fs from "node:fs";
const R = await import(new URL("../work/retrieval.mjs", import.meta.url)), S = await import(new URL("../work/state.mjs", import.meta.url));
globalThis.__PLAIN_MIN = 2;
const kb = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), mode = process.argv[4] || "base", only = new Set(process.argv.slice(5));
const { index } = R.buildIndex(kb, "local");
const cases = fs.readFileSync(process.argv[3], "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
function order(hits) {
  if (mode !== "ownfirst") return hits;
  const own = hits.filter((h) => h.__own), rest = hits.filter((h) => !h.__own);
  return [...own, ...rest];
}
let inS = 0, inC = 0, n = 0, lost = [];
for (const c of cases) {
  if (c.tier === "shelf" || (only.size && !only.has(c.id))) continue;
  const st = c.where.slice(-2), r = S.resolveState({ question: c.q, addressState: st });
  const ss = S.stateSearch(R.search, index, c.q, { k: 6, level: c.level || "pipelayer", topicBoost: [], maxChars: 9e3 }, r, c.q);
  const ex = R.mergeExcerpts([], order(ss.hits), 9e3).map((x) => x.id);
  const ids = ss.hits.map((h) => h.id), a = (c.chunks || []).some((x) => ids.includes(x)), b = (c.chunks || []).some((x) => ex.includes(x));
  n++; inS += a; inC += b; if (a && !b) lost.push(c.id);
  if (only.size) console.log(c.id, "search:", ids.join(","), "\n   after cut:", ex.join(","));
}
console.log(`${mode}: ${n} cases; chunk in search ${inS}; still there after the 9,000 cut ${inC}; lost to the cut ${lost.length}: ${lost.slice(0, 40).join(" ")}`);
