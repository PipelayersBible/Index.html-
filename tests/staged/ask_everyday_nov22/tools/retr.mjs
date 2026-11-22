// retr.mjs <out.json> : free retrieval check (no model calls). Live Ask build 1b8514750e72 search code (src_q, esbuild -> work/m_live)
// on the live library (work/kb_live.json) and on the staged library (work/kb_staged.json), each case raw and with helper-style keywords
// (cases/kw.json, my approximation of intent.ts output). chunk = a case's card is handed to the model; facts = every `must` regex is in the excerpts.
import fs from "node:fs";
const H = "/home/claude/index.html-/tests/staged/ask_everyday_nov22/";
const R = await import(H + "work/m_live/retrieval.mjs"), S = await import(H + "work/m_live/state.mjs");
globalThis.__PLAIN_MIN = 2;
const kw = JSON.parse(fs.readFileSync(H + "cases/kw.json", "utf8"));
const rx = (m) => new RegExp(m, "i");
const out = {};
for (const kbName of ["kb_live", "kb_staged"]) {
  const { index } = R.buildIndex(JSON.parse(fs.readFileSync(H + "work/" + kbName + ".json", "utf8")), "local");
  for (const set of ["cases_review40", "cases_fixes"]) {
    const cases = fs.readFileSync(H + "cases/" + set + ".jsonl", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    for (const mode of ["raw", "kw"]) {
      const res = {};
      for (const c of cases) {
        const st = c.where.slice(-2), r = S.resolveState({ question: c.q, addressState: st });
        const sq = mode === "kw" && kw[c.id] ? c.q + " " + kw[c.id] : c.q;
        const ss = S.stateSearch(R.search, index, sq, { k: 6, level: c.level || "pipelayer", topicBoost: [], maxChars: 9e3 }, r, c.q);
        const ids = ss.hits.map((h) => h.id), text = ss.hits.map((h) => h.title + " " + h.text.slice(0, 1800)).join("\n");
        const rank = Math.min(...c.chunks.map((x) => ids.indexOf(x)).filter((i) => i >= 0), 99);
        res[c.id] = { chunk: rank < 99, rank, facts: c.must.every((m) => rx(m).test(text)), first: ids[0], ids, test2: ids.includes("test-2"), test1: ids.includes("test-1") };
      }
      out[`${kbName}|${set}|${mode}`] = res;
      const v = Object.values(res);
      console.log(`${kbName.padEnd(9)} ${set.padEnd(14)} ${mode.padEnd(3)}: chunk ${v.filter((x) => x.chunk).length}/${v.length}, facts ${v.filter((x) => x.facts).length}/${v.length}, test-2 handed ${v.filter((x) => x.test2).length}`);
    }
  }
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 0));
