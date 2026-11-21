// try.mjs: node tools/try.mjs <kb.json> <cases.jsonl> <ids,comma> [overrides.json]  -> own-state candidates with scores (live build search)
import fs from "node:fs";
const R = await import(new URL("../work/retrieval.mjs", import.meta.url)), S = await import(new URL("../work/state.mjs", import.meta.url));
globalThis.__PLAIN_MIN = 2;
const kb = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (process.argv[5]) { const ov = JSON.parse(fs.readFileSync(process.argv[5], "utf8")); for (const l of Object.values(kb)) for (const c of l) if (ov[c.id]) Object.assign(c, ov[c.id]); }
const { index } = R.buildIndex(kb, "local");
const want = process.argv[4].split(",");
for (const l of fs.readFileSync(process.argv[3], "utf8").split("\n")) {
  if (!l.trim()) continue; const c = JSON.parse(l); if (!want.includes(c.id)) continue;
  const st = c.where.slice(-2), r = S.resolveState({ question: c.q, addressState: st });
  const wide = R.search(index, c.q, { k: 400, maxChars: 9e6, level: c.level || "pipelayer", topicBoost: [] });
  const own = wide.filter((h) => S.chunkStates(h).includes(st)).slice(0, 6).map((h) => `${h.id}:${h.score.toFixed(2)}`);
  const ss = S.stateSearch(R.search, index, c.q, { k: 6, level: c.level || "pipelayer", topicBoost: [], maxChars: 9e3 }, r, c.q);
  console.log(c.id, "|", c.q, "\n  own:", own.join(" "), "\n  hits:", ss.hits.map((h) => h.id).join(" "), "\n  want:", c.chunks.join(" "));
}
