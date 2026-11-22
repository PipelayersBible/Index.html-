// design_nov22 PHASE 1, deeper review items: G-1 G-3 G-4 F2 F3 H-2 H-3. PASS/FAIL; exit 1 on any FAIL.
const R = __dirname + '/../../../rig/';
const boot = require(R + 'boot'), co = require(R + 'co'), F = require(R + 'flow');
const URL0 = process.env.PB_URL || 'http://127.0.0.1:10700/cur.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const { b, p } = await boot(URL0, { init: co }); const H = F(p);
  await p.setViewportSize({ width: 390, height: 844 });
  // G-3: an empty permit is checked before the acknowledgment
  await p.evaluate(() => pbGoto('confinedPermit')); await p.waitForTimeout(800);
  await p.evaluate(() => window.pbLockConfinedPermit()); await p.waitForTimeout(500);
  const m1 = await H.modal();
  ok(!/entry supervisor decides/i.test(m1 || ''), 'G-3 incomplete permit: no "entry supervisor decides" note first (' + String(m1 || 'no dialog').slice(0, 70) + ')');
  for (let i = 0; i < 3; i++) { if (!(await H.modal())) break; const bt = await H.modalBtns(); await H.modalClick(bt[bt.length - 1]).catch(() => {}); }
  // fill it; then the acknowledgment shows, once
  const date = await p.evaluate(() => { const d = new Date(), z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); });
  const vals = { cpJobsite: 'Test Sewer', cpAddress: '1 Main St, Fresno, CA', cpSpace: 'MH-4', cpPurpose: 'Inspect', cpDate: date, cpStart: '00:01', cpEnd: '23:59', cpHazards: 'H2S', cpControls: 'Vent', cpVentFail: 'Flag', cpRescue: '911', cpComms: 'Voice', cpSupervisor: 'Sam Sup', cpSupervisorInitials: 'SS', cpAttendant: 'Al Att' };
  await p.evaluate(v => { for (const k in v) { const el = document.getElementById(k); el.value = v[k]; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } }, vals);
  await p.evaluate(() => window.pbLockConfinedPermit()); await p.waitForTimeout(600);
  const m2 = await H.modal();
  ok(/entry supervisor decides/i.test(m2 || ''), 'G-3 complete permit: the acknowledgment shows (' + String(m2 || '').slice(0, 60) + ')');
  for (let i = 0; i < 6; i++) { if (!(await H.modal())) break; const bt = await H.modalBtns(); await H.modalClick(bt.find(x => /I Understand|Lock|Yes|Continue|OK/i.test(x)) || bt[0]); await p.waitForTimeout(600); }
  ok(/confinedActive/.test(await H.screen()), 'setup: permit active (' + (await H.screen()) + ')');
  // add an entrant
  await p.evaluate(() => { pbOpenRosterAddForm(); document.getElementById('cpRosterName').value = 'Eddie Ent'; }); await p.waitForTimeout(200);
  await p.evaluate(() => { const b = [...document.querySelectorAll('#cpRosterAddForm button')].find(x => /^Add/.test(x.textContent.trim())); b && b.click(); }); await p.waitForTimeout(1200);
  const row = () => p.evaluate(() => [...document.querySelectorAll('#cpRosterList .cp-roster-row')].map(r => { const b = r.querySelector('button.cp-tog'); return { k: r.querySelector('.k').textContent, t: b ? b.textContent : '', blocked: b ? b.classList.contains('cp-tog-blocked') : null, bg: b ? getComputedStyle(b).backgroundColor : '' }; }));
  let rows = await row(); const ent = () => rows.find(r => /Eddie Ent/.test(r.k));
  ok(!!ent() && ent().blocked && /entry not allowed/.test(ent().t), 'G-1 no air test yet: entrant shows "Check In (entry not allowed)", grey (' + JSON.stringify(ent()) + ')');
  const att = rows.find(r => /Attendant/.test(r.k));
  ok(!!att && att.blocked, 'G-1 attendant row: Check In not allowed (attendant stays outside) shows so');
  // a good reading -> green again
  await p.evaluate(() => { const s = (id, x) => { document.getElementById(id).value = x; }; s('cpAtmoO2', '20.9'); s('cpAtmoLEL', '0'); s('cpAtmoH2S', '0'); s('cpAtmoCO', '0'); s('cpAtmoTester', 'Tess'); });
  await p.evaluate(() => window.pbSaveAtmoReading()); await p.waitForTimeout(1500); { const m = await H.modal(); if (m) { const bt = await H.modalBtns(); await H.modalClick(bt[0]); } }
  await p.waitForTimeout(1300); rows = await row();
  ok(!!ent() && !ent().blocked && ent().t === 'Check In', 'G-1 after a good reading the entrant’s Check In is normal again (' + JSON.stringify(ent()) + ')');
  // a bad reading -> blocked; the tap still asks DO NOT ENTER
  await p.evaluate(() => { const s = (id, x) => { document.getElementById(id).value = x; }; s('cpAtmoO2', '18.9'); s('cpAtmoLEL', '0'); s('cpAtmoH2S', '0'); s('cpAtmoCO', '0'); s('cpAtmoTester', 'Tess'); });
  await p.evaluate(() => window.pbSaveAtmoReading()); await p.waitForTimeout(1500); for (let i = 0; i < 2; i++) { const m = await H.modal(); if (!m) break; const bt = await H.modalBtns(); await H.modalClick(bt[bt.length - 1]); }
  await p.waitForTimeout(1300); rows = await row();
  ok(!!ent() && ent().blocked, 'G-1 after an out-of-range reading the entrant’s Check In shows not allowed');
  await p.evaluate(() => { const b = [...document.querySelectorAll('#cpRosterList .cp-roster-row')].find(r => /Eddie Ent/.test(r.textContent)).querySelector('button.cp-tog'); b.click(); }); await p.waitForTimeout(600);
  const dn = await H.modal(); const dnb = await H.modalBtns();
  ok(/must NOT enter|isn.t allowed in/.test(dn || '') && dnb.some(x => /they.re inside/.test(x)), 'G-1 the tap still opens DO NOT ENTER with "Yes — they’re inside"');
  await H.modalClick(dnb.find(x => /stayed out/.test(x)) || dnb[dnb.length - 1]);
  await p.screenshot({ path: (process.env.PB_OUT || __dirname + '/../shots') + '/_permit_bad.png' }).catch(() => {});
  // G-4
  const reason = await p.evaluate(() => { const b = document.querySelector('#cpCloseoutReasonToggle button.active'); return b ? b.dataset.val : null; });
  ok(reason === 'prohibited', 'G-4 after an out-of-range reading close-out starts on Evacuated / Prohibited (' + reason + ')');
  await p.evaluate(() => { const b = document.querySelector('#cpCloseoutReasonToggle button[data-val="normal"]'); b.click(); }); await p.waitForTimeout(1500);
  const r2 = await p.evaluate(() => document.querySelector('#cpCloseoutReasonToggle button.active').dataset.val);
  ok(r2 === 'normal', 'G-4 a reason the person picks is kept (' + r2 + ')');
  // F3
  const tc = await p.evaluate(() => { const e = document.querySelector('#screen-confinedActive .cp-tc-set'); return e ? getComputedStyle(e).color : null; });
  ok(tc === null || tc !== 'rgb(242, 194, 48)', 'F3 "Set reminder" is not the undefined-accent yellow (' + tc + ')');
  // F2
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
  const pin0 = await p.evaluate(() => getComputedStyle(document.getElementById('cpEmPin')).display);
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(700);
  const pin1 = await p.evaluate(() => { const e = document.getElementById('cpEmPin'); const r = e.getBoundingClientRect(); return getComputedStyle(e).display + ' ' + Math.round(r.bottom) + '/' + innerHeight; });
  ok(pin0 === 'none' && /^flex /.test(pin1), 'F2 EMERGENCY pinned at the bottom once its button scrolls away (top: ' + pin0 + ', scrolled: ' + pin1 + ')');
  await p.evaluate(() => pbGoto('home')); await p.waitForTimeout(400);
  ok((await p.evaluate(() => getComputedStyle(document.getElementById('cpEmPin')).display)) === 'none', 'F2 not on other screens');
  // H-3
  await p.evaluate(() => pbGoto('trenchCalc')); await p.waitForTimeout(500);
  const kick = await p.evaluate(() => getComputedStyle(document.querySelector('#screen-trenchCalc .pb-eyebrow > span')).display);
  ok(kick === 'none', 'H-3 the ALL-CAPS kicker is not in the page for screen readers (' + kick + ')');
  // H-2
  const eye = await p.evaluate(() => { const b = document.getElementById('loginPwEye'), i = document.getElementById('loginPassword'); if (!b) return null; const t0 = i.type; window.pbPwEye(b, ['loginPassword']); const t1 = i.type; window.pbPwEye(b, ['loginPassword']); return [t0, t1, i.type].join(','); });
  ok(eye === 'password,text,password', 'H-2 Log In password Show / Hide (' + eye + ')');
  ok(!!(await p.evaluate(() => document.getElementById('setPwEye'))), 'H-2 Set Password has Show too');
  ok(p.errs.length === 0, 'no page errors (' + p.errs.slice(0, 2).join(' | ') + ')');
  await b.close(); console.log(fails ? 'DONE with ' + fails + ' FAIL' : 'DONE all pass'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL crashed: ' + e.message); process.exit(1); });
