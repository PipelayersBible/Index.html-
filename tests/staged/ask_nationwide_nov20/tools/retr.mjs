// Retrieval-only check of Ask (no AI calls, no server): the live build's own search (ask_v24/src/_shared/retrieval.ts,
// bundled to ../work/retrieval.mjs) over a local copy of the live KB (../work/kb_live.json, from mkkb.py), followed by
// the live state filter (otherStateOnly, copied verbatim from ask_v24/src/ask.ts line 181-196).
// Usage: node retr.mjs "<question>" <ST> [level] [extra.jsonl ...]   -> top 6 hits, the ones the state filter drops marked X
//        node retr.mjs --cases cases.json [extra.jsonl ...]         -> pass/fail per case (want/avoid chunk-id regexes)
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const H = path.dirname(fileURLToPath(import.meta.url));
const { buildIndex, search } = await import(path.join(H, '../work/retrieval.mjs'));
const US_STATES = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming" };
const STATE_CUES = { VA: /\b\d+VAC\d/, TX: /\bTCEQ\b|\bTAC\b/, NY: /\bNYCRR\b/, FL: /\bF\.?A\.?C\.?\b/, WA: /\bWAC\b/, OR: /\bOAR\b/ };
export function otherStateOnly(text, jobState, question) {
  const t = String(text || ""), qq = String(question || "");
  const named = (code) => new RegExp(`\\b${US_STATES[code]}\\b`, "i").test(qq) || new RegExp(`\\b${code}\\b`).test(qq);
  if (US_STATES[jobState] && new RegExp(`\\b${US_STATES[jobState]}\\b`, "i").test(t)) return !1;
  if (jobState !== "CA" ? !1 : /\bTen States\b/i.test(t) && !/ten states/i.test(qq)) return !0;
  for (const code of Object.keys(US_STATES)) {
    if (code === jobState) continue;
    const hit = new RegExp(`\\b${US_STATES[code]}\\b`).test(t) || (STATE_CUES[code] && STATE_CUES[code].test(t));
    if (hit && !named(code)) return !0;
  }
  return !1;
}
const args = process.argv.slice(2);
const kb = JSON.parse(fs.readFileSync(path.join(H, '../work/kb_live.json'), 'utf8'));
const ordOf = new Map();
for (const l of Object.keys(kb)) for (const c of kb[l]) { ordOf.set(c.id, c._ord); delete c._ord; }
const extra = args.filter((a) => a.endsWith('.jsonl'));
for (const f of extra) for (const line of fs.readFileSync(f, 'utf8').split('\n')) if (line.trim()) { const c = JSON.parse(line); kb.field.push(c); ordOf.set(c.id, 'NEW'); }
const { index, problems } = buildIndex(kb, '2026-11-20');
if (problems && problems.length) console.log('index problems:', problems.slice(0, 5));
export function run(q, st, level = 'pipelayer') {
  const hits = search(index, q, { k: 6, level, topicBoost: [], maxChars: 9e3 });
  return hits.map((h) => ({ id: h.id, ord: ordOf.get(h.id), title: h.title, lib: h.lib, score: h.score,
    drop: st ? otherStateOnly(`${h.title || ""} ${h.source || ""} ${String(h.text || "").slice(0, 300)}`, st, q) : false, text: h.text }));
}
if (args[0] === '--cases') {
  const cases = JSON.parse(fs.readFileSync(args[1], 'utf8')); let ok = 0;
  for (const c of cases) {
    const kept = run(c.q, c.st, c.level).filter((h) => !h.drop), ids = kept.map((h) => h.id);
    const want = (c.want || []).every((w) => ids.some((i) => new RegExp(w).test(i)));
    const avoid = (c.avoid || []).filter((w) => ids.some((i) => new RegExp(w).test(i)));
    const pass = want && !avoid.length; ok += pass ? 1 : 0;
    console.log((pass ? 'PASS ' : 'FAIL ') + c.id + ' [' + c.st + '] ' + c.q + (pass ? '' : '\n      got: ' + ids.join(', ') + (avoid.length ? '\n      should not get: ' + avoid.join(', ') : '')));
  }
  console.log(ok + ' of ' + cases.length + ' pass');
} else if (args[0]) {
  for (const h of run(args[0], args[1] || null, args[2] || 'pipelayer')) console.log((h.drop ? 'X ' : '  ') + String(h.ord).padStart(4) + ' ' + h.lib.padEnd(5) + ' ' + (h.score || 0).toFixed(1).padStart(6) + ' ' + h.id + ' | ' + String(h.title).slice(0, 90));
}
