// Compares the live state filter (title + source + first 300 chars of text) with a proposed one:
//   look only at title + topic for state names and cues, plus California-only cues in title/topic/source.
// For a job in ST (default TX), prints how many chunks each drops and where they differ. Proposal only; no code changed.
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const H = path.dirname(fileURLToPath(import.meta.url)); const st = process.argv[2] || 'TX'; const list = process.argv[3]; process.argv.length = 2;
const { otherStateOnly } = await import('./retr.mjs');
const CA_CUE = /Cal\/OSHA|Caltrans|Greenbook|DigAlert|USA North|\bTitle 8\b|\bTitle 22\b|\bCCR\b|Gov(ernment)? Code 4216|SSPWC|Whitebook|\(California\)/;
export function proposed(h, jobState, q) {
  const tt = `${h.title || ''} ${h.topic || ''}`;
  if (otherStateOnly(tt, jobState, q)) return true;
  if (jobState !== 'CA' && !/california|\bCA\b/i.test(q) && CA_CUE.test(`${tt} ${h.source || ''}`)) return true;
  return false;
}
const kb = JSON.parse(fs.readFileSync(path.join(H, '../work/kb_live.json'), 'utf8'));
let a = 0, b = 0; const nowKept = {}, nowDropped = {};
for (const c of [...kb.app, ...kb.field]) {
  const live = otherStateOnly(`${c.title || ''} ${c.source || ''} ${String(c.text || '').slice(0, 300)}`, st, '');
  const prop = proposed(c, st, '');
  a += live; b += prop;
  if (live && !prop) (nowKept[c.topic] ||= []).push(c._ord);
  if (!live && prop) (nowDropped[c.topic] ||= []).push(c._ord);
}
console.log(`job in ${st}: live filter drops ${a}, proposed drops ${b}`);
const show = (o, label) => { console.log(label, Object.values(o).flat().length); if (list) for (const t of Object.keys(o)) console.log('   ', o[t].length, t.slice(0, 70), o[t].slice(0, 10).join(',')); };
show(nowKept, 'dropped today, kept by the proposal:'); show(nowDropped, 'kept today, dropped by the proposal:');
