// node tools/intent_try.mjs <kb.json> <st> "<question>" "<intent search words>" : excerpts as the build would pick them (score order + 9,000 cut)
import fs from "node:fs";
const R = await import(new URL("../work/retrieval.mjs", import.meta.url)), S = await import(new URL("../work/state.mjs", import.meta.url));
globalThis.__PLAIN_MIN = 2;
const kb = JSON.parse(fs.readFileSync(process.argv[2], "utf8")); const { index } = R.buildIndex(kb, "local");
const [st, q, it] = process.argv.slice(3), r = S.resolveState({ question: q, addressState: st });
const ss = S.stateSearch(R.search, index, it ? q + " " + it : q, { k: 6, level: "pipelayer", topicBoost: [], maxChars: 9e3 }, r, q);
const ex = R.mergeExcerpts([], ss.hits, 9e3);
let c = 0; for (const x of ex) { c += x.text.length; console.log(x.n, x.id, x.text.length, c); }
console.log("own", ss.own, "search ids", ss.hits.map((h) => h.id + ":" + h.score.toFixed(2)).join(" "));
