// Batch 29 ROLES (owner, Oct 21): "Fix this wording on foreman reported progress. It isn't supposed to be entered from the
// run results screen." The empty Job Summary sections (on screen and in its PDF) and My production say who enters it, by
// role. Must FAIL on the base (r15 without ROLES) and PASS with ROLES.
// Run (inside the lock, >= 2 GB free): PB_TEST_DIR=<site> PB_TEST_PORT=<port> /home/claude/test/run.sh <this file> 600
const R = require('./roles_lib.js'); const { M, text, waitFor, iso } = R;
const check = (l, c, d) => { console.log((c ? 'OK  ' : '*** FAIL ***') + ' - ' + l + (c || d === undefined ? '' : ' :: ' + String(d).slice(0, 400))); if (!c) process.exitCode = 1; };
const LINK = { foreman: 'acctF', pipelayer: 'acctP', by: 'acctP', started: iso(Date.now() - 2 * 86400000) };
async function pdfText(page) {
  const fs = require('fs'), cp = require('child_process'), os = require('os'), path = require('path');
  try {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.evaluate(() => pbDownloadJobSummaryPDF(document.getElementById('jobSummaryPicker').value))]);
    const f = path.join(os.tmpdir(), 'pbrw_' + Date.now() + '.pdf'); await dl.saveAs(f);
    const t = cp.execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }); try { fs.unlinkSync(f); } catch (e) {} return t.replace(/\s+/g, ' ');
  } catch (e) { return 'NO PDF: ' + e.message; }
}
async function summary(page) {
  await page.evaluate(() => { pbOpenJobSummary(); const p = document.getElementById('jobSummaryPicker'); if (p) { const o = [...p.options].find(x => x.value === '24-101'); if (o) p.value = '24-101'; } renderJobSummary(); });
  await page.waitForTimeout(500);
  return { prod: await text(page, 'jsProdEmpty'), crew: await text(page, 'jsCrewEmpty'), all: await page.evaluate(() => (document.getElementById('jobSummaryContent') || {}).textContent || '') };
}
const cases = [
  { name: 'company pipelayer (linked to Frank Ortiz)', o: { uid: 'acctP', role: 'pipelayer', extra: { __psrv: { entries: {}, plans: {}, links: [LINK] } } }, wait: true,
    want: 'Entered by your foreman (Frank Ortiz). Nothing reported yet for this job.', mine: 'Production and crew hours are entered by your foreman: Frank Ortiz.' },
  { name: 'foreman', o: { uid: 'acctF', role: 'foreman' }, want: 'Nothing entered yet. Add it from your crew’s runs (Crew list), or with Work Without a Run.', mine: 'Nothing entered yet. Add it from your crew’s runs (Crew list), or with Work Without a Run.' },
  { name: 'manager / company side', o: { uid: 'acctM', role: 'foreman', extra: { __manager: '1' } }, want: 'Nothing reported by foremen yet for this job.', mine: 'Nothing reported by foremen yet.' },
  { name: 'individual account (no company)', o: { uid: 'acctI', role: 'pipelayer', member0: true, sub: { tier: 'individual', status: 'active' } }, want: 'Nothing entered yet. Add it from a run’s production log after you end it.', mine: null }
];
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  for (const c of cases) {
    const { ctx, page } = await R.setup(browser, c.o);
    try {
      await M.lockRun(page); await M.dismiss(page);
      await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = '24-101'; return window.__debugSaveRunArchive(); }); await page.waitForTimeout(400);
      if (c.wait) await waitFor(page, () => /Frank Ortiz/.test((document.getElementById('pbRolesWho') || {}).textContent || ''), 15000);
      const s = await summary(page);
      check(c.name + ': Job Summary, Foreman-Reported Progress: "' + c.want + '"', s.prod === c.want, s.prod);
      check(c.name + ': Job Summary, Crew & Equipment Hours reads the same', s.crew === c.want, s.crew);
      check(c.name + ': no "from a run’s Results screen" anywhere on the Job Summary', !/Results screen/i.test(s.all));
      const pdf = await pdfText(page);
      check(c.name + ': Job Summary PDF says the same in both sections, never "Results screen"', pdf.split(c.want).length - 1 === 2 && !/Results screen/i.test(pdf), pdf.slice(0, 300));
      if (c.mine) {
        await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(1500);
        check(c.name + ': My production with nothing entered: "' + c.mine + '"', (await text(page, 'pmStatus')) === c.mine, await text(page, 'pmStatus'));
      }
      errs.push(...page._errors);
    } catch (e) { check('SCRIPT ERROR ' + String(e && e.message).slice(0, 200), false); } finally { await ctx.close(); }
  }
  check('no JS errors', errs.length === 0, errs.join(' | '));
  await browser.close();
})();
