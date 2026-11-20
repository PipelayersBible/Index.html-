// officeview 01: the office's Today table on a computer (company account, 1440 and 1280 wide).
// The numbers on screen must be the fake day's (lib.js DAY); a permit with people inside is red; a row opens the crew's
// detail; nothing runs off the side; with no signal the last saved copy shows with its time.
const L = require('./lib');
const cells = (p) => p.evaluate(() => [...document.querySelectorAll('#ovTable tbody tr.ov-row')].map(tr => [...tr.children].map(td => td.innerText.replace(/\s+/g, ' ').trim())));
const rowOf = (rows, name) => rows.find(r => r[0].startsWith(name)) || [];
(async () => {
  const { b, p } = await L.boot(L.URL, { init: L.co + L.mgr + L.DAY, wait: 3500 });
  await L.waitFn(p, 'pbGoto');
  for (const w of [1440, 1280]) {
    await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(w === 1440 ? 5000 : 2500);
    const g = await p.evaluate(() => { const el = document.getElementById('homeCxToday'), s = el && el.querySelector('.ov-scroll'), t = document.getElementById('ovTable'); return { shown: !!el && !el.hidden && el.offsetParent !== null, tw: t ? t.getBoundingClientRect().width : 0, box: s ? s.clientWidth : 0, sw: s ? s.scrollWidth : 0, heads: [...document.querySelectorAll('#ovTable thead th')].map(x => x.innerText.replace(/[▲▼\s]+/g, ' ').trim()), above: el && document.getElementById('homeCxJobs') ? el.getBoundingClientRect().top < document.getElementById('homeCxJobs').getBoundingClientRect().top : false }; });
    L.ok(g.shown && g.tw > (w === 1440 ? 1050 : 900), w + ': the Today table is on Home and uses the width (' + Math.round(g.tw) + ' px)');
    L.ok(g.sw <= g.box + 1, w + ': the table fits its box, no sideways scroll inside it (' + g.sw + ' <= ' + g.box + ')');
    L.ok(g.above, w + ': Today sits above the jobs');
    if (w === 1440) L.ok(JSON.stringify(g.heads).toUpperCase() === JSON.stringify(['CREW', 'JOB', 'RUNS', 'LAID TODAY', 'FITTINGS', 'PERMITS', 'DAILY', 'TICKETS', 'DELAYS', 'LAST SENT']), 'the ten columns: ' + g.heads.join(' | '));
    const o = await L.overflow(p); L.ok(o.length === 0, w + ': nothing off the side of the page ' + JSON.stringify(o));
    await p.screenshot({ path: L.OUT + '/ov1_home_' + w + '.png', fullPage: true });
  }
  // ---- the numbers are the fake day's ----
  let R = await cells(p); const ray = rowOf(R, 'Ray Alvarez'), dana = rowOf(R, 'Dana Whitley'), pat = rowOf(R, 'Pat Ochoa');
  console.log('  rows:', JSON.stringify(R));
  L.ok(R.length === 3, 'three rows: two crews working and the foreman with nothing sent');
  L.ok(/Luis Ortega, Marco Diaz/.test(ray[0]) && /^Job 26014 Sundance Sewer Improvement$/.test(ray[1]), 'Ray’s crew: who is on it, and the job with its name');
  L.ok(ray[2] === '2 active · 1 ended' && ray[3] === '260 ft', 'Ray’s crew: 2 active, 1 ended, 260 ft today (120 + 80 + 60)');
  L.ok(ray[5] === '1 open 2 inside', 'Ray’s crew: 1 permit open, 2 inside');
  L.ok(ray[6] === 'Not yet', 'Ray’s daily for today is not signed (yesterday’s, signed this morning, does not count)');
  L.ok(ray[7] === '2' && ray[8] === '0' && ray[4] === '–', 'Ray’s crew: 2 field tickets, 0 delays, fittings not known before the daily');
  L.ok(/2:27/.test(ray[9]), 'Ray’s crew last sent 2:27 (the permit, 3 minutes ago): ' + ray[9]);
  L.ok(dana[2] === '1 ended' && dana[3] === '210 ft' && dana[4] === '3', 'Dana’s crew: 1 ended, 210 ft, 3 fittings (the 6 MJ kits are not fittings)');
  L.ok(dana[5] === '–', 'Dana’s crew: the closed permit is not an open permit');
  L.ok(/^Signed 2:10/.test(dana[6]) && dana[7] === '0' && dana[8] === '1 · 1.5 h', 'Dana’s crew: daily signed 2:10, 0 tickets, 1 delay of 1.5 h: ' + dana.slice(6, 9).join(' | '));
  L.ok(pat[2] === 'Nothing sent today' && pat.slice(3).every(c => c === '–'), 'Pat Ochoa: nothing sent today');
  const red = await p.evaluate(() => { const e = document.querySelector('#ovTable .ov-inside'); if (!e) return null; const c = getComputedStyle(e).color.match(/\d+/g).map(Number), tr = e.closest('tr'); return { c, hot: tr.classList.contains('ov-hot'), txt: e.textContent }; });
  L.ok(red && red.txt === '2 inside' && red.c[0] > 150 && red.c[0] > red.c[1] * 1.8 && red.c[0] > red.c[2] * 1.8 && red.hot, 'people inside shows in red, and the row is marked: ' + JSON.stringify(red));
  // ---- only server calls that already exist, with their existing arguments ----
  const asks = await p.evaluate(() => ({ feed: (window.__ovFeedAsks || []).filter(a => a.p_filters && Array.isArray(a.p_filters.types) && a.p_filters.types.join() === 'daily,ticket,event'), day: window.__ovDay.day, log: window.__rpcLog.slice() }));
  L.ok(asks.feed.length === 1 && asks.feed[0].p_filters.from === asks.day && asks.feed[0].p_filters.to === asks.day && Object.keys(asks.feed[0]).sort().join() === 'p_before_at,p_before_key,p_expect_uid,p_filters,p_limit' && asks.feed[0].p_limit <= 100, 'one ask of the Records feed for today, with the arguments the function already takes');
  L.ok(asks.log.filter(n => n === 'pb_daily_get').length === 1, 'the signed daily is read once for its fittings');
  // ---- sorting ----
  await p.click('#ovSort_ft'); await p.waitForTimeout(300); R = await cells(p);
  L.ok(R[0][0].startsWith('Ray') && R[2][0].startsWith('Pat'), 'Laid today, most first: Ray, Dana; the idle foreman stays last');
  await p.click('#ovSort_ft'); await p.waitForTimeout(300); R = await cells(p);
  L.ok(R[0][0].startsWith('Dana') && R[2][0].startsWith('Pat') && await p.evaluate(() => document.querySelector('#ovTable th.ov-c-ft').getAttribute('aria-sort') === 'ascending'), 'a second click turns it round (and says so to a screen reader)');
  await p.click('#ovSort_permits'); await p.waitForTimeout(300); R = await cells(p);
  L.ok(R[0][0].startsWith('Ray'), 'Permits: the crew with people inside comes first');
  // ---- a row opens the crew's detail ----
  await p.click('#ovTable tr.ov-row >> text=Ray Alvarez'); await p.waitForTimeout(400);
  let d = await p.evaluate(() => { const x = document.querySelector('#ovTable tr.ov-detail'); return x ? { t: x.innerText.replace(/\s+/g, ' '), ex: document.querySelector('#ovTable tr.ov-isopen .ov-open').getAttribute('aria-expanded') } : null; });
  L.ok(d && d.ex === 'true' && /Luis Ortega · MH 4 → MH 5 In progress · laid 120 of 400 ft · today 120 ft/.test(d.t) && /Marco Diaz · Lateral 12/.test(d.t) && /Ended 11:10/.test(d.t), 'the detail lists each run: who, where, how far');
  L.ok(d && /MH-4 · 2 inside Air within limits at 2:21/.test(d.t) && /Material ticket #4410 · Ferguson/.test(d.t) && /Concrete ticket #88121/.test(d.t), 'and the open permit with its last air reading, and what was sent today');
  await p.screenshot({ path: L.OUT + '/ov1_today_open_1280.png' });
  await p.waitForTimeout(3500);
  L.ok(await p.evaluate(() => !!document.querySelector('#ovTable tr.ov-detail')), 'the detail stays open while Home refreshes itself');
  const o2 = await L.overflow(p); L.ok(o2.length === 0, 'open detail: nothing off the side ' + JSON.stringify(o2));
  // ---- an emergency and a bad air reading are loud ----
  await p.evaluate(() => { const f = window.__rpcOverride.pb_prod_company_live_permits; window.__rpcOverride.pb_prod_company_live_permits = () => { const r = f(); r.permits[0].status.emergency = true; r.permits[0].status.emergencyAt = new Date().toISOString(); r.permits[0].status.airOk = false; return r; }; window.pbOvRefresh(); });
  await p.waitForTimeout(2500); R = await cells(p); d = await p.evaluate(() => document.querySelector('#ovTable tr.ov-detail').innerText.replace(/\s+/g, ' '));
  L.ok(/^EMERGENCY 1 open 2 inside air outside limits$/.test(rowOf(R, 'Ray Alvarez')[5]), 'an emergency and air outside limits show in the row: ' + rowOf(R, 'Ray Alvarez')[5]);
  L.ok(/EMERGENCY/.test(d) && /OUTSIDE LIMITS/.test(d) && /This board alerts no one\./.test(d), 'the detail says it too, and that this board alerts no one');
  await p.evaluate(() => document.querySelector('#ovTable tr.ov-detail .ov-jobbtn').click()); await p.waitForTimeout(1500);
  L.ok(await p.evaluate(() => (document.querySelector('.pb-screen.active') || {}).id) === 'screen-prodJob', 'Open Job 26014 goes to the job');
  // ---- no signal: the last saved copy, with its time ----
  await p.waitForTimeout(1500);
  await p.context().addInitScript(`window.__ovFail=true;try{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});}catch(e){}`);
  await p.reload({ waitUntil: 'load' }); await L.waitFn(p, 'pbGoto'); await p.waitForTimeout(6000);
  R = await cells(p); const st = await p.evaluate(() => { const e = document.getElementById('ovStatus'); return e && e.offsetParent !== null ? e.textContent : '(not visible) ' + (e ? e.textContent : ''); });
  console.log('  offline status:', st, '| rows:', R.length);
  L.ok(R.length === 3 && rowOf(R, 'Ray Alvarez')[3] === '260 ft' && rowOf(R, 'Ray Alvarez')[7] === '2' && /^Signed/.test(rowOf(R, 'Dana Whitley')[6]) && rowOf(R, 'Dana Whitley')[4] === '3', 'no signal: the saved copy shows the same crews, feet, tickets, daily and fittings');
  L.ok(/^Copy from \d{1,2}:\d\d/.test(st) && /No signal/.test(st), 'and says, on screen, that it is a copy, from when, and that there is no signal: ' + st);
  await p.screenshot({ path: L.OUT + '/ov1_offline_1280.png' });
  L.ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await L.done(b);
})().catch(e => { console.log('FAIL crashed', e && e.stack); process.exit(1); });
