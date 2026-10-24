// Batch 15 PDF: dispute-grade reports. Key content per report, from the real PDFs the app writes.
// Run: cd /home/claude/test && PB_TEST_DIR=<site> PB_TEST_PORT=8985 ./run.sh /home/claude/batch15/PDF/tests/t_pdf_reports.js 300
const L = require('/home/claude/test/lib.js');
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const PH = '/home/claude/batch15/PDF/sample_photos/';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pbpdf-'));
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
// An independent jsonb text writer (PostgreSQL's jsonb::text): keys by UTF-8 length then bytes, ", " and ": ".
const jb = (v) => v === null ? 'null' : typeof v === 'boolean' ? String(v) : typeof v === 'number' ? (Object.is(v, -0) ? '0' : String(v)) : typeof v === 'string' ? JSON.stringify(v).replace(/[\u007f-￿]/g, c => c) : Array.isArray(v) ? '[' + v.map(jb).join(', ') + ']'
  : '{' + Object.keys(v).filter(k => v[k] !== undefined).sort((a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length - y.length || Buffer.compare(x, y); }).map(k => JSON.stringify(k) + ': ' + jb(v[k])).join(', ') + '}';
const pdfText = (file) => file ? execFileSync('pdftotext', ['-raw', file, '-']).toString() : ''; // a missing PDF is a FAIL (see sink), never a script error
const flat = (t) => t.replace(/\s+/g, ' ');
const tool = (cmd, args) => args.some(a => a === null || a === undefined) ? '' : execFileSync(cmd, args).toString(); // '' for a missing PDF (already a FAIL)
const readPdf = (f) => f ? fs.readFileSync(f) : Buffer.alloc(0);
(async () => {
  const browser = await L.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 400, height: 900 }, acceptDownloads: true, timezoneId: 'America/Denver' });
  await ctx.addInitScript(() => { localStorage.setItem('lastKnownUserId', 'uRpt'); localStorage.setItem('uRpt:cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active', companyName: 'Test Co' })); });
  const page = await L.newPage(browser, 'uRpt', ctx);
  // The PDF of one scenario: from the test hook when the build has it, else from the real download (a build whose
  // instrumented copy has no hook on that save, e.g. the EMERGENCY report). No PDF at all is a FAIL naming the scenario.
  const sink = async (fn, arg, name) => {
    await page.evaluate(() => { window.__pdfData = null; window.__debugPdfSink = (d) => { window.__pdfData = d; }; });
    let dlFile = null; const dl = page.waitForEvent('download', { timeout: 15000 }).then(async (d) => { const f = path.join(TMP, name); await d.saveAs(f); dlFile = f; }).catch(() => {});
    let err = null; try { await page.evaluate(fn, arg); } catch (e) { err = String(e && e.message || e).slice(0, 200); }
    for (let i = 0; i < 40 && !dlFile && !(await page.evaluate(() => !!window.__pdfData)); i++) await page.waitForTimeout(250);
    const d = await page.evaluate(() => window.__pdfData); const f = path.join(TMP, name);
    await page.evaluate(() => { window.__debugPdfSink = null; });
    if (d) { fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); return f; }
    if (!dlFile) await Promise.race([dl, new Promise(r => setTimeout(r, 3000))]);
    if (dlFile) return dlFile;
    L.check('PDF produced: ' + name + (err ? ' (the call threw: ' + err + ')' : ' (no PDF from the hook or as a download)'), false);
    return null;
  };
  const download = async (fn, name) => { const dl = page.waitForEvent('download', { timeout: 60000 }); await page.evaluate(fn); const d = await dl; const f = path.join(TMP, name); await d.saveAs(f); return { f, name: d.suggestedFilename() }; };
  // ---- a run with a note photo, a correction, and a damaged second photo ----
  const id = await L.lockRun(page, { dist: 100, stats: true });
  const idx = 5;
  await page.evaluate((i) => document.querySelector('button[onclick="pbToggleNote(this, ' + i + ')"]').click(), idx); await page.waitForTimeout(150);
  await (await page.$('#note' + idx + 'Photo')).setInputFiles(PH + 'p2_sandstone.jpg'); await page.waitForTimeout(900);
  await (await page.$('#note' + idx + 'Photo')).setInputFiles(PH + 'p5_water.jpg'); await page.waitForTimeout(900);
  await page.evaluate((i) => { const tr = document.querySelector('#note' + i + 'Photo').closest('tr'); tr.querySelector('textarea').value = 'rock at fifty'; window._s = pbSaveNote(tr.querySelector('button.pb-btn:not(.ghost)'), i); }, idx); await page.waitForTimeout(1200); await L.dismiss(page);
  await page.evaluate(() => pbToggleCorrectDistance()); await page.waitForTimeout(150);
  await page.selectOption('#correctDistanceRunSel', { index: 0 }); await page.fill('#correctDistanceVal', '101.5'); await page.fill('#correctDistanceReason', 're-taped');
  await page.evaluate(() => { window._c = pbApplyCorrectDistance(); }); await page.waitForTimeout(1200); await L.dismiss(page);
  await page.evaluate(() => pbGoto('archive')); await page.waitForTimeout(300);
  const runIdx = () => `window.__debugGetArchive().findIndex(e => e.id === ${id})`;
  const f1 = await sink((s) => pbDownloadArchivePDF(eval(s)), runIdx(), 'run1.pdf');
  const f2 = await sink((s) => pbDownloadArchivePDF(eval(s)), runIdx(), 'run2.pdf');
  L.check('run: a PDF was produced (twice)', !!f1 && !!f2);
  const t1 = pdfText(f1), t2 = pdfText(f2), n1 = Number((tool('pdfinfo', [f1]).match(/Pages:\s+(\d+)/) || [0, 0])[1]);
  const pages = t1.split('\f').filter(p => p.trim());
  L.check('run: every page says "Page X of Y" (' + n1 + ' pages)', pages.length === n1 && pages.every((p, i) => new RegExp('Page ' + (i + 1) + ' of ' + n1).test(p)));
  L.check('run: every page footer carries the record id and a short SHA-256', pages.every(p => p.includes('Record ' + id) && /SHA-256 [0-9a-f]{16}/.test(p)));
  const fp1 = (flat(t1).match(/SHA-256 fingerprint ([0-9a-f]{64})/) || [])[1], fp2 = (flat(t2).match(/SHA-256 fingerprint ([0-9a-f]{64})/) || [])[1];
  L.check('run: the full fingerprint is printed and is the same for the same record (stable)', !!fp1 && fp1 === fp2);
  L.check('run: the footer short form is the start of the full fingerprint', pages.every(p => p.includes('SHA-256 ' + fp1.slice(0, 16))));
  L.check('run: body shows the photo label "Photo 1 · p. N" and the Photos section has "Photo 1" with a back-reference', /Photo 1 · p\. \d+/.test(t1) && /Photo 1\s+Referenced on p\. \d+/.test(t1));
  const bodyPage = Number((t1.match(/Photo 1 · p\. (\d+)/) || [])[1]), photoPage = pages.findIndex(p => /Photo 1\s+Referenced on p\./.test(p)) + 1;
  L.check('run: the printed page number points at the page that really holds Photo 1 (' + bodyPage + ' = ' + photoPage + ')', bodyPage === photoPage);
  const raw = readPdf(f1).toString('latin1');
  L.check('run: the photo labels and contents are real internal links (GoTo / Dest annotations)', (raw.match(/\/Subtype \/Link/g) || []).length >= 3 && /\/Dest \[/.test(raw));
  L.check('run: stations print in the app\'s plus format (0+50.00) and numbers are right-aligned table cells', /0\+50\.00/.test(t1) && /1\+00\.00/.test(t1));
  L.check('run: the correction shows the original beside the corrected value, with its reason', /Run 1 distance\s+100\.0 ft\s+101\.5 ft\s+re-taped/.test(flat(t1)));
  L.check('run: provenance labels are printed per point, never over-claimed (S7)', /Point \(invert\): source not recorded/.test(flat(t1)) && /Calculated/.test(t1) && /Source: Point = a point entered/.test(flat(t1)) && !/AI cutsheet/.test(t1));
  L.check('run: the time zone is stated', /America\/Denver/.test(t1) && /M[DS]T/.test(t1));
  L.check('run: cubic yards print as "cu yd" (no unreliable superscript)', !/yd³/.test(t1));
  // fingerprint = SHA-256 of the canonical record (independent check)
  const fpCalc = await page.evaluate((i) => { const e = window.__debugGetArchive().find(x => x.id === i); return window.pbRptFingerprintOf(e); }, id);
  L.check('run: the printed fingerprint is the app\'s canonical-record SHA-256', fpCalc === fp1);
  // S1/S2: bookkeeping is not evidence; the exported record data hashes to the printed fingerprint; rev follows content
  const fpBook = await page.evaluate((i) => { const e = window.__debugGetArchive().find(x => x.id === i); e.supabaseId = 4711; e.cloudSyncFailed = true; e.sentReportHash = 'abc'; e.sent = true; const f = window.pbRptFingerprintOf(e); delete e.supabaseId; delete e.cloudSyncFailed; delete e.sentReportHash; e.sent = false; return f; }, id);
  L.check('fingerprint (S1): sync, sent and email bookkeeping do not change it', fpBook === fp1);
  const json = await page.evaluate((s) => { let out = null; window.__debugJsonSink = (n, t) => { out = { n, t }; }; pbExportRecordJSON(eval(s)); window.__debugJsonSink = null; return out; }, runIdx());
  L.check('verify (S2): "Export record data (JSON)" gives the exact text whose SHA-256 is the printed fingerprint', !!json && sha(json.t) === fp1 && /^record-run-\d+\.json$/.test(json.n));
  L.check('verify (S2): the Integrity section states the rules and the left-out fields', /Not part of it \(delivery and status bookkeeping, not evidence\)/.test(flat(t1)) && /supabaseId/.test(flat(t1)) && /sha256sum/.test(flat(t1)));
  const revA = (flat(t1).match(/Version (rev [0-9a-f]{8})/) || [])[1];
  L.check('version (S1): the label is a content revision, the start of the fingerprint', revA === 'rev ' + fp1.slice(0, 8));
  // ---- Batch 14 F laid marks (F's record shape, injected: F is not in this base) ----
  L.check('laid: a run without laid marks has no Laid column or section', !/Laid progress/.test(t1));
  await page.evaluate((i) => { const e = window.__debugGetArchive().find(x => x.id === i); const k = (r) => r.pointId ? 'p:' + r.pointId : 'sta:' + (Number(r.stationFt) || 0).toFixed(2); const t1 = Date.parse('2026-09-30T15:10:20Z'), t2 = Date.parse('2026-09-30T16:20:30Z'); const rows = e.intervalRows; e.laid = { v: 1, marks: {}, log: [] }; [0, 1, 2].forEach(j => { e.laid.marks[k(rows[j])] = t1; }); e.laid.log.push({ a: 'laid', at: t1, by: null, to: rows[2].station, keys: [0, 1, 2].map(j => k(rows[j])) }); e.laid.marks[k(rows[3])] = t2; e.laid.log.push({ a: 'laid', at: t2, by: null, to: rows[3].station, keys: [k(rows[3])] }); delete e.laid.marks[k(rows[3])]; e.laid.log.push({ a: 'undo', at: t2 + 60000, by: null, to: rows[3].station, keys: [k(rows[3])] }); }, id);
  const rtBefore = await page.evaluate((i) => window.__debugGetArchive().find(x => x.id === i).reportText, id);
  const fL = await sink((s) => pbDownloadArchivePDF(eval(s)), runIdx(), 'runL.pdf'), tL = flat(pdfText(fL));
  L.check('laid: the grade sheet has a Laid column with the row time, and a Laid progress section with first/last and the undo', /Laid progress/.test(tL) && /First laid Sep 30, 2026 9:10:20 AM MDT/.test(tL) && /Undo: laid marks removed from/.test(tL) && /Rows laid now 3 of/.test(tL) && (tL.match(/9:10:20 AM/g) || []).length >= 3);
  L.check('laid at (owner r3): the column is headed with the phone zone, every marked row has its time, rows marked in one swipe say so, and unmarked rows say "not marked"', /Laid at \(phone time, MDT\)/.test(tL) && /\(marked together: 0\+00\.00\u20130\+\d\d\.\d\d, 3 rows\)/.test(tL) && (tL.match(/9:10:20 AM \(same swipe\)/g) || []).length === 2 && /not marked/.test(tL));
  L.check('laid: making the PDF leaves the run\'s report text unchanged', rtBefore === await page.evaluate((i) => window.__debugGetArchive().find(x => x.id === i).reportText, id));
  await page.evaluate((i) => { delete window.__debugGetArchive().find(x => x.id === i).laid; }, id);
  {
    // Notes in the grade sheet rows (owner r3): the note's text prints in its row; a long one is cut and points to the full note.
    const longTxt = 'Existing 8 inch water main crosses at this station, about 2 ft above the new pipe. ' + 'Potholed and confirmed with the locator; owner notified and asked to support the main during backfill. '.repeat(5) + 'END-OF-NOTE.';
    const shortTxt = 'Hit 2 inch water line, potholed and cleared.';
    await page.evaluate(([i, t, s2]) => { const e = window.__debugGetArchive().find(x => x.id === i); const r = e.intervalRows[2], r4 = e.intervalRows[4]; e.fieldNotes = (e.fieldNotes || []).concat([{ rowIdx: 2, pointId: r.pointId || null, station: r.station, label: '', text: t, photoCount: 0, photos: [], time: Date.parse('2026-09-30T15:30:00Z') }, { rowIdx: 4, pointId: r4.pointId || null, station: r4.station, label: '', text: s2, photoCount: 0, photos: [], time: Date.parse('2026-09-30T16:52:00Z') }]); }, [id, longTxt, shortTxt]);
    const fN = await sink((s) => pbDownloadArchivePDF(eval(s)), runIdx(), 'runN.pdf'), tN = flat(pdfText(fN)), gs = tN.slice(tN.indexOf('Stations are measured from the start'), tN.lastIndexOf('Field notes ('));
    const pg = (gs.match(/full note p\. (\d+)/) || [])[1];
    L.check('row notes: each note prints under its row with the time written and zone ("Note (Sep 30, 2026 10:52 AM MDT): Hit 2 inch ...")', /Note \(Sep 30, 2026 10:52 AM MDT\): Hit 2 inch water line, potholed and cleared\./.test(gs) && /Note \(Sep 30, 2026 9:30 AM MDT\): Existing 8 inch water main/.test(gs));
    L.check('row notes: a very long note is trimmed after 3 lines with "\u2026 (full note p. X)", and the full note is on that page', !!pg && !/END-OF-NOTE/.test(gs) && /\u2026 \(full note p\. \d+\)/.test(gs) && pdfText(fN).split('\f')[Number(pg) - 1].replace(/\s+/g, ' ').includes('END-OF-NOTE.'));
    L.check('row notes: the Notes column only marks "Note \u2193" (no note text squeezed into it)', (gs.match(/Note \u2193/g) || []).length >= 2 && !/Note: \u201c/.test(gs));
    await page.evaluate((i) => { const e = window.__debugGetArchive().find(x => x.id === i); e.fieldNotes.pop(); e.fieldNotes.pop(); }, id);
  }
  // ---- damaged photo: keeps its number and says why ----
  await page.evaluate((i) => { const e = window.__debugGetArchive().find(x => x.id === i); const n = e.fieldNotes[0]; n.photos[1] = n.photos[1].slice(0, 3000); }, id);
  const f3 = await sink((s) => pbDownloadArchivePDF(eval(s)), runIdx(), 'run3.pdf'), t3 = pdfText(f3);
  L.check('missing photo: it keeps its number and the Photos page says why', /PHOTO 2 NOT INCLUDED/.test(t3) && /could not be read on this phone/.test(flat(t3)) && /Photo 2 · p\. \d+/.test(t3));
  L.check('missing photo: the record changed, so the fingerprint changed', ((flat(t3).match(/SHA-256 fingerprint ([0-9a-f]{64})/) || [])[1]) !== fp1);
  // ---- permit with an out-of-range test and an emergency ----
  await page.evaluate(() => pbGoto('confinedPermit')); await page.waitForTimeout(300);
  for (const [k, v] of [['cpJobsite', 'PDF Job'], ['cpJobNumber', 'J-1'], ['cpAddress', '1 St'], ['cpSpace', 'North Vault'], ['cpPurpose', 'Inspect'], ['cpDate', '2026-09-30'], ['cpStart', '00:00'], ['cpEnd', '23:30'], ['cpAtmoInterval', '15'], ['cpHazards', 'H2S'], ['cpControls', 'plug'], ['cpVentFail', 'monitor'], ['cpMinO2', '19.5'], ['cpMaxLEL', '10'], ['cpRescue', 'Fire dept'], ['cpComms', 'voice'], ['cpSupervisor', 'Sam Super'], ['cpSupervisorInitials', 'SS'], ['cpAttendant', 'Ava Attend']]) await page.fill('#' + k, v);
  await page.click('button[onclick="pbLockConfinedPermit()"]'); await page.waitForSelector('#screen-confinedActive.active'); await page.waitForTimeout(300); await L.dismiss(page);
  const reading = (o2, h2s) => page.evaluate(([a, h]) => { document.getElementById('cpAtmoAddForm').style.display = ''; document.getElementById('cpAtmoTester').value = 'Ava Attend'; document.getElementById('cpAtmoO2').value = a; document.getElementById('cpAtmoLEL').value = '0'; const H = document.getElementById('cpAtmoH2S'); if (H) H.value = h; return pbSaveAtmoReading(); }, [o2, h2s]);
  await reading('20.9', '0'); await page.waitForTimeout(500); await L.dismiss(page);
  await page.evaluate(() => { document.getElementById('cpRosterAddForm').style.display = ''; document.getElementById('cpRosterName').value = 'Ed Entrant'; document.getElementById('cpRosterRole').value = 'Entrant'; return pbAddRosterPerson(); }); await page.waitForTimeout(400); await L.dismiss(page);
  await page.evaluate(() => pbToggleRosterStatus(window.__debugGetRoster().findIndex(p => p.name === 'Ed Entrant'))); await page.waitForTimeout(400); await L.dismiss(page);
  await page.evaluate(() => { window.__debugExternalSink = () => {}; pbTriggerEmergency(); }); await page.waitForTimeout(500); await L.dismiss(page);
  await reading('20.5', '15'); await page.waitForTimeout(500); await L.dismiss(page);
  await page.evaluate(() => pbToggleRosterStatus(window.__debugGetRoster().findIndex(p => p.name === 'Ed Entrant'))); await page.waitForTimeout(400); await L.dismiss(page); await L.dismiss(page);
  // REVIEW2 N1, the three ways a number gets recorded:
  //  case 1: Send Report Email tapped with NO address (the app refuses; no email opens) -> the box's 911 (filled in by the app) is saved
  const c1 = await page.evaluate(() => { window.__ext = []; window.__debugExternalSink = (u) => window.__ext.push(u); document.getElementById('cpEmergencyEmail').value = ''; const el = document.getElementById('cpEmergencyNum'); const before = { v: el.value, auto: el.dataset.auto }; pbSendEmergencyReport(); return { before, opened: window.__ext.slice() }; });
  await page.waitForTimeout(300); await L.dismiss(page);
  //  case 3: a number the person typed in the "Emergency number called" box
  await page.evaluate(() => { const el = document.getElementById('cpEmergencyNum'); el.value = '555-0100'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }); await page.waitForTimeout(400); await L.dismiss(page);
  await page.evaluate(() => pbDismissEmergencyPanel('resolved')); await page.waitForTimeout(200); await page.click('#pbModalButtons button:has-text("Continue")').catch(() => {}); await page.waitForTimeout(400);
  L.check('N1 setup (case 1): no address -> no email opened, but the box held the app\'s own 911', c1.before.v === '911' && c1.before.auto === '1' && !c1.opened.some(u => /^mailto:/i.test(u)));
  await page.evaluate(() => pbCloseConfinedPermit()); await page.waitForTimeout(1500); await L.dismiss(page); await page.waitForTimeout(300); await L.dismiss(page);
  await page.evaluate(() => pbGoto('archive')); await page.waitForTimeout(300);
  const pIdx = `window.__debugGetArchive().findIndex(e => e.kind === 'confined')`;
  const fp = await sink((s) => pbDownloadArchivePDF(eval(s)), pIdx, 'permit.pdf'), tp = pdfText(fp), tpf = flat(tp);
  L.check('permit: status banner on page 1 says EMERGENCY DECLARED', /EMERGENCY DECLARED 1 TIME/.test(tp.split('\f')[0]));
  L.check('permit: the 1926.1206 items (a) to (p) are listed', ['(a)', '(c)', '(g)', '(k)', '(n)', '(p)'].every(k => tp.includes(k)) && /Entry supervisor and authorizing signature\/initials/.test(tpf));
  L.check('permit: the out-of-range test is marked in the log', /OUTSIDE ACCEPTABLE RANGE/.test(tpf));
  L.check('permit: signature lines for supervisor (authorize and cancel) and attendant', /Entry supervisor: authorized entry/.test(tpf) && /cancelled the permit at closeout/.test(tpf) && /Attendant Recorded in the app: Ava Attend/.test(tpf) && /Signature/.test(tpf));
  const permitFp = (tpf.match(/SHA-256 fingerprint ([0-9a-f]{64})/) || [])[1];
  const rec = await page.evaluate(() => { const e = window.__debugGetArchive().find(x => x.kind === 'confined'); const { photos, restoredFromCloud, ...rest } = e; const r = JSON.parse(JSON.stringify(rest)); if (Array.isArray(photos) && photos.length) r.photoCount = Math.max(Number(r.photoCount) || 0, photos.length); return JSON.stringify(r); }); // pbPermitBackupRecord, as the backup sends it
  L.check('permit: the fingerprint equals SHA-256 of the backup record in jsonb text form (the server\'s record_sha256)', permitFp === sha(jb(JSON.parse(rec))));
  // emergency incident report
  const fe = await sink((s) => pbDownloadEmergencyPDF(eval(s)), pIdx, 'emergency.pdf'), te = flat(pdfText(fe));
  L.check('emergency: a separate incident report is produced', !!fe && /EMERGENCY Incident Report/.test(te));
  L.check('emergency: declaration time, who was inside and every action with its time', /Declared Sep 30, 2026|Declared \w{3} \d+, 2026/.test(te) && /Who was inside when it was declared/.test(te) && /Ed Entrant/.test(te) && /\+0m 0s/.test(te));
  L.check('emergency: notifications are separate and never claim delivery', /Notifications and delivery/.test(te) && /The app does not know whether a call connected or an email was sent\./.test(te) && /EMERGENCY button tapped: [A-Z][a-z]{2} \d{1,2}, 20\d\d,? \d{1,2}:\d{2}:\d{2} (AM|PM) [A-Z]{2,5}\. The app opened the phone\u2019s dialer with 911\. The app cannot know whether the call was placed or connected\./.test(te) && !/dialed by|what the button dials|Dialer opened to/.test(te + tpf) && !/[Nn]umber (actually )?reached/.test(te) && /Not recorded whether an email was sent/.test(te));
  L.check('emergency: air readings before and during, and how it ended', /Before/.test(te) && /During/.test(te) && /INCIDENT RESOLVED/.test(te));
  L.check('emergency: the same record fingerprint as the closeout', te.includes(permitFp));
  {
    // REVIEW2 N1: every place states only what was recorded, in each of the three cases.
    const AUTO = 'Number recorded: 911 (filled in by the app, not changed); recorded when Send Report Email was tapped';
    const NOTREC = 'Whether an email was opened or sent is not recorded.';
    const cnt = (t, k) => t.split(k).length - 1;
    const zoned = /Number recorded: 911 \(filled in by the app, not changed\); recorded when Send Report Email was tapped \([A-Z][a-z]{2} \d{1,2}, 20\d\d,? \d{1,2}:\d{2}:\d{2} (AM|PM) [A-Z]{2,5}\)\. Whether an email was opened or sent is not recorded\./;
    L.check('N1 no address (case 1): closeout item (l) gives the app-filled entry in the new words, with its time and zone', cnt(tpf.slice(tpf.indexOf('(l)'), tpf.indexOf('(m)')), AUTO) === 1 && zoned.test(tpf));
    L.check('N1: the permit timeline lists the app-filled entry and the typed one', cnt(tpf.slice(tpf.indexOf('Permit timeline')), AUTO) >= 1 && /Number typed by user: 555-0100/.test(tpf.slice(tpf.indexOf('Permit timeline'))));
    L.check('N1: the emergency report key facts, actions and notifications use the same words', zoned.test(te) && cnt(te, AUTO) >= 2 && te.includes(NOTREC) && /Recorded when Send Report Email was tapped\. The app filled in this number after EMERGENCY and nobody changed it\./.test(te));
    L.check('N1 typed number (case 3): printed as typed by the user with time and zone, never as app-filled', /Number typed by user: 555-0100 \([A-Z][a-z]{2} \d{1,2}, 20\d\d,? \d{1,2}:\d{2}:\d{2} (AM|PM) [A-Z]{2,5}\)/.test(tpf) && !/Number recorded: 555-0100/.test(tpf + te));
    L.check('N1: no report says the number was "pre-filled in the incident email", or that it was reached', !/pre-filled|incident email: 911|[Nn]umber (actually )?reached/.test(tpf + te));
  }
  {
    //  N1 case 2: a second permit; EMERGENCY, then Send Report Email WITH an address (the email app is handed the message)
    await page.evaluate(() => pbGoto('confinedPermit')); await page.waitForTimeout(300);
  for (const [k, v] of [['cpJobsite', 'PDF Job'], ['cpJobNumber', 'J-1'], ['cpAddress', '1 St'], ['cpSpace', 'South Vault'], ['cpPurpose', 'Inspect'], ['cpDate', '2026-09-30'], ['cpStart', '00:00'], ['cpEnd', '23:30'], ['cpAtmoInterval', '15'], ['cpHazards', 'H2S'], ['cpControls', 'plug'], ['cpVentFail', 'monitor'], ['cpMinO2', '19.5'], ['cpMaxLEL', '10'], ['cpRescue', 'Fire dept'], ['cpComms', 'voice'], ['cpSupervisor', 'Sam Super'], ['cpSupervisorInitials', 'SS'], ['cpAttendant', 'Ava Attend']]) await page.fill('#' + k, v);
    await page.click('button[onclick="pbLockConfinedPermit()"]'); await page.waitForSelector('#screen-confinedActive.active'); await page.waitForTimeout(300); await L.dismiss(page);
    await page.evaluate(() => { window.__ext = []; window.__debugExternalSink = (u) => window.__ext.push(u); pbTriggerEmergency(); }); await page.waitForTimeout(500); await L.dismiss(page);
    const c2 = await page.evaluate(() => { window.__ext = []; document.getElementById('cpEmergencyEmail').value = 'safety@example.com'; const el = document.getElementById('cpEmergencyNum'); const before = { v: el.value, auto: el.dataset.auto }; pbSendEmergencyReport(); return { before, opened: window.__ext.slice() }; });
    await page.waitForTimeout(400); await L.dismiss(page);
    await page.evaluate(() => pbDismissEmergencyPanel('resolved')); await page.waitForTimeout(200); await page.click('#pbModalButtons button:has-text("Continue")').catch(() => {}); await page.waitForTimeout(400);
    await page.evaluate(() => pbCloseConfinedPermit()); await page.waitForTimeout(1500); await L.dismiss(page); await page.waitForTimeout(300); await L.dismiss(page);
    await page.evaluate(() => pbGoto('archive')); await page.waitForTimeout(300);
    L.check('N1 setup (case 2): with an address the email app was handed the message, and the box held the app\'s own 911', c2.before.v === '911' && c2.before.auto === '1' && c2.opened.some(u => /^mailto:/i.test(u)));
    const i2 = `window.__debugGetArchive().findIndex(e => e.kind === 'confined' && ((e.permit || {}).space === 'South Vault' || e.space === 'South Vault'))`;
    const t2 = flat(pdfText(await sink((s) => pbDownloadArchivePDF(eval(s)), i2, 'permit2.pdf'))), e2 = flat(pdfText(await sink((s) => pbDownloadEmergencyPDF(eval(s)), i2, 'emergency2.pdf')));
    const AUTO = 'Number recorded: 911 (filled in by the app, not changed); recorded when Send Report Email was tapped', NOTREC = 'Whether an email was opened or sent is not recorded.';
    L.check('N1 address given (case 2): permit item (l), permit timeline and the emergency report say the same true thing (no claim that an email was opened or sent)', t2.slice(t2.indexOf('(l)'), t2.indexOf('(m)')).includes(AUTO) && t2.slice(t2.indexOf('Permit timeline')).includes(AUTO) && e2.includes(AUTO) && e2.includes(NOTREC) && !/pre-filled|incident email: 911|[Nn]umber (actually )?reached|[Ee]mail (was )?(sent|opened) (at|on)\b/.test(t2 + e2));    await page.evaluate((s) => { const a = window.__debugGetArchive(); a.splice(eval(s), 1); }, i2); // keep the rest of this test's counts unchanged
  }
  // ---- anonymous report: nothing that identifies the sender ----
  await page.evaluate(() => pbOpenReportIssue()); await page.waitForTimeout(400); await L.dismiss(page);
  await page.click('#riAnonToggle button[data-val="anon"]'); await page.selectOption('#riCategory', 'Equipment'); await page.fill('#riDescription', 'monitor overdue for bump test');
  await (await page.$('#riPhotoPhoto')).setInputFiles(PH + 'p10_sticker.jpg'); await page.waitForTimeout(900);
  await page.evaluate(() => { window.__debugExternalSink = () => {}; window._rs = pbSendManagementReport(); }); await page.waitForTimeout(1500); await L.dismiss(page);
  await page.evaluate(() => pbGoto('archive')); await page.waitForTimeout(300);
  const anon = await page.evaluate(() => { const e = window.__debugGetArchive().find(x => x.kind === 'report' && x.anonymous); return { id: String(e.id), cid: e.clientReportId || '', tok: e.replyToken || '', at: e.deliveryAt ? String(e.deliveryAt) : '' }; });
  const fa = await download(`pbDownloadArchivePDF(window.__debugGetArchive().findIndex(e => e.kind === 'report' && e.anonymous))`, 'anon.pdf');
  const ta = pdfText(fa.f), tab = fs.readFileSync(fa.f).toString('latin1');
  L.check('anonymous: file name is neutral', fa.name === 'report-anonymous.pdf');
  L.check('anonymous: no record id, client id, reply token or delivery time anywhere in the file', [anon.id, anon.cid, anon.tok, anon.at].filter(Boolean).every(s => !tab.includes(s) && !ta.includes(s)));
  L.check('anonymous: no date, time, time zone or account in the text', !/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, 20\d\d/.test(ta) && !/\b(AM|PM)\b/.test(ta) && !/(MDT|MST|UTC|America\/|Generated|Exported by|signed in)/.test(ta));
  L.check('anonymous: the PDF creation date is the neutral one and there is no author', /\/CreationDate \(D:19700101000000\+00'00'\)/.test(tab) && !/\/Author/.test(tab));
  L.check('anonymous: content and its photo are still in the report', /monitor overdue for bump test/.test(ta) && /Photo 1 · p\. \d/.test(ta) && /Anonymous/.test(ta));
  // ---- bulk export: cover, contents, breaks, anonymous left out ----
  const fb = await download(`pbDownloadArchiveAllPDF()`, 'bulk.pdf'), tb = pdfText(fb.f), tbf = flat(tb);
  L.check('bulk: cover page with contents and page numbers', /Records Export/.test(tb.split('\f')[0]) && /Contents/.test(tb.split('\f')[0]));
  L.check('bulk: each record starts with a clear "RECORD n OF m" break', /RECORD 1 OF 3/.test(tbf) && /RECORD 3 OF 3/.test(tbf));
  L.check('bulk (B1): the anonymous report is not in the file and anonymous reports are not mentioned at all', !/monitor overdue for bump test/.test(tb) && !/anonymous/i.test(tb) && !/left out/i.test(tb) && !/anonymous/i.test(fs.readFileSync(fb.f).toString('latin1')));
  {
    // B1: the same export made with the anonymous report removed from the Archive must be the same file
    // (same page count, same text once the export time is masked): its presence leaves no trace at all.
    const removed = await page.evaluate(() => { const a = window.__debugGetArchive(), k = a.findIndex(e => e.kind === 'report' && e.anonymous); window.__pbHeldAnon = a.splice(k, 1)[0]; return k; });
    const fb2 = await download(`pbDownloadArchiveAllPDF()`, 'bulk_no_anon.pdf'), tb2 = pdfText(fb2.f);
    await page.evaluate((k) => { window.__debugGetArchive().splice(k, 0, window.__pbHeldAnon); delete window.__pbHeldAnon; }, removed);
    const pages = (f) => Number((tool('pdfinfo', [f]).match(/Pages:\s+(\d+)/) || [0, 0])[1]);
    const mask = (t) => t.replace(/[A-Z][a-z]{2} \d{1,2}, 20\d\d,? \d{1,2}:\d{2}(:\d{2})? (AM|PM)( [A-Z]{2,5})?/g, 'TIME');
    L.check('bulk (B1): with or without an anonymous report in the Archive, the export has the same pages and text', pages(fb.f) === pages(fb2.f) && mask(tb) === mask(tb2));
  }
  L.check('bulk: the emergency incident report follows its permit', /EMERGENCY incident report/.test(tbf));
  // ---- stats: one decimal ----
  await page.evaluate(() => pbGoto('stats')); await page.waitForTimeout(400);
  const fs1 = await download(`pbDownloadStatsPDF()`, 'stats.pdf'), ts = flat(pdfText(fs1.f));
  // S9: a permit with no air tests
  const noAir = await page.evaluate(() => { const e = JSON.parse(JSON.stringify(window.__debugGetArchive().find(x => x.kind === 'confined'))); e.id = 777001; e.lockTime = new Date(e.lockTime); e.atmoLog = []; e.permit.unloggedHazards = []; e.permitSessionId = 'noair'; window.__debugUnshiftToRunArchive(e); return e.id; });
  const fn = await sink((s) => pbDownloadArchivePDF(eval(s)), 'window.__debugGetArchive().findIndex(e => e.id === 777001)', 'noair.pdf'), tn = flat(pdfText(fn));
  L.check('no air tests (S9): says "No air tests recorded", never "all within limits"', /No air tests recorded/.test(tn) && !/within limits/.test(tn) && !/All readings within/.test(tn));
  // S10: accented names print; unsupported characters are replaced visibly with a note
  await page.evaluate(() => { const e = window.__debugGetArchive().find(x => x.id === 777001); e.space = 'Bóveda Nguyễn Văn Ñandú Łódź \u{1F6A7} \u05E9\u05DC'; });
  const fu = await sink((s) => pbDownloadArchivePDF(eval(s)), 'window.__debugGetArchive().findIndex(e => e.id === 777001)', 'uni.pdf'), tu = pdfText(fu);
  L.check('characters (S10): Latin-1, Latin Extended-A and Vietnamese print as typed (embedded font)', /Bóveda Nguyễn Văn Ñandú Łódź/.test(tu) && /PBSans/.test(tool('pdffonts', [fu])));
  L.check('characters (S10): characters the font lacks become "?" with a visible note on that page', /Some characters on this page could not be printed/.test(flat(tu)));
  await page.evaluate(() => { const a = window.__debugGetArchive(); a.splice(a.findIndex(e => e.id === 777001), 1); });
  L.check('stats: footage to one decimal, matching the run (101.5 ft)', /TOTAL FOOTAGE 101\.5 FT/.test(ts) && /101\.5 ft/.test(ts));
  // ---- company branding (Batch 16 BRAND's window.pbCompanyBranding) ----
  {
    const pages = (f) => Number((tool('pdfinfo', [f]).match(/Pages:\s+(\d+)/) || [0, 0])[1]);
    const imgPages = (f) => tool('pdfimages', ['-list', f]).split('\n').slice(2).filter(Boolean).map(l => l.trim().split(/\s+/)).filter(c => c[2] === 'image' || c[2] === 'smask').map(c => c[0] + ':' + c[2] + ':' + c[3] + 'x' + c[4]);
    const madeOnEvery = (f) => pdfText(f).split('\f').filter(t => t.trim()).every(t => /Made with The Pipelayer’s Bible/.test(t));
    const runIdx = `window.__debugGetArchive().findIndex(e => e.kind === 'run')`;
    // 1. No logo uploaded: the company name in bold where the logo goes. No branding function at all (and no
    //    company known on this phone, as in this test): no name and no placeholder. Footer always says "Made with".
    await page.evaluate(() => { window.pbCompanyBranding = () => ({ companyName: 'Test Co', logo: null }); });
    const f0 = await sink((s) => pbDownloadArchivePDF(eval(s)), runIdx, 'brand_name.pdf');
    L.check('branding: no logo, the header shows the company name and every page says "Made with The Pipelayer’s Bible"', pdfText(f0).split('\f').filter(t => t.trim()).every(t => /(^|\n)Test Co\n/.test(t)) && madeOnEvery(f0) && !imgPages(f0).some(x => /:smask:/.test(x)));
    await page.evaluate(() => { delete window.pbCompanyBranding; });
    const f00 = await sink((s) => pbDownloadArchivePDF(eval(s)), runIdx, 'brand_none.pdf');
    L.check('branding: without pbCompanyBranding the PDF is made, with no placeholder name, and every page says "Made with"', !!f00 && !/Company not set/.test(pdfText(f00)) && madeOnEvery(f00));
    // 2. With the fixture logo (DIG Civil, rasterized once from BRAND's SVG): logo on every page, same pages.
    const png = fs.readFileSync('/home/claude/batch15/PDF/fixtures/DIG_Civil_logo.png').toString('base64');
    await page.evaluate((png) => { window.pbCompanyBranding = () => ({ companyName: 'DIG Civil', logo: { dataUrl: 'data:image/png;base64,' + png, width: 800, height: 533, sha256: 'abc123', version: 3 } }); }, png);
    const f1 = await sink((s) => pbDownloadArchivePDF(eval(s)), runIdx, 'brand_logo.pdf'), n1 = pages(f1);
    const logoPages = new Set(imgPages(f1).filter(x => /:smask:/.test(x)).map(x => x.split(':')[0])); // the logo is the only image with transparency
    L.check('branding: the logo is drawn on every page (' + n1 + ' pages) and every page says "Made with The Pipelayer’s Bible"', logoPages.size === n1 && madeOnEvery(f1));
    // 3. A broken logo falls back to the name, never throws.
    await page.evaluate(() => { window.pbCompanyBranding = () => ({ companyName: 'DIG Civil', logo: { dataUrl: 'data:image/png;base64,AAAA', width: 10, height: 10 } }); });
    const f2 = await sink((s) => pbDownloadArchivePDF(eval(s)), runIdx, 'brand_bad.pdf');
    L.check('branding: an unreadable logo falls back to the company name in bold', /DIG Civil/.test(pdfText(f2)) && madeOnEvery(f2));
    await page.evaluate(() => { window.pbCompanyBranding = () => { throw new Error('cache broken'); }; });
    const f3 = await sink((s) => pbDownloadArchivePDF(eval(s)), runIdx, 'brand_throw.pdf');
    L.check('branding: a pbCompanyBranding that throws still gives a PDF', !!f3 && madeOnEvery(f3));
    // 4. Anonymous report: keeps the logo and name, still no sender detail.
    await page.evaluate((png) => { window.pbCompanyBranding = () => ({ companyName: 'DIG Civil', logo: { dataUrl: 'data:image/png;base64,' + png, width: 800, height: 533, sha256: 'abc123', version: 3 } }); }, png);
    const fa2 = await sink((s) => pbDownloadArchivePDF(eval(s)), `window.__debugGetArchive().findIndex(e => e.kind === 'report' && e.anonymous)`, 'anon_logo.pdf'), ta2 = pdfText(fa2), tab2 = readPdf(fa2).toString('latin1');
    L.check('branding: the anonymous report keeps the logo and "Made with", with no date, time, zone, account or build', imgPages(fa2).some(x => /:smask:/.test(x)) && madeOnEvery(fa2) && !/\b(AM|PM)\b|MDT|Exported by|signed in|uRev/.test(ta2) && !/PB_APP_BUILD|Pipelayer’s Bible [0-9r]/.test(ta2) && /\/CreationDate \(D:19700101000000\+00'00'\)/.test(tab2));
    // 5. Bulk cover carries it more prominently.
    const fb3 = await download(`pbDownloadArchiveAllPDF()`, 'bulk_logo.pdf');
    L.check('branding: the bulk cover says "Made with The Pipelayer’s Bible" under the title, and every page does in the footer', /From the Archive on this phone · Made with The Pipelayer’s Bible/.test(pdfText(fb3.f).split('\f')[0]) && madeOnEvery(fb3.f));
    await page.evaluate(() => { delete window.pbCompanyBranding; });
  }
  console.log('JS errors:', page._errors.length ? page._errors.join(' | ') : 'none');
  await browser.close();
  if (!process.env.KEEP) fs.rmSync(TMP, { recursive: true, force: true });
})().catch(e => { console.log('SCRIPT ERROR', e); process.exit(1); });
