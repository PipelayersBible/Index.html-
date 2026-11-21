// r17.13 feature test: 811 state table fixes, "Report a serious injury" by state, heat / walkway wording,
// Trench Sloping and the cave-in note by the JOB's state (Washington short-term Type A).
// Usage: PB_URL=http://127.0.0.1:104xx/cur.html NODE_PATH=/opt/npm-tools/node_modules node t_r1713.js
const R = '/home/claude/index.html-/tests/rig/'; const boot = require(R + 'boot'), co = require(R + 'co');
const CUR = process.env.PB_URL || 'http://127.0.0.1:10450/cur.html';
const UID = '00000000-0000-4000-8000-000000000001';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const here = (st) => `;try{localStorage.setItem('pbHereState',JSON.stringify({s:'${st}',at:Date.now()}));}catch(e){}`;
const curJob = (n, name) => `;try{localStorage.setItem('${UID}:pbCurrentJob',${JSON.stringify(JSON.stringify({ job_number: n, name }))});}catch(e){}`;
const srStore = (o) => `;try{localStorage.setItem('pbSr:${UID}',${JSON.stringify(JSON.stringify(o))});}catch(e){}`;
const start = async (init) => { const { b, p } = await boot(CUR, { init: co + (init || '') }); await p.setViewportSize({ width: 390, height: 844 }); return { b, p }; };
const ui = (p) => p.evaluate(() => { const g = (i) => { const e = document.getElementById(i); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }; const l = document.getElementById('trenchRuleLine'), s = document.getElementById('trenchSoil');
  return { lineHidden: !l || l.hidden, name: g('trenchRuleName'), text: g('trenchRuleText'), opts: [...s.options].map(o => o.value), soil: s.value, note: g('trenchStateNote'), sw: document.documentElement.scrollWidth, w: document.documentElement.clientWidth }; });
const calc = (p, depth, soil) => p.evaluate(([depth, soil]) => { const s = document.getElementById('trenchSoil'); if (soil) { s.value = soil; s.dispatchEvent(new Event('change', { bubbles: true })); }
  document.getElementById('trenchDepth').value = depth; document.getElementById('trenchBottomW').value = '3'; pbCalcTrench(); return document.getElementById('trenchResult').innerText.replace(/\s+/g, ' '); }, [depth, soil]);
const openTrench = (p) => p.evaluate(async () => { await pbOpenTrenchCalc(); });
(async () => {
  let b, p, u, r;
  // ---------- 1. the 811 table ----------
  ({ b, p } = await start());
  r = await p.evaluate(() => { const S = window.PB_STATE_RULES.states; const g = (c) => S[c];
    return { nc: [g('NC').tol_in, g('NC').tol_text], il: [g('IL').tol_in, g('IL').life.n, g('IL').life.unit, g('IL').note, g('IL').white_text], va: g('VA').notice, pa: [g('PA').notice, g('PA').start, g('PA').life, g('PA').renew, g('PA').white],
      la: [g('LA').tol_in, g('LA').note], ok: [g('OK').tol_in, g('OK').renew], mn: g('MN').white, fl: [g('FL').white, g('FL').emergency], mo: g('MO').note, ky: [g('KY').tol_in, g('KY').tol_text, g('KY').note],
      ga: JSON.stringify(g('GA')), nd: JSON.stringify(g('ND')), checked: ['NC', 'IL', 'VA', 'PA', 'LA', 'OK', 'MN', 'FL', 'MO', 'KY'].map(c => g(c).checked),
      srcOk: ['NC', 'IL', 'VA', 'PA', 'LA', 'OK', 'MN', 'FL', 'MO', 'KY'].every(c => g(c).sources.every(s => /^https:\/\//.test(s.url) && s.what)) }; });
  ok(r.nc[0] === 24 && /outside edge of the mark/.test(r.nc[1]) && !/applies only/.test(r.nc[1]), 'NC tolerance 24 in for every marked line (G.S. 87-117)');
  ok(r.il[0] === 18 && r.il[1] === 25 && r.il[2] === 'wd' && /positive response/.test(r.il[3]) && /black when snow/.test(r.il[4]), 'IL 18 in, 25 working days kept, positive response, black on snow');
  ok(r.va && r.va.n === 3 && r.va.unit === 'wd' && /48 hours/.test(r.va.text), 'VA wait: 48 hours from 7 AM next working day (n 3 wd)');
  ok(r.pa[0] && r.pa[0].n === 3 && r.pa[1].n === 10 && r.pa[2] === null && /2 business days/.test(r.pa[3]) && r.pa[4] === 'conditional', 'PA notice 3-10 business days, no ticket life, renotify after 2 business days away');
  ok(r.la[0] === 18 && r.la[1] === null, 'LA tolerance 18 in, "not confirmed" note gone');
  ok(r.ok[0] === 24 && /4 business days/.test(r.ok[1]), 'OK tolerance 24 in, Extend / Re-Mark 4 business days ahead');
  ok(r.mn === 'required' && r.fl[0] === 'conditional' && /Sunshine 811/.test(r.fl[1]) && /2 hours/.test(r.mo) && r.ky[0] === null && /nonintrusive/.test(r.ky[1]) && /second notice/.test(r.ky[2]), 'MN white required, FL white + emergency, MO 2-hour rule, KY hand-dig + second notice');
  ok(/"notice":null/.test(r.ga) && /could not confirm/.test(r.ga) && /"notice":null/.test(r.nd), 'Georgia and North Dakota untouched');
  ok(r.checked.every(c => c === '2026-11-20') && r.srcOk, 'changed rows: checked 2026-11-20, every source a link');
  r = await p.evaluate(() => ({ va: pbSrMath.canDig('2026-06-01', 'VA'), pa: pbSrMath.canDig('2026-06-01', 'PA'), paStart: pbSrMath.startBy('2026-06-01', 'PA'), paExp: pbSrMath.expires('2026-06-01', 'PA'), ga: pbSrMath.canDig('2026-06-01', 'GA') }));
  ok(r.va === '2026-06-04' && r.pa === '2026-06-04' && r.paStart === '2026-06-15' && r.paExp === '' && r.ga === '', 'dates: VA Mon Jun 1 call -> dig Thu Jun 4; PA dig Thu, latest start Jun 15, no expiry; GA no wait: ' + JSON.stringify(r));
  // ---------- 2a. injury line ----------
  r = await p.evaluate(() => ({ wa: pbInjuryLine('WA'), ca: pbInjuryLine('CA'), tx: pbInjuryLine('TX'), ia: pbInjuryLine('IA'), ny: pbInjuryLine('NY'), none: pbInjuryLine(''), ut: pbInjuryLine('UT'), hi: pbInjuryLine('HI'), ak: pbInjuryLine('AK'), ky: pbInjuryLine('KY') }));
  ok(/L&I/.test(r.wa) && /8 hours for a death or any hospital stay/.test(r.wa) && /WAC 296-27-031/.test(r.wa), 'WA: 8 hours for a hospital stay (WAC 296-27-031)');
  ok(/Cal\/OSHA within 8 hours for any serious injury/.test(r.ca), 'CA: 8 hours any serious injury (8 CCR 342)');
  ok(/OSHA \(1-800-321-6742\) within 8 hours for a death, and within 24 hours/.test(r.tx) && r.tx === r.ny, 'TX and NY (private crews): federal 8 / 24 hours');
  ok(/Iowa OSHA/.test(r.ia) && /877-242-6742/.test(r.ia) && /24 hours for a hospital stay/.test(r.ia), 'IA (875 IAC 4, state_audit_nov21/safety p1): Iowa OSHA 8 h / 24 h');
  ok(/isn’t known: report within 8 hours to be safe/.test(r.none), 'state not known: 8 hours to be safe');
  ok(/801-530-6901/.test(r.ut) && /\$25,000/.test(r.hi) && /AS 18\.60\.058/.test(r.ak) && /803 KAR 2:181/.test(r.ky), 'UT, HI, AK, KY rows');
  // job state, then company
  await b.close();
  ({ b, p } = await start(srStore({ co: 'TX', jobs: { 'j-wa': 'WA' }, jobs_local: {} })));
  r = await p.evaluate(() => ({ job: pbInjuryState('J-WA'), other: pbInjuryState('J-9'), none: pbInjuryState('') }));
  ok(r.job === 'WA' && r.other === 'TX' && r.none === 'TX', 'injury state: the job\'s state first, then the company\'s: ' + JSON.stringify(r));
  // Rules view
  await p.evaluate(() => pbSrShow('WA')); await p.waitForTimeout(400);
  r = await p.evaluate(() => { const g = (i) => { const e = document.getElementById(i); return e ? e.innerText.replace(/\s+/g, ' ') : ''; }; return { inj: g('pbSrV_inj'), trench: g('pbSrV_trench'), sw: document.documentElement.scrollWidth }; });
  ok(/Report a serious injury/.test(r.inj) && /Call 911 first/.test(r.inj) && /L&I/.test(r.inj), 'Rules for Washington: Report a serious injury line: ' + r.inj.slice(0, 80));
  ok(/walkways 4 ft/.test(r.trench), 'Rules for Washington: walkway guardrails from 4 ft');
  ok(r.sw <= 390, 'Rules view fits 390 px');
  await p.evaluate(() => pbSrClose());
  // Job Book safety form
  await p.evaluate(async () => { await window.pbJbOpen('J-WA', { kind: 'safety', prefill: {} }); }); await p.waitForTimeout(800);
  r = await p.evaluate(() => { const e = document.getElementById('jbFormInj'); return e ? e.innerText.replace(/\s+/g, ' ') : null; });
  ok(r && /Report a serious injury/.test(r) && /L&I/.test(r), 'Job Book safety form on a Washington job: WA reporting line: ' + String(r).slice(0, 90));
  r = await p.evaluate(() => { const e = document.getElementById('cpEmInjuryText'); return e ? e.textContent : null; });
  ok(r && /8 hours to be safe/.test(r), 'Confined space emergency panel: the line is there (state not known until a permit is open)');
  ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs)); await b.close();
  // ---------- 2b, 2c. talks ----------
  ({ b, p } = await start());
  r = await p.evaluate(() => { const L = JSON.parse(document.getElementById('pbTalksLib').textContent); const t = (id) => JSON.stringify(L.find(x => x.id === id)); return { heat: t('TT-036'), slips: t('TT-046'), falls: t('TT-066') }; });
  ok(/heat index/.test(r.heat) && /written rest-break schedule from 90°F \(Oregon\)/.test(r.heat) && /Nevada/.test(r.heat), 'Heat talk: heat index for OR/MD, Oregon rest-break schedule, Nevada');
  ok(/Washington: from 4 ft/.test(r.slips) && /WAC 296-155-655\(12\)/.test(r.falls), 'Walkway talks: Washington 4 ft');
  // ---------- 2d. trench by the job's state ----------
  await openTrench(p); u = await ui(p);
  ok(u.lineHidden && u.opts.includes('Ashort'), 'no state known: federal list (short-term Type A offered), no rule line');
  await calc(p, '4.5', 'B'); u = await ui(p);
  ok(/state isn’t known/.test(u.note) && /Washington: from 4 ft/.test(u.note) && /in Washington a protective system is needed from 4 ft/.test(u.note), 'not known: note names the strictest (WA 4 ft)');
  r = await p.evaluate(() => window.pbCaveTrig());
  ok(r.ft === 4 && !r.state, 'cave-in flag, nothing known: 4 ft');
  await b.close();
  // the job is in Washington, the phone in Texas
  ({ b, p } = await start(curJob('J-WA', 'Seattle main') + srStore({ jobs: { 'j-wa': 'WA' }, jobs_local: {} }) + here('TX')));
  await openTrench(p); u = await ui(p);
  ok(!u.lineHidden && /Washington/.test(u.name) && /no short-term Type A/.test(u.text) && /competent person decides on site/.test(u.text) && /current job/.test(u.text), 'WA job (phone in TX): rule line: ' + u.name + ' | ' + u.text);
  ok(!u.opts.includes('Ashort'), 'WA job: short-term Type A not offered');
  await calc(p, '4.5', 'A'); u = await ui(p);
  ok(/Washington/.test(u.note) && /current job/.test(u.note) && /4\.5 ft is 4 ft or more/.test(u.note), 'WA job: note under the answer is Washington, from the current job, 4 ft');
  r = await p.evaluate(() => window.pbCaveTrig());
  ok(r.ft === 4 && r.state === 'WA', 'cave-in flag on a WA job with the phone in TX: WA 4 ft');
  ok(u.sw <= 390, 'fits 390 px'); ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs)); await b.close();
  // the job is in Texas, the phone in Washington: Texas (federal)
  ({ b, p } = await start(curJob('J-TX', 'Dallas') + srStore({ jobs: { 'j-tx': 'TX' }, jobs_local: {} }) + here('WA')));
  await openTrench(p); u = await ui(p);
  ok(u.lineHidden && u.opts.includes('Ashort'), 'TX job (phone in WA): federal list');
  await calc(p, '4.5', 'B'); u = await ui(p); ok(/Texas/.test(u.note) && !/4\.5 ft is/.test(u.note), 'TX job: note is Texas, nothing needed at 4.5 ft');
  r = await p.evaluate(() => window.pbCaveTrig());
  ok(r.ft === 5 && r.state === 'TX', 'cave-in flag on a TX job: 5 ft');
  await b.close();
  // only the company's state (WA): not used for trench (strictest = not known)
  ({ b, p } = await start(srStore({ co: 'TX', jobs: {}, jobs_local: {} })));
  await openTrench(p); await calc(p, '4.5', 'B'); u = await ui(p);
  ok(/state isn’t known/.test(u.note), 'company state only (TX): trench note stays "not known" (WA 4 ft)');
  await b.close();
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
