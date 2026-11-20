// Existing eval cases (ask_state_nov20/tools/cases_all.json: the 127 live text cases + extras): are the must-facts still in the first
// search's excerpts with the merged library?   node tools/regress.mjs <kb_before.json> <kb_after.json>
import fs from "node:fs";
const R = await import(new URL("../work/retrieval.mjs", import.meta.url)), S = await import(new URL("../work/state.mjs", import.meta.url));
const cases = JSON.parse(fs.readFileSync(new URL("../../ask_state_nov20/tools/cases_all.json", import.meta.url), "utf8"));
const run = (file, plain) => {
  globalThis.__PLAIN_MIN = plain;
  const { index } = R.buildIndex(JSON.parse(fs.readFileSync(file, "utf8")), "local"), out = {};
  for (const c of cases) {
    const r = S.resolveState({ question: c.q, addressState: c.st || null });
    const hits = S.stateSearch(R.search, index, c.q, { k: 6, level: c.level || "pipelayer", topicBoost: [], maxChars: 9e3 }, r, c.q).hits;
    const text = hits.map((h) => h.title + " " + h.text.slice(0, 1800)).join("\n"), m = c.must || [];
    out[c.id] = { s: m.length ? m.filter((x) => { try { return new RegExp(x.replace(/\\[my]/gi, "\\b"), "i").test(text); } catch { return false; } }).length / m.length : 1, ids: hits.map((h) => h.id), chars: text.length };
  }
  return out;
};
const a = run(process.argv[2], 0), b = run(process.argv[3], Number(process.env.PLAIN_MIN ?? 2));
let full = [0, 0], worse = [], better = 0;
for (const c of cases) {
  full[0] += a[c.id].s === 1; full[1] += b[c.id].s === 1;
  if (b[c.id].s < a[c.id].s) worse.push(c); else if (b[c.id].s > a[c.id].s) better++;
}
const avg = (o) => Math.round(Object.values(o).reduce((s, x) => s + x.chars, 0) / cases.length);
console.log(`${cases.length} existing cases: every fact in the excerpts before ${full[0]}, after ${full[1]}; better ${better}, worse ${worse.length}; average excerpt characters ${avg(a)} -> ${avg(b)}`);
for (const c of worse) console.log(`WORSE ${c.id} [${c.st}] "${c.q}" ${a[c.id].s.toFixed(2)} -> ${b[c.id].s.toFixed(2)}\n   before ${a[c.id].ids.join(", ")}\n   after  ${b[c.id].ids.join(", ")}`);
