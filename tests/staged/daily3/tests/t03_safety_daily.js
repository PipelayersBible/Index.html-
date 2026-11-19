// #48 Job Book near misses, incidents, stop-work on that day's daily: the card, Needs attention, the signed snapshot, the
// PDF; offline (the phone's copy and an entry not sent yet); a change after signing is flagged.
const L = require('./lib3');
const items = (today, yday, extra) => [
  { id: 'aaaaaaaa-0000-4000-8000-000000000001', kind: 'safety', data: { kind: 'Near miss', date: today, time: '09:15', people: 'Joe Laborer', what: 'Bucket swung near Joe at the spoil pile' }, status: 'open', version: 1, created_at: today + 'T17:20:00Z', updated_at: today + 'T17:20:00Z', by: 'Tommy Fontaine', mine: true, photo_count: 1, history: [] },
  { id: 'aaaaaaaa-0000-4000-8000-000000000002', kind: 'safety', data: { kind: 'Stop work', date: today, time: '13:00', what: 'Gas smell at STA 4+50, stopped work', done: 'Called the gas company; resumed 14:10' }, status: 'closed', version: 2, created_at: today + 'T21:05:00Z', updated_at: today + 'T22:00:00Z', by: 'Tommy Fontaine', mine: true, photo_count: 0, history: [] },
  { id: 'aaaaaaaa-0000-4000-8000-000000000003', kind: 'safety', data: { kind: 'Incident', date: yday, what: 'Yesterday, not on today’s report' }, status: 'open', version: 1, created_at: yday + 'T18:00:00Z', updated_at: yday + 'T18:00:00Z', by: 'Tommy Fontaine', mine: true, photo_count: 0, history: [] },
  { id: 'aaaaaaaa-0000-4000-8000-000000000004', kind: 'issue', data: { title: 'Not a safety event', raised: today }, status: 'open', version: 1, created_at: today + 'T18:00:00Z', updated_at: today + 'T18:00:00Z', by: 'Tommy Fontaine', mine: true, photo_count: 0, history: [] },
].concat(extra || []);
(async () => {
  const { b, p } = await L.boot();
  await L.capSubmit(p);
  const today = await L.ev(p, 'pbFmToday()'), yday = await L.ev(p, `pbDlyDayBefore(pbFmToday())`);
  await p.evaluate(([t, y, I]) => { window.__jbItems = I; window.__rpcOverride.pb_prod_job_items = (a) => ({ ok: true, company_id: 'c1', job_key: '24-017', can_manage: false, server_at: new Date().toISOString(), job_number: a.p_job_number, items: a.p_job_number === '24-017' ? window.__jbItems : [] }); }, [today, yday, items(today, yday)]);
  await L.run(p, { job: '24-017', start: L.T(7), end: L.T(15), pipe: 80 });
  await L.daily(p, { job: '24-017' });
  let tx = await L.txt(p, '#drSafety'); console.log('card:', tx.replace(/\s+/g, ' ').slice(0, 400));
  L.ok(/Near miss/.test(tx) && /Stop work/.test(tx) && !/Yesterday/.test(tx) && !/Not a safety event/.test(tx), 'the card lists today’s near miss and stop work only (not yesterday’s, not an issue)');
  L.ok(/Called the gas company/.test(tx) && /People: Joe Laborer/.test(tx), 'what was done and the people involved show');
  tx = await L.txt(p, '#drSafetyAlert'); L.ok(/STOP WORK logged in the Job Book at 13:00/.test(tx) && !/NEAR MISS/.test(tx), 'Needs attention names the stop work (not the near miss)');
  // offline: a First aid saved on this phone, not sent yet
  await p.context().setOffline(true); await p.waitForTimeout(500);
  await L.ev(p, `pbJbQueue({ cid: pbDlyId(), id: 'aaaaaaaa-0000-4000-8000-000000000005', jobNumber: '24-017', jobKey: pbJbKey('24-017'), kind: 'safety', data: { kind: 'First aid', date: pbFmToday(), time: '15:00', what: 'Cut hand on a pipe end, bandaged' }, status: 'open', photos: [], state: 'waiting', why: '', savedAt: new Date().toISOString() })`);
  await L.ev(p, 'pbDlyRebuild()'); await p.waitForTimeout(2500); await L.openAll(p);
  tx = await L.txt(p, '#drSafety'); console.log('offline card:', tx.replace(/\s+/g, ' ').slice(0, 500));
  L.ok(/First aid/.test(tx) && /saved on this phone, not sent yet/.test(tx) && /Stop work/.test(tx), 'offline: the phone’s copy of the list plus the entry not sent yet');
  await L.both(p, 't03_safety_card');
  // sign offline: the snapshot carries safety_events
  const sg = await L.sign(p, 'Tommy Fontaine', 'Laid 80 ft. Stop work 13:00 for a gas smell.'); console.log('sign', JSON.stringify(sg));
  const rep = await L.ev(p, `(()=>{const r=pbDly.st.reports.slice(-1)[0];return {state:r.state,se:r.snapshot.safety_events};})()`);
  console.log('signed', rep.state, JSON.stringify(rep.se.items.map(x => x.kind + '@' + x.time + (x.sent ? '' : ' (not sent)'))));
  L.ok(rep.se && rep.se.items.length === 3 && rep.se.items.map(x => x.kind).join() === 'Near miss,Stop work,First aid', 'the signed report keeps the 3 safety events in time order');
  const pdf = (await L.pdfText(p, `pbDlyMakePdf(pbDly.st.reports.slice(-1)[0], false, true)`, 't03_safety_daily')).replace(/[ \t]+/g, ' ');
  L.ok(/Safety events \(Job Book\) \(3\)/.test(pdf), 'the PDF has a Safety events (Job Book) section');
  L.ok(/STOP WORK logged in the Job Book at 13:00/.test(pdf), 'the PDF’s Needs attention names the stop work');
  L.ok(/Gas smell at STA 4\+50/.test(pdf) && /Cut hand/.test(pdf) && /not on the company server yet/.test(pdf), 'the PDF rows carry what happened and the unsent mark');
  // back online: the report goes; a near miss added to the Job Book afterwards is flagged on the signed day
  await p.context().setOffline(false); await p.waitForTimeout(500);
  await L.ev(p, 'pbDlySyncSoon(100)'); await p.waitForTimeout(4000);
  const sub = await L.lastSub(p); L.ok(sub && sub.p_snapshot.safety_events && sub.p_snapshot.safety_events.items.length === 3, 'with signal the report is sent with its safety events');
  await p.evaluate(([t]) => { window.__jbItems = window.__jbItems.concat([{ id: 'aaaaaaaa-0000-4000-8000-000000000006', kind: 'safety', data: { kind: 'Near miss', date: t, time: '16:30', what: 'Logged after signing' }, status: 'open', version: 1, created_at: t + 'T23:00:00Z', updated_at: t + 'T23:00:00Z', by: 'Tommy Fontaine', mine: true, photo_count: 0, history: [] }]); }, [today]);
  await L.daily(p, { job: '24-017' }); await p.waitForTimeout(1500);
  tx = await L.txt(p, '#drChangedSince'); console.log('changed:', tx);
  L.ok(/safety events/.test(tx) && /Add an Amendment/.test(tx), 'a safety event logged after signing gets the "changed after you signed" warning');
  await L.done(b, p);
})().catch(e => { console.log('FAIL exception', e && e.stack || e); process.exit(1); });
