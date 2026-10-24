// Batch 14 F: "Laid to here" on the Results grade rows. Real touch gestures (CDP) at 390 Normal; 320 XL (the table is
// wider than the screen there); a mouse drag at 1280. Swipe vs scroll, skipping rows (one time), undo (kept in history),
// Next, Hide laid rows (per person), the menu way (no swipe needed), the pre-filled feet never over a typed value,
// marking an ended run, nothing else in the record changes, and the live status queue (offline first).
const L = require('./lf_lib.js'); const { M, check } = L;
const wrapTop = (p) => p.evaluate(() => document.querySelector('#screen-results .pb-table-wrap').scrollTop);
const errs = [];
(async () => {
  const browser = await M.chromium.launch();
  // ---------- 390 Normal, touch ----------
  { const { ctx, page } = await L.setupTouch(browser, { width: 390 });
    try {
      await M.lockRun(page);
      await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = '24-101'; return window.__debugSaveRunArchive(); }); await page.waitForTimeout(300);
      let S = await L.laidState(page); const rows0 = S.rowsJson, rep0 = S.report, sent0 = S.sent;
      check('start: nothing laid; row 0.0 is Next with a "Next" tag; no progress line; Hide switch hidden', S.n === 0 && S.nextRow === 0
        && await page.evaluate(() => document.querySelector('#resultsBody tr[data-laid-idx="0"]:not([data-laid-strip]) > td:nth-child(2)').dataset.laidTag === 'Next' && getComputedStyle(document.querySelector('#resultsBody tr[data-laid-idx="0"]:not([data-laid-strip]) > td:nth-child(2)'), '::after').content === '"Next"' && document.querySelector('#resultsBody tr[data-laid-idx="0"]:not([data-laid-strip]) > td:nth-child(2)').textContent === '0.0' && document.getElementById('laidProgress').hidden && document.getElementById('laidHideBtn').hidden));
      check('rows are touch-action pan-y (vertical scrolling stays the browser\'s)', await page.evaluate(() => getComputedStyle(document.querySelector('#resultsBody tr[data-laid-idx] > td')).touchAction === 'pan-y pinch-zoom'));
      // swipe vs scroll
      await page.evaluate(() => { document.querySelector('#screen-results .pb-table-wrap').scrollTop = 0; });
      let p = await L.rowPoint(page, 2); const t0 = await wrapTop(page);
      await L.touchDrag(page, p.x, p.y + 40, 9, -220, { steps: 12 });
      S = await L.laidState(page);
      check('scroll: an upward drag (with 9 px sideways drift) scrolls the table and marks nothing', S.n === 0 && (await wrapTop(page)) > t0 + 40);
      p = await L.rowPoint(page, 4);
      await L.touchDrag(page, p.x, p.y, 45, 110, { steps: 10 });
      check('scroll: a diagonal, mostly-down drag marks nothing', (await L.laidState(page)).n === 0);
      p = await L.rowPoint(page, 4);
      await L.touchDrag(page, p.x, p.y, 50, 3, { steps: 6 });
      check('short sideways drag (50 px, below the glove threshold) marks nothing', (await L.laidState(page)).n === 0);
      p = await L.rowPoint(page, 4);
      await L.touchDrag(page, p.x, p.y, -150, 2);
      check('a left swipe on a row that isn\'t laid does nothing', (await L.laidState(page)).n === 0);
      // review 1 SF3: only a clearly sideways start can mark; a drag that turns into a scroll never does
      const hooked = async (x, y) => { const c = page._cdp; await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
        for (let i = 1; i <= 3; i++) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 8 * i, y, id: 1 }] }); await page.waitForTimeout(16); }
        for (let i = 1; i <= 12; i++) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 24 + 8 * i, y: y - 15 * i, id: 1 }] }); await page.waitForTimeout(16); }
        await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(300); };
      p = await L.rowPoint(page, 5); await hooked(p.x, p.y + 60);
      if ((await L.laidState(page)).n) console.log('hooked', JSON.stringify(await page.evaluate(() => window.__pbLaidLastGesture)));
      check('SF3: 24 px sideways then 180 px up-and-right (the reviewer\'s hooked scroll) marks nothing', (await L.laidState(page)).n === 0);
      for (const deg of [30, 40, 60, 80]) {
        await page.evaluate(() => { document.querySelector('#screen-results .pb-table-wrap').scrollTop = 0; });
        p = await L.rowPoint(page, 3); const r = deg * Math.PI / 180;
        await L.touchDrag(page, p.x, p.y, 170 * Math.cos(r), -170 * Math.sin(r), { steps: 12 });
        check('SF3: a straight drag at ' + deg + '° from horizontal marks nothing (gesture: ' + ((await page.evaluate(() => window.__pbLaidLastGesture || {})).mode || 'browser scroll') + ')', (await L.laidState(page)).n === 0);
      }
      for (const deg of [0, 10, 20]) {
        await page.evaluate(() => { document.querySelector('#screen-results .pb-table-wrap').scrollTop = 0; });
        p = await L.rowPoint(page, 1); const r = deg * Math.PI / 180;
        await L.touchDrag(page, p.x, p.y, 170 * Math.cos(r), -170 * Math.sin(r), { steps: 12 });
        const n = (await L.laidState(page)).n;
        check('SF3: a straight drag at ' + deg + '° marks (0.0–10.0)', n === 2);
        await page.evaluate(() => pbLaidUndo(0)); await page.waitForTimeout(400);
      }
      await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); delete e.laid; return window.__debugSaveRunArchive(); }); await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(400);
      // swipe right: skip marking with one time
      p = await L.rowPoint(page, 3);
      await L.touchDrag(page, p.x, p.y, 150, 8, { steps: 10 });
      S = await L.laidState(page);
      if (S.n !== 4) console.log('debug gesture', JSON.stringify(await page.evaluate(() => window.__pbLaidLastGesture)));
      check('swipe right on 30.0: rows 0.0–30.0 laid, ALL with the same time', S.n === 4 && S.laid.slice(0, 4).every(t => t && t === S.laid[0]) && S.laid[4] === null);
      check('history: one "laid" entry, phone time, account, up to 30.0, 4 rows', S.log.length === 1 && S.log[0].a === 'laid' && S.log[0].by === 'acctA' && S.log[0].to === '30.0' && S.log[0].keys.length === 4 && S.log[0].at === S.laid[0]);
      check('laid rows show a band (class) and "Laid h:mm" in the row; 40.0 is Next', S.laidRows.join(',') === '0,1,2,3' && S.nextRow === 4
        && await page.evaluate(() => /^"Laid \d{1,2}:\d{2}/.test(getComputedStyle(document.querySelector('#resultsBody tr[data-laid-idx="3"]:not([data-laid-strip]) > td:nth-child(2)'), '::after').content) && getComputedStyle(document.querySelector('#resultsBody tr.pb-laid > td')).backgroundImage.includes('repeating-linear-gradient')));
      check('the laid band keeps the numbers readable (text colour unchanged on the darker band)', await page.evaluate(() => { const a = getComputedStyle(document.querySelector('#resultsBody tr.pb-laid > td:nth-child(3)')).color, b = getComputedStyle(document.querySelector('#resultsBody tr[data-laid-idx="6"]:not([data-laid-strip]) > td:nth-child(3)')).color; return a === b; }));
      check('Next row: yellow edge on its first cell', await page.evaluate(() => /4px 0px 0px 0px inset|inset 4px 0px 0px/.test(getComputedStyle(document.querySelector('#resultsBody tr.pb-laid-next:not([data-laid-strip]) > td')).boxShadow)));
      check('saved like a note: the stored run has the marks', JSON.stringify(((await L.stored(page, 'acctA')) || {}).marks || {}).split(':').length > 4);
      check('progress line: "Pipe laid: 30 of 100 ft, last h:mm"', /^Pipe laid: 30 of 100 ft, last \d{1,2}:\d{2}/.test(await page.evaluate(() => document.getElementById('laidProgress').textContent)));
      check('screen readers hear it: "Marked laid to 30.0 (4 rows)"', /Marked laid to 30\.0 \(4 rows\)/.test(await page.evaluate(() => document.getElementById('laidLive').textContent)));
      check('pre-filled "Feet of pipe installed": 30, with its note', await page.evaluate(() => document.getElementById('fpPipeInstalled').value === '30' && !document.getElementById('fpLaidHint').hidden));
      // skip ahead: 70.0 marks 40-70 with a NEW single time; earlier rows keep theirs
      await page.waitForTimeout(1100);
      p = await L.rowPoint(page, 7);
      await L.touchDrag(page, p.x, p.y, 160, -6); await page.waitForTimeout(900);
      S = await L.laidState(page);
      check('skip: swipe on 70.0 marks 40.0–70.0 with one new time; 0.0–30.0 keep their earlier time', S.n === 8 && S.laid.slice(4, 8).every(t => t === S.laid[4]) && S.laid[4] > S.laid[0] && S.laid[3] === S.laid[0]);
      check('Next is 80.0, and the table scrolled to keep it near the top (or as far as it goes)', S.nextRow === 8 && await page.evaluate(() => { const w = document.querySelector('#screen-results .pb-table-wrap'), n = document.querySelector('#resultsBody tr.pb-laid-next:not([data-laid-strip])'); const t = n.getBoundingClientRect().top - w.getBoundingClientRect().top; return t >= 0 && (t < w.clientHeight * 0.5 || w.scrollTop >= w.scrollHeight - w.clientHeight - 2); }));
      check('pre-fill follows the marks: 70', await page.evaluate(() => document.getElementById('fpPipeInstalled').value === '70'));
      check('leaving Results with only the pre-fill asks nothing (it is the app\'s suggestion, not typed)', await page.evaluate(() => { pbGoto('home'); const ov = document.getElementById('pbModalOverlay'); const open = getComputedStyle(ov).display !== 'none'; return !open; }));
      await page.evaluate(() => pbGoto('results', false, true)); await page.waitForTimeout(400);
      // undo
      p = await L.rowPoint(page, 6);
      await L.touchDrag(page, p.x, p.y, -150, 4);
      S = await L.laidState(page);
      check('undo: swipe back on 60.0 undoes 60.0 and 70.0; 0.0–50.0 stay laid', S.n === 6 && S.laid[5] && S.laid[6] === null && S.laid[7] === null && S.nextRow === 6);
      check('undo is kept in the history (laid, laid, undo)', S.log.map(x => x.a).join(',') === 'laid,laid,undo' && S.log[2].keys.length === 2);
      // the menu way (no swipe), keyboard reachable
      await page.evaluate(() => { const b = document.querySelector('#resultsBody tr[data-laid-idx="9"]:not([data-laid-strip]) button[aria-label="Calculators"]'); b.click(); });
      const lab = await page.evaluate(() => document.querySelector('button[data-laid-btn="9"]').textContent);
      check('menu: the row\'s calculator menu offers "Mark laid to here (and the rows before)"', lab === 'Mark laid to here (and the rows before)');
      await page.focus('button[data-laid-btn="9"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
      S = await L.laidState(page);
      check('menu + keyboard: Enter marks 60.0–90.0 laid; the button now says "Undo laid from here"', S.n === 10 && S.nextRow === 10 && await page.evaluate(() => document.querySelector('button[data-laid-btn="9"]').textContent === 'Undo laid from here'));
      // hide laid rows
      await page.click('#laidHideBtn'); await page.waitForTimeout(300);
      const fold = await page.evaluate(() => ({ sum: [...document.querySelectorAll('#resultsBody tr.pb-laid-sum')].map(t => t.textContent.trim()), hidden: [...document.querySelectorAll('#resultsBody tr[data-laid-idx]')].filter(t => getComputedStyle(t).display === 'none').length, pressed: document.getElementById('laidHideBtn').getAttribute('aria-pressed') }));
      check('Hide laid rows: one line "10 rows laid (0.0 to 90.0)"; the laid rows are folded; switch pressed', fold.sum.length === 1 && /10 rows laid \(0\.0 to 90\.0\)/.test(fold.sum[0]) && fold.hidden >= 10 && fold.pressed === 'true');
      await page.click('#resultsBody tr.pb-laid-sum button'); await page.waitForTimeout(200);
      check('tap the line: the rows open again (the line stays to fold them)', await page.evaluate(() => [...document.querySelectorAll('#resultsBody tr[data-laid-idx]')].every(t => getComputedStyle(t).display !== 'none') && document.querySelector('#resultsBody tr.pb-laid-sum button').getAttribute('aria-expanded') === 'true'));
      await page.reload(); await page.waitForTimeout(1800); await M.dismiss(page);
      await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(800);
      check('after a reload: the switch is remembered (per person) and the marks are still there', await page.evaluate(() => document.querySelectorAll('#resultsBody tr.pb-laid-sum').length === 1 && document.getElementById('laidHideBtn').getAttribute('aria-pressed') === 'true') && (await L.laidState(page)).n === 10);
      await page.click('#laidHideBtn'); await page.waitForTimeout(200);
      S = await L.laidState(page);
      check('after 4 mark/undo actions: grade rows identical, report text identical, sent state unchanged', S.rowsJson === rows0 && S.report === rep0 && S.sent === sent0);
      // never overwrite a typed value
      await page.fill('#fpPipeInstalled', '55'); await page.waitForTimeout(100);
      await page.evaluate(() => pbLaidUndo(10 - 1)); await page.waitForTimeout(400);
      await page.evaluate(() => pbLaidMark(10)); await page.waitForTimeout(400);
      check('typed 55 stays after more marks (never overwritten)', await page.evaluate(() => document.getElementById('fpPipeInstalled').value === '55' && document.getElementById('fpLaidHint').hidden));
      await page.evaluate(() => pbSaveForemanData()); await page.waitForTimeout(600); await M.dismiss(page);
      await page.evaluate(() => pbLaidUndo(5)); await page.waitForTimeout(400);
      check('a saved value stays too (55) after an undo', await page.evaluate(() => document.getElementById('fpPipeInstalled').value === '55'));
      // the record otherwise unchanged
      S = await L.laidState(page);
      check('grade rows still identical after more marks and a foreman save', S.rowsJson === rows0);
      // ended run: marking is still allowed
      await page.evaluate(() => pbEndRun()); await page.waitForTimeout(800); await M.dismiss(page); await page.waitForTimeout(400); await M.dismiss(page);
      await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(800); await M.dismiss(page);
      const ended = await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); return !!(e.completed || e.incomplete); });
      p = await L.rowPoint(page, 8);
      await L.touchDrag(page, p.x, p.y, 160, 2);
      S = await L.laidState(page);
      check('ended (locked) run: marking laid still works (' + (ended ? 'ended' : 'NOT ended?') + ')', ended && S.n === 9 && S.rowsJson === rows0);
      // the live status: queued per account, and sent (the mock records it)
      await L.waitFor(page, () => (window.__statusPuts || []).some(x => x.rowsLaid === 9 && x.ended === true), 90000);
      const puts = await page.evaluate(() => window.__statusPuts || []);
      const last = puts[puts.length - 1] || {};
      check('live status sent: session, job 24-101, laid to 80.0, 9 of 11 rows, ended', last.jobNumber === '24-101' && last.laidToStation === '80.0' && last.rowsLaid === 9 && last.rowsTotal === 11 && last.ended === true && typeof last.lastLaidAt === 'number');
      await page.screenshot({ path: L.SHOTS + 'laid_390.png' });
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- offline status queue survives a reload ----------
  { const { ctx, page } = await L.setupTouch(browser, { width: 390 });
    try {
      await page.evaluate(() => localStorage.setItem('__rpcMode', 'offline')); // the company answer is held from start-up; then no signal
      await M.lockRun(page);
      await page.evaluate(() => pbLaidMark(2)); await page.waitForTimeout(2500);
      let q = await page.evaluate(() => window.__pbLiveDebug());
      check('offline: the status waits on this phone (1 pending, laid to 20.0), nothing sent', q.q && Object.keys(q.q.pending).length === 1 && Object.values(q.q.pending)[0].laidToStation === '20.0' && !(await page.evaluate(() => (window.__statusPuts || []).length)));
      check('offline: kept in this account\'s storage (acctA:liveStatusQ)', await page.evaluate(() => /20\.0/.test(localStorage.getItem('acctA:liveStatusQ') || '')));
      await page.evaluate(() => localStorage.setItem('__rpcMode', 'ok'));
      await page.reload(); await page.waitForTimeout(1500); await M.dismiss(page);
      await L.waitFor(page, () => (window.__statusPuts || []).length > 0, 15000);
      q = await page.evaluate(() => window.__pbLiveDebug());
      check('signal back (after a reload): sent once, nothing pending', (await page.evaluate(() => (window.__statusPuts || []).length)) >= 1 && q.q && Object.keys(q.q.pending).length === 0);
      // review 1 SF2: a status queued under company c1 is never sent once the account is in another company
      await page.evaluate(() => localStorage.setItem('__rpcMode', 'offline'));
      await page.evaluate(() => pbLaidMark(5)); await page.waitForTimeout(2500);
      const before = await page.evaluate(() => (window.__statusPuts || []).length);
      await page.evaluate(() => { localStorage.setItem('__company', 'c2'); localStorage.setItem('__rpcMode', 'ok'); });
      await page.reload(); await page.waitForTimeout(1500); await M.dismiss(page);
      await L.waitFor(page, () => { const d = window.__pbLiveDebug(); return d.q && !Object.keys(d.q.pending).some(k => d.q.pending[k].company === 'c1'); }, 15000);
      const puts2 = await page.evaluate(() => (window.__statusPuts || []));
      check('SF2: the c1 status is dropped, not sent to c2 (nothing with laid to 50.0 went out)', !puts2.some(x => x.laidToStation === '50.0'));
      check('NIT2: seq is time-based (never restarts at 1)', (await page.evaluate(() => (window.__statusPuts || []).concat([]).map(x => x.seq))).every(n => n > 1e12));
      check('pipelayer is never told: no words about a foreman seeing the run on Results', !/foreman can see|your foreman sees|shared with your foreman/i.test(await page.evaluate(() => document.getElementById('screen-results').textContent)));
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 320 XL: the table is wider than the screen ----------
  { const { ctx, page } = await L.setupTouch(browser, { width: 320, height: 760, xl: true });
    try {
      await M.lockRun(page);
      const ov = await page.evaluate(() => { const w = document.querySelector('#screen-results .pb-table-wrap'); w.scrollLeft = 0; return w.scrollWidth - w.clientWidth; });
      let p = await L.rowPoint(page, 2, { xFrac: 0.5 });
      await L.touchDrag(page, p.x, p.y, -120, 2);
      const sl = await page.evaluate(() => document.querySelector('#screen-results .pb-table-wrap').scrollLeft);
      check('320 XL: a left drag scrolls the wide table sideways (' + ov + ' px wider) and marks nothing', ov > 20 && sl > 20 && (await L.laidState(page)).n === 0);
      p = await L.rowPoint(page, 2, { xFrac: 0.6 });
      await L.touchDrag(page, p.x, p.y, 110, 2);
      const sl2 = await page.evaluate(() => document.querySelector('#screen-results .pb-table-wrap').scrollLeft);
      check('320 XL: a right drag while scrolled sideways scrolls back first, marks nothing', sl2 < sl && (await L.laidState(page)).n === 0);
      await page.evaluate(() => { document.querySelector('#screen-results .pb-table-wrap').scrollLeft = 0; });
      p = await L.rowPoint(page, 2, { xFrac: 0.5 });
      await L.touchDrag(page, p.x, p.y, 130, 3);
      check('320 XL: at the table\'s left edge, a right swipe marks 0.0–20.0', (await L.laidState(page)).n === 3);
      check('320 XL: no sideways page scroll', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      await page.evaluate(() => { const b = document.querySelector('#resultsBody tr[data-laid-idx="5"]:not([data-laid-strip]) button[aria-label="Calculators"]'); b.click(); b.closest('tr').nextElementSibling.nextElementSibling.scrollIntoView({ block: 'center' }); });
      check('320 XL: the menu button is at least 44 px tall', await page.evaluate(() => document.querySelector('button[data-laid-btn="5"]').getBoundingClientRect().height >= 44));
      await page.evaluate(() => { document.querySelector('#resultsBody tr.pb-laid').scrollIntoView({ block: 'center' }); });
      await page.screenshot({ path: L.SHOTS + 'laid_320xl.png' });
      await page.click('#laidHideBtn'); await page.waitForTimeout(200);
      await page.evaluate(() => { document.querySelector('#resultsBody tr.pb-laid-sum').scrollIntoView({ block: 'center' }); });
      await page.screenshot({ path: L.SHOTS + 'laid_hidden_320xl.png' });
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 1280 desktop: a mouse drag works too, a click on a number still copies ----------
  { const { ctx, page } = await L.setupTouch(browser, { width: 1280, height: 900, touch: false });
    try {
      await M.lockRun(page);
      let p = await L.rowPoint(page, 4);
      await page.mouse.move(p.x, p.y); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(p.x + 15 * i, p.y + 1); await page.waitForTimeout(10); } await page.mouse.up(); await page.waitForTimeout(400);
      check('1280: a mouse drag right marks 0.0–40.0, and opens no copy menu', (await L.laidState(page)).n === 5 && !(await L.modal(page)));
      await page.evaluate(() => { const td = document.querySelector('#resultsBody tr[data-laid-idx="7"]:not([data-laid-strip]) td.pb-tap-copy'); td.scrollIntoView({ block: 'center' }); });
      p = await page.evaluate(() => { const r = document.querySelector('#resultsBody tr[data-laid-idx="7"]:not([data-laid-strip]) td.pb-tap-copy').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await page.mouse.click(p.x, p.y); await page.waitForTimeout(300);
      check('1280: a plain click on a number still opens the copy choice', !!(await L.modal(page)));
      await M.dismiss(page);
      await page.evaluate(() => { document.querySelector('#resultsBody tr.pb-laid-next').scrollIntoView({ block: 'center' }); });
      await page.screenshot({ path: L.SHOTS + 'laid_1280.png' });
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  check('JS errors: ' + (errs.length ? errs.join(' | ') : 'none'), !errs.length);
  console.log('JS errors: ' + (errs.length ? errs.join(' | ') : 'none'));
  await browser.close();
})();
