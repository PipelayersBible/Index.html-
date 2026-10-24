// feat_run33 regression: the pipe-run flow fixes from /home/claude/night/run.md (probes p01–p11 flipped to the fixed behaviour).
// Harness: /home/claude/night/run/h.js (390 px, individual tier, Lenker runs).
const H = require('/home/claude/feat_run33/tests/h.js'); const { L } = H;
const SH = '/home/claude/feat_run33/shots/'; H.fs.mkdirSync(SH, { recursive: true });
const modal = (page) => page.evaluate(() => { const ov = document.getElementById('pbModalOverlay'); return ov && getComputedStyle(ov).display !== 'none' ? { title: document.getElementById('pbModalTitle').innerText, msg: document.getElementById('pbModalMessage').innerText, buttons: Array.from(document.querySelectorAll('#pbModalButtons button')).map(b => b.textContent) } : null; });
const tap = (page, label) => page.evaluate((l) => { const b = Array.from(document.querySelectorAll('#pbModalButtons button')).find(x => x.textContent.trim() === l); if (!b) throw new Error('no modal button ' + l); b.click(); }, label);
const state = (page, uid) => page.evaluate((u) => ({ runs: window.__debugGetArchive().filter(e => e.kind === 'run').map(e => ({ id: e.id, end: e.summary.endInv, ended: !!e.runEndTime, dist: e.distance })), stats: JSON.parse(localStorage.getItem(u + ':statsLog') || '[]').map(s => ({ id: s.entryId, ft: s.footage })), cur: window.__debugGetCurrentArchiveEntry() && window.__debugGetCurrentArchiveEntry().id }), uid);
const noErr = (page) => page._errors.filter(e => !/ERR_TUNNEL|Failed to fetch/.test(e));
(async () => {
  const browser = await L.chromium.launch();
  // ---------------------------------------------------------------- 1. Edit Run Data -> typo fix -> Lock: Replace / Keep Both
  {
    const uid = 'uR33relock';
    const page = await H.newPage390(browser, uid); await L.dismiss(page);
    const id1 = await H.lockLenker(page, { start: '100.00', end: '101.50', dist: 300, interval: 20, stats: true, job: 'J-RL', beforeReview: async (p) => { await p.fill('#startLabel', 'MH-1'); await p.fill('#endLabel', 'MH-2'); } });
    await page.waitForTimeout(800);
    let st = await state(page, uid);
    L.check('1 control: one run, Stats 300 ft once', st.runs.length === 1 && st.stats.length === 1 && st.stats[0].ft === 300);
    await page.click('button[onclick="pbEditRunData()"]'); await page.waitForTimeout(300);
    L.check('1 control: Edit Run Data opens the form still holding the run (end 101.50)', await H.screen(page) === 'input' && await page.evaluate(() => document.getElementById('endElev').value) === '101.50');
    await page.fill('#endElev', '101.60'); await page.waitForTimeout(200);
    await page.click('text=Review & Calculate'); await page.waitForTimeout(500);
    await page.click('button[onclick="pbLock()"]'); await page.waitForTimeout(800);
    let m = await modal(page);
    console.log('edited re-lock modal:', JSON.stringify(m));
    L.check('1: an edited re-Lock asks Replace / Keep Both / Cancel and names the earlier record', !!m && /Replace that record/.test(m.msg) && /MH-1 → MH-2/.test(m.msg) && m.buttons.join('|') === 'Cancel|Keep Both|Replace');
    await tap(page, 'Cancel'); await page.waitForTimeout(400);
    st = await state(page, uid);
    L.check('1: Cancel locks nothing (one run, one Stats record)', st.runs.length === 1 && st.stats.length === 1 && await H.screen(page) === 'review');
    await page.click('button[onclick="pbLock()"]'); await page.waitForTimeout(800);
    await tap(page, 'Replace');
    for (let i = 0; i < 20; i++) { await page.waitForTimeout(250); if (await H.screen(page) === 'results') break; }
    await page.waitForTimeout(1200); await L.dismiss(page);
    st = await state(page, uid);
    console.log('after Replace:', JSON.stringify(st));
    L.check('1: Replace -> Records has ONE run (end 101.60, a new id) and Stats counts 300 ft once, under the new record', st.runs.length === 1 && st.runs[0].end === '101.60' && st.runs[0].id !== id1 && st.stats.length === 1 && st.stats[0].ft === 300 && st.stats[0].id === st.runs[0].id && st.cur === st.runs[0].id);
    const stored = await page.evaluate((u) => JSON.parse(localStorage.getItem(u + ':runArchive') || '[]').filter(e => e.kind === 'run').length, uid);
    L.check('1: the stored Records list holds one run too', stored === 1);
    const id2 = st.runs[0].id;
    // Keep Both: another run of the same pipe
    await page.click('button[onclick="pbEditRunData()"]'); await page.waitForTimeout(300);
    await page.fill('#endElev', '101.70'); await page.waitForTimeout(200);
    await page.click('text=Review & Calculate'); await page.waitForTimeout(500);
    await page.click('button[onclick="pbLock()"]'); await page.waitForTimeout(800);
    m = await modal(page);
    L.check('1: the replaced record can be edited and re-locked too (asked again)', !!m && /Replace that record/.test(m.msg));
    await tap(page, 'Keep Both');
    for (let i = 0; i < 20; i++) { await page.waitForTimeout(250); if (await H.screen(page) === 'results') break; }
    await page.waitForTimeout(1200); await L.dismiss(page);
    st = await state(page, uid);
    console.log('after Keep Both:', JSON.stringify(st));
    L.check('1: Keep Both -> two runs (101.60 and 101.70), Stats 600 ft', st.runs.length === 2 && st.stats.length === 2 && st.stats.reduce((a, s) => a + s.ft, 0) === 600 && st.runs.some(r => r.id === id2));
    // a record someone has worked on (a note) is not offered Replace: today's behaviour
    const id3 = st.cur;
    await page.evaluate((i) => { const e = window.__debugGetArchive().find(x => x.id === i); e.fieldNotes.push({ pointId: 'start', text: 'x', photos: [] }); }, id3);
    await page.click('button[onclick="pbEditRunData()"]'); await page.waitForTimeout(300);
    await page.fill('#endElev', '101.80'); await page.waitForTimeout(200);
    await page.click('text=Review & Calculate'); await page.waitForTimeout(500);
    await page.click('button[onclick="pbLock()"]');
    for (let i = 0; i < 20; i++) { await page.waitForTimeout(250); if (await H.screen(page) === 'results') break; }
    await page.waitForTimeout(800); await L.dismiss(page);
    st = await state(page, uid);
    L.check('1 control: a run with a note is not offered Replace — the Lock makes a second record as before', st.runs.length === 3);
    L.check('1: no JS errors', noErr(page).length === 0);
    await page.context().close();
  }
  // ---------------------------------------------------------------- 2. after a restart: Correct / Add Interval / Edit Run Data work from the record
  {
    const uid = 'uR33restart';
    const page = await H.newPage390(browser, uid); await L.dismiss(page);
    let hub;
    const id = await H.lockLenker(page, { start: '100.00', end: '101.50', dist: 300, interval: 20, stats: true, job: 'J-R', beforeReview: async (p) => {
      hub = await p.evaluate(() => { pbAddHub(); const ids = Array.from(document.querySelectorAll('#hubsContainer [data-hub-id]')).map(c => c.dataset.hubId); return ids[ids.length - 1]; });
      await H.fill(p, hub + 'Station', '120'); await H.fill(p, hub + 'Label', 'CO-3'); await H.fill(p, hub + 'Elev', '100.60');
    } });
    await page.waitForTimeout(600);
    await page.reload(); await page.waitForTimeout(1500); await L.dismiss(page);
    await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(600); await L.dismiss(page);
    L.check('2 control: after the restart Continue Run opens the run\'s Results', await H.screen(page) === 'results' && (await page.evaluate(() => window.__debugGetCurrentArchiveEntry().id)) === id);
    // Correct a Distance or Hub
    await page.evaluate(() => { document.getElementById('correctDistancePanel').style.display = 'none'; pbToggleCorrectDistance(); }); await page.waitForTimeout(300);
    const corr = await page.evaluate(() => ({ opts: Array.from(document.getElementById('correctDistanceRunSel').options).map(o => o.textContent.trim()), err: document.getElementById('correctDistanceError').style.display === 'none' ? '' : document.getElementById('correctDistanceError').innerText }));
    console.log('Correct after restart:', JSON.stringify(corr));
    L.check('2: Correct a Distance or Hub opens with the picker filled (Run 1 + hub CO-3), no refusal', corr.err === '' && corr.opts.length === 2 && /CO-3/.test(corr.opts[1]) && /120\.0/.test(corr.opts[1]));
    L.check('2: the form was rebuilt from the record and holds it', await page.evaluate(() => document.getElementById('totalDist').value === '300' && document.querySelectorAll('#hubsContainer [data-hub-id]').length === 1));
    await page.selectOption('#correctDistanceRunSel', 'run:1'); await page.evaluate(() => pbUpdateCorrectDistanceField());
    await page.fill('#correctDistanceVal', '310'); await page.evaluate(() => { window._c = pbApplyCorrectDistance(); }); await page.waitForTimeout(1200); await L.dismiss(page);
    let e = await H.entry(page, id);
    L.check('2: Apply changes the record (distance 300 -> 310, one correction, hub kept at 120 / 100.600)', e.distance === 310 && (e.correctionHistory || []).length === 1 && e.intervalRows.some(r => r.stationFt === 120 && r.label === 'CO-3' && Math.abs(r.piFt - 100.6) < 1e-6));
    // Add Interval
    await page.evaluate(() => { document.getElementById('addIntervalPanel').style.display = 'none'; pbToggleAddInterval(); }); await page.waitForTimeout(100);
    await page.fill('#newIntervalStation', '86'); await page.fill('#newIntervalLabel', 'tap'); await page.evaluate(() => { window._a = pbAddInterval(); }); await page.waitForTimeout(900);
    const addErr = await page.evaluate(() => { const x = document.getElementById('addIntervalError'); return x.style.display === 'none' ? '' : x.innerText; }); await L.dismiss(page);
    e = await H.entry(page, id);
    const r86 = e.intervalRows.find(r => r.stationFt === 86);
    console.log('Add Interval after restart:', addErr || 'ok', JSON.stringify(r86 || null));
    L.check('2: Add Interval works after the restart (row 86 "tap" interpolated on the grade)', addErr === '' && !!r86 && r86.label === 'tap' && r86.addedTime);
    // Edit Run Data
    await page.click('button[onclick="pbEditRunData()"]'); await page.waitForTimeout(400);
    const form = await page.evaluate(() => ({ s: document.getElementById('startElev').value, d: document.getElementById('totalDist').value, hubs: Array.from(document.querySelectorAll('#hubsContainer [data-hub-id]')).map(c => { const h = c.dataset.hubId; return [document.getElementById(h + 'Station').value, document.getElementById(h + 'Label').value, document.getElementById(h + 'Elev').value]; }) }));
    console.log('Edit Run Data after restart:', JSON.stringify(form));
    L.check('2: Edit Run Data opens the form filled with the run (start 100.000, 310 ft after the correction, hub CO-3 at 120 / 100.600)', await H.screen(page) === 'input' && form.s === '100.000' && form.d === '310' && form.hubs.length === 1 && form.hubs[0][0] === '120' && form.hubs[0][1] === 'CO-3' && form.hubs[0][2] === '100.600');
    // an unchanged re-Lock from that form is the same run: asked, never a silent second record
    await page.click('text=Review & Calculate'); await page.waitForTimeout(500);
    await page.click('button[onclick="pbLock()"]'); await page.waitForTimeout(800);
    const m2 = await modal(page);
    console.log('unchanged re-lock after restart:', JSON.stringify(m2));
    L.check('2: Review + Lock of the unchanged rebuilt form is asked "Already Locked" (not a second record)', !!m2 && m2.title === 'Already Locked');
    await tap(page, 'Cancel'); await page.waitForTimeout(300);
    L.check('2: still one run in Records', (await state(page, uid)).runs.length === 1);
    L.check('2: no JS errors', noErr(page).length === 0);
    await page.context().close();
  }
  // ---------------------------------------------------------------- 3, 4, 10, 15, 16: a Lenker run with bedding, labels and a hub (p02 / p03 / p05 / p09)
  {
    const uid = 'uR33flow';
    const page = await H.newPage390(browser, uid); await L.dismiss(page);
    let hub;
    const id = await H.lockLenker(page, { start: '4512.35', end: '4514.75', dist: 600, interval: 20, wt: '0.02', id: '8', stats: true, job: '24-017', type: 'PVC SDR 35', beforeReview: async (p) => {
      await p.fill('#runBedding', '0.5'); await p.fill('#runTrenchWidth', '3'); await p.fill('#startLabel', 'MH-12 IE OUT'); await p.fill('#endLabel', 'MH-13 IE IN');
      hub = await p.evaluate(() => { pbAddHub(); const ids = Array.from(document.querySelectorAll('#hubsContainer [data-hub-id]')).map(c => c.dataset.hubId); return ids[ids.length - 1]; });
      await H.fill(p, hub + 'Station', '250'); await H.fill(p, hub + 'Label', 'Lateral 1234 Elm'); await H.fill(p, hub + 'Elev', '4513.35');
    } });
    const strips = await page.evaluate(() => Array.from(document.querySelectorAll('#resultsBody tr[data-laid-strip] .pb-sta-sub')).map(x => x.innerText.trim()));
    console.log('strips:', JSON.stringify(strips));
    L.check('3: the grade sheet strips name the points: "Start — MH-12 IE OUT", the hub label, "End — MH-13 IE IN"', strips[0] === 'Start — MH-12 IE OUT' && strips[strips.length - 1] === 'End — MH-13 IE IN' && strips.includes('Lateral 1234 Elm'));
    const cols = await page.evaluate(() => { const w = document.documentElement.clientWidth; return Array.from(document.querySelectorAll('#resultsHead th')).map(th => { const r = th.getBoundingClientRect(); return th.innerText + ':' + Math.round(r.left) + '-' + Math.round(r.right) + (r.right <= w + 0.5 ? '' : ' OFF'); }); });
    console.log('lenker+bedding cols:', JSON.stringify(cols));
    L.check('4: at 390 px Sta · BOP · INV · TOP are on screen (Subgrade comes after TOP)', ['Sta.', 'BOP', 'INV', 'TOP'].every(n => cols.some(h => h.startsWith(n + ':') && !/OFF/.test(h))) && cols.findIndex(h => /^Subgrade/.test(h)) > cols.findIndex(h => /^TOP/.test(h)));
    const rowOrder = await page.evaluate(() => { const tr = document.querySelector('#resultsBody tr[data-laid-idx]:not([data-laid-strip])'); return Array.from(tr.querySelectorAll('td')).slice(1).map(td => td.innerText.trim()); });
    console.log('first row cells:', JSON.stringify(rowOrder));
    L.check('4: the cells follow the head (BOP 4512.33 · INV 4512.35 · TOP 4513.04 · Subgrade 4511.83)', rowOrder[1] === '4512.33' && rowOrder[2] === '4512.35' && rowOrder[3] === '4513.04' && rowOrder[4] === '4511.83');
    const noteBtns = await page.evaluate(() => { const b = document.querySelectorAll('#resultsBody tr[data-laid-idx]:not([data-laid-strip]) td:first-child .pb-notebtn'); const a = b[0].getBoundingClientRect(), c = b[1].getBoundingClientRect(); return { stacked: c.top >= a.bottom - 1, w: Math.round(a.width), h: Math.round(a.height) }; });
    L.check('4: the two note buttons stack (44 wide, 40 tall, so a row stays under 100 px)', noteBtns.stacked && noteBtns.w >= 44 && noteBtns.h >= 40 && noteBtns.h < 44);
    await page.evaluate(() => document.querySelector('.pb-table-wrap').scrollIntoView()); await page.waitForTimeout(200);
    await page.screenshot({ path: SH + 'f4_lenker_bedding_390.png' });
    L.check('10 control: before any correction the flags fold says "Flagged at Lock"', await page.evaluate(() => { const f = document.getElementById('lockFlagsMore'); return !f || /Flagged at Lock/.test(f.innerText); }));
    // a hub correction that raises warnings: not "Flagged at Lock"
    await page.evaluate(() => { document.getElementById('correctDistancePanel').style.display = 'none'; pbToggleCorrectDistance(); }); await page.waitForTimeout(200);
    await page.selectOption('#correctDistanceRunSel', 'hub:' + hub); await page.evaluate(() => pbUpdateCorrectDistanceField());
    await page.fill('#correctHubStation', '250'); await page.fill('#correctHubElev', '4515.00'); await page.evaluate(() => { window._c = pbApplyCorrectDistance(); }); await page.waitForTimeout(1500); await L.dismiss(page);
    const flags = await page.evaluate(() => { const f = document.getElementById('lockFlagsMore'); return f ? f.querySelector('summary').innerText : ''; });
    console.log('flags after correction:', flags);
    L.check('10: flags raised by a correction are headed "Flags after correction (n)"', /Flags after correction \(\d+\)/.test(flags) && (await H.entry(page, id)).correctionHistory.length >= 1);
    // laid to row 3, then Home
    await page.evaluate(() => pbLaidMark(3)); await page.waitForTimeout(600); await L.dismiss(page);
    await page.evaluate(() => pbGoto('home')); await page.waitForTimeout(600);
    const homeTxt = await page.evaluate(() => document.getElementById('homeWork').innerText.replace(/\n+/g, ' | '));
    const cjTxt = await page.evaluate(() => { const c = document.getElementById('homeCurrentJob'); return c && c.style.display !== 'none' ? c.innerText.replace(/\n+/g, ' | ') : ''; });
    console.log('home work:', homeTxt, '|| current job:', cjTxt);
    L.check('16: the Continue Run card says how far the pipe is marked laid (60 of 600 ft)', /Pipe laid: 60(\.0)? of 600(\.0)? ft/.test(homeTxt));
    L.check('16: the job is on the Current job card once, not repeated on the run card', /24-017/.test(cjTxt) && (homeTxt.match(/24-017/g) || []).length === 0);
    await page.screenshot({ path: SH + 'f16_home.png' });
    await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(500);
    // End Run Without Completing: hint + laid line
    await page.evaluate(() => { document.getElementById('endIncompletePanel').style.display = 'none'; pbToggleEndIncomplete(); }); await page.waitForTimeout(200);
    const panel = await page.evaluate(() => { const s = document.getElementById('endIncompleteStation'); return { sel: s.options[s.selectedIndex] && s.options[s.selectedIndex].textContent.trim(), disabled: s.options[0].disabled, txt: document.getElementById('endIncompletePanel').innerText }; });
    console.log('end panel:', JSON.stringify(panel));
    L.check('15: the stop picker shows "Tap to choose the last station laid" (disabled) and the panel says the pipe is marked laid to 60.0 ft', panel.sel === 'Tap to choose the last station laid' && panel.disabled && /Pipe is marked laid to 60\.0 ft/.test(panel.txt));
    await page.evaluate(() => { window._e = pbEndRunIncomplete(); }); await page.waitForTimeout(500);
    const m3 = await modal(page); await L.dismiss(page);
    L.check('15: Confirm with the hint still selected asks for a stop point, ends nothing', !!m3 && /Select where the run stopped/.test(m3.msg) && !(await H.entry(page, id)).incomplete);
    await page.evaluate(() => { const s = document.getElementById('endIncompleteStation'); s.selectedIndex = Array.from(s.options).findIndex(o => o.textContent.trim() === '300.0'); });
    await page.evaluate(() => pbEndRunIncomplete()); await page.waitForTimeout(1500); await L.dismiss(page); await page.waitForTimeout(300); await L.dismiss(page);
    const e3 = await H.entry(page, id);
    L.check('15 control: ended incomplete at 300.0', e3.incomplete && e3.stoppedAtStation === '300.0');
    await page.evaluate(() => pbGoto('home')); await page.waitForTimeout(600);
    const fin = await page.evaluate(() => document.getElementById('homeFinishRuns').innerText.replace(/\n+/g, ' | '));
    console.log('finish card:', fin);
    L.check('16: the Finish Run card says "Ended early at 300.0 ft"', /Ended early at 300\.0 ft/.test(fin));
    // 9: resuming a Lenker run
    await page.evaluate((i) => { const k = window.__debugGetArchive().findIndex(x => x.id === i); pbResumeIncompleteRun(k); }, id); await page.waitForTimeout(700);
    const m4 = await modal(page); await L.dismiss(page); await page.waitForTimeout(300);
    console.log('resume alert:', JSON.stringify(m4));
    L.check('9: a Lenker resume is not told to shoot a rod reading for an HI', !!m4 && m4.title === 'Resuming This Run' && !/rod reading|HI/.test(m4.msg) && /300\.0 is where you left off/.test(m4.msg));
    const hint = await page.evaluate(() => { const el = document.getElementById('runDraftStatus'); return el && !el.hidden ? el.innerText : ''; });
    console.log('form hint:', hint);
    L.check('9: the form says which run it resumes and that Lock continues it', /Resuming MH-12 IE OUT → MH-13 IE IN \(stopped at 300\.0\) — Lock to continue it/.test(hint));
    await page.evaluate(() => pbGoto('home')); await page.waitForTimeout(500);
    const m5 = await modal(page);
    console.log('leave resume:', JSON.stringify(m5));
    L.check('9: leaving the untouched resume form says the earlier session is saved (not "NOT saved")', !!m5 && /Nothing new has been typed/.test(m5.msg) && !/NOT saved/.test(m5.msg));
    await tap(page, 'Leave'); await page.waitForTimeout(600);
    const home2 = await page.evaluate(() => document.getElementById('homeWork').innerText.replace(/\n+/g, ' | '));
    console.log('home after leaving the resume:', home2);
    L.check('9: Home offers Finish Run once, no Continue Draft card for the same run', /Finish Run/.test(home2) && !/Draft/i.test(home2));
    L.check('3/4/9/10/15/16: no JS errors', noErr(page).length === 0);
    await page.context().close();
  }
  // ---------------------------------------------------------------- 5, 6, 7, 8, 11, 12, 13, 14, 18: the run form and Review (p01 / p10)
  {
    const uid = 'uR33form';
    const page = await H.newPage390(browser, uid); await L.dismiss(page);
    await page.evaluate(() => pbOpenNewRun()); await page.waitForTimeout(300);
    await page.click('#rodToggle button[data-val="lenker"]'); await page.waitForTimeout(100);
    const im = await page.evaluate(() => ({ interval: document.getElementById('interval').getAttribute('inputmode'), step: document.getElementById('interval').getAttribute('step'), seg2: document.getElementById('seg2Interval').getAttribute('inputmode'), qr: document.getElementById('qrInterval').getAttribute('inputmode'), ml: document.getElementById('startLabel').maxLength }));
    L.check('6: the Interval boxes take decimals (inputmode=decimal, step 0.5; seg2 and Quick Run too)', im.interval === 'decimal' && im.step === '0.5' && im.seg2 === 'decimal' && im.qr === 'decimal');
    L.check('5: point labels are capped at 80 characters', im.ml === 80);
    const sizes = await page.evaluate(() => Array.from(document.getElementById('runIdSel').options).map(o => o.value));
    L.check('14: the Pipe ID list has 15" and 21" (and 3", 27")', ['3', '15', '21', '27'].every(s => sizes.includes(s)));
    const review = async () => { await page.click('text=Review & Calculate'); await page.waitForTimeout(400); return { scr: await H.screen(page), err: await H.errText(page) }; };
    // 11: one section backflowing
    await page.fill('#startElev', '100.00'); await page.fill('#endElev', '99.50'); await page.fill('#totalDist', '100'); await page.fill('#interval', '10'); await page.fill('#runWT', '0.02'); await page.selectOption('#runIdSel', '15');
    let r = await review(); const rt = await H.reviewText(page);
    L.check('11: one backflowing section reads "This run’s one section of pipe is backflowing", not "All 1 section"', r.scr === 'review' && /This run’s one section of pipe is backflowing/.test(rt) && !/All 1 section/.test(rt));
    L.check('14: a 15" pipe reviews as ID 15.00"', /15\.00"/.test(rt));
    L.check('18: no bedding entered: no "Bedding Thickness —" / "Total Bedding Volume not recorded" tiles', !/Bedding Thickness/.test(rt) && !/Total Bedding Volume/.test(rt));
    // 12: interval longer than the run
    await page.evaluate(() => pbGoto('input', true)); await page.waitForTimeout(200);
    await page.fill('#endElev', '100.50'); await page.fill('#totalDist', '60'); await page.fill('#interval', '100');
    r = await review(); const rt2 = await H.reviewText(page);
    L.check('12: a 100 ft interval on a 60 ft run reviews with a note that there will be no interval rows', r.scr === 'review' && /Interval \(100 ft\) is longer than the run \(60 ft\)/.test(rt2));
    // 13: "12+50" in a hub station box; 7/8: review with hubs
    await page.evaluate(() => pbGoto('input', true)); await page.waitForTimeout(200);
    await page.fill('#totalDist', '200'); await page.fill('#interval', '20');
    const hubs = [];
    for (const [st, el, lb] of [['60', '100.30', 'CO-1'], ['140', '100.70', 'CO-2']]) { const h = await page.evaluate(() => { pbAddHub(); const ids = Array.from(document.querySelectorAll('#hubsContainer [data-hub-id]')).map(c => c.dataset.hubId); return ids[ids.length - 1]; }); hubs.push(h); await H.fill(page, h + 'Station', st); await H.fill(page, h + 'Elev', el); await H.fill(page, h + 'Label', lb); }
    await page.waitForTimeout(300);
    const identShown = await page.evaluate((h) => { const el = document.querySelector('[data-hub-id="' + h + '"] .pb-hub-ident'); return { txt: el.textContent, shown: getComputedStyle(el).display !== 'none' }; }, hubs[0]);
    L.check('18: the hub title line ("Sta 60 · CO-1") is kept for the collapsed card, hidden while the card is open', identShown.txt === 'Sta 60 · CO-1' && !identShown.shown);
    await page.evaluate((h) => pbToggleHubCollapse(h), hubs[0]); await page.waitForTimeout(150);
    L.check('18: ...and shown once the card is collapsed', await page.evaluate((h) => getComputedStyle(document.querySelector('[data-hub-id="' + h + '"] .pb-hub-ident')).display !== 'none', hubs[0]));
    await page.evaluate((h) => pbToggleHubCollapse(h), hubs[0]);
    const privacy = await page.evaluate(() => Array.from(document.querySelectorAll('#screen-input .pb-ai-stake .pb-ai-privacy')).filter(p => p.offsetParent !== null || getComputedStyle(p).display !== 'none').length);
    L.check('18: the AI privacy line shows once on the form (Start), not under every point', privacy === 1 && await page.evaluate(() => getComputedStyle(document.querySelector('#pointBody-start .pb-ai-privacy')).display !== 'none'));
    await page.evaluate((h) => { const el = document.getElementById(h + 'Station'); el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }, hubs[1]);
    await page.type('#' + hubs[1] + 'Station', '12+50'); await page.waitForTimeout(200);
    r = await review(); console.log('12+50:', JSON.stringify(r));
    L.check('13: "12+50" in a Station box is explained (feet from the run’s start, 1250), not "missing its station"', r.scr === 'input' && /12\+50 goes in as feet/.test(r.err) && !/missing its station/.test(r.err));
    await H.fill(page, hubs[1] + 'Station', '140');
    r = await review();
    const rv = await page.evaluate(() => ({ btns: Array.from(document.querySelectorAll('#reviewPointsWrap .pb-btn-row button')).map(b => b.innerText + (b.classList.contains('ghost') ? ' [ghost]' : ' [solid]') + (b.getAttribute('aria-pressed') === 'true' ? ' pressed' : '')), hubsShown: document.querySelectorAll('#reviewPointsWrap .pb-review-item').length, grid: document.getElementById('reviewSummaryGrid').innerText.replace(/\n/g, ' | '), items: Array.from(document.querySelectorAll('#reviewContent > .pb-review-item')).map(k => k.innerText.replace(/\n/g, ' | ')), points: Array.from(document.querySelectorAll('#reviewPointsWrap .pb-review-item .k')).map(k => k.innerText) }));
    console.log('review:', JSON.stringify(rv));
    L.check('7: Review shows the hubs (4 points) and the pressed state is marked; the solid button is the action available', r.scr === 'review' && rv.hubsShown === 4 && rv.btns.includes('Show All Hubs (2) [ghost] pressed') && rv.btns.includes('Hide Hubs [solid]'));
    L.check('8: no "Pipe" item under the grid (the grid has Wall Thickness / Pipe ID), the Run item has no distance and says "2 hubs"', !rv.items.some(t => /^Pipe/.test(t)) && rv.items.some(t => /^Run \| Start → End · interval 20 ft · 2 hubs$/.test(t)) && /Distance \| 200\.0 ft/.test(rv.grid));
    L.check('8: a point whose label is its role is not written twice ("Start", not "Start — Start")', rv.points[0] === 'Start' && rv.points[rv.points.length - 1] === 'End' && rv.points.includes('Hub — CO-1') && !rv.points.some(t => /Start — Start|End — End/.test(t)));
    await page.screenshot({ path: SH + 'f8_review_390.png', fullPage: true });
    await page.evaluate(() => pbSetReviewHubsVisible(false)); await page.waitForTimeout(100);
    const rv2 = await page.evaluate(() => ({ n: document.querySelectorAll('#reviewPointsWrap .pb-review-item').length, btns: Array.from(document.querySelectorAll('#reviewPointsWrap .pb-btn-row button')).map(b => b.innerText + (b.classList.contains('ghost') ? ' [ghost]' : ' [solid]')) }));
    L.check('7: Hide Hubs hides them and Show All Hubs becomes the solid (available) button', rv2.n === 2 && rv2.btns.includes('Show All Hubs (2) [solid]') && rv2.btns.includes('Hide Hubs [ghost]'));
    // 17: architect's rod, 14 inches: one message for the field
    await page.evaluate(() => pbGoto('input', true)); await page.waitForTimeout(200);
    await page.evaluate(() => pbOpenNewRun()); await page.waitForTimeout(300);
    await page.click('#rodToggle button[data-val="architect"]'); await page.waitForTimeout(200);
    await page.click('#hiToggle button[data-val="direct"]'); await page.waitForTimeout(150);
    await H.fill(page, 'hiDirect_ft', '110'); await H.fill(page, 'hiDirect_in', '0');
    await H.fill(page, 'startElevReading_ft', '4'); await H.fill(page, 'startElevReading_in', '7'); await page.selectOption('#startElevReading_frac', '0.5'); await page.waitForTimeout(700);
    await H.fill(page, 'endElevReading_ft', '3'); await H.fill(page, 'endElevReading_in', '14'); await page.waitForTimeout(700);
    await page.fill('#totalDist', '50'); await page.fill('#interval', '25'); await page.fill('#runWT', '0.05'); await page.selectOption('#runIdSel', '12');
    r = await review(); console.log('arch 14 in:', JSON.stringify(r));
    L.check('17: 14 inches gives ONE message for the End field (the "data is incomplete" one is dropped)', r.scr === 'input' && /End: inches must be from 0 to 11 \(14 was entered\)/.test(r.err) && !/incomplete/.test(r.err));
    L.check('5–18: no JS errors', noErr(page).length === 0);
    await page.context().close();
  }
  await browser.close();
})().catch(e => { console.log('SCRIPT ERROR', e); process.exit(1); });
