// r15.8 feat_curjob + feat_pdfview: tap Current job on Home to choose / type / clear it; New Run starts on it; a run in
// progress on another job is shown too. Reports > View shows the PDF, Text Version a tap away.
const L = require('/home/claude/batch14/F/tests/lf_lib.js'); const { M, check } = L;
const sleep = (p, ms) => p.waitForTimeout(ms);
const MOCK = () => { const o = window.__rpc; window.__rpc = async (fn, args) => {
  if (fn === 'pb_prod_member_jobs') { window.__rpcLog.push({ fn }); return { data: { jobs: [{ job_key: '26050', job_number: '26050', project_name: 'Main St Sewer' }, { job_key: '26014', job_number: '26014', project_name: null }] }, error: null }; }
  return o(fn, args); }; };
const cj = (p) => p.evaluate(() => (document.getElementById('homeCurrentJob') || {}).innerText.replace(/\s+/g, ' '));
const picks = (p) => p.evaluate(() => [...document.querySelectorAll('[id^="cjPick"]')].map(b => b.textContent));
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  try {
    const { ctx, page } = await L.setupTouch(browser, { uid: 'acctP', role: 'pipelayer' });
    await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 2000); await M.dismiss(page);
    page.on('pageerror', e => errs.push(String(e)));
    await page.evaluate(() => pbGotoTab('home')); await sleep(page, 1200);
    let t = await cj(page);
    check('Home: Current job "None chosen. Tap to choose." (' + t + ')', /Current job None chosen\. Tap to choose\./.test(t) && /Change/.test(t));
    await page.click('#homeCurrentJob'); await sleep(page, 1200);
    let p = await picks(page);
    check('tap: the company jobs (' + p.join(' | ') + ')', p.join('|') === 'Job 26050 — Main St Sewer|Job 26014' && /Current Job/.test(await page.evaluate(() => document.getElementById('pbModalTitle').textContent)));
    await page.click('#cjPick0'); await sleep(page, 600);
    t = await cj(page);
    check('chosen: Job 26050 — Main St Sewer (' + t + ')', /Current job Job 26050 — Main St Sewer/.test(t));
    await page.evaluate(() => pbOpenNewRun()); await sleep(page, 500);
    check('New Run starts on it: Job details on, 26050, Main St Sewer', await page.evaluate(() => document.getElementById('saEnableToggle').checked && document.getElementById('saJobNumber').value === '26050' && document.getElementById('saJobsite').value === 'Main St Sewer'));
    await L.M.lockRun(page, { dist: 150 }); await M.dismiss(page);
    await page.evaluate(() => pbGotoTab('home')); await sleep(page, 800);
    await page.click('#homeCurrentJob'); await sleep(page, 800);
    await page.click('#cjPick1'); await sleep(page, 600);
    t = await cj(page);
    check('another job chosen while a run is in progress: both shown (' + t + ')', /Current job Job 26014/.test(t) && /Run in progress Job 26050 — Main St Sewer/.test(t));
    await page.click('#homeCurrentJob'); await sleep(page, 800);
    await page.fill('#cjType', '99999'); await page.click('#cjTypeGo'); await sleep(page, 500);
    check('typed job: 99999', /Current job Job 99999/.test(await cj(page)));
    await page.reload(); await sleep(page, 2500); await M.dismiss(page); await page.evaluate(() => pbGotoTab('home')); await sleep(page, 1200);
    check('kept after reopening the app', /Current job Job 99999/.test(await cj(page)));
    await page.click('#homeCurrentJob'); await sleep(page, 800);
    await page.click('#cjClear'); await sleep(page, 500);
    check('cleared: back to the run’s job', /Current job Job 26050 — Main St Sewer/.test(await cj(page)));
    // Reports > View = the PDF
    await page.evaluate(() => pbGotoTab('reports')); await sleep(page, 1200);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#screen-archive button')].find(x => x.textContent.trim() === 'View'); b.click(); });
    await L.waitFor(page, () => { const b = document.getElementById('archivePdf0'); return !!b && !!b.dataset.pages; }, 30000);
    const pv = await page.evaluate(() => ({ n: document.querySelectorAll('#archivePdf0 canvas').length, txt: getComputedStyle(document.getElementById('archiveView0')).display }));
    check('View shows the PDF pages, the text hidden (' + JSON.stringify(pv) + ')', pv.n >= 1 && pv.txt === 'none');
    await page.screenshot({ path: '/home/claude/feat_curjob/archive_pdf.png' });
    await page.click('#archiveTxtBtn0'); await sleep(page, 300);
    check('Text Version shows the text', await page.evaluate(() => getComputedStyle(document.getElementById('archiveView0')).display !== 'none'));
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
