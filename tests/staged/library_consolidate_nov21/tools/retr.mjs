// retr.mjs <state.mjs> <kb.json> <cases.jsonl> <out.json> [alias.json] : free retrieval check (no model calls). Search = the build's own code
// (work/retrieval.mjs = live retrieval.ts; state module = live d881 state.ts or the patched one). A case passes when one of its chunks is
// in the excerpts the first search hands the model for a job at the case's `where`; facts = every must-regex is in those excerpts.
import fs from "node:fs";
const [stateMod, kbFile, caseFile, outFile, aliasFile] = process.argv.slice(2);
const R = await import(new URL("../work/retrieval.mjs", import.meta.url)), S = await import(new URL(stateMod, "file://" + process.cwd() + "/"));
globalThis.__PLAIN_MIN = Number(process.env.PLAIN_MIN ?? 0);
const kb = JSON.parse(fs.readFileSync(kbFile, "utf8")), alias = aliasFile ? JSON.parse(fs.readFileSync(aliasFile, "utf8")) : {};
const { index } = R.buildIndex(kb, "local");
const cases = fs.readFileSync(caseFile, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
const res = {};
for (const c of cases) {
  if (c.tier === "shelf") continue;
  const st = /, [A-Z]{2}$/.test(c.where || "") ? c.where.slice(-2) : null, r = S.resolveState({ question: c.q, addressState: st });
  const ss = S.stateSearch(R.search, index, c.q, { k: 6, level: c.level || "pipelayer", topicBoost: [], maxChars: 9e3 }, r, c.q);
  const ids = ss.hits.map((h) => h.id), want = (c.chunks || []).flatMap((x) => alias[x] || [x]);
  const rank = Math.min(...want.map((x) => ids.indexOf(x)).filter((i) => i >= 0), 99);
  const text = ss.hits.map((h) => h.title + " " + h.text.slice(0, 1800)).join("\n");
  const fok = (c.must || []).every((m) => { try { return new RegExp(m.replace(/\\[my]/gi, "\\b"), "i").test(text); } catch { return false; } });
  res[c.id] = { ok: rank < 99, rank, facts: fok, ids, dep: ss.dependent, own: ss.own, chars: text.length, forced: ss.forced || [] };
}
const v = Object.values(res);
console.log(`${caseFile.split("/").pop()}: ${v.filter((x) => x.ok).length}/${v.length} chunk, ${v.filter((x) => x.facts).length}/${v.length} facts`);
fs.writeFileSync(outFile, JSON.stringify(res));
