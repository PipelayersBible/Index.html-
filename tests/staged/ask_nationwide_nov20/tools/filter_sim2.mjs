// Proposal P2 for the lead (code, not applied): the state filter looks at TITLE + TOPIC only (not the source line, not the
// first 300 characters of text). Lists, for a job in ST, state-specific chunks that P2 would newly let through, i.e.
// chunks whose title/topic do not name their state: these need the state added to the title before P2 ships.
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const H = path.dirname(fileURLToPath(import.meta.url)); const st = process.argv[2] || 'TX'; process.argv.length = 2;
const { otherStateOnly } = await import('./retr.mjs');
const kb = JSON.parse(fs.readFileSync(path.join(H, '../work/kb_live.json'), 'utf8'));
const STATEY = /Cal\/OSHA|Caltrans|Greenbook|DigAlert|USA North|\bTitle 8\b|\bTitle 22\b|Gov(ernment)? Code 4216|SSPWC|Whitebook|Wage Order|WSDOT|\bMAG\b|SUDAS|ODOT|TCEQ|COMAR|MOSH|DOSH|L&I/;
let live = 0, p2 = 0; const newly = [];
for (const c of [...kb.app, ...kb.field]) {
  const a = otherStateOnly(`${c.title || ''} ${c.source || ''} ${String(c.text || '').slice(0, 300)}`, st, '');
  const b = otherStateOnly(`${c.title || ''} ${c.topic || ''}`, st, '');
  live += a; p2 += b;
  if (a && !b) newly.push(c);
}
const stateSpecific = newly.filter((c) => STATEY.test(`${c.title} ${c.topic} ${c.source}`) || /^(ca-|cal-|gb-|st-|emp-)/.test(c.id));
console.log(`job in ${st}: live filter drops ${live}; title+topic filter drops ${p2}; newly kept ${newly.length}; of those look state-specific: ${stateSpecific.length}`);
for (const c of stateSpecific) console.log('  ', c._ord, c.id, '|', (c.topic || '').slice(0, 50), '|', c.title.slice(0, 70));
