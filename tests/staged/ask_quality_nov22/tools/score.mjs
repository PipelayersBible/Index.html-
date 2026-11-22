// score.mjs <moddir> <kb.json> <out.json> [alias.json] : free retrieval check across ALL eval sets (no model calls).
// Search = the build's own code (moddir/retrieval.mjs + state.mjs + route.mjs, esbuild of the build source; tools/mk_mjs.sh).
// Library case passes ("chunk") when one of its chunks is in the excerpts the first search hands the model at the case's `where`;
// "facts" = every must-regex is in those excerpts. Text127: share of must facts. Also: office-level analysis routing per question.
import fs from "node:fs";
const [modDir, kbFile, outFile, aliasFile] = process.argv.slice(2);
const abs = (p) => new URL(p, "file://" + process.cwd() + "/");
const R = await import(abs(modDir + "/retrieval.mjs")), S = await import(abs(modDir + "/state.mjs")), RT = await import(abs(modDir + "/route.mjs"));
globalThis.__PLAIN_MIN = Number(process.env.PLAIN_MIN ?? 2);
const kb = JSON.parse(fs.readFileSync(kbFile, "utf8")), alias = aliasFile ? JSON.parse(fs.readFileSync(aliasFile, "utf8")) : {};
const { index } = R.buildIndex(kb, "local");
const H = "/home/claude/index.html-/tests/staged/ask_quality_nov22/work/cases/";
const sets = (process.env.SETS || "cases_existing cases_consol204 cases_cs cases_cs_states_retr").split(/\s+/).concat((process.env.EXTRA || "").split(/\s+/).filter(Boolean));
const rx = (m) => { try { return new RegExp(m.replace(/\\[my]/gi, "\\b"), "i"); } catch { return null; } };
const out = { sets: {}, text: {} };
for (const set of sets) {
  const cases = fs.readFileSync(H + set + ".jsonl", "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)), res = {};
  for (const c of cases) {
    if (c.tier === "shelf") continue;
    const st = /, [A-Z]{2}$/.test(c.where || "") ? c.where.slice(-2) : null, r = S.resolveState({ question: c.q, addressState: st });
    const ss = S.stateSearch(R.search, index, c.q, { k: 6, level: c.level || "pipelayer", topicBoost: [], maxChars: 9e3 }, r, c.q);
    const ids = ss.hits.map((h) => h.id), want = (c.chunks || []).flatMap((x) => alias[x] || [x]);
    const rank = want.length ? Math.min(...want.map((x) => ids.indexOf(x)).filter((i) => i >= 0), 99) : 0;
    const text = ss.hits.map((h) => h.title + " " + h.text.slice(0, 1800)).join("\n");
    const fok = (c.must || []).every((m) => { const re = rx(m); return re ? re.test(text) : false; });
    res[c.id] = { ok: rank < 99, rank, facts: fok, ids, dep: ss.dependent, own: ss.own, chars: text.length, forced: ss.forced || [], office_analysis: RT.routeAnalysis(c.q, []) };
  }
  out.sets[set] = res;
  const v = Object.values(res);
  console.log(`${set}: ${v.filter((x) => x.ok).length}/${v.length} chunk, ${v.filter((x) => x.facts).length}/${v.length} facts, office->analysis ${v.filter((x) => x.office_analysis).length}`);
}
const tc = JSON.parse(fs.readFileSync(H + "text127.json", "utf8"));
for (const c of tc) {
  const r = S.resolveState({ question: c.q, addressState: c.st || null });
  const ss = S.stateSearch(R.search, index, c.q, { k: 6, level: c.level || "pipelayer", topicBoost: [], maxChars: 9e3 }, r, c.q);
  const text = ss.hits.map((h) => h.title + " " + h.text.slice(0, 1800)).join("\n"), m = c.must || [];
  out.text[c.id] = { s: m.length ? m.filter((x) => { const re = rx(x); return re ? re.test(text) : false; }).length / m.length : 1, ids: ss.hits.map((h) => h.id), chars: text.length, office_analysis: RT.routeAnalysis(c.q, []) };
}
console.log(`text127: all facts ${Object.values(out.text).filter((x) => x.s === 1).length}/${tc.length}, office->analysis ${Object.values(out.text).filter((x) => x.office_analysis).length}`);
fs.writeFileSync(outFile, JSON.stringify(out));
