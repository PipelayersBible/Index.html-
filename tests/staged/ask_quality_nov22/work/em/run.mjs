import fs from "node:fs";
const E = await import("./emergency.mjs"), O = await import("./safety_old.mjs");
const H = "/home/claude/index.html-/tests/staged/ask_quality_nov22/work/";
const read = (f) => fs.readFileSync(H + f, "utf8").split("\n").filter(Boolean);
let miss = 0;
for (const q of read("em/pos.txt")) { const k = E.pbEmergencyKind(q), o = O.localAnswer(q); if (!k) miss++; console.log((k ? k.key + "/" + k.lang : "MISS").padEnd(10), (o && o.kind === "emergency" ? "old:Y" : "old:-"), q); }
console.log("pos miss", miss);
for (const q of read("em/neg.txt")) { const k = E.pbEmergencyKind(q); console.log((k ? "FALSE+ " + k.key : "ok").padEnd(10), q); }
// every eval question
const qs = [];
for (const f of ["cases_existing", "cases_consol204", "cases_cs", "cases_cs_states_retr"]) for (const l of read("cases/" + f + ".jsonl")) qs.push(JSON.parse(l).q);
for (const c of JSON.parse(fs.readFileSync(H + "cases/text127.json"))) qs.push(c.q);
let fp = 0, oldfp = 0;
for (const q of qs) { const k = E.pbEmergencyKind(q), o = O.localAnswer(q); if (o && o.kind === "emergency") oldfp++; if (k) { fp++; console.log("EVAL HIT", k.key, "|", q); } }
console.log("eval questions", qs.length, "new emergency hits", fp, "old", oldfp);
