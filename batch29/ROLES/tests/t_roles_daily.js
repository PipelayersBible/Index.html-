// Batch 29 ROLES: the foreman's daily report (batch 23 DAILY) includes the crew man-hours and equipment hours he
// entered for his pipelayers' runs (on their run from My crew now, or on a run he claimed), once each, next to his own
// runs' Crew & Equipment Log; refused entries, claims still waiting for approval and other jobs are left out.
// On batch 28 MANUAL's nr_lib (batch 20 HOME's production mock + the daily functions). Must FAIL on the base, PASS with ROLES.
// Run (inside the lock, >= 2 GB free): PB_TEST_DIR=<site> PB_TEST_PORT=<port> /home/claude/test/run.sh <this file> 600
const T = require('/home/claude/batch28/MANUAL/tests/nr_lib.js'); const { M } = T;
const check = (l, c, d) => { console.log((c ? 'OK  ' : '*** FAIL ***') + ' - ' + l + (c || d === undefined ? '' : ' :: ' + String(d).slice(0, 500))); if (!c) process.exitCode = 1; };
const day = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
(async () => {
  const browser = await M.chromium.launch();
  const now = Date.now(), d = day(), iso = (ms) => new Date(ms).toISOString(), sod = new Date(new Date().setHours(0, 0, 0, 0)).getTime(), t0 = Math.max(now - 5 * 3600000, sod + 60000);
  const rows = [1000, 1100, 1200].map((s, i) => ({ stationFt: s, station: String(s.toFixed(1)), label: i === 0 ? 'start' : i === 2 ? 'end' : '', pointId: i === 0 ? 'start' : i === 2 ? 'end' : null }));
  // his own run today on 24-101: Joe 2 h (Laborer), a dozer 3 h
  const run = { id: 9201, kind: 'run', jobNumber: '24-101', jobsite: 'Elm St water main', startLabel: 'MH-1', endLabel: 'MH-2', runStartTime: iso(t0), runEndTime: iso(t0 + 4 * 3600000), lockTime: iso(t0),
    distance: 200, completedDistance: 200, durationMin: 240, intervalRows: rows, fieldNotes: [], summary: {}, foreman: { feetPipeInstalled: 200, enteredBy: 'Frank Ortiz', enteredAt: now - 3600000 },
    crewLog: [{ id: 'c1', name: 'Joe Lopez', type: 'Laborer', category: 'Pipe Installation', status: 'out', log: [{ action: 'Checked In', time: t0 }, { action: 'Checked Out', time: t0 + 2 * 3600000 }] },
      { id: 'c2', name: 'Dozer #2', type: 'Equipment', category: 'Excavation', status: 'out', log: [{ action: 'Checked In', time: t0 }, { action: 'Checked Out', time: t0 + 3 * 3600000 }] }] };
  const stamp = { k: 'ok', companyId: 'c1', accessAt: iso(now - 86400000) };
  const cr = (pid, name, sref, job, items, extra) => Object.assign({ cid: 'crewrun:' + pid + ':' + sref, pid, name, sref, rref: 'r' + sref, rec: { jobNumber: job, jobsite: '', workDate: d, enteredBy: '', src: 'crewrun', pipelayerName: name }, items, h: 'h' + sref, at: now - 600000, stamp, sentH: 'h' + sref }, extra || {});
  const H = (m, e) => [{ key: 'pipe', qty: 40, unit: 'LF' }, { key: '_manhours', qty: m, unit: 'h' }, { key: '_equiphours', qty: e, unit: 'h' }];
  const prodSync = { v: 3, items: {}, ids: {}, crewRuns: {
    'crewrun:acctP:s99': cr('acctP', 'Wes Hall', 's99', '24-101', H(16, 6)),
    'crewrun:acctP:s98': cr('acctP', 'Wes Hall', 's98', '24-101', H(50, 50), { refused: 'hs98', why: 'pb:already_claimed', sentH: null }), // refused: never counted
    'crewrun:acctP2:s97': cr('acctP2', 'Walt Ruiz', 's97', '25-900', H(7, 7)) } }; // another job
  const ent = (k, id, user, rec, items, extra) => [k, Object.assign({ id, user, email: user + '@x.com', company: 'c1', versions: [1], updated_at: iso(now - 1800000), record: rec, items, crew: null }, extra || {})];
  const srv = { plans: {}, links: [{ foreman: 'acctA', pipelayer: 'acctP', by: 'acctA', started: iso(now - 5 * 86400000) }], entries: Object.fromEntries([
    ent('acctP2|run:w1', '00000000-0000-0000-0000-0000000000a1', 'acctP2', { jobNumber: '24-101', workDate: d, enteredBy: 'Walt Ruiz', sessionRef: 'w1' }, H(24, 8), { crew: { state: 'claimed', created: now - 3600000, by: 'acctA' } }),
    ent('acctA|claim:00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0002-0000000000c1', 'acctA', { jobNumber: '24-101', workDate: d, claimedFrom: '00000000-0000-0000-0000-0000000000a1', claimedFromName: 'Walt Ruiz', enteredBy: null }, H(24, 8), { source: '00000000-0000-0000-0000-0000000000a1' }),
    ent('acctP2|run:w2', '00000000-0000-0000-0000-0000000000a2', 'acctP2', { jobNumber: '24-101', workDate: d, enteredBy: 'Walt Ruiz', sessionRef: 'w2' }, H(99, 99), { crew: { state: 'sent', created: now - 3600000 } }),
    ent('acctA|claim:00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0003-0000000000c2', 'acctA', { jobNumber: '24-101', workDate: d, claimedFrom: '00000000-0000-0000-0000-0000000000a2', claimedFromName: 'Walt Ruiz', enteredBy: null }, H(99, 99),
      { source: '00000000-0000-0000-0000-0000000000a2', late: 'pending', pendingEdit: { id: 1, kind: 'late_claim', companyOnly: true, sourceVersion: 1, items: H(99, 99), saved_at: iso(now - 600000), by: 'acctA' } }) ]) }; // a late claim waiting: the pipelayer's numbers count
  const { ctx, page } = await T.setup(browser, { extra: { 'acctA:runArchive': [run], 'acctA:prodSync': prodSync, __psrv: srv, __names: { acctP: 'Wes Hall', acctP2: 'Walt Ruiz' }, __pipelayers: [{ id: 'acctP', name: 'Wes Hall' }, { id: 'acctP2', name: 'Walt Ruiz' }] } });
  try {
    await page.evaluate(() => pbOpenProdMine()); for (let t = 0; t < 60 && !(await page.evaluate(() => !!document.getElementById('pmClaimed0'))); t++) await page.waitForTimeout(250);
    check('setup: his claimed run is in Runs you claimed', await page.evaluate(() => !!document.getElementById('pmClaimed0')));
    const crewOf = async () => { await page.evaluate(() => pbOpenDailyReport()); await page.waitForTimeout(3500); return page.evaluate(() => { const s = window.__debugDaily().view.snap; return s ? JSON.parse(JSON.stringify(s.crew)) : null; }); };
    let C = await crewOf();
    const P = (C && C.people) || [], E = (C && C.equipment) || [], names = P.concat(E).map(p => p.name + '=' + p.hours).join(' | ');
    check('his own run: Joe Lopez 2 h (Laborer) and Dozer #2 3 h, as before', P.some(p => p.name === 'Joe Lopez' && p.hours === 2 && p.type === 'Laborer') && E.some(p => p.name === 'Dozer #2' && p.hours === 3), names);
    check('Wes Hall’s run (entered on his run from My crew now): crew man-hours 16 h and equipment hours 6 h, listed once', P.filter(p => /Wes Hall/.test(p.name)).length === 1 && P.some(p => /Crew man-hours on Wes Hall’s run \(entered by you on their run\)/.test(p.name) && p.hours === 16) && E.filter(p => /Wes Hall/.test(p.name)).length === 1 && E.some(p => /Wes Hall/.test(p.name) && p.hours === 6), names);
    check('Walt Ruiz’s claimed run: crew man-hours 24 h and equipment hours 8 h, listed once', P.filter(p => /Walt Ruiz/.test(p.name)).length === 1 && P.some(p => /Walt Ruiz’s run \(a run you claimed\)/.test(p.name) && p.hours === 24) && E.some(p => /Walt Ruiz/.test(p.name) && p.hours === 8), names);
    check('left out: the refused entry (50 h), the claim still waiting for approval (99 h), another job (7 h)', !P.concat(E).some(p => p.hours === 50 || p.hours === 99 || p.hours === 7), names);
    check('totals: equipment 17 h (3 + 6 + 8); laborer 2 h (typed man-hours are listed, not in L and O, as batch 28’s)', C && C.totals.equipment_h === 17 && C.totals.laborer_h === 2, JSON.stringify(C && C.totals));
    check('the source line says how they are counted', C && /entered for your pipelayers’ runs .* listed once per run/.test(C.source), C && C.source);
    const scr = await page.evaluate(() => (document.getElementById('drCrew') || {}).textContent || '');
    check('on screen: "Equipment 17 h" and both pipelayers’ runs listed', /Equipment 17 h/.test(scr) && /Crew man-hours on Wes Hall’s run/.test(scr) && /Walt Ruiz’s run/.test(scr), scr.slice(0, 500));
    C = await crewOf();
    check('built again (re-opened): still once each, equipment still 17 h (never added twice)', C && C.people.filter(p => /Wes Hall|Walt Ruiz/.test(p.name)).length === 2 && C.totals.equipment_h === 17, JSON.stringify(C && C.totals));
    check('no JS errors', page._errors.length === 0, page._errors.join(' | '));
  } catch (e) { check('SCRIPT ERROR ' + String(e && e.message).slice(0, 200), false); } finally { await ctx.close(); await browser.close(); }
})();
