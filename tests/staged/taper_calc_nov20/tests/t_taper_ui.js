// taper_calc_nov20: the Taper & Cone Spacing calculator in the app. Phone (390) and computer (1280) width, dark mode,
// job/company/phone state default, California rule, offline, no page errors.
// PB_URL=http://127.0.0.1:10350/cur.html NODE_PATH=/opt/npm-tools/node_modules node tests/t_taper_ui.js
const R = __dirname + '/../../../rig/'; const boot = require(R + 'boot'); const co = require(R + 'co');
const URL = process.env.PB_URL || 'http://127.0.0.1:10350/cur.html', OUT = process.env.PB_OUT || __dirname + '/../work';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const res = (p) => p.evaluate(() => document.getElementById('taperResult').innerText.replace(/\s+/g, ' '));
const sel = async (p, id, v) => { await p.selectOption('#' + id, v); await p.waitForTimeout(150); };
const typ = async (p, id, v) => { await p.fill('#' + id, String(v)); await p.waitForTimeout(150); };
const open = async (p) => {
  await p.click('#pbTabCalculators'); await p.waitForTimeout(500);
  await p.locator('#screen-calcHub .pb-tool-row[data-dest="taper"]').click(); await p.waitForTimeout(600);
};
const overflow = (p) => p.evaluate(() => { const w = document.documentElement.clientWidth; return [...document.querySelectorAll('#screen-taperCalc *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > w + 1; }).map(e => e.id || e.className).slice(0, 5); });
(async () => {
  // ---- phone width
  let { b, p } = await boot(URL, { init: co });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.click('#pbTabCalculators'); await p.waitForTimeout(500);
  ok(await p.isVisible('#calcCatBtnTraffic'), 'Calculators tab: Traffic Control category button');
  await p.click('#calcCatBtnTraffic'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => { const r = document.querySelector('#toolsList section[aria-label="Traffic Control"] .pb-tool-row[data-dest="taper"]'); return !!r && /Taper & Cone Spacing/.test(r.textContent); }), 'Traffic Control section lists Taper & Cone Spacing');
  await open(p);
  ok(await p.evaluate(() => document.getElementById('screen-taperCalc').classList.contains('active')), 'the calculator opens');
  ok(await p.evaluate(() => document.activeElement.id) === 'tcSpeed', 'cursor in Posted speed on opening');
  ok(await p.evaluate(() => document.getElementById('tcState').options.length) === 52, 'state list: not set + 50 states + DC');
  await p.keyboard.type('45'); await p.waitForTimeout(300);
  let t = await res(p);
  ok(/Merging taper length 540 ft/.test(t) && /L = W × S = 12 × 45 = 540 ft/.test(t), 'live: 45 mph, 12 ft -> 540 ft merging taper: ' + t.slice(0, 90));
  ok(/13 cones/.test(t) && /45 ft apart/.test(t), '13 cones 45 ft apart');
  ok(/Cone spacing along the work 90 ft/.test(t), 'along the work 90 ft');
  ok(/Buffer space 360 ft/.test(t), 'buffer 360 ft (Table 6B-2)');
  ok(/Pick road type/.test(t), 'signs wait for a road type');
  ok(await p.isVisible('#tcTcpLine') && (await p.textContent('#tcTcpLine')) === 'Your competent person / traffic control plan decides on site. Follow the approved TCP if there is one.', 'the TCP line is on the page, last');
  ok(await p.evaluate(() => { const l = document.getElementById('tcTcpLine'); return !l.nextElementSibling && l.getBoundingClientRect().top > document.getElementById('taperResult').getBoundingClientRect().bottom; }), 'TCP line is the last thing, under the answer');
  await sel(p, 'tcRoad', 'rural'); t = await res(p);
  ok(/500 · 500 · 500 ft/.test(t) && /First sign 1,500 ft before the taper \(rural road\)/.test(t), 'rural signs 500/500/500, first sign 1,500 ft');
  ok(/National MUTCD numbers/.test(t), 'no state: national numbers note');
  await sel(p, 'tcType', 'shift'); t = await res(p); ok(/Shifting taper length 270 ft/.test(t), 'shifting 270 ft');
  await sel(p, 'tcType', 'shoulder'); await typ(p, 'tcWidth', 8); t = await res(p);
  ok(/Shoulder taper length 120 ft/.test(t) && (await p.textContent('#tcWidthLabel')) === 'Shoulder width closed (ft)', 'shoulder 8 ft at 45 -> 120 ft, label says shoulder');
  await sel(p, 'tcType', 'flagger'); t = await res(p);
  ok(/50 to 100 ft/.test(t) && /4 to 6 cones/.test(t) && /About 20 ft apart/.test(t) && /Flagger station: about 360 ft/.test(t), 'flagger: 50-100 ft, 4-6 cones 20 ft, station 360 ft');
  ok(!(await p.isVisible('#tcWidth')), 'flagger: width box hidden');
  await sel(p, 'tcType', 'merge'); await typ(p, 'tcWidth', 12);
  // California
  await sel(p, 'tcState', 'CA'); await typ(p, 'tcSpeed', 30); await sel(p, 'tcRoad', 'urbanLow'); t = await res(p);
  ok(/150 · 150 · 150 ft/.test(t) && /California rule:/.test(t), 'CA 30 mph city street: 150 ft each, "California rule": ' + t.slice(-160));
  ok(/180 ft/.test(t), 'CA 30 mph merging taper 180 ft (Table 6B-3(CA))');
  await sel(p, 'tcState', 'TX'); t = await res(p);
  ok(/100 · 100 · 100 ft/.test(t) && /Texas may have its own manual/.test(t), 'TX: federal 100 ft + state may differ');
  await sel(p, 'tcState', 'AK'); await typ(p, 'tcSpeed', 40); await sel(p, 'tcRoad', 'urbanHigh'); t = await res(p);
  ok(/100 · 100 · 100 ft/.test(t) && /Alaska rule:/.test(t) && /24 in wide with 8 in letters/.test(t) && /Check the state manual/.test(t), 'AK 40 mph city: 100 ft, "Alaska rule", paddle note, check line');
  await typ(p, 'tcSpeed', 45); t = await res(p); ok(/350 · 350 · 350 ft/.test(t) && /Alaska, city street at 45 mph/.test(t), 'AK 45 mph city: 350 ft');
  await sel(p, 'tcState', 'MA'); await sel(p, 'tcRoad', 'urbanLow'); t = await res(p);
  ok(/100 · 100 · 100 ft/.test(t) && /MassDOT certified/.test(t) && /airhorn/.test(t) && /36 in/.test(t) && /Check the state manual/.test(t) && !/rule:/.test(t), 'MA: national spacing + flagger/cone note + check line');
  // bad entry: one quiet line on leaving the box
  await typ(p, 'tcSpeed', 90); await p.click('#tcRoad'); await p.keyboard.press('Escape'); await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(300);
  ok(/20 to 75 mph/.test(await p.evaluate(() => (document.getElementById('taperCalcLiveMsg') || {}).textContent || '')) && !(await p.evaluate(() => !!document.querySelector('#taperResult .pb-answer-box'))), '90 mph: no answer, message "20 to 75 mph"');
  await typ(p, 'tcSpeed', 45);
  // copy calculation
  await p.evaluate(() => { try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true }); } catch (e) {} });
  await p.click('#taperCalcCopyBtn'); await p.waitForTimeout(300);
  const cp = await p.evaluate(() => window.__pbLastCalcCopy || '');
  ok(/Taper & Cone Spacing/.test(cp) && /Posted speed \(mph\): 45/.test(cp) && /540 ft/.test(cp), 'Copy calculation has entries and answer');
  ok((await overflow(p)).length === 0, 'phone: nothing wider than the screen ' + (await overflow(p)));
  await p.screenshot({ path: OUT + '/taper_phone.png', fullPage: true });
  // Home shortcut
  await p.click('#screen-taperCalc .pb-addhome'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('#screen-taperCalc .pb-addhome').getAttribute('aria-pressed')) === 'true', 'Add to Home works');
  // search on the More tab finds it
  await p.evaluate(() => pbGoto('tools')); await p.waitForTimeout(400); await p.fill('#toolsAllSearchBox', 'cone spacing'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!document.querySelector('#toolsAllResults .pb-tool-row[data-dest="taper"]')), 'More search "cone spacing" finds it');
  // offline: reopen and answer with no network
  await p.context().setOffline(true);
  await open(p); await sel(p, 'tcState', ''); await typ(p, 'tcSpeed', 55); t = await res(p);
  ok(/660 ft/.test(t) && /495 ft/.test(t), 'offline: 55 mph -> 660 ft taper, 495 ft buffer');
  await p.context().setOffline(false);
  ok(p.errs.length === 0, 'phone: no page errors ' + p.errs.join(' | '));
  await b.close();
  // ---- state default: from where the phone is, then from the company
  ({ b, p } = await boot(URL, { init: co + `;try{localStorage.setItem('pbHereState',JSON.stringify({s:'CA',at:Date.now()}))}catch(e){}` }));
  await p.setViewportSize({ width: 390, height: 844 }); await open(p);
  ok(await p.inputValue('#tcState') === 'CA' && /Where this phone is now/.test(await p.textContent('#tcStateHow')), 'job state defaults to where the phone is (CA)');
  await sel(p, 'tcState', 'NV'); await p.evaluate(() => pbGoto('calcHub')); await p.waitForTimeout(300); await open(p);
  ok(await p.inputValue('#tcState') === 'NV', 'a picked state is kept on return');
  await b.close();
  ({ b, p } = await boot(URL, { init: co + `;try{localStorage.setItem('pbSr:00000000-0000-4000-8000-000000000001',JSON.stringify({co:'OR',jobs:{},jobs_local:{},at:Date.now()}))}catch(e){}` }));
  await p.setViewportSize({ width: 390, height: 844 }); await open(p);
  const co1 = await p.inputValue('#tcState');
  ok(co1 === 'OR' && /From your company/.test(await p.textContent('#tcStateHow')), 'job state defaults to the company state (OR): ' + co1);
  ok(p.errs.length === 0, 'state default: no page errors ' + p.errs.join(' | '));
  await b.close();
  // ---- computer width, dark mode
  process.env.DARK = '1';
  ({ b, p } = await boot(URL, { init: co }));
  await p.setViewportSize({ width: 1280, height: 900 }); await open(p);
  await typ(p, 'tcSpeed', 35); await sel(p, 'tcRoad', 'urbanLow'); t = await res(p);
  ok(/245 ft/.test(t) && /8 cones/.test(t) && /250 ft/.test(t) && /100 · 100 · 100 ft/.test(t), 'computer: 35 mph -> 245 ft, 8 cones, buffer 250, signs 100');
  const dark = await p.evaluate(() => { const c = (el) => getComputedStyle(el); const box = document.querySelector('#taperResult .pb-answer-box'); return { bg: c(document.body).backgroundColor, fg: c(box.querySelector('.pb-answer-label')).color, sel: c(document.getElementById('tcType')).backgroundColor }; });
  const lum = (s) => { const m = s.match(/\d+/g).map(Number); return (m[0] * 299 + m[1] * 587 + m[2] * 114) / 1000; };
  ok(lum(dark.bg) < 80 && lum(dark.fg) > 120, 'dark mode: dark page, light text ' + JSON.stringify(dark));
  ok((await overflow(p)).length === 0, 'computer: nothing wider than the screen');
  await p.screenshot({ path: OUT + '/taper_computer_dark.png', fullPage: true });
  ok(p.errs.length === 0, 'computer: no page errors ' + p.errs.join(' | '));
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL crashed ' + e.stack); process.exit(1); });
