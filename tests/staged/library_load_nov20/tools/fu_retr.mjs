// Free check for continuation turns: what the excerpts hold for turn 2 (old: "yes" + nothing; new: offered part + original question).
// node tools/fu_retr.mjs <kb.json> <cases.json>   cases: [{id, q, where, offer, want:[chunk ids]}]
import fs from "node:fs";
const R = await import(new URL("../work/retrieval.mjs", import.meta.url)), S = await import(new URL("../work/state.mjs", import.meta.url));
globalThis.__PLAIN_MIN = 2;
const kb = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), { index } = R.buildIndex(kb, "local");
const cases = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
let okOld = 0, okNew = 0, okT1 = 0;
for (const c of cases) {
  const st = S.resolveState({ question: c.q, addressState: c.where.slice(-2) });
  const hitsOf = (q) => S.stateSearch(R.search, index, q, { k: 6, level: c.level || "foreman", topicBoost: [], maxChars: 9e3 }, st, q).hits;
  const run = (q) => R.mergeExcerpts([], hitsOf(q), 1e4).map((x) => x.id);
  const cont = (part, orig) => { const a = hitsOf(orig), seen = new Set(a.map((h) => h.id)), b = hitsOf(part.split(" ").length >= 3 ? part : part + " " + orig).filter((h) => !seen.has(h.id)).sort((x, y) => Number(x.lib === "osha") - Number(y.lib === "osha")).slice(0, 3); return R.mergeExcerpts([], [...a, ...b], 14e3).map((x) => x.id); };
  const part = c.offer.replace(/^\s*(do you )?(want|need|should i|would you like)\b/i, "").replace(/^\s*(me to )?(give|show|list|go through|walk you through)?\s*(you )?(the rest|more|the details)?\s*(on|of|for)?\s*[:,-]?\s*/i, "").replace(/\?\s*$/, "").trim();
  const t1 = run(c.q), nw = cont(part, c.q), old = run(c.q.split(" ").slice(0, 0).join(" ") + "yes " + (c.intent || ""));
  const has = (ids) => (c.want || []).some((w) => ids.includes(w));
  okT1 += has(t1); okNew += has(nw); okOld += has(old);
  console.log(`${c.id}  want ${c.want}  turn1:${has(t1) ? "Y" : "n"}  new turn2:${has(nw) ? "Y" : "n"}  [${part}]\n   new: ${nw.join(", ")}`);
}
console.log(`turn1 ${okT1}/${cases.length}; continuation search ${okNew}/${cases.length}`);
