// Capacity bench for the Ask in-worker search (no server, no AI calls).
//   node --max-old-space-size=256 tools/bench.mjs <factor>
// Clones the local copy of the live KB <factor> times (new ids, one unique word per clone so the vocabulary grows a little),
// then times what an Ask worker does on a cold start (build, or decode the saved blob) and on each question (search).
import fs from "node:fs";
import { buildIndex, search, tokenize } from "../work/retrieval.mjs";
import { encodeIndex, decodeIndex } from "../work/kb_codec.mjs";
const F = Number(process.argv[2] || 1);
const src = JSON.parse(fs.readFileSync(new URL("../../ask_state_nov20/work/kb_live2.json", import.meta.url)));
const byLib = {};
for (const lib of Object.keys(src)) {
  byLib[lib] = [];
  for (let f = 0; f < F; f++) for (const c of src[lib]) byLib[lib].push(f ? { ...c, id: c.id + "~" + f, text: c.text + " zq" + f + "x" + (c._ord % 97) } : c);
}
const mb = (n) => (n / 1048576).toFixed(1);
const rss0 = process.memoryUsage().rss;
let t = performance.now();
const { index } = buildIndex(byLib, "bench");
const tBuild = performance.now() - t;
const heapBuilt = process.memoryUsage().heapUsed;
t = performance.now();
const json = JSON.stringify(index);
const tJson = performance.now() - t;
let blob = null, tEnc = 0, tDec = 0, decErr = "";
try { t = performance.now(); blob = await encodeIndex(index); tEnc = performance.now() - t; } catch (e) { decErr = "encode: " + e; }
if (blob) { try { t = performance.now(); await decodeIndex(blob, index.N); tDec = performance.now() - t; } catch (e) { decErr = String(e).slice(0, 80); } }
const QS = ["how deep can a trench be before I need a trench box", "how long is my 811 ticket good for", "confined space permit attendant duties",
  "taper length for a lane closure at 45 mph", "minimum cover over water main", "what does OSHA say about ladders in a trench", "do we get a lunch break",
  "how far from the edge do spoil piles have to be", "air monitor alarm set points h2s lel", "flagger station distance sign spacing"];
for (const q of QS) search(index, q, { k: 6, maxChars: 9000 });
t = performance.now();
for (let i = 0; i < 5; i++) for (const q of QS) { search(index, q, { k: 6, maxChars: 9000 }); search(index, q, { k: 20, maxChars: 28000 }); }
const tSearch = (performance.now() - t) / (QS.length * 5);   // one question = first search (k 6) + the model's own search (k 20)
// words that stop counting: the scorer gives a word zero weight once more than IDF_REF (4000) chunks of one library contain it
const dead = {};
for (const term of Object.keys(index.t)) { const p = index.t[term], per = {}; for (let i = 1; i < p.length; i += 2) { const l = index.docs[p[i]][1]; per[l] = (per[l] || 0) + 1; } for (const l in per) if (per[l] > 4000) (dead[l] ||= []).push(term); }
const qterms = [...new Set(QS.flatMap((q) => tokenize(q)))];
const deadQ = qterms.filter((x) => (dead.field || []).includes(x));
console.log(JSON.stringify({ factor: F, chunks: index.N, terms: Object.keys(index.t).length, build_ms: Math.round(tBuild), heap_after_build_mb: mb(heapBuilt),
  index_json_mb: mb(json.length), json_ms: Math.round(tJson), blob_b64_mb: blob ? mb(blob.data.length) : null, blob_parts: blob ? Math.ceil(blob.data.length / 1e6) : null,
  encode_ms: Math.round(tEnc), decode_ms: Math.round(tDec), decode_err: decErr, per_question_search_ms: +tSearch.toFixed(1), rss_mb: mb(process.memoryUsage().rss),
  zero_weight_words_field: (dead.field || []).length, zero_weight_in_test_questions: deadQ }));
