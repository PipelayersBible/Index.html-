// which eval questions get one of the job state's own chunks, on a job in ST (to see that unrelated questions get none)
import fs from 'fs';
process.argv[2] = 'none';
const E = await import('./evalret.mjs');
const S = await import('../work/state.mjs');
const cases = JSON.parse(fs.readFileSync(new URL('./cases_all.json', import.meta.url), 'utf8'));
for (const st of (process.env.ST || 'TX,WA').split(',')) { let n = 0; const rows = [];
  for (const c of cases) { const r = E.after(c.q, st, c.level); const own = r.hits.filter((h) => S.chunkStates(h).includes(st)); if (own.length) { n++; rows.push(`  ${c.id}: ${own.map((h) => h.id).join(', ')}  <- ${c.q.slice(0, 70)}`); } }
  console.log(st, n, 'of', cases.length, 'questions get a', st, 'chunk'); if (process.env.LIST) console.log(rows.join('\n')); }
