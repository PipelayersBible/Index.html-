// node tools/q.mjs <kb.json> "<question>" ST   : what the first search hands the model
import fs from "node:fs";
const R = await import(new URL("../work/retrieval.mjs", import.meta.url)), S = await import(new URL("../work/state.mjs", import.meta.url));
globalThis.__PLAIN_MIN = Number(process.env.PLAIN_MIN ?? 2);
const { index } = R.buildIndex(JSON.parse(fs.readFileSync(process.argv[2], "utf8")), "local"), q = process.argv[3], st = process.argv[4] || null;
const r = S.resolveState({ question: q, addressState: st }), ss = S.stateSearch(R.search, index, q, { k: 6, level: "pipelayer", topicBoost: [], maxChars: 9e3 }, r, q);
console.log("state", r.code, r.how, "dependent", ss.dependent, "own", ss.own);
for (const h of ss.hits) console.log(h.score.toFixed(1), h.id, "|", h.title.slice(0, 80), "|", h.topic.slice(0, 30));
if (process.argv[5]) { const w = R.search(index, q, { k: 400, level: "pipelayer", maxChars: 9e6 }); for (const id of process.argv[5].split(",")) { const i = w.findIndex((h) => h.id === id); console.log("rank of", id, i, i >= 0 ? w[i].score.toFixed(1) : ""); } }
