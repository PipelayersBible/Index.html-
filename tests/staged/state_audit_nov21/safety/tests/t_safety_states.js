// state_audit_nov21/safety: injury lines for every state plan, trench lines, CA permit line, Rules-view safety lines,
// talks, talk schedule line, confined space rule line.
// Usage: PB_URL=http://127.0.0.1:10540/cur.html NODE_PATH=/opt/npm-tools/node_modules node t_safety_states.js
const R = '/home/claude/index.html-/tests/rig/'; const boot = require(R + 'boot'), co = require(R + 'co');
const CUR = process.env.PB_URL || 'http://127.0.0.1:10540/cur.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const start = async (init) => { const { b, p } = await boot(CUR, { init: co + (init || '') }); await p.setViewportSize({ width: 390, height: 844 }); return { b, p }; };
(async () => {
  let { b, p } = await start(), r;
  // 1. injury lines
  r = await p.evaluate(() => { const S = window.PB_STATE_RULES.states, o = {}; Object.keys(S).forEach(c => { o[c] = { plan: S[c].osha, line: pbInjuryLine(c) }; }); return o; });
  const unread = Object.keys(r).filter(c => /haven’t checked/.test(r[c].line));
  ok(unread.length === 0, 'no state plan left at "We haven’t checked": ' + unread.join(','));
  ok(/MOSH \(1-800-759-6297\)/.test(r.MD.line) && /within 8 hours for a death/.test(r.MD.line) && /24 hours for a hospital stay, an amputation or a lost eye/.test(r.MD.line), 'MD line: MOSH 8 h / 24 h');
  ok(/651-284-5050/.test(r.MN.line) && /after hours, federal OSHA/.test(r.MN.line), 'MN line: MNOSHA numbers, after hours federal');
  ok(/702-486-9020/.test(r.NV.line) && /775-688-3700/.test(r.NV.line), 'NV line: both Nevada OSHA numbers');
  ok(/803-896-7672/.test(r.SC.line), 'SC line'); ok(/877-242-6742/.test(r.IA.line) && /875 IAC 4/.test(r.IA.line), 'IA line');
  ok(['AZ', 'IN', 'NC', 'NM', 'TN', 'VT', 'WY'].every(c => /the federal rule, 29 CFR 1904\.39/.test(r[c].line) && /within 8 hours for a death/.test(r[c].line)), 'identical-adoption plans use the federal times');
  ok(/ADOSH/.test(r.AZ.line) && /TOSHA/.test(r.TN.line) && /the federal rule, 29 CFR 1904\.39/.test(r.WY.line), 'AZ, TN, WY name their plan and the federal rule');
  ok(/L&I/.test(r.WA.line) && /8 CCR 342/.test(r.CA.line) && /29 CFR 1904\.39/.test(r.TX.line), 'WA, CA, TX lines unchanged');
  r = await p.evaluate(() => pbInjuryLine(''));
  ok(/isn’t known: report within 8 hours to be safe/.test(r), 'state not known: still 8 hours to be safe');
  // 2. trench lines and CA permit
  r = await p.evaluate(() => { const S = window.PB_STATE_RULES.states; const o = {}; ['AK', 'HI', 'NC', 'TN', 'VA', 'IN', 'SC', 'MD', 'IA', 'VT', 'WY', 'MI', 'WA'].forEach(c => { o[c] = S[c].trench; }); o.ca = S.CA.permit; o.src = S.MD.sources.map(x => x.url).join(' '); return o; });
  ok(['AK', 'HI', 'NC', 'TN', 'VA', 'IN', 'SC', 'MD'].every(c => r[c].ft === 5 && /5 ft \(29 CFR 1926\.652/.test(r[c].text)), 'AK HI NC TN VA IN SC MD: federal 5 ft line');
  ok(/soils analysis/.test(r.SC.text) && /at the jobsite/.test(r.MD.text) && /reqprotect/.test(r.src), 'SC training line, MD jobsite records line + source');
  ok(['IA', 'VT', 'WY', 'MI'].every(c => r[c].ft === null && /not checked/.test(r[c].text)), 'IA VT WY MI untouched');
  ok(r.WA.ft === 4, 'WA still 4 ft');
  ok(/annual permit/.test(r.ca) && /district office before you start each new site/.test(r.ca) && /PUC-regulated utilities/.test(r.ca) && /emergency repair/.test(r.ca), 'CA permit line: project / annual, notify each site, exemptions');
  // 3. Rules view
  const view = async (c) => { await p.evaluate((c) => pbSrShow(c), c); await p.waitForTimeout(350);
    const v = await p.evaluate(() => { const g = (i) => { const e = document.getElementById(i); return e ? e.innerText.replace(/\s+/g, ' ') : null; }; return { heat: g('pbSrV_heat'), meet: g('pbSrV_meet'), aid: g('pbSrV_aid'), flag: g('pbSrV_flag'), inj: g('pbSrV_inj'), sw: document.documentElement.scrollWidth }; });
    await p.evaluate(() => pbSrClose()); return v; };
  r = await view('WA');
  ok(/80°F/.test(r.heat) && /WAC 296-62-095/.test(r.heat), 'Rules WA: heat'); ok(/weekly/.test(r.meet) && /1 year/.test(r.meet), 'Rules WA: toolbox talks weekly');
  ok(/first-aid card/.test(r.aid), 'Rules WA: first aid card'); ok(/WAC 296-155-305/.test(r.flag) && /Check the current state DOT spec/.test(r.flag), 'Rules WA: flagger card');
  ok(r.sw <= 390, 'Rules WA fits 390 px (' + r.sw + ')');
  r = await view('CA');
  ok(/95°F/.test(r.heat) && /10 working days/.test(r.meet) && /8 CCR 1512/.test(r.aid) && /No state card/.test(r.flag) && !/Check the current/.test(r.flag), 'Rules CA: heat, talks, first aid, flaggers');
  r = await view('TX');
  ok(/No state heat rule/.test(r.heat) && r.meet === null && r.aid === null && /TxDOT/.test(r.flag), 'Rules TX: no heat rule, no talk/first-aid lines, TxDOT flaggers');
  r = await view('MD'); ok(/Heat index/.test(r.heat) && /COMAR 09\.12\.32/.test(r.heat) && /MOSH/.test(r.inj), 'Rules MD: heat index rule, MOSH reporting');
  r = await view('FL'); ok(/No state card rule found/.test(r.flag), 'Rules FL: no flagger card rule found');
  // 4. talks
  r = await p.evaluate(() => { const L = JSON.parse(document.getElementById('pbTalksLib').textContent); const t = (id) => JSON.stringify(L.find(x => x.id === id)); return { aid: t('TT-050'), strike: t('TT-013'), wz: t('TT-031') + t('TT-033'), flag: t('TT-032') }; });
  ok(/WAC 296-155-120/.test(r.aid) && /8 CCR 1512/.test(r.aid), 'TT-050 first aid state lines');
  ok(/49 CFR 196\.109/.test(r.strike), 'TT-013 49 CFR 196.109');
  ok(!/1926\.200-203/.test(r.wz) && /1926\.200\(g\) and 1926\.201\(a\)/.test(r.wz), 'TT-031 / TT-033 Subpart G references');
  ok(/Class 3 at night \(MUTCD 6C\.05\)/.test(r.flag) && /Oregon \(public roads\)/.test(r.flag), 'TT-032 Class 3 at night, WA / OR cards');
  // talk schedule line (foreman)
  await p.evaluate(async () => { try { await window.pbOpenTalks(); } catch (e) {} }); await p.waitForTimeout(1200);
  r = await p.evaluate(() => { const e = document.getElementById('ttEveryRule'); return e ? e.innerText : null; });
  ok(r && /Washington, at least weekly/.test(r) && /10 working days/.test(r), 'talk schedule: state rule line under How often: ' + r);
  // 5. confined space rule line
  r = await p.evaluate(() => ({ caF: pbCpRuleText('CA', true), caP: pbCpRuleText('CA'), mi: pbCpRuleText('MI'), or: pbCpRuleText('OR', true), tx: pbCpRuleText('TX', true), md: pbCpRuleText('MD', true) }));
  ok(/1960\(a\)/.test(r.caF) && !/1960/.test(r.caP), 'CA note on the form only, not in the PDF line');
  ok(/MIOSHA Part 35/.test(r.mi), 'MI: Part 35 named'); ok(/signature/.test(r.or), 'OR signature line kept');
  ok(r.tx === 'Permit items: federal OSHA 29 CFR 1926.1206.' && r.md === r.tx, 'TX / MD: federal only');
  await b.close();
  console.log(fails ? 'FAILS: ' + fails : 't_safety_states: ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
