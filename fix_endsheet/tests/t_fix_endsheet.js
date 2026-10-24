// fix_endsheet: both owner reports (LIVE r14.2, iPhone Home Screen app, company pipelayer). Must FAIL on the base
// (r14.2 / r15 chain) and PASS with fix_endsheet. Company pipelayer as the live server answers (es_lib/real_member).
// Run (inside the lock, >= 2 GB free): /home/claude/batch29/ROLES/tests/run_t.sh <site> <this file> [port]
const { R, M, E, setup, LINKS } = require('./es_lib.js');
const check = (l, c, d) => { console.log((c ? 'OK  ' : '*** FAIL ***') + ' - ' + l + (c || d === undefined ? '' : ' :: ' + String(d).slice(0, 400))); if (!c) process.exitCode = 1; };
const sleep = (p, ms) => p.waitForTimeout(ms);
const vis = (p, id) => p.evaluate((i) => { const el = document.getElementById(i); if (!el) return false; let x = el; while (x) { if (x.hidden || getComputedStyle(x).display === 'none') return false; x = x.parentElement; } return el.getBoundingClientRect().height > 0; }, id);
const sizes = (p) => p.evaluate(() => { const box = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { h: b.height, w: b.width, fs: parseFloat(getComputedStyle(el).fontSize) }; };
  const extra = document.querySelector('#pbModalDialog .pb-modal-extra'), W = extra ? extra.getBoundingClientRect().width : 0;
  const pointCtl = document.querySelector('.pb-fx-st-row') || document.getElementById('pbEaPoint'), dayCtl = document.querySelector('.pb-fx-days button') || document.getElementById('pbEaDay');
  const dayWrap = document.querySelector('.pb-fx-days') || document.getElementById('pbEaDay');
  return { W, point: box(pointCtl), day: box(dayCtl), dayWrap: box(dayWrap), time: box(document.getElementById('pbEaTime')), help: document.querySelectorAll('#pbModalDialog .pb-modal-extra details, #pbModalDialog .pb-modal-extra a').length, ps: [...document.querySelectorAll('#pbModalDialog .pb-modal-extra p')].filter(x => x.id !== 'pbEaPointHelp' && !x.closest('details')).length, laid: document.querySelectorAll('.pb-fx-st-row.laid').length }; });
const big = (b, W) => !!b && b.h >= 48 && b.fs >= 16 && (W ? b.w >= W - 2 : true);
const pdfSink = (p) => p.evaluate(() => { window.__pdfData = null; window.__debugPdfSink = (d) => { window.__pdfData = d; }; });
const pdfGot = async (p) => { for (let i = 0; i < 40; i++) { const n = await p.evaluate(() => window.__pdfData ? window.__pdfData.length : 0); if (n) return n; await sleep(p, 250); } return 0; };
const reportShown = (p, id) => p.evaluate((id) => { if ((document.querySelector('.pb-screen.active') || {}).id !== 'screen-archive') return ''; const i = window.__debugGetArchive().findIndex(e => e.id === id); const pre = document.getElementById('archiveView' + i); return pre && getComputedStyle(pre).display !== 'none' ? pre.textContent : ''; }, id);
async function ownerRun(browser, o) { // Tue Oct 20 6:22 PM lock (510 ft), rows marked laid to 140.0 at 9:47 PM, Wed 4:26 AM
  const { ctx, page } = await setup(browser, Object.assign({ extra: LINKS, clock: '2026-10-20T18:22:00' }, o || {}));
  const id = await M.lockRun(page, { dist: 510 }); await M.dismiss(page);
  await page.clock.fastForward((3 * 60 + 25) * 60000); await page.evaluate(() => { for (let i = 1; i <= 14; i++) pbLaidMark(i); }); await sleep(page, 1500);
  await page.evaluate(() => pbGoto('home')); await page.clock.fastForward((6 * 60 + 39) * 60000);
  return { ctx, page, id };
}
const saveLbl = async (p) => ((await E.buttons(p)).find(b => /^Save/.test(b)) || 'Save End');
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  try {
    // ================= 1. the sheet, the owner's case =================
    { const { ctx, page, id } = await ownerRun(browser);
      try {
        check('plan: company pipelayer (contractor through the company)', await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('acctP:cachedSubscription') || 'null'); return !!c && c.companyRole === 'pipelayer' && c.tier === 'contractor'; }));
        await E.openRun(page); await sleep(page, 1500);
        check('Wed 4:26 AM: "Where Did This Run End?"', (await E.title(page)) === 'Where Did This Run End?', await E.title(page));
        const msg = await E.message(page);
        check('one short line: "Run started Tue 6:22 PM and was never ended. Laid to 140.0 (9:47 PM)."', msg === 'Run started Tue 6:22 PM and was never ended. Laid to 140.0 (9:47 PM).', msg);
        const Z = await sizes(page);
        check('no other paragraphs; at most one small help link', Z.ps <= 1 && Z.help <= 1, JSON.stringify(Z));
        check('station control: >= 48 px tall, >= 16 px text, full width (rows inside the list box)', big(Z.point, Z.W - 16), JSON.stringify(Z.point) + ' W=' + Z.W);
        check('day control: >= 48 px tall, >= 16 px text, full width', big(Z.day) && Z.dayWrap && Z.dayWrap.w >= Z.W - 2, JSON.stringify(Z.day) + ' ' + JSON.stringify(Z.dayWrap));
        check('time field: >= 48 px tall, >= 16 px text, full width', big(Z.time, Z.W), JSON.stringify(Z.time));
        check('no horizontal page scroll at 390', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const F = await E.fields(page);
        check('default point: 140.0, the furthest row marked laid (not 510.0)', F.point === await E.keyOf(page, 14), JSON.stringify([F.point, F.pointText]));
        check('default day: Tue Oct 20, the day of the last activity (not today)', F.day === '2026-10-20', F.day);
        check('default time: blank, to be chosen (never "now minus 2 h")', F.time === '', F.time);
        check('laid rows are shown as laid in the station list (14 laid, 140.0 "Laid to here")', await page.evaluate(() => document.querySelectorAll('.pb-fx-st-row.laid').length >= 14 && /Laid to here/.test((document.querySelector('.pb-fx-st-row[aria-checked="true"]') || {}).textContent || '')));
        const h0 = await page.evaluate(() => { const h = document.getElementById('pbEaPointHelp'); return h && getComputedStyle(h).display !== 'none' ? h.textContent : ''; });
        check('hint while 140.0 is still chosen: "Suggested: 140.0, the furthest row marked laid."', h0 === 'Suggested: 140.0, the furthest row marked laid.', h0);
        await page.evaluate(() => { const b = [...document.querySelectorAll('.pb-fx-st-row')].find(x => /^200\.0/.test(x.textContent.trim())); if (b) b.click(); else { const s = document.getElementById('pbEaPoint'); s.value = [...s.options].find(o => /^200\.0/.test(o.textContent)).value; s.dispatchEvent(new Event('change')); } }); await sleep(page, 200);
        const h1 = await page.evaluate(() => { const h = document.getElementById('pbEaPointHelp'); return h && getComputedStyle(h).display !== 'none' ? h.textContent.trim() : ''; });
        check('200.0 chosen: the point is 200.0 and the hint no longer claims "furthest row marked laid"', (await E.fields(page)).point === await E.keyOf(page, 20) && !/furthest row marked laid/.test(h1), h1);
        check('buttons: Save End / Not Now (no Still Working: last activity over 10 h ago)', JSON.stringify(await E.buttons(page)) === '["Save End","Not Now"]', JSON.stringify(await E.buttons(page)));
        // the existing limits, through the new controls
        await page.evaluate(() => { const b = [...document.querySelectorAll('.pb-fx-st-row')].find(x => /^140\.0/.test(x.textContent.trim())); if (b) b.click(); else { const s = document.getElementById('pbEaPoint'); s.value = [...s.options].find(o => /^140\.0/.test(o.textContent)).value; } }); await sleep(page, 100);
        await page.evaluate(() => { const b = [...document.querySelectorAll('.pb-fx-days button')].find(x => /Today/.test(x.textContent)); if (b) b.click(); else document.getElementById('pbEaDay').value = '2026-10-21'; }); await sleep(page, 100);
        await page.fill('#pbEaTime', '05:00'); await E.tap(page, await saveLbl(page)); await sleep(page, 400);
        check('Today 5:00 AM (still to come): refused, nothing recorded', (await E.title(page)) === 'Check Where It Ended' && /still to come/.test(await E.message(page)) && !(await E.runOf(page, id)).endEntry);
        await E.tap(page, 'Back'); await sleep(page, 400);
        const Fb = await E.fields(page);
        check('Back keeps the answer (140.0, today, 05:00), and the day buttons show it', Fb.point === await E.keyOf(page, 14) && Fb.day === '2026-10-21' && Fb.time === '05:00' && await page.evaluate(() => !document.querySelector('.pb-fx-days') || /Today/.test((document.querySelector('.pb-fx-days button[aria-checked="true"]') || {}).textContent || '')));
        await page.evaluate(() => { const b = [...document.querySelectorAll('.pb-fx-days button')].find(x => /Yesterday/.test(x.textContent)); if (b) b.click(); else document.getElementById('pbEaDay').value = '2026-10-20'; }); await sleep(page, 100);
        await page.fill('#pbEaTime', '18:00'); await E.tap(page, await saveLbl(page)); await sleep(page, 400);
        check('Tue 6:00 PM (before the 6:22 PM start): refused', (await E.title(page)) === 'Check Where It Ended' && /before the run started/.test(await E.message(page)));
        await E.tap(page, 'Back'); await sleep(page, 400);
        await page.fill('#pbEaTime', '21:50'); await E.tap(page, await saveLbl(page)); await sleep(page, 1800);
        const r = await E.runOf(page, id);
        check('Tue 9:50 PM at 140.0: recorded, "entered next day at 4:26 AM"', (await E.title(page)) === 'End Recorded' && /work ended at 140\.0, Tue, Oct 20 at 9:50 PM \(entered next day at 4:26 AM\)/.test(await E.message(page)) && r.incomplete && r.dist === 140 && /Oct 20 2026 21:50/.test(r.end) && r.endEntry && r.endEntry.via === 'next_day' && r.endEntry.fromLaid === true, JSON.stringify(r.endEntry));
        await E.tap(page, 'Not Today'); await sleep(page, 1000);
        // ================= 2. the report after the END sheet =================
        check('Home after the end: "Run ended" with View Report and Save PDF', (await E.screen(page)) === 'screen-home' && await vis(page, 'homeRunReportView') && await vis(page, 'homeRunReportPdf'));
        await page.evaluate(() => { const b = document.getElementById('homeRunReportView'); if (b) b.click(); }); await sleep(page, 1200);
        const txt = await reportShown(page, id);
        check('View Report: Reports > Archive, that run\'s report open ("RUN RECORD … entered next day")', /RUN RECORD/.test(txt) && /entered next day at 4:26 AM/.test(txt), txt.slice(0, 200));
        await page.evaluate(() => pbGoto('home')); await sleep(page, 600); await pdfSink(page);
        await page.evaluate(() => { const b = document.getElementById('homeRunReportPdf'); if (b) b.click(); });
        check('Save PDF from Home: the run\'s PDF is made', (await pdfGot(page)) > 1000);
        await page.evaluate(() => { const b = document.getElementById('homeRunReportDismiss'); if (b) b.click(); }); await sleep(page, 300);
        check('Dismiss: the line goes', !(await vis(page, 'homeRunReport')));
        errs.push(...page._errors);
      } catch (e) { check('SCRIPT ERROR ' + String(e && e.stack).slice(0, 300), false); } finally { await ctx.close(); }
    }
    // ================= 3. a company pipelayer, End Run as normal: Results and Home =================
    { const { ctx, page } = await setup(browser, { extra: LINKS });
      try {
        const id = await M.lockRun(page); await M.dismiss(page);
        await page.evaluate(() => pbLaidMark(4)); await sleep(page, 500);
        check('Results (pipelayer): View Report and Save PDF are offered', await vis(page, 'pbFxResView') && await vis(page, 'pbFxResPdf'));
        await page.evaluate(() => { const b = document.getElementById('pbFxResView'); if (b) b.click(); }); await sleep(page, 1000);
        check('Results > View Report: the run\'s report in the Archive', /RUN RECORD/.test(await reportShown(page, id)));
        await page.evaluate(() => pbResumeLastRunResults()); await sleep(page, 800); await M.dismiss(page);
        await page.evaluate(() => pbEndRun()); await sleep(page, 1800); await M.dismiss(page);
        check('End Run: ended, Home', (await E.screen(page)) === 'screen-home' && (await E.runOf(page, id)).completed);
        check('Home after End Run: View Report / Save PDF for that run', await vis(page, 'homeRunReportView') && await vis(page, 'homeRunReportPdf'));
        await page.evaluate(() => { const b = document.getElementById('homeRunReportView'); if (b) b.click(); }); await sleep(page, 1200);
        check('View Report after End Run: the run\'s report, open', /RUN RECORD/.test(await reportShown(page, id)));
        await pdfSink(page); await page.evaluate((id) => pbArchiveTap('pbDownloadArchivePDF', id), id);
        check('Archive Download PDF still works for the pipelayer', (await pdfGot(page)) > 1000);
        errs.push(...page._errors);
      } catch (e) { check('SCRIPT ERROR ' + String(e && e.stack).slice(0, 300), false); } finally { await ctx.close(); }
    }
    // ================= 4. iPhone Home Screen app: the PDF goes to the share sheet =================
    { const { ctx, page } = await setup(browser, { extra: LINKS, init: () => { Object.defineProperty(navigator, 'standalone', { configurable: true, get: () => true }); navigator.canShare = () => true; navigator.share = async (d) => { (window.__shared = window.__shared || []).push((d.files || []).map(f => [f.name, f.type, f.size])); }; } });
      try {
        const id = await M.lockRun(page); await M.dismiss(page);
        await page.evaluate(() => pbEndRun()); await sleep(page, 1800); await M.dismiss(page);
        await page.evaluate((id) => pbArchiveTap('pbDownloadArchivePDF', id), id);
        let sh = null; for (let i = 0; i < 40 && !sh; i++) { sh = await page.evaluate(() => window.__shared || null); if (!sh) await sleep(page, 250); }
        check('Home Screen app: Download PDF hands the run PDF to the share sheet (not a browser download)', !!sh && sh.length === 1 && /\.pdf$/.test(sh[0][0][0]) && sh[0][0][1] === 'application/pdf' && sh[0][0][2] > 1000, JSON.stringify(sh));
        await page.evaluate(() => { window.__shared = null; pbGoto('home'); }); await sleep(page, 600);
        await page.evaluate(() => { const b = document.getElementById('homeRunReportPdf'); if (b) b.click(); });
        sh = null; for (let i = 0; i < 40 && !sh; i++) { sh = await page.evaluate(() => window.__shared || null); if (!sh) await sleep(page, 250); }
        check('Home Screen app: Home > Save PDF goes to the share sheet too', !!sh && /\.pdf$/.test(sh[0][0][0]), JSON.stringify(sh));
        errs.push(...page._errors);
      } catch (e) { check('SCRIPT ERROR ' + String(e && e.stack).slice(0, 300), false); } finally { await ctx.close(); }
    }
    // ================= 5. individual plan: unchanged (Save to Phone, no new line) =================
    { const { ctx, page } = await setup(browser, { real: false, uid: 'acctP', extra: { __tier: 'individual', __member: '0' }, sub: { tier: 'individual', status: 'active' } });
      try {
        const id = await M.lockRun(page); await M.dismiss(page);
        check('individual: Results has Save to Phone, not the Archive report buttons', await vis(page, 'saveToPhoneWrap') && !(await vis(page, 'pbFxResReport')));
        await page.evaluate(() => pbEndRun()); await sleep(page, 1800); await M.dismiss(page);
        check('individual: Home has its Save to Phone offer, not the Archive report line', await vis(page, 'homeSaveOffer') && !(await vis(page, 'homeRunReport')));
        errs.push(...page._errors);
      } catch (e) { check('SCRIPT ERROR ' + String(e && e.stack).slice(0, 300), false); } finally { await ctx.close(); }
    }
    check('no page errors', errs.length === 0, errs.join(' / '));
  } finally { await browser.close(); }
})();
