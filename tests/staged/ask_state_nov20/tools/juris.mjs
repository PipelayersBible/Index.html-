// Compares the live state filter (ask.ts:184 otherStateOnly on title+source+first 300 chars) with the new one
// (state.ts keepForState on the chunk's own jurisdiction) over the whole library. node juris.mjs [LIST=1]
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const H = path.dirname(fileURLToPath(import.meta.url));
const S = await import(path.join(H, '../work/state.mjs'));
process.argv.length = 2;
const { otherStateOnly } = await import('/home/claude/index.html-/tests/staged/ask_nationwide_nov20/tools/retr.mjs');
const kb = JSON.parse(fs.readFileSync(path.join(H, '../work/kb_live2.json'), 'utf8'));
const tags = fs.existsSync(path.join(H, '../work/state_tags.json')) ? JSON.parse(fs.readFileSync(path.join(H, '../work/state_tags.json'), 'utf8')) : {};
const all = []; for (const l of Object.keys(kb)) for (const c of kb[l]) all.push({ ...c, lib: l, state: tags[c.id] || c.state });
const per = {}; let jur = 0;
for (const c of all) { const cs = S.chunkStates(c); if (cs.length) jur++; for (const s of cs) per[s] = (per[s] || 0) + 1; }
console.log(all.length, 'chunks;', jur, 'belong to a state;', all.length - jur, 'general/federal');
console.log('per state:', Object.keys(S.US_STATES).map((s) => s + ':' + (per[s] || 0)).join(' '));
for (const st of ['CA', 'TX', 'WA', 'VA', 'WV', 'IA', 'MI']) {
  const back = [], gone = [];
  for (const c of all) {
    const oldKeep = !otherStateOnly(`${c.title || ''} ${c.source || ''} ${String(c.text || '').slice(0, 300)}`, st, '');
    const newKeep = S.keepForState(c, st, []) && !S.tenStatesOnly(c, st, '');
    if (newKeep && !oldKeep) back.push(c); if (!newKeep && oldKeep) gone.push(c);
  }
  console.log(`\n${st}: ${back.length} chunks come back (were hidden), ${gone.length} now hidden (were shown)`);
  if (process.env.LIST === st || process.env.LIST === '1') { for (const c of gone) console.log('  HIDE', c._ord, c.id, '|', c.title.slice(0, 80), '|', (c.topic || '').slice(0, 40), '->', S.chunkStates(c).join(',')); }
  if (process.env.BACK === st) for (const c of back) console.log('  BACK', c._ord, c.id, '|', c.title.slice(0, 70), '| src:', (c.source || '').slice(0, 50));
}
