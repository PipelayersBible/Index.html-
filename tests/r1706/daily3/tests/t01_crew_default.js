// #45 crew hours default: 8 h, or the crew's first start to last stop when longer; #46 the second job takes off the hours
// already on the other signed report (with the new default); the foreman's typed hours win.
const L = require('./lib3'), T = L.T;
(async () => {
  const { b, p } = await L.boot();
  await L.capSubmit(p);
  // a 2 h run with Joe logged 2 h: everyone starts at 8 h, not the logged 2 h
  await L.run(p, { job: '24-017', start: T(7), end: T(9), pipe: 40, crew: [['Joe Laborer', 'Laborer']] });
  await L.daily(p, { job: '24-017' });
  let D = await L.draftDump(p); console.log('A', JSON.stringify(D));
  L.ok(D.crew.includes('Joe Laborer=8') && D.crew.some(x => /=8$/.test(x) && !/Joe/.test(x)), 'a short day: everyone defaults to 8 h (Joe was logged 2 h)');
  let tx = await L.txt(p, '#dxCrewDef'); console.log(' line:', tx);
  L.ok(/Hours start at 8 h/.test(tx), 'the line under Crew Today says the 8 h rule');
  // a second run later the same day: first start 7:00 to last stop 17:30 = 10.5 h
  await L.run(p, { job: '24-017', start: T(13), end: T(17, 30), pipe: 60, crew: [['Joe Laborer', 'Laborer']] });
  await L.daily(p, { job: '24-017' });
  D = await L.draftDump(p); console.log('B', JSON.stringify(D));
  L.ok(D.crew.length >= 2 && D.crew.every(x => /=10\.5$/.test(x)), 'first start to last stop (10.5 h) is the default when longer than 8 h, setup and the gap included');
  tx = await L.txt(p, '#dxCrewDef'); console.log(' line:', tx);
  L.ok(/first start .* to last stop .*10\.5 h/.test(tx), 'the line names first start, last stop and 10.5 h');
  // the foreman changes Joe to 9 and signs
  await L.ev(p, `(()=>{const d=pbDpDraft();const i=d.crew.findIndex(x=>x.name==='Joe Laborer');pbDxCrewHours(i,'9');return i;})()`); await p.waitForTimeout(800);
  await L.sign(p, 'Tommy Fontaine', 'Laid 100 ft.');
  const s1 = await L.lastSub(p); const P = s1 && s1.p_snapshot.crew_today;
  console.log('signed', JSON.stringify(P && P.people), JSON.stringify(P && P.day_default));
  L.ok(P && P.people.find(x => x.name === 'Joe Laborer').hours === 9, 'what the foreman typed (9 h) is what is signed');
  L.ok(P && P.people.find(x => x.name !== 'Joe Laborer').hours === 10.5, 'the others are signed at the default (10.5 h)');
  L.ok(P && P.people.find(x => x.name === 'Joe Laborer').log_h === 6.5, 'the logged run time stays on the report (log_h 6.5)');
  L.ok(P && P.day_default && P.day_default.hours === 10.5 && P.day_default.first_start && P.day_default.last_stop, 'the report keeps the day default and its first start / last stop');
  // #46: a second job at 18:00-19:00. The crew's day is now 7:00-19:00 = 12 h, less what is on the signed 24-017 report
  await L.run(p, { job: '24-020', site: 'Elm St Water', start: T(18), end: T(19), pipe: 10, crew: [['Joe Laborer', 'Laborer']] });
  await L.daily(p, { job: '24-020' });
  D = await L.draftDump(p); console.log('C', JSON.stringify(D));
  L.ok(D.crew.includes('Joe Laborer=3') && D.crew.some(x => !/Joe/.test(x) && /=1\.5$/.test(x)), 'second job: the day (12 h) less the hours on the signed report (Joe 12-9=3, foreman 12-10.5=1.5)');
  tx = await L.txt(p, '#dpCrew'); L.ok(/taken off the full day/.test(tx), 'the second-job line still shows');
  // no signal: the same defaults (worked out on the phone)
  await p.context().setOffline(true); await p.waitForTimeout(300);
  await L.daily(p, { job: '24-020' });
  const D2 = await L.draftDump(p); L.ok(JSON.stringify(D2.crew) === JSON.stringify(D.crew), 'offline: the same defaults (' + D2.crew.join(', ') + ')');
  await L.both(p, 't01_crew');
  await p.context().setOffline(false);
  await L.done(b, p);
})().catch(e => { console.log('FAIL exception', e && e.stack || e); process.exit(1); });
