// state_audit_nov21/811 test: wait-day fixes (p1 confirmed, p2 "full days", p3 "not the call day"), 811 center holidays,
// the "Hit a line" section and fills (p4), the phone's location before the California default (p5).
// Usage: PB_BASE=http://127.0.0.1:10520 NODE_PATH=/opt/npm-tools/node_modules node t_811_audit.js <set>
//   set: live | p1 | p2 | p3 | p4 | p5 | all   (the page is <PB_BASE>/<set>.html)
const R = '/home/claude/index.html-/tests/rig/'; const boot = require(R + 'boot'), co = require(R + 'co');
const SET = process.argv[2] || 'all', BASE = process.env.PB_BASE || 'http://127.0.0.1:10520';
const has = (k) => SET === 'all' || SET === k;
const UID = '00000000-0000-4000-8000-000000000001';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const here = (st) => `;try{localStorage.setItem('pbHereState',JSON.stringify({s:'${st}',at:Date.now()}));}catch(e){}`;
const srStore = (o) => `;try{localStorage.setItem('pbSr:${UID}',${JSON.stringify(JSON.stringify(o))});}catch(e){}`;
const start = async (init) => { const { b, p } = await boot(BASE + '/' + SET + '.html', { init: co + (init || '') }); await p.setViewportSize({ width: 390, height: 844 }); return { b, p }; };
(async () => {
  let { b, p } = await start();
  const m = await p.evaluate(() => {
    const c = pbSrMath.canDig, x = pbSrMath.expires, S = window.PB_STATE_RULES.states, rb = window.__debugLocRen.rb;
    const o = { v: {}, rb: {}, ex: {}, url: {}, holX: null, ga: JSON.stringify(S.GA) };
    // Monday Jun 1 2026 call (no holidays that week); MN uses its own Tuesday example
    for (const s of ['CA', 'NV', 'NY', 'OH', 'IL', 'NM', 'CO', 'FL', 'KS', 'KY', 'AR', 'NE', 'OR', 'WA', 'WY', 'CT', 'NC', 'UT', 'IA', 'IN', 'SD', 'OK', 'SC', 'TX', 'WV', 'VA', 'LA', 'MI', 'MA', 'DC', 'PA', 'MD']) o.v[s] = c('2026-06-01', s);
    o.v.MNtue = c('2026-06-02', 'MN');
    o.v.NVoct = c('2026-10-28', 'NV'); o.v.UTjul = c('2026-07-22', 'UT'); o.v.SCmay = c('2026-05-08', 'SC'); o.v.SCdec = c('2026-12-23', 'SC');
    o.v.CAfri = c('2026-11-20', 'CA'); o.v.CAwed = c('2026-11-25', 'CA'); o.v.CAsat = c('2026-11-21', 'CA');
    for (const s of ['MN', 'IA', 'IN', 'WA', 'NC', 'OR', 'CT', 'AR', 'NM', 'OK', 'KY', 'CO', 'UT']) o.rb[s] = rb[s];
    o.ex.MN = x('2026-06-02', 'MN'); o.ex.IA = x('2026-06-01', 'IA'); o.ex.SC = x('2026-06-01', 'SC'); o.ex.CA = x('2026-06-01', 'CA');
    o.url.OH = S.OH.centers[0].url; o.n = {}; for (const s of Object.keys(S)) o.n[s] = S[s].notice ? S[s].notice.n : null;
    o.holX = pbSrMath.holX ? { NV: pbSrMath.holX(2026, 'NV'), UT: pbSrMath.holX(2026, 'UT'), SC: pbSrMath.holX(2026, 'SC'), TX: pbSrMath.holX(2026, 'TX') } : null;
    o.fill = { IL: S.IL.emergency, OK: [S.OK.white, S.OK.white_text], WY: S.WY.white, MO: S.MO.white };
    return o; });
  console.log('dates ' + JSON.stringify(m.v));
  const W = (s, d) => m.v[s] === d;
  // unchanged everywhere: TX, WV hours run from the call; VA, LA from 7 AM next day; MI, MA 72 h; DC 96 h; PA, MD 3 business days
  ok(W('TX', '2026-06-03') && W('WV', '2026-06-03') && W('VA', '2026-06-04') && W('LA', '2026-06-04') && W('MI', '2026-06-04') && W('MA', '2026-06-04') && W('DC', '2026-06-05') && W('PA', '2026-06-04') && W('MD', '2026-06-04'), 'states not changed keep their dates');
  ok(/"notice":null/.test(m.ga), 'Georgia untouched');
  if (has('p1')) {
    ok(W('MNtue', '2026-06-05'), 'MN: Tuesday ticket -> Friday (GSOC example)');
    ok(W('IA', '2026-06-04') && W('IN', '2026-06-04') && W('SD', '2026-06-04') && W('OK', '2026-06-04'), 'IA, IN, SD, OK: Monday call -> Thursday');
    ok(W('SC', '2026-06-05'), 'SC: 3 full working days -> Monday call digs Friday');
    ok(m.rb.MN === 3 && m.rb.IA === 3 && m.rb.IN === 3 && m.rb.OK === 4, 'Renew-by: MN, IA, IN 3 (new notice waits like the first); OK keeps 4');
    ok(m.ex.MN === '2026-06-19' && m.ex.IA === '2026-06-28', 'ticket life from the real legal start: MN Jun 2 call -> Jun 19; IA (day 1 = Thursday) -> Jun 28: ' + JSON.stringify(m.ex));
    ok(m.holX && JSON.stringify(m.holX.NV) === '["2026-10-30"]' && JSON.stringify(m.holX.UT) === '["2026-07-24","2026-12-24"]' && JSON.stringify(m.holX.SC) === '["2026-05-11","2026-12-24","2026-12-28"]' && m.holX.TX.length === 0, 'center holidays 2026 = their posted lists: ' + JSON.stringify(m.holX));
    ok(W('NVoct', '2026-11-02') && W('UTjul', SET === 'all' ? '2026-07-28' : '2026-07-27') && W('SCmay', '2026-05-15') && W('SCdec', '2027-01-04'), 'waits skip Nevada Day, Pioneer Day, SC Confederate Memorial Day and Christmas days');
    ok(m.ex.SC === '2026-06-26', 'SC ticket life (15 working days, short holiday list) from Fri Jun 5 -> Jun 26: ' + m.ex.SC);
    ok(m.url.OH === 'https://ohio811.org', 'OHIO811 site address');
  }
  if (has('p2')) {
    ok(['CO', 'FL', 'KS', 'KY', 'AR', 'NE', 'OR', 'WA', 'WY', 'CT'].every(s => W(s, '2026-06-04')) && W('UT', '2026-06-04'), '"2 full business days" states and UT: Monday call -> Thursday');
    ok(W('NC', '2026-06-05'), 'NC: 3 full working days -> Friday');
    ok(m.rb.WA === 3 && m.rb.OR === 3 && m.rb.CT === 3 && m.rb.AR === 3 && m.rb.NC === 4 && m.rb.KY === 2 && m.rb.CO === 2 && m.rb.UT === 2, 'Renew-by follows the new wait where going on = a new notice');
  }
  if (has('p3')) {
    ok(['CA', 'NV', 'NY', 'OH', 'IL', 'NM'].every(s => W(s, '2026-06-04')), '"not counting the call day" states: Monday call -> Thursday');
    ok(m.rb.NM === 3 && m.ex.CA === '2026-06-29', 'NM Renew-by 3; CA ticket life unchanged (28 days from the call)');
    console.log('t130 CA lines for p3: Fri Nov 20 -> ' + m.v.CAfri + ', Wed Nov 25 -> ' + m.v.CAwed + ', Sat Nov 21 -> ' + m.v.CAsat);
  }
  if (!has('p1') && !has('p2') && !has('p3')) ok(W('CA', '2026-06-03') && W('MNtue', '2026-06-04') && W('SC', '2026-06-04'), 'baseline (r17.13): CA Wed, MN Thu, SC Thu');
  if (has('p4')) {
    ok(/2 hours/.test(m.fill.IL || '') && m.fill.OK[0] === 'required' && m.fill.WY === 'required' && m.fill.MO === 'recommended', 'fills: IL emergency, OK / WY / MO white lining');
    const view = async (st) => { await p.evaluate((s) => pbSrShow(s), st); await p.waitForTimeout(300);
      return p.evaluate(() => { const e = document.getElementById('pbSrV_hit'); return { t: e ? e.innerText.replace(/\s+/g, ' ') : '', sw: document.documentElement.scrollWidth }; }); };
    let v = await view('TX'); ok(/Hit a line/.test(v.t) && /call 911/.test(v.t) && /TDRF/.test(v.t) && v.sw <= 390, 'Rules for Texas: Hit a line with the 1-hour / TDRF duty, fits 390 px');
    v = await view('GA'); ok(/Don’t bury/.test(v.t) && !/within/.test(v.t), 'Rules for Georgia: common lines only');
    v = await view('CA'); ok(/48 hours/.test(v.t), 'Rules for California: tell the 811 center within 48 hours');
    await p.evaluate(() => pbSrClose());
  }
  ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs)); await b.close();
  if (has('p5')) {
    ({ b, p } = await start(here('TX')));
    let r = await p.evaluate(() => ({ s: window.pbSrJobState('J-1'), inj: pbInjuryState('J-1') }));
    ok(r.s.code === 'TX' && r.s.how === 'here' && r.inj === 'TX', 'no job or company state, phone in Texas: Texas rules, not California: ' + JSON.stringify(r));
    await b.close();
    ({ b, p } = await start(here('WA') + srStore({ co: 'NV', jobs: { 'j-2': 'OR' }, jobs_local: {} })));
    r = await p.evaluate(() => ({ job: window.pbSrJobState('J-2'), co: window.pbSrJobState('J-3') }));
    ok(r.job.code === 'OR' && r.co.code === 'NV' && r.co.how === 'company', 'job state first, then the company state, before the phone: ' + JSON.stringify(r));
    await b.close();
    ({ b, p } = await start());
    r = await p.evaluate(() => window.pbSrJobState('J-1'));
    ok(r.code === 'CA' && r.how === 'default', 'nothing known: the California default stays (labelled)');
    ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs)); await b.close();
  }
  console.log(fails ? 'FAILS: ' + fails : 't_811_audit ' + SET + ': ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
