// General (not state-specific) chunks that the live state filter removes on most jobs only because their SOURCE line or
// first 300 characters name a state (e.g. source "Iowa One Call Excavator Manual", "Virginia 12VAC5-590-1150").
// Usage: node overdrop.mjs  -> list + count by topic. A chunk is "general" when its topic and title name no state.
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const H = path.dirname(fileURLToPath(import.meta.url)); process.argv.length = 2;
const { otherStateOnly } = await import('./retr.mjs');
const kb = JSON.parse(fs.readFileSync(path.join(H, '../work/kb_live.json'), 'utf8'));
const NAMES = /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|Cal\/OSHA|Caltrans|Greenbook|DigAlert|WSDOT|MAG|SUDAS|Clark County|Kansas City|Ten States)\b/;
const by = {}; const rows = [];
for (const c of kb.field) {
  if (NAMES.test(`${c.topic || ''} ${c.title || ''}`)) continue;
  const head = `${c.title || ''} ${c.source || ''} ${String(c.text || '').slice(0, 300)}`;
  const dropped = ['TX', 'OH', 'AZ', 'FL'].filter((s) => otherStateOnly(head, s, '')).length;
  if (dropped < 4) continue;
  const m = `${c.source || ''}`.match(NAMES) ? 'source' : 'text';
  (by[c.topic] ||= []).push(c._ord); rows.push(`${c._ord} | ${m} | ${c.topic.slice(0, 44)} | ${c.title.slice(0, 70)} | src: ${(c.source || '').slice(0, 60)}`);
}
if (process.env.LIST) console.log(rows.join('\n'));
for (const t of Object.keys(by).sort((a, b) => by[b].length - by[a].length)) console.log(String(by[t].length).padStart(3), t.slice(0, 90), by[t].slice(0, 12).join(','));
console.log(rows.length, 'general chunks dropped on TX, OH, AZ and FL jobs');
