// Night sweep round 3 (Stats / reporting screens), r15.34. Seeded realistic Records (feat_records storage.json).
// A: Stats after the r15.33 Edit Run Data → Lock → Replace path (count, total, PDF numbers agree with the screen).
// B: Records › Mark Sent / Download PDF on the replaced run. C: the Management report form (repetition when Anonymous,
// offline save path). D: every Education article opens; its tool buttons open a calculator; no page errors.
// BUG: lines PASS by demonstrating the problem.
const H = require('/home/claude/feat_records/tests/h_rec.js'); const { L } = H;
const SH = '/home/claude/night/stats/shots/', OUT = '/home/claude/night/stats/out/';
const fs = require('fs'); const { execFileSync } = require('child_process');
const pdfText = (f) => { try { return execFileSync('pdftotext', ['-raw', f, '-']).toString(); } catch (e) { return ''; } };
const statsNums = async (page) => { await L.dismiss(page); await page.evaluate(() => pbOpenStats()); await page.waitForTimeout(300); await page.evaluate(() => { document.getElementById('statsFilterPeriod').value = 'all'; document.getElementById('statsFilterType').value = 'all'; document.getElementById('statsFilterJobsite').value = 'all'; renderStats(); }); return page.evaluate(() => { const t = document.getElementById('screen-stats').innerText.replace(/\s+/g, ' '); return { t, foot: Number((t.match(/Total Footage (\d+) ft/) || [])[1]), runs: Number((t.match(/Runs Tracked (\d+)/) || [])[1]), log: window.__debugGetArchive ? JSON.parse(localStorage.getItem('uNightRec:statsLog') || '[]').length : -1 }; }); };
const sink = async (page, fn, name) => { await page.evaluate(() => { window.__pdfData = null; window.__debugPdfSink = (d) => { window.__pdfData = d; }; }); await page.evaluate(fn); for (let i = 0; i < 80 && !(await page.evaluate(() => !!window.__pdfData)); i++) await page.waitForTimeout(250); const d = await page.evaluate(() => window.__pdfData); await page.evaluate(() => { window.__debugPdfSink = null; }); if (!d) return ''; const f = OUT + name; fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); return f; };
(async () => {
  const browser = await L.chromium.launch();
  const page = await H.seeded(browser, { time: new Date('2026-10-21T13:20:00Z') });
  const s0 = await statsNums(page);
  console.log('   seeded Stats:', s0.foot, 'ft', s0.runs, 'runs, log', s0.log);
  // ---- A: lock a new tracked run, then Edit Run Data → fix the end invert → Lock → Replace ----
  const id1 = await L.lockRun(page, { dist: 120, stats: true });
  const s1 = await statsNums(page);
  L.check('control: a new tracked 120 ft run adds 120 ft and 1 run to Stats (' + s0.foot + '→' + s1.foot + ', ' + s0.runs + '→' + s1.runs + ')', s1.foot === s0.foot + 120 && s1.runs === s0.runs + 1);
  await page.evaluate(() => pbGoto('results')); await page.waitForTimeout(200);
  await page.evaluate(() => pbEditRunData()); await page.waitForTimeout(400); await L.dismiss(page);
  await page.fill('#endElev', '99.10'); await page.click('text=Review & Calculate'); await page.waitForTimeout(400);
  await page.click('button[onclick="pbLock()"]'); await page.waitForTimeout(500);
  let m = await H.modal(page);
  L.check('control: Lock after a changed end invert asks Locked Once Already (Cancel / Keep Both / Replace)', !!m && /Locked Once Already/.test(m.title) && m.btns.join('|') === 'Cancel|Keep Both|Replace', m && JSON.stringify(m));
  await H.clickBtn(page, /^Replace$/); await page.waitForSelector('#screen-results.active'); await page.waitForTimeout(900); await L.dismiss(page);
  const id2 = await page.evaluate(() => window.__debugGetCurrentArchiveEntry().id);
  const arch = await page.evaluate(() => window.__debugGetArchive().filter(e => e.kind === 'run').map(e => ({ id: e.id, end: e.endElev !== undefined ? e.endElev : (e.calc && e.calc.endElev), dist: e.distance, keys: Object.keys(e).filter(k => /elev/i.test(k)).join(',') })));
  console.log('   runs after Replace:', JSON.stringify(arch.slice(-2)), 'id1', id1, 'id2', id2);
  const s2 = await statsNums(page);
  L.check('control: Replace leaves one record for the run (old id gone, new one with end 99.10)', !arch.some(e => e.id === id1) && arch.some(e => e.id === id2 && e.dist === 120) && id1 !== id2, JSON.stringify(arch.slice(0, 2)));
  L.check('control: Stats after Replace still ' + s1.foot + ' ft / ' + s1.runs + ' runs (not double-counted) [' + s2.foot + '/' + s2.runs + ', log ' + s2.log + ']', s2.foot === s1.foot && s2.runs === s1.runs && s2.log === s1.log);
  const stRec = await page.evaluate((id) => JSON.parse(localStorage.getItem('uNightRec:statsLog') || '[]').filter(s => s.entryId === id), id2);
  L.check('control: the Stats record now belongs to the new id (one record, 120 ft)', stRec.length === 1 && Math.abs(stRec[0].footage - 120) < 0.01, JSON.stringify(stRec));
  // Stats PDF and CSV agree with the screen after the Replace
  const dl = page.waitForEvent('download', { timeout: 30000 }); await page.evaluate(() => pbDownloadStatsPDF()); const d = await dl; const fS = OUT + 'stats_after_replace.pdf'; await d.saveAs(fS);
  const TS = pdfText(fS).replace(/\s+/g, ' '); console.log('   stats pdf:', TS.slice(0, 350));
  L.check('control: Stats PDF says ' + s2.foot + ' ft and ' + s2.runs + ' runs like the screen', new RegExp('\\b' + s2.foot + '(\\.0)? ft', 'i').test(TS) && new RegExp('\\b' + s2.runs + ' runs', 'i').test(TS), TS.slice(0, 200));
  const csv = await page.evaluate(() => { let r = null; window.__debugCsvSink = (n, rows) => { r = rows; }; pbExportStatsCSV(); window.__debugCsvSink = null; return r; });
  L.check('control: Stats CSV has ' + s2.runs + ' data rows, one for the replaced run with 120 ft', csv && csv.length === s2.runs + 1 && csv.slice(1).filter(r => Number(r[3]) === 120).length === 1, csv && JSON.stringify(csv.slice(0, 6)));
  // ---- B: Records row → Mark Sent → Download PDF: the PDF numbers equal the record's ----
  await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(400);
  const row = await page.evaluate((id) => { const A = window.__debugGetArchive(); const i = A.findIndex(e => e.id === id); const r = document.querySelectorAll('#archiveList .pb-arch-row')[i]; return r ? r.innerText.replace(/\s+/g, ' ') : ''; }, id2);
  console.log('   row:', row.slice(0, 300));
  await page.evaluate((id) => pbArchiveTap('pbToggleArchiveSent', id), id2); await page.waitForTimeout(600); await L.dismiss(page);
  const sent = await page.evaluate((id) => window.__debugGetArchive().find(e => e.id === id).sent, id2);
  L.check('control: Mark Sent on the replaced run sets sent', sent === true);
  const pdf = await sink(page, 'pbArchiveTap(\'pbDownloadArchivePDF\', ' + JSON.stringify(id2) + ')', 'run_replaced.pdf');
  const X = pdf ? pdfText(pdf).replace(/\s+/g, ' ') : '';
  console.log('   pdf:', X.slice(0, 400));
  L.check('control: the run PDF carries the corrected end invert 99.10 and 120 ft, never the replaced 99.00', pdf && /99\.10/.test(X) && /120(\.0+)? ft/.test(X) && !/99\.00/.test(X.replace(/100\.00/g, '')), X.slice(0, 300));
  const rowFoot = (row.match(/(\d+\.\d) ft/) || [])[1];
  L.check('control: the Records row footage (' + rowFoot + ') is on the PDF', rowFoot && X.indexOf(rowFoot) >= 0);
  await page.screenshot({ path: SH + 'b_records_replaced.png' });
  // ---- C: the Management report form ----
  await L.dismiss(page); await page.evaluate(() => pbOpenReportIssue()); await page.waitForTimeout(500);
  const named = await page.evaluate(() => document.getElementById('screen-reportIssue').innerText);
  await page.click('#riAnonToggle button[data-val="anon"]'); await page.waitForTimeout(300);
  const anon = await page.evaluate(() => document.getElementById('screen-reportIssue').innerText);
  const cnt = (s) => (s.match(/For anything urgent, call\./g) || []).length;
  console.log('   urgent-call lines: named', cnt(named), 'anon', cnt(anon));
  L.check('W1 with Anonymous picked "For anything urgent, call." is said once', cnt(anon) === 1);
  L.check('control: with My Name it is said once', cnt(named) === 1);
  await page.screenshot({ path: SH + 'c_report_anon.png', fullPage: true });
  const dest = await page.evaluate(() => document.getElementById('riDestLine').innerText.replace(/\s+/g, ' '));
  console.log('   dest line:', dest);
  // offline save path: Save Without Sending while signed out
  await page.selectOption('#riCategory', 'Equipment'); await page.fill('#riDescription', 'Night probe: excavator track pad cracked, bay 3.');
  await page.click('#riSaveOnlyBtn'); await page.waitForTimeout(1200);
  m = await H.modal(page); if (m) console.log('   save-only modal:', JSON.stringify(m).slice(0, 300));
  const active = await page.evaluate(() => (document.querySelector('.pb-screen.active') || {}).id);
  const rep = await page.evaluate(() => { const r = window.__debugGetArchive().filter(e => e.kind === 'report'); const e = r.find(x => /track pad/.test(x.reportText || '')) || null; return e ? { cat: e.category, del: e.delivery, sent: e.sent, txt: (e.reportText || '').slice(0, 400), anon: e.anonymous } : null; });
  console.log('   after Save Without Sending: screen', active, JSON.stringify(rep).slice(0, 500));
  L.check('control: Save Without Sending stores an Equipment report (saved, not sent)', rep && rep.cat === 'Equipment' && !rep.sent);
  L.check('control: the stored report text names the category and the description', rep && /EQUIPMENT/i.test(rep.txt) && /track pad cracked/.test(rep.txt), rep && rep.txt);
  await L.dismiss(page); await page.screenshot({ path: SH + 'c_receipt.png', fullPage: true });
  // ---- D: Education articles ----
  const ids = ['refRod', 'refPipeDiagram', 'refSlope', 'refBends', 'refFlowVolume', 'refTrench', 'refPipe', 'refConfined', 'refConcrete', 'refSafety', 'refCutsheet', 'refGlossary'];
  const bad = [], tools = [];
  for (const id of ids) {
    await L.dismiss(page); await page.evaluate((id) => pbEduOpen(id), id); await page.waitForTimeout(350);
    const r = await page.evaluate((id) => { const sc = document.getElementById('screen-' + id); const ok = sc && sc.classList.contains('active'); const btns = [...sc.querySelectorAll('.pb-edu-bar button, button[onclick*="pbEduOpenToolKeep"]')].map(b => b.textContent.trim()); const over = document.documentElement.scrollWidth > window.innerWidth + 1; return { ok, btns, over, w: document.documentElement.scrollWidth }; }, id);
    if (!r.ok || r.over) bad.push(id + ':' + JSON.stringify(r));
    tools.push(id + ':' + r.btns.join('/'));
  }
  console.log('   edu tools:', tools.join(' | '));
  L.check('control: every Education article opens at 390 px with no sideways scroll', bad.length === 0, bad.join(' '));
  // tool buttons: each opens its calculator screen
  const toolFails = await page.evaluate(() => { const out = []; for (const k of ['rodElev', 'slopeConv', 'frac', 'lift', 'bedding', 'trench', 'vent', 'pipeWeight', 'manning', 'flow', 'volume', 'bend', 'manhole']) { try { pbEduOpenToolKeep(k); } catch (e) { out.push(k + ':throw ' + e.message); continue; } const a = (document.querySelector('.pb-screen.active') || {}).id; const ov = document.getElementById('pbModalOverlay'); const modal = ov && getComputedStyle(ov).display !== 'none' ? document.getElementById('pbModalMessage').textContent.slice(0, 80) : ''; if (!/Calc|calc/.test(a) || modal) out.push(k + ':' + a + (modal ? ' modal=' + modal : '')); } return out; });
  L.check('control: all 13 article tool links open a calculator screen', toolFails.length === 0, toolFails.join(' | '));
  L.check('no JS errors', page._errors.length === 0, page._errors.join(' | '));
  await browser.close();
})();
