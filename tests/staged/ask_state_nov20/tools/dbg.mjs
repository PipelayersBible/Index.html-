import fs from 'fs';
const { buildIndex, search } = await import('/home/claude/index.html-/tests/staged/ask_nationwide_nov20/work/retrieval.mjs');
const S = await import('../work/state.mjs');
const kb = JSON.parse(fs.readFileSync(new URL('../work/kb_live2.json', import.meta.url), 'utf8'));
const { index } = buildIndex(kb, 'x');
const [q, st, lv] = process.argv.slice(2);
const wide = search(index, q, { k: 400, level: lv || 'pipelayer', maxChars: 9e6 });
console.log('top', wide[0].score.toFixed(1), 'n', wide.length);
wide.forEach((h, i) => { if (S.chunkStates(h).includes(st)) console.log(i, h.score.toFixed(1), h.id, h.title.slice(0, 70)); });
