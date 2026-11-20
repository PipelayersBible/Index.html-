// Trench Sloping follows the job's state (Nov 20). Values are the official tables:
//   Federal: 29 CFR 1926 Subpart P App. B Table B-1 (stable rock vertical, A 3/4:1, B 1:1, C 1 1/2:1; under 20 ft).
//   Michigan: MIOSHA Part 9 Table 1 (R 408.40941): solid rock 90, fractured rock 75 (1/4:1), stiff clay 63 (1/2:1),
//     firm clay 56 (2/3:1), previously disturbed 45 (1:1), wet granular 34 (1 1/2:1), saturated granular 26 (2:1),
//     running soil 18 (3:1); engineer over 20 ft (R 408.40942(8)).
//   Washington: WAC 296-155-66403 Table N-1 (same slopes, no short-term Type A row).
// Usage: PB_URL=http://127.0.0.1:98xx/cur.html [PB_BASE=.../base.html] node t_mi1_trench_state.js
const R = __dirname + '/../../../rig/'; const boot = require(R + 'boot'), co = require(R + 'co');
const CUR = process.env.PB_URL || 'http://127.0.0.1:9800/cur.html', BASE = process.env.PB_BASE || '';
const OUT = process.env.PB_OUT || (__dirname + '/../shots'); try { require('fs').mkdirSync(OUT, { recursive: true }); } catch (e) {}
const UID = '00000000-0000-4000-8000-000000000001';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const here = (st) => `;try{localStorage.setItem('pbHereState',JSON.stringify({s:'${st}',at:Date.now()}));}catch(e){}`;
const curJob = (n, name) => `;try{localStorage.setItem('${UID}:pbCurrentJob',${JSON.stringify(JSON.stringify({ job_number: n, name }))});}catch(e){}`;
const srStore = (o) => `;try{localStorage.setItem('pbSr:${UID}',${JSON.stringify(JSON.stringify(o))});}catch(e){}`;
const start = async (url, init) => { const { b, p } = await boot(url, { init: co + (init || '') }); await p.setViewportSize({ width: 390, height: 844 }); return { b, p }; };
const open = (p, viaHome) => p.evaluate(async (viaHome) => { if (viaHome) await pbOpenTrenchCalc(); else pbGoto('trenchCalc'); }, viaHome !== false);
const calc = (p, depth, soil, width) => p.evaluate(([depth, soil, width]) => {
  const s = document.getElementById('trenchSoil'); if (soil) { s.value = soil; s.dispatchEvent(new Event('change', { bubbles: true })); }
  document.getElementById('trenchDepth').value = depth; document.getElementById('trenchBottomW').value = width === undefined ? '3' : width;
  pbCalcTrench();
  const r = document.getElementById('trenchResult'), box = (l) => { const b = [...r.querySelectorAll('.pb-answer-box')].find(x => (x.querySelector('.pb-answer-label') || {}).textContent === l); return b ? ((b.querySelector('.pb-answer-val') || {}).textContent || '').trim() : null; };
  return { soil: s.value, labels: [...r.querySelectorAll('.pb-answer-label')].map(x => x.textContent.trim()), slope: box('Max Allowable Slope'), off: box('Horizontal Offset Each Side'), top: box('Required Top Width'), eng: box('Engineer Required'), text: r.innerText.replace(/\s+/g, ' '), diagram: document.getElementById('trenchDiagram').innerHTML.length };
}, [depth, soil, width]);
const ui = (p) => p.evaluate(() => { const g = (i) => { const e = document.getElementById(i); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }; const l = document.getElementById('trenchRuleLine'), s = document.getElementById('trenchSoil');
  return { lineHidden: !l || l.hidden, name: g('trenchRuleName'), text: g('trenchRuleText'), swap: g('trenchRuleSwap'), opts: [...s.options].map(o => o.value + '=' + o.textContent.trim()), soil: s.value, warnT: g('trenchWarnT'), warnK: g('trenchWarnK'), warnD: (document.getElementById('trenchWarnD') || {}).textContent || '', vert: getComputedStyle(document.getElementById('trenchVertOptWrap')).display, note: g('trenchStateNote'), sw: document.documentElement.scrollWidth, w: document.documentElement.clientWidth }; });
const FED = ['rock=Stable Rock — vertical (90°)', 'A=Type A — 0.75:1 (53°)', 'Ashort=Type A, short-term ≤12 ft, ≤24 hrs — 0.5:1 (63°)', 'B=Type B — 1:1 (45°)', 'C=Type C — 1.5:1 (34°)'];
// depth 10 ft, bottom 3 ft: [soil, slope, offset each side, top width]
const FED10 = [['rock', 'Vertical', '0.00 ft', '3.00 ft'], ['A', '0.75:1', '7.50 ft', '18.00 ft'], ['Ashort', '0.5:1', '5.00 ft', '13.00 ft'], ['B', '1:1', '10.00 ft', '23.00 ft'], ['C', '1.5:1', '15.00 ft', '33.00 ft']];
const MI = ['mi_rock=Solid rock — vertical (90°)', 'mi_frac=Fractured rock — 0.25:1 (75°)', 'mi_stiff=Stiff clay — 0.5:1 (63°)', 'mi_firm=Firm clay — 0.67:1 (56°)', 'mi_dist=Previously disturbed soil — 1:1 (45°)', 'mi_wet=Wet granular soil — 1.5:1 (34°)', 'mi_sat=Saturated granular soil — 2:1 (26°)', 'mi_run=Running soil — 3:1 (18°)'];
const MI10 = [['mi_rock', 'Vertical', '0.00 ft', '3.00 ft', 90], ['mi_frac', '0.25:1', '2.50 ft', '8.00 ft', 75], ['mi_stiff', '0.5:1', '5.00 ft', '13.00 ft', 63], ['mi_firm', '0.67:1', '6.67 ft', '16.33 ft', 56], ['mi_dist', '1:1', '10.00 ft', '23.00 ft', 45], ['mi_wet', '1.5:1', '15.00 ft', '33.00 ft', 34], ['mi_sat', '2:1', '20.00 ft', '43.00 ft', 26], ['mi_run', '3:1', '30.00 ft', '63.00 ft', 18]];
const fedChecks = async (p, tag, noShort) => {
  for (const [soil, slope, off, top] of FED10) { if (noShort && soil === 'Ashort') continue; const r = await calc(p, '10', soil); ok(r.slope === slope && r.off === off && r.top === top, `${tag} federal ${soil} 10 ft: ${r.slope}, ${r.off}, top ${r.top}`); }
  let r = await calc(p, '19.9', 'B'); ok(r.slope === '1:1' && r.off === '19.90 ft', `${tag} federal B 19.9 ft keeps the slope`);
  for (const d of ['20', '25']) { r = await calc(p, d, 'B'); ok(r.eng && !r.slope && !r.off && !r.diagram && /less than 20 feet deep/.test(r.text) && /Table B-1 note 3/.test(r.text), `${tag} federal B ${d} ft: Engineer Required (${r.eng}), no slope, OSHA's note`); }
};
(async () => {
  let b, p, u, r;
  // ---- A) state not known: the federal calculator, nothing added ----
  ({ b, p } = await start(CUR)); await open(p); u = await ui(p);
  ok(u.lineHidden && JSON.stringify(u.opts) === JSON.stringify(FED) && /^OSHA’s table/.test(u.warnT) && /Appendix A/.test(u.warnK), 'state not known: federal soil list and warning, no rule line');
  await fedChecks(p, 'unknown');
  ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs)); await b.close();
  // ---- B) a federal state (Texas): unchanged, the same as the page before ----
  ({ b, p } = await start(CUR, here('TX'))); await open(p); u = await ui(p);
  ok(u.lineHidden && JSON.stringify(u.opts) === JSON.stringify(FED), 'Texas: federal soil list, no rule line');
  await fedChecks(p, 'Texas'); const txText = (await calc(p, '12', 'C')).text, txNote = (await ui(p)).note;
  ok(/Texas/.test(txNote || '') && /where this phone is/.test(txNote || ''), 'Texas: the note under the answer still names the state: ' + (txNote || '').slice(0, 70));
  ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs)); await b.close();
  if (BASE) { ({ b, p } = await start(BASE, here('TX'))); await open(p); const bt = (await calc(p, '12', 'C')).text, bu = await ui(p); ok(bt === txText && bu.note === txNote, 'Texas: answer and note word for word the same as before the change'); await b.close(); }
  // ---- C) Michigan (the phone is there): MIOSHA Part 9 Table 1 ----
  ({ b, p } = await start(CUR, here('MI'))); await open(p); u = await ui(p);
  ok(!u.lineHidden && u.name === 'Michigan rule (MIOSHA Part 9)' && /where this phone is/.test(u.text), 'Michigan: the rule line says so: ' + u.name + ' | ' + u.text);
  ok(JSON.stringify(u.opts) === JSON.stringify(MI), 'Michigan: soil list is Table 1 (8 soils, slopes and angles): ' + u.opts.length);
  ok(u.soil === 'mi_dist' && u.vert === 'none', 'Michigan: starts on previously disturbed soil (1:1); no Type A vertical option');
  ok(/^Michigan’s table/.test(u.warnT) && /competent person decides/.test(u.warnK) && /R 408\.40941/.test(u.warnD) && /R 408\.40942\(8\)/.test(u.warnD) && !/Appendix A|Table B-1/.test(u.warnK + u.warnD), 'Michigan: the warning cites Part 9, not OSHA appendices');
  for (const [soil, slope, off, top, deg] of MI10) { r = await calc(p, '10', soil); ok(r.slope === slope && r.off === off && r.top === top && new RegExp(deg + '° from horizontal').test(r.text) && /Michigan rule \(MIOSHA Part 9\), Table 1/.test(r.text) && r.diagram > 0, `Michigan ${soil} 10 ft: ${r.slope}, ${r.off}, top ${r.top}, ${deg}°`); }
  r = await calc(p, '6', 'mi_firm', ''); ok(r.slope === '0.67:1' && r.off === '4.00 ft' && r.top === null, 'Michigan firm clay 6 ft, no width: offset exactly 4.00 ft (2/3:1), no top width');
  r = await calc(p, '20', 'mi_wet'); ok(r.slope === '1.5:1' && r.off === '30.00 ft' && !r.eng && /more than 20 feet in depth/.test(r.text), 'Michigan 20 ft: Table 1 still answers (rule is "more than 20 feet"), with the engineer line shown');
  for (const d of ['20.1', '25']) { r = await calc(p, d, 'mi_wet'); ok(r.eng === 'Over 20 ft' && !r.slope && !r.off && !r.top && !r.diagram && /R 408\.40942\(8\)/.test(r.text) && /registered professional engineer/.test(r.text) && !/Table B-1/.test(r.text), `Michigan ${d} ft: Engineer Required, no slope, R 408.40942(8)`); }
  u = await ui(p); ok(/Michigan \(where this phone is\)/.test(u.note || '') && /Table 1/.test(u.note || '') && /R 408\.40941/.test(u.note || ''), 'Michigan: note under the answer: ' + (u.note || '').slice(0, 90));
  ok(u.sw <= u.w, 'Michigan: fits 390 px (' + u.sw + ')');
  await calc(p, '10', 'mi_stiff'); await p.screenshot({ path: OUT + '/mi_stiff_10ft.png', fullPage: true });
  // the deep-trench link: 20.04 ft is rounded UP to 20.1 -> engineer
  r = await p.evaluate(async () => { await pbOpenTrenchCalc('review', 20.04, null); await new Promise(r => setTimeout(r, 300)); const x = document.getElementById('trenchResult'); return { d: document.getElementById('trenchDepth').value, l: [...x.querySelectorAll('.pb-answer-label')].map(e => e.textContent.trim()) }; });
  ok(r.d === '20.1' && r.l.includes('Engineer Required') && !r.l.includes('Max Allowable Slope'), 'Michigan: a run point at 20.04 ft opens at 20.1 ft: Engineer Required');
  // switch to the federal table and back
  await open(p); await calc(p, '10', 'mi_stiff'); await p.click('#trenchRuleSwap'); await p.waitForTimeout(150); u = await ui(p);
  ok(u.name === 'Federal OSHA table' && /Michigan has its own rule/.test(u.text) && u.swap === 'Use Michigan Rule' && JSON.stringify(u.opts) === JSON.stringify(FED) && u.soil === 'B', 'Michigan: "Use Federal OSHA Table" gives the federal list (Type B), and says Michigan has its own rule');
  r = await calc(p, '10', 'A'); ok(r.slope === '0.75:1' && r.off === '7.50 ft' && !/Michigan rule/.test(r.text), 'Michigan switched to federal: Type A 10 ft = 0.75:1, 7.50 ft');
  await p.click('#trenchRuleSwap'); await p.waitForTimeout(150); u = await ui(p); ok(u.name === 'Michigan rule (MIOSHA Part 9)' && JSON.stringify(u.opts) === JSON.stringify(MI), 'Michigan: switched back');
  await p.click('#trenchRuleSwap'); await open(p); u = await ui(p); ok(u.name === 'Michigan rule (MIOSHA Part 9)', 'Michigan: opening the calculator again starts on Michigan’s rule');
  const fedSaved = await p.evaluate((uid) => localStorage.getItem(uid + ':lastTrenchSoil'), UID); ok(!/^mi_/.test(String(fedSaved || '')), 'Michigan soil is never saved as the federal last soil (' + fedSaved + ')');
  ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs)); await b.close();
  // ---- D) the job beats the phone: current job picked as Michigan, phone in Ohio; and the other way round ----
  ({ b, p } = await start(CUR, here('OH') + srStore({ jobs: {}, jobs_local: { 'j-9': { code: 'MI', num: 'J-9' } } }) + curJob('J-9', 'Lansing sewer')));
  const cj = await p.evaluate(() => { const v = window.pbCurJobGet(); return v && v.job_number; }); ok(cj === 'J-9', 'current job is J-9 (' + cj + ')');
  await open(p); u = await ui(p); ok(u.name === 'Michigan rule (MIOSHA Part 9)' && /State from the current job/.test(u.text) && u.opts.length === 8, 'job in Michigan, phone in Ohio: Michigan’s rule, from the current job');
  r = await calc(p, '8', 'mi_sat'); u = await ui(p); ok(r.slope === '2:1' && r.off === '16.00 ft' && /Michigan \(the current job\)/.test(u.note || ''), 'job in Michigan: saturated granular 8 ft = 2:1, 16.00 ft; the note says the current job');
  await b.close();
  ({ b, p } = await start(CUR, here('MI') + srStore({ jobs: {}, jobs_local: { 'j-9': { code: 'OH', num: 'J-9' } } }) + curJob('J-9', 'Toledo sewer')));
  await open(p); u = await ui(p);
  ok(u.lineHidden && JSON.stringify(u.opts) === JSON.stringify(FED), 'job in Ohio, phone in Michigan: the federal table'); await b.close();
  // ---- E) company state only ----
  ({ b, p } = await start(CUR, srStore({ co: 'MI', jobs: {}, jobs_local: {} }))); await open(p); u = await ui(p);
  ok(u.name === 'Michigan rule (MIOSHA Part 9)' && /your company’s state/.test(u.text), 'only the company’s state is known (Michigan): Michigan’s rule, and it says where the state came from'); await b.close();
  // ---- F) Washington: federal slopes, no short-term Type A ----
  ({ b, p } = await start(CUR, here('WA'))); await open(p); u = await ui(p);
  ok(u.name === 'Washington rule (WAC 296-155 Part N)' && /no short-term Type A/.test(u.text) && u.swap === null, 'Washington: the rule line: ' + u.text);
  ok(JSON.stringify(u.opts) === JSON.stringify(FED.filter(o => !/^Ashort/.test(o))), 'Washington: the short-term Type A option is gone; the rest is the federal list');
  await fedChecks(p, 'Washington', true);
  r = await p.evaluate(async (uid) => { localStorage.setItem(uid + ':lastTrenchSoil', 'Ashort'); await pbOpenTrenchCalc(); return document.getElementById('trenchSoil').value; }, UID); ok(r === 'B', 'Washington: a saved short-term Type A falls back to Type B (' + r + ')');
  ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs)); await b.close();
  // ---- G) the state table rows ----
  ({ b, p } = await start(CUR)); r = await p.evaluate(() => { const g = (c) => window.pbSrMath.row(c); return { MI: g('MI').trench, MN: g('MN').trench, KY: g('KY').trench, HI: g('HI').trench.ft, WA: g('WA').trench.ft, chk: g('MI').checked, src: g('MI').sources.map(s => s.what).join(' | '), rules: Object.keys(window.PB_TRENCH_RULES.states).join() }; });
  ok(r.MI.ft === 5 && /Part 9/.test(r.MI.text) && /R 408\.40941/.test(r.MI.text) && r.chk === '2026-11-20' && /MIOSHA Part 9/.test(r.src), 'state table: Michigan trench line confirmed with sources');
  ok(r.MN.ft === 5 && r.KY.ft === 5 && /803 KAR 2:415/.test(r.KY.text) && r.HI === null && r.WA === 4, 'state table: Minnesota and Kentucky confirmed (federal rule); unchecked plans and Washington untouched');
  ok(r.rules === 'MI,WA', 'trench rule table rows: ' + r.rules); await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
