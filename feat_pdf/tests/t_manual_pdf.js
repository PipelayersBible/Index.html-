// Batch 28 MANUAL: work entered without a run. Mocked server (nr_lib.js on batch 20 HOME's pd_lib). Must FAIL on the
// base (r14 + DAILY + NOTES + M34 + CONSOLE) and PASS with batch 28's patch.
// Run (inside the lock, >= 2 GB free): PB_TEST_DIR=<site> PB_TEST_PORT=<port> /home/claude/test/run.sh <this file> 600
const T = require('/home/claude/feat_pdf/tests/nr_lib_keep.js'); const { M } = T;
const check = (l, c, d) => { console.log((c ? 'OK  ' : '*** FAIL ***') + ' - ' + l + (c || d === undefined ? '' : ' :: ' + String(d).slice(0, 500))); if (!c) process.exitCode = 1; };
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const dayOff = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
(async () => {
  const browser = await M.chromium.launch();
  let ctx, page;
  const fresh = async (o) => { if (ctx) await ctx.close(); ({ ctx, page } = await T.setup(browser, o)); };
  const save = async () => { await page.click('#nrSaveBtn'); await page.waitForTimeout(600); };
  const nrSaves = () => page.evaluate(() => window.__rpcLog.filter(x => x.fn === 'pb_prod_save' && /^norun:/.test(x.args.p_client_entry_id)));
  const fill = async (o) => { for (const k in o) { const id = '#nr' + k.charAt(0).toUpperCase() + k.slice(1); await page.fill(id, String(o[k])); } };
  try {
    // ================= FOREMAN =================
    await fresh({});
    const has = await page.evaluate(() => typeof window.pbOpenNoRun === 'function' && !!document.getElementById('screen-prodNoRun'));
    check('the build has the "Work without a run" screen', has);
    if (!has) { check('(the rest needs the screen)', false); return; }
    await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(800);
    check('foreman: the Reports tab shows "Work without a run"', await T.shown(page, 'archiveNoRunBtn') && /Work without a run/.test(await T.text(page, 'archiveNoRunBtn')));
    await page.click('#archiveNoRunBtn'); await page.waitForTimeout(2500);
    check('it opens the form screen', await page.evaluate(() => document.getElementById('screen-prodNoRun').classList.contains('active')));
    const jobOpts = await page.$$eval('#nrJob option', o => o.map(x => x.value + '|' + x.textContent));
    check('job list: the company job 24-101 (from production) is listed, plus "Other job number"', jobOpts.some(x => /^24-101\|Job 24-101/.test(x)) && jobOpts.some(x => /^__other\|/.test(x)), jobOpts.join(' / '));
    check('review S4: the picker has all the company’s known jobs (25-900, never filed on by him, from the server job list)', jobOpts.some(x => /^25-900\|Job 25-900/.test(x)), jobOpts.join(' / '));
    await page.selectOption('#nrJob', '24-101'); await page.waitForTimeout(1500);
    const pipeOpts = await page.$$eval('#nrPipe option', o => o.map(x => x.textContent));
    check('pipe material: the job’s PM list (M3), with "Other (type it)"', pipeOpts.includes('8" C900 PVC') && pipeOpts.includes('Other (type it)') && !pipeOpts.includes('Coarse sand'), pipeOpts.join(' / '));
    check('bedding / shading / width / OD default from the job settings (shown, blank = the job’s)', (await page.$eval('#nrBedThk', e => e.placeholder)) === 'Job: 0.5 ft' && (await page.$eval('#nrWidth', e => e.placeholder)) === 'Job: 3 ft' && (await page.$eval('#nrShadeThk', e => e.placeholder)) === 'Job: 1 ft' && (await page.$eval('#nrOd', e => e.placeholder)) === 'Job: 9.05"');
    const qIds = await page.$$eval('#nrForm input[data-nrq]', x => x.map(e => e.dataset.nrq + ':' + e.dataset.unit));
    check('production fields: the job plan’s categories (with its extra "Thrust blocks"), pipe = the footage', qIds.join(',') === 'demo:LF,excavation:LF,backfill:LF,restoration:SY,structures:EA,thrust_blocks:EA' && /the footage above/.test(await T.text(page, 'nrQpipe')), qIds.join(','));
    check('crew man-hours and equipment hours fields', await T.shown(page, 'nrManH') && await T.shown(page, 'nrEqH'));
    check('the form fits a 390 px phone (no sideways scroll)', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    // validation
    await page.selectOption('#nrJob', '__other'); await page.waitForTimeout(300); await page.fill('#nrJobTyped', '24-1O1'); await fill({ feet: 20 }); await page.click('#nrSaveBtn'); await page.waitForTimeout(500);
    let m0 = await T.modal(page);
    check('review S4: a typed job that isn’t known is confirmed ("Job 24-1O1 isn’t a known job. Use it anyway?")', m0 && /Unknown Job/.test(m0.title) && /Job 24-1O1 isn’t a known job\. Use it anyway\?/.test(m0.msg), m0 && m0.msg);
    await T.click(page, '^Cancel$'); await page.waitForTimeout(300);
    check('…and Cancel saves nothing', /Check the job number/.test(await T.text(page, 'nrMsg') || '') && (await page.evaluate(() => window.__debugNoRun().st.entries.length)) === 0);
    await page.selectOption('#nrJob', '24-101'); await page.waitForTimeout(800);
    await page.evaluate((d) => { document.getElementById('nrDate').value = d; }, dayOff(1)); await fill({ feet: 20 }); await save();
    check('a work date in the future is refused', /can’t be in the future/.test(await T.text(page, 'nrMsg') || ''), await T.text(page, 'nrMsg'));
    await page.evaluate((d) => { document.getElementById('nrDate').value = d; }, today());
    await fill({ staFrom: '10+00', staTo: '', feet: '' }); await save();
    check('one station alone is refused (both, or neither)', /both stations/.test(await T.text(page, 'nrMsg') || ''), await T.text(page, 'nrMsg'));
    // stations and footage disagree -> which is right; then the run on the same stations -> warn
    await fill({ staFrom: '10+00', staTo: '12+00', feet: '150' }); await page.click('#nrSaveBtn'); await page.waitForTimeout(500);
    let m = await T.modal(page);
    check('stations (200 ft) and footage (150 ft) disagree: he is asked which is right', m && /Stations and Footage Disagree/.test(m.title) && /make 200 ft, but the footage says 150 ft/.test(m.msg) && m.buttons.some(b => /^Stations: 200 ft/.test(b)) && m.buttons.some(b => /^Footage: 150 ft/.test(b)), m && JSON.stringify(m));
    await T.click(page, '^Stations'); await page.waitForTimeout(500);
    m = await T.modal(page);
    check('the stations overlap today’s run on the same job (MH-7 to MH-8, Sta 10+00 to 12+00): warned, he must confirm', m && /Already Counted/.test(m.title) && /run MH-7 to MH-8/.test(m.msg) && /10\+00\.00 to 12\+00\.00/.test(m.msg) && /counts it twice/.test(m.msg), m && m.msg);
    await T.click(page, '^Cancel$'); await page.waitForTimeout(500);
    check('cancelled: nothing saved or sent', /Not saved/.test(await T.text(page, 'nrMsg') || '') && (await page.evaluate(() => window.__debugNoRun().st.entries.length)) === 0 && !(await nrSaves()).length);
    // a good entry: stations agree with the footage, list pipe, a typed bedding name (unlisted), list shading
    await fill({ staFrom: '12+00', staTo: '14+00', feet: '200', size: '8' });
    await page.selectOption('#nrPipe', { label: '8" C900 PVC' }); await page.waitForTimeout(200);
    await page.selectOption('#nrBed', { label: 'Other (type it)' }); await page.waitForTimeout(200);
    check('"Other (type it)" opens a box to type the material', await T.shown(page, 'nrBedTyped'));
    await page.fill('#nrBedTyped', 'Pit run gravel');
    await page.selectOption('#nrShade', { label: 'Coarse sand' }); await page.waitForTimeout(200);
    await fill({ jobTyped: '' }).catch(() => {});
    await page.fill('#nrQ_excavation', '210'); await page.fill('#nrQ_backfill', '180'); await page.fill('#nrQ_thrust_blocks', '2');
    await fill({ manH: '24', eqH: '8', by: 'Frank Ortiz', note: 'Inspector had us lay without stakes; survey came after.' });
    await page.waitForTimeout(300);
    const est = await T.text(page, 'nrEst');
    check('materials estimate as for runs: pipe 200 LF, bedding ≈ 11.11 yd³ (200 × 3 × 0.5), shading ≈ 35.67 yd³, spoils ≈ 62.62 yd³ loose; labelled an estimate', /Pipe 8" C900 PVC: 200 LF/.test(est) && /Bedding: Pit run gravel \(not on the job list\): ≈ 11\.11 yd³/.test(est) && /Shading: Coarse sand: ≈ 35\.67 yd³/.test(est) && /≈ 62\.62 yd³ loose/.test(est) && /Estimate from footage/.test(est), est);
    const jpg = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 48; const g = c.getContext('2d'); g.fillStyle = '#3a6'; g.fillRect(0, 0, 64, 48); return c.toDataURL('image/jpeg', 0.9).split(',')[1]; });
    // review S2: the phone near full: the photo is refused, plainly, so permits and runs keep their room
    await page.evaluate(() => { try { localStorage.setItem('__filler', 'x'.repeat(3600000)); } catch (e) {} });
    await page.setInputFiles('#nrPhotoInput', { name: 'trench.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpg, 'base64') }); await page.waitForTimeout(800);
    let mf = await T.modal(page);
    check('review S2: storage nearly full: the photo isn’t added, and it says why (permits and runs keep their room)', mf && /Storage Nearly Full/.test(mf.title) && /confined-space permits can still be saved/.test(mf.msg) && (await page.$$eval('#nrPhotos img', x => x.length)) === 0, mf && mf.msg);
    if (mf) await T.click(page, '^OK$');
    await page.evaluate(() => localStorage.removeItem('__filler'));
    const big = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 3000; c.height = 2000; const g = c.getContext('2d'); g.fillStyle = '#3a6'; g.fillRect(0, 0, 3000, 2000); g.fillStyle = '#fff'; g.fillRect(100, 100, 800, 400); return c.toDataURL('image/jpeg', 0.9).split(',')[1]; });
    await page.setInputFiles('#nrPhotoInput', { name: 'trench.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(big, 'base64') }); await page.waitForTimeout(1500);
    check('a photo is added', (await page.$$eval('#nrPhotos img', x => x.length)) === 1);
    check('review S2: shrunk to 1024 px (from 3000 px)', (await page.$eval('#nrPhotos img', i => i.naturalWidth)) === 1024);
    await page.fill('#nrNote', 'Inspector had us lay without stakes; survey came after.'); await page.waitForTimeout(1200);
    check('review S2: the draft keeps no photo data', await page.evaluate(() => { const d = localStorage.getItem('acctA:prodNoRunDraft') || ''; return d.length > 10 && !/data:image/.test(d) && /"nPhotos":1/.test(d); }));
    await page.click('#nrSaveBtn'); await page.waitForTimeout(800);
    m = await T.modal(page);
    check('stations agree and don’t overlap the run: saved with no question', !m && /^Saved: Job 24-101, Today, 200 LF\./.test(await T.text(page, 'nrMsg') || ''), (m && m.msg) || await T.text(page, 'nrMsg'));
    await page.waitForTimeout(3500);
    let s = (await nrSaves()).pop();
    const R = s && s.args.p_record, P = R && R.mat && R.mat.parts && R.mat.parts[0];
    check('it is sent as a normal production entry: client id norun:…, filed under the company held at save (c1), this account', s && /^norun:[0-9a-z]{10,}$/.test(s.args.p_client_entry_id) && s.args.p_access_company === 'c1' && !!s.args.p_access_at && s.args.p_expect_uid === 'acctA', JSON.stringify(s && s.args).slice(0, 300));
    check('labelled: src norun, noRun, note "Entered without a run (manual) · Sta 12+00.00 to 14+00.00 · 200 LF · pipe 8" C900 PVC · equipment 8 h · <note>", and says no grade or cut/fill', R && R.src === 'norun' && R.noRun === true && /^Entered without a run \(manual\) · Sta 12\+00\.00 to 14\+00\.00 · 200 LF · pipe 8" C900 PVC · equipment 8 h · Inspector had us/.test(R.note) && /No grade or cut\/fill/.test(R.noGrade), R && R.note);
    check('author, device time and zone ride on it (entered by, entered at, zone, version 1), job and date', R && R.enteredBy === 'Frank Ortiz' && Number.isFinite(R.enteredAt) && typeof R.enteredTz === 'string' && R.enteredTz.length > 2 && R.entryVersion === 1 && R.jobNumber === '24-101' && R.workDate === today(), JSON.stringify(R && { b: R.enteredBy, t: R.enteredTz, v: R.entryVersion }));
    check('materials go exactly as a run session’s `mat` (M1–M4): one part, 200 ft, list pipe id, typed bedding (unlisted: no id), list shading id; blank thickness / width = the job’s (null)', P && R.mat.v === 1 && R.mat.off === 0 && R.mat.parts.length === 1 && P.len === 200 && P.pipe.id === 'm-pipe' && P.bed.id === null && P.bed.name === 'Pit run gravel' && P.shade.id === 'm-sand' && P.bed_thk === null && P.width === null && P.shade_thk === null && P.od_in === null, JSON.stringify(R && R.mat));
    const items = s ? s.args.p_items.map(i => i.key + ' ' + i.qty + ' ' + i.unit).join(', ') : '';
    check('quantities: pipe 200 LF (the footage), excavation 210, backfill 180, thrust blocks 2 EA, crew man-hours 24 h', items === 'pipe 200 LF, excavation 210 LF, backfill 180 LF, thrust_blocks 2 EA, _manhours 24 h', items);
    check('the photo is kept on the phone; the record carries its SHA-256 only', R && R.photos.length === 1 && /^[0-9a-f]{64}$/.test(R.photos[0].sha256) && JSON.stringify(R).length < 8000 && !/data:image/.test(JSON.stringify(R)));
    let list = await T.text(page, 'nrEntries') || '';
    check('the entry is listed, labelled, with its stations, quantities and "Synced"', /Job 24-101 · Today/.test(list) && /Entered without a run \(manual\)/.test(list) && /Sta 12\+00\.00 to 14\+00\.00/.test(list) && /Synced/.test(list), list.slice(0, 400));
    // My production shows it with the label
    await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(1500);
    const mine = await T.text(page, 'pmToday') || '';
    check('My production lists it with the label, its quantities and Synced', /Entered without a run \(manual\)/.test(mine) && /Pipe Installed 200 LF/.test(mine) && /Synced/.test(mine), mine.slice(0, 400));
    // edit: a new version, same entry, history kept
    await page.evaluate(() => pbOpenNoRun()); await page.waitForTimeout(1500);
    const eid = await page.evaluate(() => window.__debugNoRun().st.entries[0].id);
    await page.click('#nrEdit_' + eid); await page.waitForTimeout(1500);
    check('Edit opens the entry filled in', /Editing: Job 24-101/.test(await T.text(page, 'nrJobCard') || '') && (await page.$eval('#nrQ_excavation', e => e.value)) === '210' && (await page.$eval('#nrBedTyped', e => e.value)) === 'Pit run gravel');
    await page.fill('#nrQ_excavation', '220'); await page.click('#nrSaveBtn'); await page.waitForTimeout(4000);
    s = (await nrSaves()).pop();
    check('the edit is sent as a new version of the SAME entry (excavation 220, entry version 2)', s && s.args.p_client_entry_id === (await page.evaluate(() => window.__debugNoRun().st.entries[0].cid)) && s.args.p_record.entryVersion === 2 && s.args.p_items.some(i => i.key === 'excavation' && i.qty === 220));
    list = await T.text(page, 'nrEntries') || '';
    check('edit history kept: "version 2", "Earlier versions (1)" listing version 1 with excavation 210', /version 2/.test(list) && /Earlier versions \(1\)/.test(list) && /Version 1, saved .*Excavation 210 LF/.test(list), list.slice(0, 600));
    const srv = await page.evaluate(() => JSON.parse(localStorage.getItem('__psrv')));
    const row = Object.values(srv.entries).find(e => /^norun:/.test(e.record && e.record.runRef || ''));
    check('the server holds one entry for it with 2 versions (no duplicate)', row && row.versions.length === 2 && Object.values(srv.entries).filter(e => /^norun:/.test(e.record && e.record.runRef || '')).length === 1);
    // footage only on a day with a run on that job: he is asked (could be the same pipe)
    await fill({ staFrom: '', staTo: '', feet: '50' }); await page.click('#nrSaveBtn'); await page.waitForTimeout(500);
    m = await T.modal(page);
    check('footage only, and a run on the same job that day: warned it may be the same pipe', m && /Same Job and Day/.test(m.title) && /run MH-7 to MH-8/.test(m.msg) && /your other entry without a run/.test(m.msg), m && m.msg);
    await T.click(page, '^Cancel$'); await page.waitForTimeout(300);
    // the per-entry PDF
    const pdf = await T.pdfText(page, () => page.click('#nrPdf_' + eid));
    const X = pdf ? pdf.txt.replace(/\s+/g, ' ') : '';
    check('its PDF: titled, ENTERED WITHOUT A RUN banner, no grade or cut/fill said, stations, footage, the typed bedding, the earlier version, the photo, integrity', pdf && /^work-without-run-24-101-\d{4}-\d\d-\d\d-v2\.pdf$/.test(pdf.name) && /Work Entered Without a Run/.test(X) && /ENTERED WITHOUT A RUN \(MANUAL\)/.test(X) && /No grade or cut\/fill/.test(X)
      && /12\+00\.00 to 14\+00\.00/.test(X) && /200 LF \(stations and footage agree\)/.test(X) && /Pit run gravel \(typed: not on the job list\)/.test(X) && /Earlier versions \(1\)/.test(X) && /Photo 1/.test(X) && /SHA-256/.test(X) && /Materials used \(estimate\)/.test(X), pdf ? pdf.name + ' :: ' + X.slice(0, 600) : 'no pdf');
    // feat_pdf (r15.27), on the real bytes: F3 "≈" never prints as "?"; F4 the Pipe row says the size once and the header
    // carries the date, never "Today"; F6 footer keeps the time.
    const XL = pdf ? pdf.txt : '';
    check('F3: the materials estimate prints "approx." (no "?" anywhere, no replaced-characters note)', pdf && /approx\. [\d.]+ yd/.test(X) && !/\?/.test(X) && !/could not be printed/.test(X), X.match(/.{0,40}\?.{0,40}/g));
    check('F4: Pipe is 8" C900 PVC (job list), the size once', /Pipe\s+8" C900 PVC \(job list\)/.test(X) && !/8" 8"/.test(X), X.match(/Pipe .{0,40}/));
    check('F4: the header says the work date, not "Today"', !/\bToday\b/.test(XL) && /[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, 20\d\d/.test(XL), XL.slice(0, 200));
    check('F6: every page footer keeps "Generated <date>"', XL.split('\f').filter(p => p.trim()).every(p => /Generated [A-Z][a-z]{2} \d{1,2}, 20\d\d/.test(p)));
    // ---- the daily report (batch 23): the entry is in Runs and production, labelled; the PDF line says no grade ----
    await page.evaluate(() => pbOpenDailyReport()); await page.waitForTimeout(3500);
    const runsTxt = await T.text(page, 'drRuns') || '';
    check('daily report: the entry is listed with the run, labelled, with "no grade or cut/fill"', /MH-7 to MH-8/.test(runsTxt) && /Entered without a run \(manual\): Sta 12\+00\.00 to 14\+00\.00/.test(runsTxt) && /no grade or cut\/fill/.test(runsTxt) && /Excavation 220/.test(runsTxt), runsTxt.slice(0, 600));
    const snap = await page.evaluate(() => window.__debugDaily().view.snap);
    check('daily report day totals add the entry (pipe 200 + run 200 = 400 LF)', snap && snap.runs.totals.pipe && snap.runs.totals.pipe.qty === 400, JSON.stringify(snap && snap.runs.totals));
    const matUsed = snap ? snap.materials.used.map(x => x.what + ' ' + x.qty + ' ' + x.unit).join(' | ') : '';
    check('daily report materials: the entry’s pipe (with its size and material) and bedding / shading / spoils estimates', /Pipe installed \(8" C900 PVC\) 200 LF/.test(matUsed) && /Bedding: Pit run gravel \(not on the job list\) \(calculated estimate\) 11\.11 yd³/.test(matUsed) && /Shading: Coarse sand \(calculated estimate\) 35\.67/.test(matUsed), matUsed);
    check('daily report hours: the typed man-hours and equipment hours, labelled as typed', snap && snap.crew.people.some(p => /Crew man-hours \(typed\)/.test(p.name) && p.hours === 24) && snap.crew.equipment.some(p => p.hours === 8) && snap.crew.totals.equipment_h === 8, JSON.stringify(snap && snap.crew));
    // sign it, then its PDF
    await page.fill('#drName', 'Frank Ortiz'); await page.fill('#drNarrative', 'Laid 200 ft without stakes, Sta 12+00 to 14+00.');
    for (let i = 0; i < 4; i++) {
      await page.click('#drSignBtn'); await page.waitForTimeout(1500);
      m = await T.modal(page); if (m && /Sign Report/.test(m.buttons.join('|'))) { await T.click(page, '^Sign Report$'); await page.waitForTimeout(2500); m = await T.modal(page); if (m) await T.click(page, '^OK$'); break; }
      if (await T.shown(page, 'drWxConfirm')) await page.check('#drWxConfirm');
    }
    await page.waitForTimeout(800);
    const rep = await page.evaluate(() => (window.__debugDaily().st.reports || [])[0] || null);
    const dpdf = rep ? await T.pdfText(page, () => page.click('#drPdf_' + rep.cid)) : null;
    const D = dpdf ? dpdf.raw.replace(/\s+/g, ' ') : '';
    const DL = dpdf ? dpdf.raw : '';
    check('F7: the day total names the plan category ("Thrust blocks 2 EA"), never its key', /Day total \(foreman entries\):[^\n]*Thrust blocks 2 EA/.test(D) && !/thrust_blocks/.test(D), D.match(/Day total.{0,160}/));
    check('F6: the daily footer shortens the phone UUID and keeps "Generated <date>" on every page', DL.split('\f').filter(p => p.trim()).every(p => /phone record [0-9a-f]{8}…\) · v\d+ · rev [0-9a-f]{8} · Generated [A-Z][a-z]{2} \d{1,2}, 20\d\d/.test(p)), DL.match(/Record daily.{0,200}/));
    check('daily report PDF: the entry’s line says it was entered without a run and that there is no grade or cut/fill', /Entered without a run \(manual\): Sta 12\+00\.00 to 14\+00\.00/.test(D) && /\(no run\)/.test(D) && /No grade or cut\/fill: entered without a run, so there are no elevations/.test(D) && /Crew man-hours: 24 h/.test(D), D ? D.slice(D.lastIndexOf('Runs and production'), D.lastIndexOf('Runs and production') + 1200) : 'no pdf (signed: ' + !!rep + ')');
    // ---- offline: saved on the phone, sent when signal returns ----
    await page.evaluate(() => { localStorage.setItem('__rpcMode', 'offline'); pbOpenNoRun(); }); await page.waitForTimeout(2500);
    await page.evaluate((d) => { document.getElementById('nrDate').value = d; }, dayOff(-1));
    await fill({ staFrom: '', staTo: '', feet: '40' }); await page.click('#nrSaveBtn'); await page.waitForTimeout(3500);
    const off = await page.evaluate(() => window.__debugNoRun().st.entries.find(e => e.footage === 40));
    list = await T.text(page, 'nrEntries') || '';
    check('offline: saved on the phone, not synced yet', off && off.stamp && off.stamp.k === 'ok' && !(await nrSaves()).some(x => x.args.p_client_entry_id === off.cid && x.args.p_items.length) || !/Synced[^]*40 LF/.test(list), list.slice(0, 300));
    const before = (await page.evaluate(() => JSON.parse(localStorage.getItem('__psrv')))).entries;
    check('offline: nothing reached the server for it', !Object.values(before).some(e => e.record && e.record.runRef === (off && off.cid)));
    // the app is closed while offline and opened again with signal: the entry is loaded with the account and sent
    await page.evaluate(() => localStorage.setItem('__rpcMode', 'ok'));
    await page.reload(); await page.waitForTimeout(9000); await M.dismiss(page).catch(() => {});
    const after = (await page.evaluate(() => JSON.parse(localStorage.getItem('__psrv')))).entries;
    check('reopened with signal: it is sent on its own (no tap needed)', Object.values(after).some(e => e.record && e.record.runRef === (off && off.cid)));
    await page.evaluate(() => pbOpenNoRun()); await page.waitForTimeout(2500);
    check('and shows Synced', /Synced/.test(await page.evaluate((id) => { const li = document.querySelector('#nrEntries li[data-nr="' + id + '"]'); return li ? li.textContent : ''; }, off && off.id)));
    // remove: taken off the company totals (a voiding version), kept in the list as removed
    await page.click('#nrRemove_' + off.id); await page.waitForTimeout(300);
    m = await T.modal(page);
    check('Remove asks first and says the company keeps the history', m && /taken off the company totals/.test(m.msg) && /keeps its history/.test(m.msg), m && m.msg);
    await T.click(page, '^Remove$'); await page.waitForTimeout(3000);
    const v = await T.rpcs(page, 'pb_prod_void_mine');
    check('removed: voided on the server (pb_prod_void_mine for its client id), listed as removed', v.some(x => x.args.p_client_entry_id === off.cid) && /Removed/.test(await page.evaluate((id) => { const li = document.querySelector('#nrEntries li[data-nr="' + id + '"]'); return li ? li.textContent : ''; }, off.id)));
    // drafts: typed, the app closed, opened again: it is back
    await page.evaluate(() => pbOpenNoRun()); await page.waitForTimeout(2000);
    await fill({ feet: '33', note: 'draft note' }); await page.waitForTimeout(1200);
    await page.reload(); await page.waitForTimeout(3000); await M.dismiss(page).catch(() => {});
    await page.evaluate(() => pbOpenNoRun()); await page.waitForTimeout(2500);
    check('draft (R2 pattern): what was typed is back after the app was closed, and says so', (await page.$eval('#nrFeet', e => e.value)) === '33' && (await page.$eval('#nrNote', e => e.value)) === 'draft note' && /kept on this phone and is back/.test(await T.text(page, 'nrMsg') || ''));
    await page.click('#nrClearBtn'); await page.waitForTimeout(300); await T.click(page, 'Clear Form'); await page.waitForTimeout(500);
    check('Clear Form empties it', (await page.$eval('#nrFeet', e => e.value)) === '');
    check('no page errors', !page._errors.length, page._errors.join(' | '));

    // ================= PIPELAYER: not offered (his production is held for a foreman) =================
    await fresh({ extra: { __role: 'pipelayer' } });
    await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(800);
    check('pipelayer: no "Work without a run" row', !(await T.shown(page, 'archiveNoRunBtn')));
    await page.evaluate(() => pbOpenNoRun()); await page.waitForTimeout(1500);
    m = await T.modal(page);
    check('pipelayer: opening it explains a foreman enters it', m && /entered by a foreman/.test(m.msg) && !(await page.evaluate(() => document.getElementById('screen-prodNoRun').classList.contains('active'))), m && m.msg);
    // ================= COMPANY ACCOUNT with no crew row (review S5): from the job screen =================
    await fresh({ extra: { __ownerCo: '1', __manager: '1' } }); // the mock's company functions need __manager; pb_prod_access stays the owner's (no crew row)
    await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(2500);
    let jo = await page.evaluate(() => { const b = [...document.querySelectorAll('[id^="pdJob"]')].find(x => /^pdJob\d+$/.test(x.id) && /24-101/.test(x.textContent)); return b ? Number(b.id.slice(5)) : -1; });
    await page.evaluate((i) => pbOpenProdJob(i), jo); await page.waitForTimeout(2500);
    check('company account: the job screen has "Add Work Without a Run"', await page.evaluate(() => { const b = document.getElementById('pjNoRunBtn'); return !!b && /Add Work Without a Run/.test(b.textContent); }));
    await page.evaluate(() => document.getElementById('pjNoRunBtn').click()); await page.waitForTimeout(3000);
    check('it opens this same form, prefilled with that job, with the materials blocks (the job’s list)', await page.evaluate(() => document.getElementById('screen-prodNoRun').classList.contains('active'))
      && (await page.$eval('#nrJob', e => e.value)) === '24-101' && (await page.$$eval('#nrPipe option', o => o.map(x => x.textContent))).includes('8" C900 PVC') && await T.shown(page, 'nrBedThk'));
    await page.evaluate((d) => { document.getElementById('nrDate').value = d; }, dayOff(-3));
    await fill({ feet: '75', by: 'DIG office' }); await page.selectOption('#nrPipe', { label: '8" C900 PVC' }); await page.click('#nrSaveBtn'); await page.waitForTimeout(4000);
    const cs = (await T.rpcs(page, 'pb_prod_company_norun_save')).pop();
    check('company account: filed through pb_prod_company_norun_save (norun: id, src norun, its mat with 75 ft and the list pipe), not pb_prod_save', cs && /^norun:/.test(cs.args.p_client_entry_id) && cs.args.p_record.src === 'norun' && cs.args.p_record.mat.parts[0].len === 75 && cs.args.p_record.mat.parts[0].pipe.id === 'm-pipe' && !(await nrSaves()).length, JSON.stringify(cs && cs.args.p_record.mat));
    check('company account: shown Synced', /Synced/.test(await T.text(page, 'nrEntries') || ''), await T.text(page, 'nrEntries'));
    await page.click('#nrBack'); await page.waitForTimeout(2500);
    check('Back returns to the job screen, which lists the entry with its label', await page.evaluate(() => document.getElementById('screen-prodJob').classList.contains('active')));
    await page.evaluate(() => pbProdJobLoad()); await page.waitForTimeout(2500);
    check('…labelled "Entered without a run (manual)"', /Entered without a run \(manual\) · 75 LF/.test(await page.evaluate(() => (document.getElementById('pjRecentSec') || {}).textContent || '')));
    const coId = await page.evaluate(() => window.__debugNoRun().st.entries[0].id);
    await page.evaluate((id) => pbOpenNoRun(id), coId); await page.waitForTimeout(2000);
    await page.click('#nrRemove_' + coId); await page.waitForTimeout(300); await T.click(page, '^Remove$'); await page.waitForTimeout(3500);
    check('company account: Remove takes it off with pb_prod_void', (await T.rpcs(page, 'pb_prod_void')).length >= 1 && /taken off the company totals/.test(await T.text(page, 'nrEntries') || ''), await T.text(page, 'nrEntries'));
    // ================= A MANAGER on a crew: may use it, and sees it on the company job screen =================
    await fresh({ manager: true });
    await page.evaluate(() => pbOpenNoRun()); await page.waitForTimeout(2500);
    check('a manager on a crew may use it', await page.evaluate(() => document.getElementById('screen-prodNoRun').classList.contains('active')));
    await page.selectOption('#nrJob', '24-101'); await page.waitForTimeout(800);
    await page.evaluate((d) => { document.getElementById('nrDate').value = d; }, dayOff(-2));
    await fill({ staFrom: '', staTo: '', feet: '30' }); await page.click('#nrSaveBtn'); await page.waitForTimeout(1500);
    await page.evaluate((d) => { document.getElementById('nrDate').value = d; }, dayOff(-2));
    await fill({ staFrom: '20+00', staTo: '21+00', feet: '', shadeThk: '0' }); await page.click('#nrSaveBtn'); await page.waitForTimeout(600);
    m = await T.modal(page);
    check('review S3: typed stations, and his footage-only entry that day: "can’t check for overlap; make sure this isn’t counted twice"', m && /Can’t Check for Overlap/.test(m.title) && /can’t check for overlap/.test(m.msg) && /counted twice/.test(m.msg), m && m.msg);
    await T.click(page, '^Save$'); await page.waitForTimeout(4000);
    s = (await nrSaves()).pop();
    check('stations alone give the footage (100 ft)', s && s.args.p_items.some(i => i.key === 'pipe' && i.qty === 100) && s.args.p_record.footageBasis === 'stations');
    check('review S1: shading thickness 0 is kept (sides of the pipe only), as on Run Setup', s && s.args.p_record.mat.parts[0].shade_thk === 0, s && JSON.stringify(s.args.p_record.mat.parts[0]));
    await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(2000);
    const ji = await page.evaluate(() => { const b = [...document.querySelectorAll('[id^="pdJob"]')].find(x => /^pdJob\d+$/.test(x.id) && /24-101/.test(x.textContent)); return b ? Number(b.id.slice(5)) : -1; });
    check('company production lists job 24-101', ji >= 0, ji);
    await page.evaluate((i) => pbOpenProdJob(i), ji); await page.waitForTimeout(2500);
    const rec = await page.evaluate(() => { const el = document.getElementById('pjRecentSec'); return el ? el.textContent : ''; });
    check('company job screen (batch 27): the entry shows in the job’s entries, labelled "Entered without a run (manual)" with its stations', /Entered without a run \(manual\) · Sta 20\+00\.00 to 21\+00\.00 · 100 LF/.test(rec), rec.slice(0, 500));
    check('no page errors (other accounts)', !page._errors.length, page._errors.join(' | '));
  } catch (e) { check('test ran without an exception', false, e && e.stack); }
  finally { await browser.close(); }
})();
