// Retrieval-only eval, no AI calls, no server. For every text eval case: the excerpts the FIRST search hands the model,
//   BEFORE = the live build (b4ad91749f6f): search(q, k=6) then otherStateOnly(title+source+first 300 chars)
//   AFTER  = state.ts stateSearch (chunk's own jurisdiction + a place for the job state's own chunks)
// Score per case = share of the case's `must` facts (regexes) found in the kept excerpts (title + text). 1.0 = every fact is in front of the model.
// Modes:  node evalret.mjs own            each case at its own eval location
//         node evalret.mjs matrix         every case in every state (51) and with no state: "is a location worse?"
//         node evalret.mjs q "<question>" ST    show hits before/after
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const H = path.dirname(fileURLToPath(import.meta.url));
const { buildIndex, search } = await import('/home/claude/index.html-/tests/staged/ask_nationwide_nov20/work/retrieval.mjs');
globalThis.__PLAIN_MIN = process.env.PLAIN || 0; // PLAIN=2 tries the optional plain-language slots
const S = await import(path.join(H, '../work/state.mjs'));
const OLD_STATES = { ...S.US_STATES }; delete OLD_STATES.DC;
const STATE_CUES = { VA: /\b\d+VAC\d/, TX: /\bTCEQ\b|\bTAC\b/, NY: /\bNYCRR\b/, FL: /\bF\.?A\.?C\.?\b/, WA: /\bWAC\b/, OR: /\bOAR\b/ };
function otherStateOnly(text, jobState, question) { // verbatim from live ask.ts:184
  const t = String(text || ""), qq = String(question || "");
  const named = (code) => new RegExp(`\\b${OLD_STATES[code]}\\b`, "i").test(qq) || new RegExp(`\\b${code}\\b`).test(qq);
  if (OLD_STATES[jobState] && new RegExp(`\\b${OLD_STATES[jobState]}\\b`, "i").test(t)) return !1;
  if (jobState !== "CA" ? !1 : /\bTen States\b/i.test(t) && !/ten states/i.test(qq)) return !0;
  for (const code of Object.keys(OLD_STATES)) {
    if (code === jobState) continue;
    const hit = new RegExp(`\\b${OLD_STATES[code]}\\b`).test(t) || (STATE_CUES[code] && STATE_CUES[code].test(t));
    if (hit && !named(code)) return !0;
  }
  return !1;
}
const kbFile = process.env.KB || path.join(H, '../work/kb_live2.json');
const kb = JSON.parse(fs.readFileSync(kbFile, 'utf8'));
const tagsF = path.join(H, '../work/state_tags.json'), tags = !process.env.NOTAGS && fs.existsSync(tagsF) ? JSON.parse(fs.readFileSync(tagsF, 'utf8')) : {};
const stOf = new Map();
for (const l of Object.keys(kb)) for (const c of kb[l]) { delete c._ord; if (tags[c.id] || c.state) stOf.set(c.id, tags[c.id] || c.state); }
for (const f of (process.env.EXTRA || '').split(',').filter(Boolean)) for (const line of fs.readFileSync(f, 'utf8').split('\n')) if (line.trim()) { const c = JSON.parse(line); if (c.state) stOf.set(c.id, c.state); (kb[c.lib || 'field'] ||= []).push(c); }
const { index } = buildIndex(kb, '2026-11-20');
const withState = (hs) => hs.map((h) => (stOf.has(h.id) ? { ...h, state: stOf.get(h.id) } : h));
const srch = (ix, q, o) => withState(search(ix, q, o));
export function before(q, st, level) {
  const hits = search(index, q, { k: 6, level, topicBoost: [], maxChars: 9e3 });
  return st && OLD_STATES[st] ? hits.filter((h) => !otherStateOnly(`${h.title || ""} ${h.source || ""} ${String(h.text || "").slice(0, 300)}`, st, q)) : hits;
}
export function after(q, st, level) {
  const r = S.resolveState({ question: q, addressState: st });
  return S.stateSearch(srch, index, q, { k: 6, level, topicBoost: [], maxChars: 9e3 }, r, q);
}
const re = (m) => new RegExp(m.replace(/\\y/g, '\\b'), 'i');
const cover = (c, hits) => { const t = hits.map((h) => h.title + '\n' + h.text).join('\n'); const ok = c.must.filter((m) => re(m).test(t)).length; return c.must.length ? ok / c.must.length : 1; };
const cases = JSON.parse(fs.readFileSync(path.join(H, process.env.CASES || 'cases_all.json'), 'utf8'));
const mode = process.argv[2] || 'own';
if (mode === 'q') {
  const q = process.argv[3], st = process.argv[4] || null, lv = process.argv[5] || 'pipelayer';
  const show = (hs) => hs.forEach((h) => console.log('   ', (h.score || 0).toFixed(1).padStart(6), h.lib.padEnd(5), (S.chunkStates(h).join(',') || '-').padEnd(5), h.id, '|', String(h.title).slice(0, 80)));
  console.log('BEFORE'); show(before(q, st, lv)); const a = after(q, st, lv); console.log('AFTER  dropped', a.dropped, 'own', a.own, 'dependent', a.dependent); show(a.hits);
} else if (mode === 'own') {
  let b = 0, a = 0, fb = 0, fa = 0; const worse = [], better = [];
  const by = {};
  for (const c of cases) {
    const cb = cover(c, before(c.q, c.st, c.level)), ca = cover(c, after(c.q, c.st, c.level).hits);
    b += cb; a += ca; fb += cb === 1 ? 1 : 0; fa += ca === 1 ? 1 : 0;
    const s = (by[c.st] ||= { n: 0, b: 0, a: 0, fb: 0, fa: 0 }); s.n++; s.b += cb; s.a += ca; s.fb += cb === 1; s.fa += ca === 1;
    if (ca < cb - 1e-9) worse.push(`${c.id} [${c.st}] ${cb.toFixed(2)} -> ${ca.toFixed(2)}  ${c.q}`);
    if (ca > cb + 1e-9) better.push(`${c.id} [${c.st}] ${cb.toFixed(2)} -> ${ca.toFixed(2)}  ${c.q}`);
  }
  console.log(`${cases.length} text cases. All facts in the first excerpts: before ${fb}, after ${fa}. Mean share of facts: before ${(b / cases.length).toFixed(3)}, after ${(a / cases.length).toFixed(3)}`);
  console.log('by eval location (cases | all-facts before -> after | mean before -> after):');
  for (const st of Object.keys(by).sort()) { const s = by[st]; console.log(`  ${st} ${String(s.n).padStart(3)} | ${s.fb} -> ${s.fa} | ${(s.b / s.n).toFixed(2)} -> ${(s.a / s.n).toFixed(2)}`); }
  console.log('BETTER', better.length); better.forEach((x) => console.log('  ' + x));
  console.log('WORSE', worse.length); worse.forEach((x) => console.log('  ' + x));
} else if (mode === 'matrix') {
  // Tommy's rule: a question that does worse because of the location = work to do. Questions that name their own state
  // (or are about a state's own book) are run too; "worse" is measured against the best any location gets.
  const sts = [null, ...Object.keys(S.US_STATES)], rows = [], out = { before: {}, after: {} };
  for (const st of sts) { out.before[st] = { sum: 0, full: 0, worse: [] }; out.after[st] = { sum: 0, full: 0, worse: [] }; }
  for (const c of cases) {
    const B = sts.map((st) => cover(c, before(c.q, st, c.level))), A = sts.map((st) => cover(c, after(c.q, st, c.level).hits));
    // the yardstick: what the case's own eval location gets today (before); a location is "worse" when it gets less than that
    const base = Math.max(B[sts.indexOf(c.st)], A[sts.indexOf(c.st)]);
    sts.forEach((st, i) => {
      out.before[st].sum += B[i]; out.before[st].full += B[i] === 1; if (B[i] < base - 1e-9) out.before[st].worse.push(c.id);
      out.after[st].sum += A[i]; out.after[st].full += A[i] === 1; if (A[i] < base - 1e-9) out.after[st].worse.push(c.id);
    });
  }
  console.log(`${cases.length} cases x ${sts.length} locations. Per location: cases with every fact in the first excerpts (before -> after) | cases doing worse than at their own eval location (before -> after)`);
  for (const st of sts) console.log(`  ${String(st || 'none').padEnd(4)} ${String(out.before[st].full).padStart(3)} -> ${String(out.after[st].full).padStart(3)} | ${String(out.before[st].worse.length).padStart(3)} -> ${String(out.after[st].worse.length).padStart(3)}${process.env.IDS ? '   ' + out.after[st].worse.join(' ') : ''}`);
  const cnt = {}; for (const st of sts) for (const id of out.after[st].worse) cnt[id] = (cnt[id] || 0) + 1;
  const cntB = {}; for (const st of sts) for (const id of out.before[st].worse) cntB[id] = (cntB[id] || 0) + 1;
  console.log('cases still worse somewhere AFTER (case: number of locations; before):'); for (const id of Object.keys(cnt).sort((x, y) => cnt[y] - cnt[x])) console.log(`  ${id}: ${cnt[id]} (before ${cntB[id] || 0})  ${cases.find((c) => c.id === id).q.slice(0, 90)}`);
  fs.writeFileSync(path.join(H, '../work/matrix.json'), JSON.stringify({ cnt, cntB, per: Object.fromEntries(sts.map((st) => [st || 'none', { fullBefore: out.before[st].full, fullAfter: out.after[st].full, worseBefore: out.before[st].worse, worseAfter: out.after[st].worse }])) }));
}
