// dates_xing_nov22: the reviewers' examples (Nov 21) on the patched page.
// Usage: PB_URL=http://127.0.0.1:10770/mine/cur.html PB_FAKE_NOW=2026-06-22T09:00:00 NODE_PATH=/opt/npm-tools/node_modules node t_dates_xing.js [math|ui|xing|all]
// PB_FAKE_NOW (Mon Jun 22 2026, 9 AM) is needed for the ui part (Utah day 21 after 8 AM; a TX ticket good at 10 AM today).
const R = '/home/claude/index.html-/tests/rig/'; const boot = require(R + 'boot'), co = require(R + 'co'), F = require(R + 'flow');
const URL = process.env.PB_URL || 'http://127.0.0.1:10770/mine/cur.html', PART = process.argv[2] || 'all';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const LOC = (addr, locates) => `;window.__rpcOverride.pb_prod_locates=(a)=>({ok:true,job_key:String(a.p_job_number).toLowerCase(),locate_days:28,locates:${JSON.stringify(locates || [])},job:{job_number:a.p_job_number,project_name:'Main St',address:${JSON.stringify(addr)}},server_at:new Date().toISOString()});`;
const txt = (p, id) => p.evaluate(i => { const e = document.getElementById(i); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, id);
(async () => {
 if (PART === 'all' || PART === 'math') {
  const { b, p } = await boot(URL, { init: co });
  const m = await p.evaluate(() => {
    const c = pbSrMath.canDig, at = pbSrMath.canDigAt, h = pbSrMath.holX, S = window.PB_STATE_RULES.states, o = {};
    o.NCdec = c('2026-12-21', 'NC'); o.NCh26 = h(2026, 'NC'); o.NCh27 = h(2027, 'NC'); o.NCh28 = h(2028, 'NC');
    o.VAelect = c('2026-11-02', 'VA'); o.VAh = h(2026, 'VA');
    o.MApat = at('2026-04-17', '10:00', 'MA'); o.MEh = h(2026, 'ME'); o.RIh = h(2026, 'RI'); o.VTh = h(2026, 'VT'); o.NHh26 = h(2026, 'NH'); o.NHh27 = h(2027, 'NH');
    o.HIh = h(2026, 'HI'); o.TNh = h(2026, 'TN'); o.TXh = h(2026, 'TX');
    o.TXmon = at('2026-06-01', '14:00', 'TX'); o.TXnot = at('2026-06-01', '', 'TX'); o.TXsatAm = at('2026-06-06', '10:00', 'TX'); o.TXsatPm = at('2026-06-06', '13:00', 'TX');
    o.TXsatNo = at('2026-06-06', '', 'TX'); o.TXsatLabor = at('2026-09-05', '09:00', 'TX'); o.DC = at('2026-06-01', '14:00', 'DC'); o.WV = at('2026-06-01', '07:30', 'WV'); o.TNat = at('2026-06-01', '14:00', 'TN');
    o.ORlate = at('2026-06-01', '18:00', 'OR'); o.ORearly = at('2026-06-01', '16:00', 'OR'); o.ORnone = at('2026-06-01', '', 'OR'); o.ORfri = at('2026-06-05', '17:30', 'OR');
    o.UT = at('2026-06-01', '', 'UT'); o.UTsat = c('2026-06-06', 'UT'); o.UTexp = pbSrMath.expires('2026-06-01', 'UT');
    o.MNsat = c('2026-12-05', 'MN'); o.sat = {}; for (const s of ['IA', 'SD', 'VA', 'LA', 'FL', 'WA', 'CO', 'KY', 'NC', 'SC', 'AZ', 'IN', 'KS', 'NE', 'WY', 'AR', 'CT', 'OK', 'OR', 'CA', 'NV', 'NY', 'TX', 'MA', 'PA']) o.sat[s] = c('2026-06-06', s);
    o.mon = {}; for (const s of ['IA', 'SD', 'VA', 'LA', 'FL', 'WA', 'CO', 'KY', 'NC', 'SC', 'AZ', 'MN', 'UT', 'OR']) o.mon[s] = c('2026-06-01', s);
    o.nbdN = ['MN', 'IA', 'SD', 'VA', 'UT', 'LA', 'FL', 'WA', 'CO', 'KY', 'NC', 'SC', 'IN', 'KS', 'NE', 'WY', 'AR', 'CT', 'OK', 'AZ'].filter(s => !(S[s].notice.n === 3 || (S[s].notice.n === 4 && (s === 'NC' || s === 'SC'))));
    o.AZ = c('2026-06-01', 'AZ'); o.AZt = S.AZ.notice.text; o.TXt = S.TX.notice.text; o.NCt = S.NC.notice.text; o.TNt = S.TN.notice.text; o.GA = JSON.stringify(S.GA);
    return o; });
  console.log(JSON.stringify(m));
  ok(m.NCdec === '2026-12-30', 'NC call Mon Dec 21 2026: Tue 22, Wed 23 full, Dec 24/25/28 off, Tue 29 full -> dig Wed Dec 30 (was Mon Dec 28)');
  ok(JSON.stringify(m.NCh26) === '["2026-04-03","2026-12-24","2026-12-25","2026-12-28"]' && JSON.stringify(m.NCh27) === '["2027-03-26","2027-12-23","2027-12-24","2027-12-27"]' && JSON.stringify(m.NCh28) === '["2028-04-14","2028-12-22","2028-12-25","2028-12-26"]', 'NC811 / NC state Christmas days and Good Friday 2026-2028 match the posted lists');
  ok(m.VAelect === '2026-11-06' && JSON.stringify(m.VAh) === '["2026-11-03"]', 'VA: Election Day off -> Mon Nov 2 call digs Fri Nov 6');
  ok(m.MApat.d === '2026-04-23' && m.MApat.t === '10:00' && JSON.stringify(m.MEh) === '["2026-04-20"]', 'MA/ME Patriots\' Day Apr 20: Fri Apr 17 10 AM call -> Thu Apr 23 10 AM');
  ok(JSON.stringify(m.RIh) === '["2026-08-10"]' && JSON.stringify(m.VTh) === '["2026-08-17"]' && JSON.stringify(m.NHh26) === '["2026-11-03"]' && m.NHh27.length === 0, 'RI Victory Day Aug 10, VT Bennington Aug 16 (Sun) -> Mon Aug 17, NH Election Day only in even years');
  ok(JSON.stringify(m.HIh) === '["2026-03-26","2026-04-03","2026-06-11","2026-08-21","2026-11-03"]', 'HI: Kuhio, Good Friday, Kamehameha, Statehood (3rd Fri Aug), Election Day');
  ok(JSON.stringify(m.TNh) === '["2026-04-03","2026-12-24"]' && m.TXh.includes('2026-12-24') && m.TXh.includes('2026-12-26') && m.TXh.includes('2026-04-21') && m.TXh.includes('2026-04-03'), 'TN Good Friday + Christmas Eve; TX state holidays + Good Friday');
  ok(m.TXmon.d === '2026-06-03' && m.TXmon.t === '14:00' && m.TXnot.hint === 'after the time you called' && m.TXnot.t === '', 'TX: Mon 2 PM -> Wed 2 PM; no time -> "after the time you called"');
  ok(m.TXsatAm.d === '2026-06-09' && m.TXsatAm.t === '11:59' && m.TXsatPm.d === '2026-06-10' && m.TXsatPm.t === '' && m.TXsatLabor.d === '2026-09-09' && m.TXsatLabor.t === '11:59', 'TX 251.151(b): Sat 10 AM -> Tue 11:59 AM; Sat 1 PM -> Wed; Sat before Labor Day -> Wed 11:59 AM');
  ok(m.TXsatNo.d === '2026-06-10' && /Tue 11:59 AM if called before noon/.test(m.TXsatNo.hint), 'TX Saturday, no time: Wed, "or Tue 11:59 AM if called before noon"');
  ok(m.DC.d === '2026-06-05' && m.DC.t === '14:00' && m.WV.d === '2026-06-03' && m.WV.t === '07:30' && m.TNat.d === '2026-06-04' && m.TNat.t === '14:00', 'DC 96 h -> Fri 2 PM; WV 48 h -> Wed 7:30 AM; TN 3 working days from the call time -> Thu 2 PM');
  ok(m.ORlate.d === '2026-06-05' && m.ORearly.d === '2026-06-04' && m.ORnone.d === '2026-06-04' && /before 5 PM/.test(m.ORnone.hint) && m.ORfri.d === '2026-06-11', 'OR: Mon 6 PM counts as Tue -> Fri; Mon 4 PM -> Thu; no time labeled; Fri 5:30 PM counts as Mon -> Thu');
  ok(m.UT.d === '2026-06-04' && m.UT.t === '08:00' && m.UTsat === '2026-06-10' && m.UTexp === '2026-06-22', 'UT: Mon -> Thu 8 AM; Sat -> Wed (8 AM Mon start); expiry day 21 = Jun 22');
  ok(m.MNsat === '2026-12-09', 'MN Sat Dec 5 2026 -> Wed Dec 9 (was Thu Dec 10)');
  const want = { IA: '2026-06-10', SD: '2026-06-10', VA: '2026-06-10', LA: '2026-06-10', FL: '2026-06-10', WA: '2026-06-10', CO: '2026-06-10', KY: '2026-06-10', NC: '2026-06-11', SC: '2026-06-11', AZ: '2026-06-10', IN: '2026-06-10', KS: '2026-06-10', NE: '2026-06-10', WY: '2026-06-10', AR: '2026-06-10', CT: '2026-06-10', OK: '2026-06-10', OR: '2026-06-11', CA: '2026-06-11', NV: '2026-06-11', NY: '2026-06-11', TX: '2026-06-10', MA: '2026-06-11', PA: '2026-06-11' };
  const bad = Object.keys(want).filter(s => m.sat[s] !== want[s]); ok(!bad.length, 'Saturday Jun 6 call: next-business-day states Wed (NC, SC Thu); OR, CA, NV, NY, MA, PA unchanged ' + JSON.stringify(bad.map(s => s + '=' + m.sat[s])));
  ok(Object.keys(m.mon).every(s => m.mon[s] === (s === 'NC' || s === 'SC' ? '2026-06-05' : '2026-06-04')), 'weekday calls unchanged (Mon -> Thu; NC, SC Fri) ' + JSON.stringify(m.mon));
  ok(m.nbdN.length === 0, 'every next-business-day state counts the call day out (n = wait + 1): ' + JSON.stringify(m.nbdN));
  ok(m.AZ === '2026-06-04' && /2 full working days/.test(m.AZt) && /10 working days/.test(m.AZt) && /mobile home park/.test(m.AZt), 'AZ: Mon -> Thu; text has 2 full working days and the apartment / mobile home park 10 days');
  ok(/A Saturday call made before noon \(11:59 AM\): dig from Tuesday 11:59 AM \(Wednesday if Monday is a holiday\)\. A Saturday afternoon or Sunday call counts from Monday\./.test(m.TXt) && !/A Saturday call: dig/.test(m.TXt), 'TX Rules text: Saturday before noon');
  ok(/Good Friday, Christmas Eve, the day after Christmas/.test(m.NCt) && /from the time you call/.test(m.TNt), 'NC and TN texts');
  ok(/"notice":null/.test(m.GA), 'Georgia untouched');
  ok(!p.errs.length, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await b.close();
 }
 if (PART === 'all' || PART === 'ui') {
  // Locates: a Texas job; a Utah job's ticket on its 21st day after 8 AM (PB_FAKE_NOW Mon Jun 22 2026 9 AM)
  const tx = [{ id: 'aaaaaaaa-0000-4000-8000-000000000011', job_key: 'j-300', job_number: 'J-300', ticket_no: 'TX-EARLY', called_at: '2026-06-17', expires_at: '2026-07-07', note: null, closed: false, version: 1 }];
  let { b, p } = await boot(URL, { init: co + LOC('500 Main St, Austin, TX 78701', tx) + `;try{localStorage.setItem('pbLocTm:'+'00000000-0000-4000-8000-000000000001',JSON.stringify({'aaaaaaaa-0000-4000-8000-000000000011':{t:'10:00',d:'2026-06-17',at:1}}));}catch(e){}` });
  const today = await p.evaluate(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }); ok(today === '2026-06-22', 'fake clock: today ' + today);
  await p.evaluate(() => window.pbOpenLocates('J-300')); await p.waitForTimeout(1500);
  const chip = await p.evaluate(() => { const e = document.querySelector('[id^="locChip_"]'); return e ? e.textContent : null; });
  const dig = await p.evaluate(() => { const e = document.querySelector('[id^="loc_"][id$="Dig"]'); return e ? e.textContent : null; });
  ok(/^Not valid until Mon Jun 22, 10:00 AM$/.test(chip || '') && dig === 'Mon Jun 22, 10:00 AM', 'TX ticket Wed Jun 17 10 AM (Fri Jun 19 off): good Mon Jun 22 at 10:00 AM; at 9 AM it is "Not valid until Mon Jun 22, 10:00 AM": ' + chip + ' / ' + dig);
  await p.evaluate(() => window.pbLocAdd()); await p.waitForTimeout(400);
  const f = await p.evaluate(() => ({ tm: (document.getElementById('locCalledTm') || {}).value, help: (document.getElementById('locTmHelp') || {}).textContent, dig: document.getElementById('locFDig').textContent }));
  ok(/^09:0\d$/.test(f.tm || '') && /^Texas counts from the time you called\.$/.test(f.help || '') && /^Wed Jun 24, 9:0\d AM$/.test(f.dig), 'new TX ticket: Time called = now, dig "Wed Jun 24, 9:0x AM": ' + JSON.stringify(f));
  await p.fill('#locCalled', '2026-06-01'); await p.dispatchEvent('#locCalled', 'change'); await p.waitForTimeout(200);
  ok((await p.evaluate(() => document.getElementById('locCalledTm').value)) === '' && (await txt(p, 'locFDig')) === 'Wed Jun 3, after the time you called', 'another day: time cleared, "after the time you called"');
  await p.fill('#locCalledTm', '14:00'); await p.dispatchEvent('#locCalledTm', 'change'); await p.waitForTimeout(200);
  ok((await txt(p, 'locFDig')) === 'Wed Jun 3, 2:00 PM', 'Mon Jun 1 2:00 PM -> "Wed Jun 3, 2:00 PM"');
  await p.fill('#locNo', 'TX-NEW'); await p.click('#locSave'); await p.waitForTimeout(800);
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('pbLocTm:00000000-0000-4000-8000-000000000001') || '{}'));
  const saved = Object.values(st).find(r => r.d === '2026-06-01');
  ok(saved && saved.t === '14:00', 'the call time is kept on this phone with the ticket: ' + JSON.stringify(st));
  const card = await p.evaluate(() => [...document.querySelectorAll('[id^="loc_"][id$="Dig"]')].map(e => e.textContent));
  ok(card.includes('Wed Jun 3, 2:00 PM'), 'the saved ticket card shows the time: ' + JSON.stringify(card));
  ok(!p.errs.length, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await b.close();
  // Arizona job: no time field; Utah ticket on day 21 after 8 AM
  const ut = [{ id: 'aaaaaaaa-0000-4000-8000-000000000021', job_key: 'j-400', job_number: 'J-400', ticket_no: 'UT-21', called_at: '2026-06-01', expires_at: '2026-06-22', note: null, closed: false, version: 1 },
              { id: 'aaaaaaaa-0000-4000-8000-000000000022', job_key: 'j-400', job_number: 'J-400', ticket_no: 'UT-22', called_at: '2026-06-02', expires_at: '2026-06-23', note: null, closed: false, version: 1 }];
  ({ b, p } = await boot(URL, { init: co + LOC('350 S State St, Salt Lake City, UT 84111', ut) }));
  await p.evaluate(() => window.pbOpenLocates('J-400')); await p.waitForTimeout(1500);
  const u = await p.evaluate(() => ({ chips: [...document.querySelectorAll('[id^="locChip_"]')].map(e => e.textContent), exp: [...document.querySelectorAll('[id^="loc_"][id$="Exp"]')].map(e => e.textContent), nodig: [...document.querySelectorAll('[id^="locNoDig_"]')].map(e => e.textContent), dig: [...document.querySelectorAll('[id^="loc_"][id$="Dig"]')].map(e => e.textContent) }));
  ok(u.chips.includes('Expired 8 AM today') && u.chips.includes('Expires 8 AM tomorrow'), 'UT chips: "Expired 8 AM today" / "Expires 8 AM tomorrow": ' + JSON.stringify(u.chips));
  ok(u.exp.includes('Mon Jun 22, 8 AM') && u.nodig.some(t => /Expired Jun 22 at 8 AM\. Don’t dig/.test(t)) && u.nodig.length === 1, 'UT card: "Expires Mon Jun 22, 8 AM" and the Don\'t dig line from 8 AM: ' + JSON.stringify(u));
  ok(u.dig.includes('Thu Jun 4, 8:00 AM'), 'UT dig day shows 8:00 AM: ' + JSON.stringify(u.dig));
  await p.evaluate(() => window.pbLocAdd()); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => !!document.getElementById('locCalledTm'))), 'Utah (a day state): no Time called field');
  await p.evaluate(() => window.pbLocFormCancel());
  // permit CO words: no Cal/OSHA outside California
  const co1 = await p.evaluate(() => document.querySelector('label[for="cpMaxCO"]').textContent);
  ok(co1 === 'Maximum CO (ppm) — blank uses 25 ppm (the strictest limit; federal OSHA’s is 50)', 'permit CO label: ' + co1);
  ok(!p.errs.length, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await b.close();
 }
 if (PART === 'all' || PART === 'xing') {
  const { b, p } = await boot(URL, { init: co }); const H = F(p);
  let stake = null; await p.route('**/functions/v1/ai**', async r => { await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, text: JSON.stringify(stake), used: 1, limit: 60 }) }); });
  const S = (sta, el, cf, line, num) => ({ is_stake: true, stake_number: { value: num, conf: 'high' }, station: { value: sta, conf: 'high' }, offset: { value: '10/SD', conf: 'high' }, line_label: { value: line, conf: 'high' }, cut_fill: { direction: 'cut', feet: cf, as_written: 'C-' + cf, to: 'IE', conf: 'high' }, stake_elevation: { feet: el, as_written: String(el), conf: 'high' }, other_text: '', uncertain: [] });
  await p.getByText('New Run', { exact: true }).click(); await p.waitForTimeout(1500);
  await H.f('saJobNumber', '24-017'); await H.f('saJobsite', 'Test');
  await p.selectOption('#runPipeType', 'PVC SDR 35'); await p.waitForTimeout(300);
  await H.sel('runIdSel', '8"'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('runCarriesWrap').hidden), '"This run carries" hidden before any crossing');
  stake = S('1+50', 103.4, 3.61, 'MH-1', '3860'); await p.setInputFiles('#startAiStakePhoto', [H.img('p12')]); await p.waitForTimeout(2500); await H.f('startStakeReading', '4.36');
  stake = S('4+51', 104.26, 3.83, 'MH-2', '3863'); await p.setInputFiles('#endAiStakePhoto', [H.img('p05')]); await p.waitForTimeout(2500); await H.f('endStakeReading', '3.50');
  await p.evaluate(() => pbXingAdd(1)); await p.waitForTimeout(400);
  const id = await p.evaluate(() => document.querySelector('#screen-input .pb-xing-card').dataset.xingId);
  const live = async (st) => { await p.evaluate(c => { window.pbSrJobState = () => c ? { code: c, how: 'picked' } : { code: 'CA', how: 'default' }; window.pbXingLiveNow(); }, st); await p.waitForTimeout(150);
    return p.evaluate(() => { const e = document.querySelector('#screen-input .pb-xing-card .pb-xing-live'); return e && !e.hidden ? e.textContent : '(none)'; }); };
  // our pipe's top / bottom at 2+50, read back from a gas crossing's clearance line
  await H.f(id + 'Sta', '2+50'); await H.f(id + 'Util', 'Gas'); await H.f(id + 'Bop', '110'); await p.waitForTimeout(400);
  const t1 = await live('TX'); await H.f(id + 'Bop', ''); await H.f(id + 'Top', '90'); await p.waitForTimeout(400); const t2 = await live('TX'); await H.f(id + 'Top', '');
  const our = { top: 110 - parseFloat((/will be ([\d.]+) ft above/.exec(t1) || [])[1]), bop: 90 + parseFloat((/will be ([\d.]+) ft below/.exec(t2) || [])[1]) };
  ok(isFinite(our.top) && isFinite(our.bop), 'our pipe top / bottom at 2+50: ' + JSON.stringify(our) + ' ' + t1 + ' / ' + t2);
  const w = await p.evaluate(() => ({ hidden: document.getElementById('runCarriesWrap').hidden, opt: document.getElementById('runCarries').options[0].textContent }));
  ok(!w.hidden && w.opt === 'Sewer (from pipe type)', '"This run carries" shows with a crossing; blank = "Sewer (from pipe type)"');
  await H.f(id + 'Bop', (our.top + 12.1 / 12).toFixed(3)); await p.waitForTimeout(400);
  for (const u of ['Waterline', 'WTR', 'W', 'WL', '8" W', 'DW', 'Water main']) { await H.f(id + 'Util', u); const t = await live('TX'); ok(/Texas rule \(TCEQ 290\.44\).*Gap 12\.1 in, needs 24 in\./.test(t), 'TX, "' + u + '" 12.1 in above our sewer: flagged with the gap: ' + t); }
  await H.f(id + 'Util', 'Gas'); ok(/^Clear/.test(await live('TX')), 'gas 12.1 in above: no water rule');
  // heading on Check Before Locking
  await H.f(id + 'Util', 'Waterline'); await live('TX');
  const head = await p.evaluate(() => { try { window.pbReview(); } catch (e) { return 'ERR ' + e.message; } return new Promise(r => setTimeout(() => r([...document.querySelectorAll('.pb-xing-rvw strong')].map(e => e.textContent)), 600)); });
  ok(Array.isArray(head) && head.includes('Water Too Close Above Sewer'), 'Check Before Locking heading: "Water Too Close Above Sewer": ' + JSON.stringify(head));
  await p.evaluate(() => pbGoto('input')); await p.waitForTimeout(500);
  // AZ rule
  ok(/Arizona rule \(A\.A\.C\. R18-5-502\): water crosses at least 2 ft above the sewer.*Gap 12\.1 in, needs 24 in\./.test(await live('AZ')), 'AZ: water 12.1 in above sewer flagged (2 ft)');
  await H.f(id + 'Bop', ''); await H.f(id + 'Top', (our.bop - 30 / 12).toFixed(3)); await p.waitForTimeout(400);
  ok(/Arizona rule.*This water line is below your pipe/.test(await live('AZ')), 'AZ: water 30 in below the sewer: not allowed (water on top)');
  const head2 = await p.evaluate(() => { window.pbReview(); return new Promise(r => setTimeout(() => r([...document.querySelectorAll('.pb-xing-rvw strong')].map(e => e.textContent)), 600)); });
  ok(head2.includes('Water Below Sewer'), 'water below: heading "Water Below Sewer": ' + JSON.stringify(head2));
  await p.evaluate(() => pbGoto('input')); await p.waitForTimeout(500);
  // our own pipe is a water line in HDPE: the run's choice
  await H.f(id + 'Util', 'Sewer'); await H.f(id + 'Top', ''); await H.f(id + 'Bop', ''); await H.f(id + 'Top', (our.bop - 12 / 12).toFixed(3)); await p.waitForTimeout(400);
  ok(/^Clear/.test(await live('TX')), 'sewer 12 in below our pipe, run = sewer (from pipe type): no water rule');
  await p.selectOption('#runCarries', 'water'); await p.waitForTimeout(300);
  ok(/Texas rule.*Gap 12\.0 in, needs 24 in\./.test(await live('TX')), 'run carries Water (any pipe type): the sewer 12 in below is flagged (TX 2 ft)');
  await p.selectOption('#runCarries', 'other'); await p.waitForTimeout(300);
  ok(!/Texas rule/.test(await live('TX')), 'run carries Other: no water / sewer rule');
  await p.selectOption('#runCarries', 'water');
  const snap = await p.evaluate(() => { const el = document.getElementById('runCarries'); return !!el.closest('#screen-input') && !el.closest('[id^="pointBody-"], .pb-hub-card, .pb-ai-review, .pb-xing-card') && el.value; });
  ok(snap === 'water', 'drafts keep the choice (a top-level select of Run Setup, read by the draft snapshot)');
  ok(!p.errs.length, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await b.close();
 }
 console.log(fails ? 'FAILS: ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
