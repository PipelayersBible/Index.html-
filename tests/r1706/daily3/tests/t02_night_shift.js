// #47 night shift: runs started after midnight stay with the shift's report (any job), the r17.00 opening, the crew's
// day across midnight, and a run after the shift's report was signed starts the new day. Clock: Mon Nov 16 2026, Pacific.
const L = require('./lib3');
const at = (s) => Date.parse(s);
(async () => {
  const { b, p } = await L.boot2('', { time: '2026-11-17T05:10:00-08:00', tz: 'America/Los_Angeles' });
  await L.capSubmit(p);
  const r1 = await L.run(p, { job: '24-017', start: at('2026-11-16T19:00:00-08:00'), end: at('2026-11-16T23:30:00-08:00'), pipe: 100, crew: [['Joe Laborer', 'Laborer']] });
  const r2 = await L.run(p, { job: '24-017', start: at('2026-11-17T00:30:00-08:00'), end: at('2026-11-17T03:00:00-08:00'), pipe: 60, crew: [['Joe Laborer', 'Laborer']] });
  const r3 = await L.run(p, { job: '24-020', site: 'Elm St Water', start: at('2026-11-17T03:30:00-08:00'), end: at('2026-11-17T05:00:00-08:00'), pipe: 20, crew: [['Joe Laborer', 'Laborer']] });
  const days = await L.ev(p, `runArchive.slice().sort((a,b)=>a.id-b.id).map(e=>__pbDlyRunDay(e))`); console.log('days', JSON.stringify(days));
  L.ok(days.join() === '2026-11-16,2026-11-16,2026-11-16', 'the runs at 00:30 (same job) and 03:30 (other job) belong to the shift that started Mon Nov 16');
  // with no signal: the daily opens on the shift's day with both 24-017 runs
  await p.context().setOffline(true);
  await L.ev(p, `(()=>{const o=pbDxToast;pbDxToast=function(t){window.__toasts=(window.__toasts||[]).concat([t]);return o.apply(this,arguments);};return 1;})()`);
  await L.daily(p);
  const ds = await p.evaluate(() => document.getElementById('drDate').value), job = await p.evaluate(() => document.getElementById('drJob').value);
  console.log('opened', ds, job);
  L.ok(ds === '2026-11-16' && job === '24-020', 'offline: the daily opens on the shift day (Mon), on the job of its last run (24-020)');
  const toast = await p.evaluate(() => (window.__toasts || []).join(' | ')); console.log('toast', toast);
  L.ok(/runs after midnight are on this report/.test(toast || ''), 'the note says the runs after midnight are on this report');
  await L.ev(p, `(()=>{document.getElementById('drJob').value='24-017';return pbDlyPick();})()`); await p.waitForTimeout(2500);
  const snap = await L.ev(p, `pbDlyView.snap&&{runs:pbDlyView.snap.runs.items.length,ft:pbDlyView.snap.runs.totals.pipe&&pbDlyView.snap.runs.totals.pipe.qty}`); console.log('24-017 Mon', JSON.stringify(snap));
  L.ok(snap && snap.runs === 2 && snap.ft === 160, 'Monday\u2019s 24-017 report has both of the shift\u2019s runs (19:00 and 00:30), 160 LF');
  let D = await L.draftDump(p); console.log('crew', JSON.stringify(D));
  L.ok(D.crew.every(x => /=10$/.test(x)), 'the crew’s day runs across midnight: 19:00 to 05:00 = 10 h');
  await L.ev(p, `(()=>{document.getElementById('drDate').value='2026-11-17';return pbDlyPick();})()`); await p.waitForTimeout(2500);
  const tue = await L.ev(p, `pbDlyView.snap&&pbDlyView.snap.runs.items.length`); L.ok(tue === 0, 'Tuesday’s 24-017 report has none of the shift’s runs');
  await p.context().setOffline(false); await p.waitForTimeout(1000);
  // sign Monday's 24-017; a 24-017 run at 06:00 Tue (1 h after the shift's last stop) now starts the new day
  await L.daily(p, { job: '24-017', date: '2026-11-16' });
  const sg = await L.sign(p, 'Tommy Fontaine', 'Night shift, 160 ft.'); console.log('sign', JSON.stringify(sg));
  const s1 = await L.lastSub(p); L.ok(s1 && s1.p_work_date === '2026-11-16' && s1.p_snapshot.runs.items.length === 2, 'signed Monday with the two runs');
  const pdf = await L.pdfText(p, `pbDlyMakePdf(pbDly.st.reports.filter(r=>r.workDate==='2026-11-16').slice(-1)[0], false, true)`, 't02_night_daily');
  L.ok(/Runs & Production \(2\)/.test(pdf) && /after midnight are on the shift/.test(pdf.replace(/\s+/g, ' ')), 'the daily PDF lists both runs and says the night shift rule');
  await p.clock.fastForward('01:00:00');
  await L.run(p, { job: '24-017', start: at('2026-11-17T06:00:00-08:00'), end: at('2026-11-17T06:05:00-08:00'), pipe: 5 });
  const days2 = await L.ev(p, `runArchive.slice().sort((a,b)=>a.id-b.id).map(e=>__pbDlyRunDay(e))`); console.log('days2', JSON.stringify(days2));
  L.ok(days2[3] === '2026-11-17' && days2.slice(0, 3).join() === '2026-11-16,2026-11-16,2026-11-16', 'a run after the shift’s report was signed goes on the new day; the signed ones stay');
  // a day shift: gap over 4 h, or after noon, is its own day
  const day = await L.ev(p, `(()=>{const e={kind:'run',id:1,jobNumber:'24-017',runStartTime:${at('2026-11-17T13:00:00-08:00')},runEndTime:${at('2026-11-17T15:00:00-08:00')}};runArchive.push(e);const d=__pbDlyRunDay(e);runArchive.pop();return d;})()`);
  L.ok(day === '2026-11-17', 'an afternoon run is on its own day');
  await L.both(p, 't02_night');
  await L.done(b, p);
})().catch(e => { console.log('FAIL exception', e && e.stack || e); process.exit(1); });
