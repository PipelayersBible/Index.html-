import fs from 'fs'; process.argv[2] = 'none';
const E = await import('./evalret.mjs');
const cases = JSON.parse(fs.readFileSync(new URL('./cases_all.json', import.meta.url), 'utf8'));
let n = 0, extra = 0, base = 0; for (const c of cases) { const r = E.after(c.q, 'TX', c.level); base += r.hits.reduce((t, h) => t + h.text.length, 0); if (r.plain) { n++; } }
console.log('TX: questions with plain chunks added:', n, 'of', cases.length, '| mean excerpt chars per question:', Math.round(base / cases.length));
