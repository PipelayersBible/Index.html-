// hunt2 03: "Did this window start last night?" at permit Lock.
// node t_c03_permit_last_night.js   (PB_ROOT=http://127.0.0.1:PORT/  PG=<hook page>; each case opens the app at its own clock time)
const path = require('path'); const RIG = path.resolve(__dirname, '../../../rig');
const fails = []; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails.push(m); };
async function one(now, start, end, answer) {
  process.env.PB_FAKE_NOW = now; Object.keys(require.cache).forEach(k => { if (/\/rig\/(env|boot)\.js$/.test(k)) delete require.cache[k]; });
  const boot = require(RIG + '/boot'), co = require(RIG + '/co'), F = require(RIG + '/flow');
  const { b, p } = await boot((process.env.PB_ROOT || 'http://127.0.0.1:8843/') + (process.env.PG || 'cur.html'), { init: co }); const H = F(p);
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => pbGoto('confinedPermit')); await p.waitForTimeout(800);
  const date = await p.evaluate(() => document.getElementById('cpDate').value || (() => { const d = new Date(), z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); })());
  const vals = { cpJobsite: 'Test Sewer', cpAddress: '1 Main St', cpSpace: 'MH-4', cpPurpose: 'Inspect', cpDate: date, cpStart: start, cpEnd: end, cpHazards: 'H2S', cpControls: 'Vent', cpVentFail: 'Flag', cpRescue: '911', cpComms: 'Voice', cpSupervisor: 'Sam Sup', cpSupervisorInitials: 'SS', cpAttendant: 'Al Att' };
  await p.evaluate(v => { for (const k in v) { const el = document.getElementById(k); el.value = v[k]; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } }, vals);
  await p.evaluate(() => window.pbLockConfinedPermit()); await p.waitForTimeout(600);
  let asked = null, acks = 0;
  for (let i = 0; i < 6; i++) { const m = await H.modal(); if (!m) break; const bt = await H.modalBtns();
    if (/Did This Window Start Last Night/i.test(m)) { asked = m; if (process.env.SHOT && !one.shot) { one.shot = 1; await p.screenshot({ path: process.env.SHOT }); } await H.modalClick(answer === 'no' ? 'No, Tonight' : 'Yes, Last Night'); }
    else { if (/Entry Supervisor Decides/.test(m)) acks++; await H.modalClick(bt.find(x => /I Understand|OK|Lock|Yes|Continue/i.test(x)) || bt[0]); }
    await p.waitForTimeout(600); }
  const st = await p.evaluate(() => window.__dEval("(function(){return confinedPermit?{date:confinedPermit.date,start:confinedPermit.start,end:confinedPermit.end,ws:confinedPermit.windowStartMs,we:confinedPermit.windowEndMs,now:Date.now()}:null;})()"));
  const scr = await H.screen(), txt = await p.evaluate(() => { const s = [...document.querySelectorAll('[id^=screen-]')].find(x => x.offsetParent); return s ? s.innerText.replace(/\s+/g, ' ') : ''; });
  const errs = p.errs.slice(); await b.close();
  return { asked, acks, st, scr, date, outside: /OUTSIDE THIS PERMIT/i.test(txt), errs };
}
const dayBefore = (d) => { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() - 1); const z = n => String(n).padStart(2, '0'); return x.getFullYear() + '-' + z(x.getMonth() + 1) + '-' + z(x.getDate()); };
(async () => {
  let r = await one('2026-11-20T00:30:00', '22:00', '02:00', 'yes');
  ok(!!r.asked, '12:30 AM, 10 PM to 2 AM: Lock asks "Did this window start last night?"' + (r.asked ? ' — ' + r.asked.slice(0, 220) : ''));
  ok(r.scr === 'screen-confinedActive' && r.st && r.st.date === dayBefore(r.date) && r.st.ws <= r.st.now && r.st.now < r.st.we, 'Yes, Last Night: the permit is locked for last night (' + (r.st && r.st.date) + ') and is in its window now');
  ok(!r.outside, 'Yes, Last Night: the active permit does not say OUTSIDE THIS PERMIT’S AUTHORIZED WINDOW');
  ok(r.acks === 1, 'the "Entry Supervisor Decides" notice shows once, not twice (' + r.acks + ')');
  ok(!r.errs.length, 'no page errors ' + r.errs.slice(0, 2).join(' | '));
  r = await one('2026-11-20T00:30:00', '22:00', '02:00', 'no');
  ok(!!r.asked && r.scr === 'screen-confinedActive' && r.st && r.st.date === r.date && r.st.ws > r.st.now, 'No, Tonight: locked as typed, starting tonight (' + (r.st && r.st.date) + '), asked once');
  r = await one('2026-11-19T23:30:00', '22:00', '02:00');
  ok(!r.asked && r.scr === 'screen-confinedActive' && !r.outside, '11:30 PM (before midnight), 10 PM to 2 AM: not asked, in its window');
  r = await one('2026-11-20T00:30:00', '07:00', '15:00');
  ok(!r.asked && r.scr === 'screen-confinedActive', '12:30 AM, a day window 7 AM to 3 PM: not asked');
  r = await one('2026-11-20T00:30:00', '00:01', '23:59');
  ok(!r.asked && r.scr === 'screen-confinedActive' && !r.outside, '12:30 AM, 12:01 AM to 11:59 PM (already running): not asked');
  r = await one('2026-11-20T13:00:00', '22:00', '06:00');
  ok(!r.asked && r.scr === 'screen-confinedActive', '1 PM, tonight 10 PM to 6 AM (last night’s window is over): not asked');
  r = await one('2026-11-20T05:10:00', '18:00', '06:00', 'yes');
  ok(!!r.asked && r.st && r.st.date === dayBefore(r.date) && !r.outside, '5:10 AM, 6 PM to 6 AM: asked; Yes puts it in its window');
  console.log(fails.length ? 'RESULT: ' + fails.length + ' failed' : 'RESULT: all passed'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.log('FAIL exception', e && e.stack || e); process.exit(1); });
