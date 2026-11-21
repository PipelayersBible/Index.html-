// Free retrieval check (no AI calls, no server) with the NEXT build's own search (work/retrieval.mjs, work/state.mjs are esbuild copies of
// /home/claude/ask_v24/src/_shared/retrieval.ts and src/state.ts, plus any patch in src_patch/).
//   node tools/retr.mjs <kb.json> <cases.jsonl> [out.json]      KB = {app,field,osha}
// A case passes when one of its `chunks` is among the excerpts the first search hands the model for a job at the case's `where`.
import fs from "node:fs";
const R = await import(new URL("../work/retrieval.mjs", import.meta.url)), S = await import(new URL("../work/state.mjs", import.meta.url));
globalThis.__PLAIN_MIN = Number(process.env.PLAIN_MIN ?? 2);
const kb = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const have = new Set(Object.values(kb).flat().map((c) => c.id));
const { index, problems } = R.buildIndex(kb, "local");
if (problems.length) console.log("index problems:", problems.slice(0, 5));
const cases = fs.readFileSync(process.argv[3], "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
const res = {}, by = {};
for (const c of cases) {
  if (c.tier === "shelf") continue;
  const st = c.where.slice(-2), r = S.resolveState({ question: c.q, addressState: st });
  const ss = S.stateSearch(R.search, index, c.q, { k: 6, level: c.level || "pipelayer", topicBoost: [], maxChars: 9e3 }, r, c.q), hits = ss.hits;
  const ids = hits.map((h) => h.id), rank = Math.min(...(c.chunks || []).map((x) => ids.indexOf(x)).filter((i) => i >= 0), 99);
  const text = hits.map((h) => h.title + " " + h.text.slice(0, 1800)).join("\n");
  const fok = (c.must || []).every((m) => { try { return new RegExp(m.replace(/\\[my]/gi, "\\b"), "i").test(text); } catch { return false; } });
  res[c.id] = { ok: rank < 99, rank, facts: fok, ids, exists: (c.chunks || []).some((x) => have.has(x)), dep: ss.dependent, own: ss.own };
  const k = c.coll || "x"; (by[k] ||= [0, 0, 0])[0] += rank < 99; by[k][1] += fok; by[k][2]++;
}
const v = Object.values(res), n = v.length;
console.log(`${v.filter((x) => x.ok).length} of ${n} get their chunk in the first search; ${v.filter((x) => x.facts).length} of ${n} have every must-fact in the excerpts; ${v.filter((x) => x.ok || x.facts).length} either`);
console.log(Object.entries(by).map(([k, [a, f, t]]) => `${k}: chunk ${a}/${t}, facts ${f}/${t}`).join("   "));
if (process.argv[4]) fs.writeFileSync(process.argv[4], JSON.stringify(res));
