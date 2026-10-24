// feat_pdf (r15.27): the real PDFs, checked on their bytes and text (pdftotext), not on mocked jsPDF calls.
// F1 closeout reason label once; F2 the grade-sheet legend never opens a page without its lead; F3 "≈" prints as
// "approx." (no "?" and no replaced-characters note); F6 the footer keeps "Generated <time>" and the exporter's address;
// F7 a plan category key is never printed raw. (F4/F5 are covered by t_manual / t_daily copies in this folder.)
const L = require('/home/claude/test/lib.js');
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pbrender-'));
const pdfText = (f) => execFileSync('pdftotext', ['-layout', f, '-']).toString();
const pages = (f) => pdfText(f).split('\f').filter(p => p.trim());
(async () => {
  const browser = await L.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 400, height: 900 }, acceptDownloads: true, timezoneId: 'America/Denver' });
  await ctx.addInitScript(() => { localStorage.setItem('lastKnownUserId', 'uRnd'); localStorage.setItem('uRnd:cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active', companyName: 'Render Co' })); });
  const page = await L.newPage(browser, 'uRnd', ctx);
  const sink = async (fn, arg, name) => {
    await page.evaluate(() => { window.__pdfData = null; window.__debugPdfSink = (d) => { window.__pdfData = d; }; });
    await page.evaluate(fn, arg);
    for (let i = 0; i < 60 && !(await page.evaluate(() => !!window.__pdfData)); i++) await page.waitForTimeout(250);
    const d = await page.evaluate(() => window.__pdfData); await page.evaluate(() => { window.__debugPdfSink = null; });
    if (!d) { L.check('PDF produced: ' + name, false); return null; }
    const f = path.join(TMP, name); fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); return f;
  };
  // ---- a run whose grade-sheet legend has to move to a new page: many rows (interval 5 over 300 ft) ----
  const id = await L.lockRun(page, { dist: 300, stats: true }); // interval 10 -> 31 rows: the legend lands on the next page
  await page.evaluate(() => pbGoto('archive')); await page.waitForTimeout(300);
  const runIdx = () => `window.__debugGetArchive().findIndex(e => e.id === ${id})`;
  const f1 = await sink((s) => pbDownloadArchivePDF(eval(s)), runIdx(), 'run.pdf');
  if (f1) {
    const P = pages(f1), t = pdfText(f1).replace(/\s+/g, ' ');
    L.check('run: the grade-sheet legend is printed', /Source: Stake \/ Invert = a point entered on the run form/.test(t));
    const opens = P.filter(p => /^\s*Source: Stake \/ Invert = a point entered/m.test(p) && !/Grade sheet: interval and layout rows/.test(p.split('Source: Stake')[0]));
    // F2: on any page where the legend is the first thing after the header, its lead line is right above it
    const bad = opens.filter(p => { const i = p.indexOf('Source: Stake'); const above = p.slice(0, i); return !/Grade sheet legend \(the table is on the previous page\)/.test(above) && !/\d\+\d\d\.\d\d/.test(above); });
    L.check('F2: a legend that opens a page has its lead line ("Grade sheet legend (the table is on the previous page)") above it [' + opens.length + ' such page(s)]', bad.length === 0);
    L.check('F6: every footer keeps "Generated <date>" (' + P.length + ' pages)', P.every(p => /Generated [A-Z][a-z]{2} \d{1,2}, 20\d\d/.test(p)));
    L.check('no replaced-characters note on any page', !/could not be printed in this PDF/.test(t));
  }
  // ---- a permit: closeout reason once ----
  await page.evaluate(() => pbGoto('confinedPermit')); await page.waitForTimeout(300);
  for (const [k, v] of [['cpJobsite', 'Render Job'], ['cpJobNumber', 'J-9'], ['cpAddress', '9 St'], ['cpSpace', 'MH-9'], ['cpPurpose', 'Inspect'], ['cpDate', '2026-09-30'], ['cpStart', '00:00'], ['cpEnd', '23:30'], ['cpAtmoInterval', '15'], ['cpHazards', 'H2S'], ['cpControls', 'plug'], ['cpVentFail', 'monitor'], ['cpMinO2', '19.5'], ['cpMaxLEL', '10'], ['cpRescue', 'Fire dept'], ['cpComms', 'voice'], ['cpSupervisor', 'Sam Super'], ['cpSupervisorInitials', 'SS'], ['cpAttendant', 'Ava Attend']]) await page.fill('#' + k, v);
  await page.click('button[onclick="pbLockConfinedPermit()"]'); await page.waitForSelector('#screen-confinedActive.active'); await page.waitForTimeout(300); await L.dismiss(page);
  await page.evaluate(() => pbCloseConfinedPermit()); await page.waitForTimeout(1500); await L.dismiss(page); await page.waitForTimeout(300); await L.dismiss(page);
  await page.evaluate(() => pbGoto('archive')); await page.waitForTimeout(300);
  const pIdx = await page.evaluate(() => window.__debugGetArchive().findIndex(e => e.kind === 'confined'));
  if (pIdx >= 0) {
    const fp = await sink((i) => pbDownloadArchivePDF(i), pIdx, 'permit.pdf');
    if (fp) { const t = pdfText(fp).replace(/\s+/g, ' '); L.check('F1: the closeout table says "Reason <reason>" once, never "Closeout reason: Closeout reason"', /Reason\s+(Completed Normally|not recorded)/.test(t) && !/Closeout reason: Closeout reason/.test(t) && !/Closeout reason\s+Closeout reason/.test(t)); }
  } else L.check('setup: a closed permit exists', false);
  // ---- the renderer itself (test hook __debugRptMake): F2 forced, F3, F6, F7 ----
  const probe = await page.evaluate(() => {
    const G = window.__debugRptG, LEG = 'Source: Stake / Invert = a point entered on the run form. '.repeat(6);
    const doc = window.__debugRptMake((R) => {
      R.beginRecord({ company: 'Render Co', type: 'Probe', title: 'Probe', job: 'x', recordId: 'daily rep-3 (phone record d9ea2e4d-53d0-4d56-8c7d-b8d0a3f43274)', version: 'v1 · rev 1de6e865', fp: 'a'.repeat(64), fpShort: 'a'.repeat(16), generated: 'Oct 23, 2026 8:00 PM MDT', account: 'frank.ortiz@example.test (foreman at DIG Civil Construction)', build: 'The Pipelayer\u2019s Bible r15.27 \u00b7 2026-10-23' });
      R.para('Est ≈ 11.11 yd³ and ' + window.__debugProdCatName('thrust_blocks', null) + ' and ' + window.__debugProdCatName('_eq_other', null) + ' and ' + window.__debugProdCatName('_equiphours', null));
      R.y = G.BOTTOM - 12; // almost no room: a kept legend must move to page 2, with its lead
      R.para(LEG, { size: 9, keep: true, lead: 'Legend lead line' });
    }, {});
    return { data: doc.output('datauristring'), replaced: !!(doc.__pbReplaced && doc.__pbReplaced.size) };
  });
  const fq = path.join(TMP, 'probe.pdf'); fs.writeFileSync(fq, Buffer.from(probe.data.split(',')[1], 'base64'));
  const PQ = pages(fq), tq = pdfText(fq).replace(/\s+/g, ' ');
  L.check('F2 (forced): the kept paragraph moved to page 2 and page 2 opens with its lead line', PQ.length === 2 && /Legend lead line\s+Source: Stake/.test(PQ[1].replace(/\s+/g, ' ')) && !/Source: Stake/.test(PQ[0]));
  L.check('F3: "≈" prints as "approx.", nothing replaced with "?"', /Est approx\. 11\.11 yd³/.test(tq) && !/\?/.test(tq) && !probe.replaced);
  L.check('F7: an unknown plan key is humanized ("Thrust blocks"); known keys keep their names', /Thrust blocks and Other equipment and Equipment hours/.test(tq));
  L.check('F6: footer shows the shortened phone record (d9ea2e4d…), the version and "Generated <date>"', /Record daily rep-3 \(phone record d9ea2e4d…\) · v1 · rev 1de6e865 · Generated [A-Z][a-z]{2} \d{1,2}, 20\d\d/.test(tq));
  L.check('F6: footer keeps the exporter\'s address whole (the role in parentheses is dropped, not the address)', /Exported by: frank\.ortiz@example\.test/.test(tq) && !/example\.te…/.test(tq));
  await browser.close();
  if (!process.env.KEEP) fs.rmSync(TMP, { recursive: true, force: true });
})();
