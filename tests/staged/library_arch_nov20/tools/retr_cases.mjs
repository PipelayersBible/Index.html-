// Free retrieval check for library eval cases (no AI calls, no server). Seconds to run.
//   node tools/retr_cases.mjs cases.jsonl [batch.jsonl ...]
// Uses the Ask build's own search plus the staged state-aware first search (ask_state_nov20/work/state.mjs) over the local
// copy of the live library, with the given batches' CORE chunks added. A case passes when one of its `chunks` is among the
// excerpts the first search would hand the model for a job at the case's `where`. Also reports whether its `must` facts are there.
// Shelf chunks are not searched here (Ask cannot see them until the shelf search is built): such cases are listed as "shelf".
import fs from "node:fs";
import { buildIndex, search } from "../work/retrieval.mjs";
const S = await import(new URL("../../ask_state_nov20/work/state.mjs", import.meta.url));
const rd = (f) => fs.readFileSync(f, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
const kb = JSON.parse(fs.readFileSync(process.env.KB || new URL("../../ask_state_nov20/work/kb_live2.json", import.meta.url), "utf8"));
const shelf = new Set(); let added = 0;
for (const f of process.argv.slice(3)) for (const c of rd(f)) {
  if (c.tier === "shelf") { shelf.add(c.id); continue; }
  (kb[c.id.startsWith("osha-19") && c.kind === "verbatim" ? "osha" : "field"] ||= []).push(c); added++;
}
const { index, problems } = buildIndex(kb, "local");
if (problems.length) console.log("index problems:", problems.slice(0, 5));
let pass = 0, facts = 0, n = 0, onShelf = 0; const by = {};
for (const c of rd(process.argv[2])) {
  if ((c.chunks || []).length && c.chunks.every((x) => shelf.has(x))) { onShelf++; continue; }
  n++;
  const st = c.where.slice(-2), r = S.resolveState({ question: c.q, addressState: st });
  const hits = (S.stateSearch(search, index, c.q, { k: 6, level: c.level || "pipelayer", topicBoost: [], maxChars: 9e3 }, r, c.q)).hits;
  const ids = hits.map((h) => h.id), ok = (c.chunks || []).some((x) => ids.includes(x)), text = hits.map((h) => h.title + " " + h.text).join("\n");
  const fok = (c.must || []).every((m) => new RegExp(m.replace(/\\[my]/gi, "\\b"), "i").test(text));
  pass += ok; facts += fok; (by[st] ||= [0, 0])[0] += ok; by[st][1]++;
  if (!ok) console.log(`MISS ${c.id} [${st}] "${c.q}" wanted ${c.chunks} got ${ids.join(", ")}${fok ? "  (facts are in another excerpt)" : ""}`);
}
console.log(`${pass} of ${n} cases get their chunk in the first search; ${facts} of ${n} have every must-fact in the excerpts; ${onShelf} shelf cases skipped; ${added} core chunks added to ${index.N - added} live`);
console.log("by state:", Object.entries(by).sort().map(([s, [a, b]]) => `${s} ${a}/${b}`).join("  "));
