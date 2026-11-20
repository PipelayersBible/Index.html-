// officeview 02: Records is a full-width table on a computer for a company account (1440 and 1280): the same rows the
// list had, sortable by heading, a box that narrows them, a click opens the record; nothing off the side.
const L = require('./lib');
const rows = (p) => p.evaluate(() => [...document.querySelectorAll('#ovRecTable tbody tr')].map(tr => [...tr.children].map(td => td.innerText.replace(/\s+/g, ' ').trim())));
(async () => {
  const { b, p } = await L.boot(L.URL, { init: L.co + L.mgr + L.DAY, wait: 3500 });
  await L.waitFn(p, 'pbGoto'); await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(1500);
  await p.evaluate(() => pbGoto('archive')); await p.waitForTimeout(3500);
  for (const w of [1440, 1280]) {
    await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(800);
    const g = await p.evaluate(() => { const t = document.getElementById('ovRecTable'), s = t && t.parentElement, bar = document.getElementById('ovRecBar'); return { tw: t ? t.getBoundingClientRect().width : 0, box: s ? s.clientWidth : 0, sw: s ? s.scrollWidth : 0, bar: !!bar && bar.offsetParent !== null, list: document.querySelectorAll('#rpfList ul.rpf-rows').length, chips: !!document.querySelector('#rpfChips .rpf-chip-b, #rpfChips button') }; });
    L.ok(g.tw > (w === 1440 ? 1100 : 950) && g.list === 0, w + ': Records is one table across the page (' + Math.round(g.tw) + ' px), not the 560 px column');
    L.ok(g.sw <= g.box + 1 && g.bar && g.chips, w + ': it fits its box; the find box and the filter chips are there');
    const o = await L.overflow(p); L.ok(o.length === 0, w + ': nothing off the side of the page ' + JSON.stringify(o));
    await p.screenshot({ path: L.OUT + '/ov2_records_' + w + '.png' });
  }
  let R = await rows(p); console.log('  rows:', JSON.stringify(R));
  const heads = await p.evaluate(() => [...document.querySelectorAll('#ovRecTable thead th')].map(x => x.innerText.replace(/[▲▼\s]+/g, ' ').trim().toUpperCase()));
  L.ok(heads.join('|') === 'WHEN|TYPE|RECORD|JOB|BY|STATUS', 'six columns: ' + heads.join(' | '));
  L.ok(R.length === 8 && (await p.evaluate(() => document.getElementById('ovRecCount').textContent)) === '8 records', 'all 8 of the fake server’s records are listed');
  L.ok(R[0].join('|') === 'Today · 2:10 PM|Delay / extra work|Delay · Weather · 1.5 h|Job 26043|Dana Whitley|Needs review' || R[1].join('|') === 'Today · 2:10 PM|Delay / extra work|Delay · Weather · 1.5 h|Job 26043|Dana Whitley|Needs review', 'a delay row reads: when, type, what, job, who, status');
  const find = (t) => R.find(r => r[2] === t) || [];
  L.ok(find('Daily report — ' + (await p.evaluate(() => new Date(window.__ovDay.day + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))))[5] === 'Signed' && find('MH 3 → MH 4').join('|').startsWith('Yesterday · 12:30 PM|Run report|MH 3 → MH 4|Job 26014|Luis Ortega|Approved'), 'the daily and the run report rows match the server’s data');
  L.ok(find('Confined space — MH-2')[1] === 'Permit' && find('Confined space — MH-2')[5] === 'Closed' && find('CO 1 → MH 1')[5] === 'Not approved yet', 'so do the permit and the run not approved yet');
  L.ok(R.every((r, i) => i === 0 || true) && /^Today/.test(R[0][0]) && !/^Today|^Yesterday/.test(R[7][0]), 'newest first to begin with');
  const full = await p.evaluate(() => [...document.querySelectorAll('#ovRecTable .pb-chip')].every(c => c.scrollWidth <= c.clientWidth + 1));
  L.ok(full, 'no status chip is cut short');
  // sort
  await p.click('#ovRecSort_job'); await p.waitForTimeout(300); R = await rows(p);
  L.ok(R.slice(0, 5).every(r => r[3] === 'Job 26014') && R.slice(5).every(r => r[3] === 'Job 26043'), 'sorted by Job: the five of 26014, then the three of 26043');
  await p.click('#ovRecSort_who'); await p.waitForTimeout(300); R = await rows(p);
  L.ok(R[0][4] === 'Dana Whitley' && R[7][4] === 'Sam Reyes', 'sorted by who sent it');
  await p.click('#ovRecSort_at'); await p.waitForTimeout(300); R = await rows(p);
  L.ok(/^Today/.test(R[0][0]) && R[7][2] === 'Confined space — MH-2', 'When: newest first again');
  // find
  await p.fill('#ovRecQ', 'ticket'); await p.waitForTimeout(300); R = await rows(p);
  L.ok(R.length === 2 && R.every(r => r[1] === 'Field ticket') && (await p.evaluate(() => document.getElementById('ovRecCount').textContent)) === '2 of 8 shown' && (await p.evaluate(() => document.activeElement.id)) === 'ovRecQ', 'the find box narrows to the 2 field tickets, says "2 of 8 shown", and keeps the cursor');
  await p.fill('#ovRecQ', 'zzz'); await p.waitForTimeout(300);
  L.ok(/None of the rows on screen match/.test(await p.evaluate(() => document.getElementById('rpfList').innerText)), 'no match says so');
  await p.fill('#ovRecQ', ''); await p.waitForTimeout(300);
  // a click on a row opens that record, as the list row did (a run report opens the office's run reports)
  await p.click('#ovRecTable tbody tr >> text=MH 3 → MH 4'); await p.waitForTimeout(2000);
  const scr = await p.evaluate(() => (document.querySelector('.pb-screen.active') || {}).id);
  L.ok(scr === 'screen-cxList', 'a click on a run report row opens it, as the list row did (' + scr + ')');
  await p.evaluate(() => pbGoto('archive')); await p.waitForTimeout(1500);
  await p.focus('#rpfRow0'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  const scr2 = await p.evaluate(() => (document.querySelector('.pb-screen.active') || {}).id);
  L.ok(scr2 !== 'screen-archive', 'the keyboard opens a row too (Enter on the record: ' + scr2 + ')');
  // back to Records at a phone width in the same session: the list again
  await p.evaluate(() => pbGoto('archive')); await p.waitForTimeout(1500);
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(1200);
  const ph = await p.evaluate(() => ({ table: !!document.getElementById('ovRecTable'), lists: document.querySelectorAll('#rpfList ul.rpf-rows').length, rowsN: document.querySelectorAll('#rpfList .rpf-row').length, bar: (() => { const x = document.getElementById('ovRecBar'); return !!x && x.offsetParent !== null; })() }));
  L.ok(!ph.table && ph.lists >= 1 && ph.rowsN === 8 && !ph.bar, 'window narrowed to a phone: the list is back (8 rows), no table, no find box');
  L.ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await L.done(b);
})().catch(e => { console.log('FAIL crashed', e && e.stack); process.exit(1); });
