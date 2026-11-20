// Lists KB chunks that carry California-only rules but are NOT removed by the live state filter on a non-California job
// (the filter only looks for a state NAME in title + source + first 300 chars; "Cal/OSHA", "Title 8", "Greenbook",
// "DigAlert", "Caltrans" are not names). Usage: node caleak.mjs [ST]
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const H = path.dirname(fileURLToPath(import.meta.url));
process.argv.splice(2, 0, ''); 
const { otherStateOnly } = await import('./retr.mjs');
const st = process.argv[3] || 'TX';
const kb = JSON.parse(fs.readFileSync(path.join(H, '../work/kb_live.json'), 'utf8'));
const CA = /Cal\/OSHA|Title 8\b|\b8 CCR\b|\bCCR\b|Caltrans|Greenbook|DigAlert|USA North|Gov(ernment)? Code 4216|\bDOSH\b|Wage Order|\bDIR\b|Title 22|SSPWC|Labor Code/;
let n = 0; const rows = [];
for (const lib of ['app', 'field']) for (const c of kb[lib]) {
  const head = `${c.title || ''} ${c.source || ''} ${String(c.text || '').slice(0, 300)}`;
  const all = `${c.title} ${c.source} ${c.text}`;
  if (!CA.test(all)) continue;
  if (otherStateOnly(head, st, '')) continue;
  const m = all.match(CA); const headHit = CA.test(head);
  rows.push([c._ord, c.id, headHit ? 'HEAD' : 'body', (c.topic || '').slice(0, 40), c.title.slice(0, 80)]);
}
for (const r of rows) console.log(r.join(' | '));
console.log(rows.length, 'chunks with California rules kept on a', st, 'job;', rows.filter((r) => r[2] === 'HEAD').length, 'of them California in the first lines');
