import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const H = path.dirname(fileURLToPath(import.meta.url));
const ords = process.argv.slice(2).map(Number);
const US = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming" };
const CUES = { VA: /\b\d+VAC\d/, TX: /\bTCEQ\b|\bTAC\b/, NY: /\bNYCRR\b/, FL: /\bF\.?A\.?C\.?\b/, WA: /\bWAC\b/, OR: /\bOAR\b/ };
const kb = JSON.parse(fs.readFileSync(path.join(H, '../work/kb_live.json'), 'utf8'));
for (const c of [...kb.app, ...kb.field]) if (ords.includes(c._ord)) {
  const head = `${c.title || ''} ${c.source || ''} ${String(c.text || '').slice(0, 300)}`;
  const hits = Object.keys(US).filter((k) => new RegExp(`\\b${US[k]}\\b`).test(head) || (CUES[k] && CUES[k].test(head)));
  const m = head.match(/\bF\.?A\.?C\.?\b|\bTAC\b/);
  console.log(c._ord, hits.join(','), m ? 'cue:' + JSON.stringify(head.slice(Math.max(0, m.index - 30), m.index + 20)) : '');
}
