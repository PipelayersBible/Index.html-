// Per-location table for NOTES: every text case asked on a job in each state (and with no state).
//   BEFORE = live build + live KB.   AFTER = staged build + KB with sql/01_ask_kb_state_fix.sql.
// "full" = every `must` fact of the case is in the first excerpts. "gap" = general cases (not about one state's own rule)
// that do worse here than at the case's own eval location AFTER  -> Tommy's rule: work to do.
import fs from 'fs'; import { spawnSync } from 'child_process';
const S = await import('../work/state.mjs');
const cases = JSON.parse(fs.readFileSync(new URL('./cases_all.json', import.meta.url), 'utf8'));
const SPECIFIC = new Set(['lo3', 'lo4', 'lo5', 'co1', 'tr6', 'wa2', 'gb1', 'gb2', 'gb3', 'gb4', 'cs5', 'web2', 'brk1', 'brk2', 'brk3', 'brk4', 'nw13', 'nw14', 'nw15', 'nw16', 'nw17', 'nw18', 'nw19', 'nw20', 'nw25', 'nw26', ...Array.from({ length: 12 }, (_, i) => 'nw' + (i + 1))]);
const run = (kb) => { const r = spawnSync('node', ['evalret.mjs', 'matrix'], { env: { ...process.env, KB: kb }, cwd: new URL('.', import.meta.url).pathname, encoding: 'utf8' }); return JSON.parse(fs.readFileSync(new URL('../work/matrix.json', import.meta.url), 'utf8')); };
const B = run('../work/kb_live2.json'), A = run('../work/kb_after.json');
const rows = [], gapCases = {};
for (const st of ['none', ...Object.keys(S.US_STATES)]) {
  const gaps = A.per[st].worseAfter.filter((id) => !SPECIFIC.has(id)); for (const g of gaps) (gapCases[g] ||= []).push(st);
  rows.push(`| ${st} | ${B.per[st].fullBefore} | ${A.per[st].fullAfter} | ${gaps.length} | ${gaps.join(' ')} |`);
}
console.log('| Job in | all facts found BEFORE (of ' + cases.length + ') | AFTER | general cases still worse than at home | which |\n|---|---|---|---|---|\n' + rows.join('\n'));
console.log('\ngeneral cases worse somewhere after:'); for (const g of Object.keys(gapCases)) console.log(' ', g, gapCases[g].length, 'locations |', cases.find((c) => c.id === g).q);
