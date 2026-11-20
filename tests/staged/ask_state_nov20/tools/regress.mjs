// strict check: any (case, location) where AFTER puts fewer of the case's facts in front of the model than BEFORE
import fs from 'fs';
process.argv[2] = 'none';
const E = await import('./evalret.mjs'); const S = await import('../work/state.mjs');
const cases = JSON.parse(fs.readFileSync(new URL('./' + (process.env.CASES || 'cases_all.json'), import.meta.url), 'utf8'));
const re = (m) => new RegExp(m.replace(/\\y/g, '\\b'), 'i');
const cover = (c, hits) => { const t = hits.map((h) => h.title + '\n' + h.text).join('\n'); return c.must.length ? c.must.filter((m) => re(m).test(t)).length / c.must.length : 1; };
const sts = [null, ...Object.keys(S.US_STATES)]; const by = {}; let n = 0, up = 0;
for (const c of cases) for (const st of sts) { const b = cover(c, E.before(c.q, st, c.level)), a = cover(c, E.after(c.q, st, c.level).hits); if (a < b - 1e-9) { n++; (by[c.id] ||= []).push(st || 'none'); } if (a > b + 1e-9) up++; }
console.log(cases.length * sts.length, 'case x location pairs:', up, 'better,', n, 'worse');
for (const id of Object.keys(by)) console.log(' ', id, by[id].length, by[id].slice(0, 12).join(' '), '|', cases.find((c) => c.id === id).q.slice(0, 80));
