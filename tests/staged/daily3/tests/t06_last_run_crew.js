// #50 a new run offers the last run's crew in one tap (people and equipment, type, category, Rental), checked in now;
// offline; only what this run doesn't have yet; not on an ended run.
const L = require('./lib3');
const log = (p) => L.ev(p, `(getCurrentArchiveEntry().crewLog||[]).map(c=>c.name+'|'+c.type+'|'+c.category+(c.rental?'|rental':'')+'|'+c.status+'|'+c.log.length)`);
(async () => {
  const { b, p } = await L.boot();
  await L.mkrun(p, { job: '24-017' });
  L.ok(!(await p.$('#crewSameBtn')), 'the first run has no last run to offer');
  await L.crew(p, 'Joe Laborer', 'Laborer', 'Excavation'); await L.crew(p, 'Sam Operator', 'Operator');
  await p.evaluate(() => { document.getElementById('crewLogAddForm').style.display = ''; document.getElementById('crewLogName').value = 'Mini Ex #4'; document.getElementById('crewLogType').value = 'Equipment'; window.pbFmCrewTypeChanged && pbFmCrewTypeChanged(); const r = document.getElementById('crewLogRental'); if (r) r.checked = true; });
  await L.ev(p, 'pbAddCrewLogEntry(true)'); await p.waitForTimeout(900);
  const first = await log(p); console.log('run 1', JSON.stringify(first));
  await L.endRun(p);
  // a new run, with no signal
  await p.context().setOffline(true); await p.waitForTimeout(300);
  await L.mkrun(p, { job: '24-017' });
  await p.evaluate(() => { const d = document.querySelector('#resForemanCard'); if (d) d.open = true; });
  const offer = await p.evaluate(() => ({ btn: (document.getElementById('crewSameBtn') || {}).textContent || '', names: (document.getElementById('crewSameNames') || {}).textContent || '' })); console.log('offer', JSON.stringify(offer));
  L.ok(/Same Crew as Last Run \(3\)/.test(offer.btn) && /Joe Laborer, Sam Operator, Mini Ex #4/.test(offer.names) && /today/.test(offer.names), 'a new run offers the last run’s 3 (names, and when)');
  const bb = await p.evaluate(() => { const r = document.getElementById('crewSameBtn').getBoundingClientRect(); return { w: r.width, h: r.height }; }); L.ok(bb.h >= 44, 'the button is a glove-size target (' + Math.round(bb.h) + ' px)');
  await p.evaluate(() => document.getElementById('crewSameBtn').scrollIntoView({ block: 'center' })); await L.both(p, 't06_offer');
  await p.click('#crewSameBtn'); await p.waitForTimeout(1200);
  const second = await log(p); console.log('run 2', JSON.stringify(second));
  L.ok(second.length === 3 && second.includes('Joe Laborer|Laborer|Excavation|in|1') && second.some(x => /^Sam Operator\|Operator\|.*\|in\|1$/.test(x)) && second.some(x => /^Mini Ex #4\|Equipment\|.*\|rental\|in\|1$/.test(x)), 'one tap adds all 3 with type, category and Rental, checked in (offline)');
  L.ok(!(await p.$('#crewSameBtn')), 'the offer is gone once they are on');
  const saved = await L.ev(p, `(async()=>{const r=await pbGetFor(pbArchiveOwnerUid,'runArchive')||'';return r.indexOf('Mini Ex #4')>=0;})().catch(()=>null)`);
  console.log('saved in store:', saved);
  // only who is missing: remove Sam, the offer is for 1
  await L.ev(p, `(()=>{const e=getCurrentArchiveEntry();const k=e.crewLog.find(c=>c.name==='Sam Operator');return pbApplyCrewRemove?pbRunOnEntry(e,()=>pbApplyCrewRemove(e,k)):null;})()`); await p.waitForTimeout(900);
  const o2 = await p.evaluate(() => (document.getElementById('crewSameBtn') || {}).textContent || ''); L.ok(/\(1\)/.test(o2), 'after removing one, the offer is only for who is missing (' + o2 + ')');
  // an ended run doesn't offer it
  await L.endRun(p); await p.waitForTimeout(800);
  await L.ev(p, `renderCrewLog(getCurrentArchiveEntry())`);
  L.ok(!(await p.$('#crewSameBtn')), 'an ended run does not offer it');
  await p.context().setOffline(false);
  await L.done(b, p);
})().catch(e => { console.log('FAIL exception', e && e.stack || e); process.exit(1); });
