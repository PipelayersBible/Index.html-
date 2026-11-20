// node kept.mjs ST 'regex' : chunks matching regex that the state filter keeps on a job in ST (shows context)
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const H = path.dirname(fileURLToPath(import.meta.url));
const st = process.argv[2], rx = new RegExp(process.argv[3], 'i'); process.argv.length = 2;
const { otherStateOnly } = await import('./retr.mjs');
const kb = JSON.parse(fs.readFileSync(path.join(H, '../work/kb_live.json'), 'utf8'));
for (const lib of ['app', 'field']) for (const c of kb[lib]) {
  const all = `${c.title} ${c.text}`; const m = all.match(rx); if (!m) continue;
  const head = `${c.title || ''} ${c.source || ''} ${String(c.text || '').slice(0, 300)}`;
  if (otherStateOnly(head, st, '')) continue;
  console.log(c._ord, c.id, '|', c.title.slice(0, 60), '|', all.slice(Math.max(0, m.index - 110), m.index + 150).replace(/\n/g, ' '));
}
