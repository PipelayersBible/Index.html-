// Pass-12 review. pbCarriedGasNote now picks the LAST measured gas before a blank retest
// by order stamp alone. Two earlier tests from two different places (tabs/page loads)
// that never saw each other: a SAFE H2S 2 from tab B whose stamp ran ahead (its clock was
// fast earlier, then fixed: stamped 10:40, clock 10:05), and a HAZARD H2S 15 from tab A at
// 10:20 (stamp = clock). Which came first is unknown, so the app's fail-safe rule
// (pbLatestMeasuredGases / pbObsSupersedes) keeps the hazard: the live latch stays UNSAFE.
// A blank-H2S retest follows (this tab, it saw both). The closeout report/PDF judge
// "not retested" with pbCarriedGasNote, which takes the SAFE 2 (higher stamp) and prints the
// blank retest as a clean reading: the record contradicts the latch and hides the hazard.
// Base build (clock times) flags it NOT CLEARED. Control: B's stamp not ahead (10:05).
const L = require('/home/claude/test/lib.js'); const fs = require('fs'); const { execSync } = require('child_process');
const TMP = '/tmp/claude-0/-home-claude/301429b0-ad8e-5cc1-a9ea-816c5040b6d3/scratchpad';
async function permit(page) {
  await page.evaluate(() => pbGoto('confinedPermit')); await page.waitForTimeout(300);
  for (const [id,v] of [['cpJobsite','GAS'],['cpAddress','1 St'],['cpSpace','Sewer MH'],['cpPurpose','T'],['cpDate','2026-10-03'],['cpStart','00:00'],['cpEnd','23:59'],['cpAtmoInterval','60'],['cpCommInterval','15'],['cpHazards','h'],['cpControls','c'],['cpVentFail','v'],['cpMinO2','19.5'],['cpMaxLEL','10'],['cpRescue','911'],['cpComms','r'],['cpSupervisor','S'],['cpSupervisorInitials','S'],['cpAttendant','Att']]) await page.fill('#' + id, v);
  await page.click('button[onclick="pbLockConfinedPermit()"]'); await page.waitForTimeout(600); await L.dismiss(page);
}
const air = async (page, h2s) => { await page.evaluate((h) => { document.getElementById('cpAtmoAddForm').style.display=''; document.getElementById('cpAtmoTester').value='T'; document.getElementById('cpAtmoO2').value='20.9'; document.getElementById('cpAtmoLEL').value='0'; document.getElementById('cpAtmoH2S').value=h; document.getElementById('cpAtmoCO').value=''; return pbSaveAtmoReading(); }, h2s); await page.waitForTimeout(500); await L.dismiss(page); };
const T0 = new Date('2026-10-03T10:00:00Z').getTime(), M = 60000;
(async () => { const browser = await L.chromium.launch();
  try {
  for (const ahead of [false, true]) {
    const tag = ahead ? 'safe test stamped ahead' : 'control';
    const page = await L.newPage(browser, 'uRBc1' + (ahead ? 'a' : 'c')); await page.clock.install({ time: T0 }); await page.reload(); await page.waitForTimeout(800); await L.dismiss(page); await permit(page);
    // Two earlier tests from two other places, merged into this permit's log (as a merge of another tab's save would).
    await page.evaluate(([T0, M, ahead]) => {
      const log = window.__debugGetAtmoLog();
      log.push({ o2: 20.9, lel: 0, h2s: 2, co: null, other: '', tester: 'Bsafe', time: new Date(T0 + 5 * M), gasTimes: { h2s: T0 + (ahead ? 40 : 5) * M, co: null }, order: T0 + (ahead ? 40 : 5) * M, by: 'tabB', seen: {}, confirmed: true });
      log.push({ o2: 20.9, lel: 0, h2s: 15, co: null, other: '', tester: 'Ahaz', time: new Date(T0 + 20 * M), gasTimes: { h2s: T0 + 20 * M, co: null }, order: T0 + 20 * M, by: 'tabA', seen: {}, confirmed: true });
    }, [T0, M, ahead]);
    await page.clock.setFixedTime(T0 + 30 * M); await air(page, '');   // 10:30 blank-H2S retest in this tab
    const st = await page.evaluate(() => ({ n: window.__debugGetAtmoLog().length, ban: getComputedStyle(document.getElementById('cpUnsafeBanner')).display !== 'none' }));
    L.check(tag + ': three tests logged and the live latch says UNSAFE (H2S 15 kept by the fail-safe rule)', st.ban && st.n === 3);
    await page.evaluate(() => pbCloseConfinedPermit()); await page.waitForTimeout(1500); await L.dismiss(page);
    const rt = await page.evaluate(() => { const e = window.__debugGetArchive().find(x => x.kind === 'confined'); return e && e.reportText; });
    const blankLine = (rt || '').split('\n').find(l => /Tester: T —/.test(l)) || '';
    L.check(tag + ': closeout text report flags the blank retest NOT CLEARED (H2S 15 not retested): "' + blankLine.slice(0, 200) + '"', /NOT CLEARED/.test(blankLine) && /15 ppm/.test(blankLine));
    await page.evaluate(() => { window.__pdf = null; window.__debugPdfSink = (d) => { window.__pdf = d; }; pbGoto('archive'); const i = window.__debugGetArchive().findIndex(x => x.kind === 'confined'); return pbDownloadArchivePDF(i); }); await page.waitForTimeout(1500);
    const d = await page.evaluate(() => window.__pdf); const f = TMP + '/rBc1' + (ahead ? 'a' : 'c') + '.pdf'; fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));
    const pdf = execSync(`python3 -c "from pypdf import PdfReader; print(' '.join(' '.join(p.extract_text().split()) for p in PdfReader('${f}').pages))"`).toString();
    L.check(tag + ': closeout PDF says H2S was not retested on the blank retest', /not retested/i.test(pdf));
    L.check(tag + ': no JS errors', page._errors.length === 0); if (page._errors.length) console.log(page._errors);
    await page._ctx.close();
  }
  } finally { await browser.close(); }
})();
