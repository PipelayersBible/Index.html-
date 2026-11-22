// eval_hits.mjs <new.mjs> <old.mjs>: every eval question in ask_quality_nov22/work/cases (+ ask_everyday_nov22/cases) through the old and
// new instant check: lists questions whose result changed (a normal eval question must not become an emergency).
import fs from "node:fs";
const [nf, of] = process.argv.slice(2);
const N = await import(new URL(nf, "file://" + process.cwd() + "/")), O = await import(new URL(of, "file://" + process.cwd() + "/"));
const qs = new Set();
for (const d of ["/home/claude/index.html-/tests/staged/ask_quality_nov22/work/cases/", "/home/claude/index.html-/tests/staged/ask_everyday_nov22/cases/"])
  for (const f of fs.readdirSync(d)) {
    const s = fs.readFileSync(d + f, "utf8");
    if (f.endsWith(".jsonl")) for (const l of s.split("\n")) { try { const j = JSON.parse(l); if (j.q) qs.add(j.q); } catch {} }
    else if (f.endsWith(".json")) { try { const j = JSON.parse(s); if (Array.isArray(j)) j.forEach((c) => c && c.q && qs.add(c.q)); } catch {} }
  }
let ch = 0, nh = 0, oh = 0;
for (const q of qs) {
  const a = N.pbEmergencyKind(q), b = O.pbEmergencyKind(q);
  if (a) nh++; if (b) oh++;
  const ka = a ? a.key + "/" + a.lang : "-", kb = b ? b.key + "/" + b.lang : "-";
  if (ka !== kb) { ch++; console.log(`old ${kb.padEnd(9)} new ${ka.padEnd(9)} | ${q}`); }
}
console.log(`eval questions ${qs.size}: emergency old ${oh}, new ${nh}, changed ${ch}`);
