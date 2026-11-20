import fs from 'fs';
const { buildIndex, search } = await import('/home/claude/index.html-/tests/staged/ask_nationwide_nov20/work/retrieval.mjs');
const kb = JSON.parse(fs.readFileSync(new URL('../work/kb_after.json', import.meta.url), 'utf8'));
const { index } = buildIndex(kb, 'x'); const S = await import('../work/state.mjs');
for (const q of process.argv.slice(2)) { console.log('==', q); const w = search(index, q, { k: 400, level: 'pipelayer', maxChars: 9e6 }); let n = 0; w.forEach((h, i) => { if (h.lib === 'field' && !S.chunkStates(h).length && n < 5) { n++; console.log('  ', i, h.score.toFixed(1), h.id, '|', h.title.slice(0, 70)); } }); }
