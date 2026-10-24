// r15.1 PM RUNS: a crew member's runs reach the office (company account / managers / PMs) as "Crew runs" with the report
// and a PDF. Part 1: a pipelayer's phone locks a run with a photo; the office copy leaves the photo data out and is sent
// with pb_prod_run_record_put (mocked here, server rules as sql/01_run_records.sql); a change resends; an unchanged run
// does not. Part 2: a PM's Company Home shows the Crew runs tile, the list (who, job, waiting for a foreman), the run's
// report text, and Save PDF makes a file.
// Run: flock /home/claude/pw.lock env PB_TEST_DIR=<site> PB_TEST_PORT=8811 /home/claude/test/run.sh <this file> 400
const L = require('/home/claude/batch14/F/tests/lf_lib.js'); const { M, check } = L;
const sleep = (p, ms) => p.waitForTimeout(ms);
const RRMOCK = () => {
  const orig = window.__rpc;
  window.__rpc = async (fn, args) => {
    if (fn === 'pb_prod_crew_autolink') { window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args || {})) }); return { data: { ok: true, linked: /^brandon jones$/i.test(String(args.p_name).trim()), again: false, foreman_name: 'Brandon Jones' }, error: null }; }
    if (fn === 'pb_prod_run_record_put' || fn === 'pb_prod_company_runs' || fn === 'pb_prod_company_run_get') {
      window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args || {})) });
      if ((localStorage.getItem('__rpcMode') || 'ok') === 'offline') return { data: null, error: { message: 'TypeError: Failed to fetch' } };
      const srv = JSON.parse(localStorage.getItem('__rrsrv') || '{"runs":{}}');
      const me = (JSON.parse(localStorage.getItem('__mockSess') || 'null') || {}).id;
      if (fn === 'pb_prod_run_record_put') {
        if (args.p_expect_uid !== me) return { data: null, error: { message: 'pb:wrong_account' } };
        if (localStorage.getItem('__member') === '0') return { data: null, error: { message: 'pb:not_company_member' } };
        if (JSON.stringify(args.p_record).includes('data:image/')) return { data: null, error: { message: 'pb:photo_data' } };
        if (String(args.p_record.id) !== args.p_entry_id || args.p_record.kind !== 'run') return { data: null, error: { message: 'pb:bad_record' } };
        const k = me + '|' + args.p_entry_id, old = srv.runs[k], same = old && JSON.stringify(old.record) === JSON.stringify(args.p_record);
        if (!same) srv.runs[k] = { id: 'rr-' + Object.keys(srv.runs).length, record: args.p_record, version: old ? old.version + 1 : 1, who: 'Mike Smith', role: 'pipelayer' };
        localStorage.setItem('__rrsrv', JSON.stringify(srv));
        return { data: { ok: true, same: !!same, version: srv.runs[k].version }, error: null };
      }
      if (localStorage.getItem('__manager') !== '1') return { data: null, error: { message: 'pb:not_company_account' } };
      const list = Object.values(srv.runs);
      if (fn === 'pb_prod_company_runs') return { data: { runs: list.map(x => ({ id: x.id, entry_id: String(x.record.id), job_number: x.record.jobNumber, jobsite: x.record.jobsite, label: x.record.startLabel + ' to ' + x.record.endLabel,
        locked_at: x.record.lockTime, ended: !!(x.record.completed || x.record.incomplete), ended_early: !!x.record.incomplete, distance_ft: x.record.distance, laid_ft: x.record.pbOffice && x.record.pbOffice.laidFt,
        photo_count: x.record.pbOffice ? x.record.pbOffice.photosLeftOut : 0, version: x.version, who: x.who, role: x.role, sent_at: x.record.lockTime, sent_how: 'pipelayer', reviewed_at: localStorage.getItem('__rrReviewed') || null, reviewed_by_name: localStorage.getItem('__rrReviewed') ? 'Brandon Jones' : null, confirmed: localStorage.getItem('__rrConfirmed') === '1', status: localStorage.getItem('__rrConfirmed') === '1' ? 'foreman' : 'waiting' })), server_at: new Date().toISOString() }, error: null };
      const x = list.find(y => y.id === args.p_id);
      return x ? { data: { id: x.id, record: x.record, version: x.version, who: x.who, photo_count: x.record.pbOffice ? x.record.pbOffice.photosLeftOut : 0 }, error: null } : { data: null, error: { message: 'pb:not_found' } };
    }
    return orig(fn, args);
  };
};
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' + 'A'.repeat(300);
const puts = (p) => p.evaluate(() => window.__rpcLog.filter(x => x.fn === 'pb_prod_run_record_put'));
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  let srv = null;
  try {
    // ---- 1. the crew phone ----
    {
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctP', role: 'pipelayer' });
      await ctx.addInitScript(RRMOCK); await page.reload(); await sleep(page, 1800); await M.dismiss(page);
      page.on('pageerror', e => errs.push(String(e)));
      const id = await M.lockRun(page, { dist: 200 }); await M.dismiss(page);
      await page.evaluate((png) => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = '26014'; e.jobsite = 'Sundance Sewer Improvements'; e.crew = 'Brandon Jones'; e.intervalRows[0].photos = [png, { url: png, sha: 'x' }]; return window.__debugSaveRunArchive(); }, PNG);
      await sleep(page, 300);
      const c = await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); return window.__pbRrDebug.copy(e.id); });
      check('office copy: no photo data left, 2 photos counted, report text kept', !JSON.stringify(c).includes('data:image/') && c.pbOffice.photosLeftOut === 2 && typeof c.reportText === 'string' && c.reportText.length > 50 && c.kind === 'run');
      check('office copy: the phone\'s own record still has its photos', await page.evaluate(() => window.__debugGetCurrentArchiveEntry().intervalRows[0].photos.length === 2));
      await page.evaluate(() => window.__pbRrDebug.send()); await sleep(page, 1500);
      let P = await puts(page);
      check('sent once with this account and its company (' + P.length + ')', P.length === 1 && P[0].args.p_expect_uid === 'acctP' && P[0].args.p_access_company === 'c1' && P[0].args.p_record.jobNumber === '26014');
      await page.evaluate(() => window.__pbRrDebug.send()); await sleep(page, 800);
      check('unchanged: not sent again', (await puts(page)).length === 1);
      await page.evaluate(() => pbLaidMark(5)); await sleep(page, 6000);
      const al = await page.evaluate(() => window.__rpcLog.filter(x => x.fn === 'pb_prod_crew_autolink').map(x => x.args.p_name));
      check('auto-link: the typed foreman (Brandon Jones) is asked once (6 h memory), not on every send (' + al.join(',') + ')', al.length === 1 && al[0] === 'Brandon Jones');
      const order = await page.evaluate(() => { const L = window.__rpcLog.map(x => x.fn); const a = L.indexOf('pb_prod_crew_autolink'), s = L.lastIndexOf('pb_prod_run_status_put'); return [a, s]; });
      check('auto-link asked before the newest status send (' + order + ')', order[0] >= 0 && order[1] > order[0]);
      await page.evaluate(() => window.__pbRrDebug.send()); await sleep(page, 1500);
      P = await puts(page);
      check('marked laid: sent again with the laid feet (' + (P[1] && P[1].args.p_record.pbOffice.laidFt) + ')', P.length === 2 && P[1].args.p_record.pbOffice.laidFt === 50);
      await page.evaluate(() => localStorage.setItem('__member', '0'));
      srv = await page.evaluate(() => localStorage.getItem('__rrsrv'));
      await ctx.close();
    }
    // ---- 2. the office (a PM: manager) ----
    {
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctM', role: 'pm', manager: true, extra: { __rrsrv: srv } });
      await ctx.addInitScript(RRMOCK); await page.reload(); await sleep(page, 2000); await M.dismiss(page);
      page.on('pageerror', e => errs.push(String(e)));
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 2500);
      const onCx = await page.evaluate(() => document.documentElement.classList.contains('pb-cx'));
      check('PM gets the Company Home', onCx);
      await L.waitFor(page, () => /New run report/.test((document.getElementById('homeCxRuns2') || {}).textContent || ''), 10000);
      const tile = await page.evaluate(() => (document.getElementById('homeCxRuns2') || {}).innerText || '');
      check('Home: Run reports tile, 1 new, 1 waiting for a foreman (' + tile.replace(/\s+/g, ' ') + ')', /1/.test(tile) && /New run report/.test(tile) && /1 new · 1 waiting for a foreman/.test(tile));
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/home_tile.png' });
      const wt = await page.evaluate(() => (document.getElementById('homeCxWait') || {}).innerText || '');
      check('Home: Waiting on foremen counts the crew run (' + wt.replace(/\s+/g, ' ') + ')', /^\s*1\b/.test(wt.replace(/[^\S\n]+/g, ' ').trim().split('\n').filter(Boolean)[0] || '') || /\b1\s*Waiting on foremen/.test(wt.replace(/\s+/g, ' ')));
      await page.click('#homeCxWait'); await sleep(page, 1200);
      check('Waiting on foremen list: "1 crew run with no production yet"', /1 run report not reviewed yet/.test(await page.evaluate(() => (document.getElementById('cxWaitRuns') || {}).innerText || '')));
      await page.click('#cxWaitRuns'); await sleep(page, 1200);
      check('it opens Crew runs', await page.evaluate(() => !!document.getElementById('cxRun0')));
      await page.evaluate(() => pbGoto('home')); await sleep(page, 800);
      await page.click('#homeCxRuns2'); await sleep(page, 1500);
      const row = await page.evaluate(() => (document.getElementById('cxRun0') || {}).innerText || '');
      check('list: the run with job, who, waiting (' + row.replace(/\s+/g, ' ') + ')', /26014/.test(row) && /Mike Smith/.test(row) && /Waiting for a foreman/.test(row) && /50 ft marked laid/.test(row));
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/list.png' });
      await page.click('#cxRun0'); await sleep(page, 1500);
      const det = await page.evaluate(() => ({ t: (document.getElementById('cxRunText') || {}).textContent || '', ph: (document.getElementById('cxRunPhotos') || {}).textContent || '' }));
      check('run opens: the report text and the photos note', det.t.length > 50 && /2 photos left out/.test(det.ph));
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/detail.png' });
      await L.waitFor(page, () => !!(document.getElementById('cxRunPdfView') || {}).dataset && !!document.getElementById('cxRunPdfView').dataset.pages, 30000);
      await page.evaluate(() => { window.__c0 = document.querySelector('#cxRunPdfView canvas'); });
      await sleep(page, 6000); // the company Home redraws its lists every 1.5 s
      const stable = await page.evaluate(() => ({ same: document.querySelector('#cxRunPdfView canvas') === window.__c0 && !!window.__c0 && document.contains(window.__c0), n: document.querySelectorAll('#cxRunPdfView canvas').length, pages: document.getElementById('cxRunPdfView').dataset.pages }));
      check('the report stays put on the company account (no redraw loop) (' + JSON.stringify(stable) + ')', stable.same && String(stable.n) === stable.pages);
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }).catch(() => null), page.click('#cxRunPdf')]);
      let ok = false, size = 0;
      if (dl) { const p = await dl.path(); size = require('fs').statSync(p).size; ok = /^crew-run-26014-.*\.pdf$/.test(dl.suggestedFilename()) && size > 5000; require('fs').copyFileSync(p, '/home/claude/feat_pmruns/shots/office_copy.pdf'); }
      check('Save PDF: a PDF of the run (' + (dl ? dl.suggestedFilename() : 'none') + ', ' + size + ' bytes)', ok);
      await page.click('#cxRunBack'); await sleep(page, 400);
      check('back to the list', await page.evaluate(() => !!document.getElementById('cxRun0')));
      await page.evaluate(() => localStorage.setItem('__rrReviewed', new Date().toISOString())); await page.evaluate(() => window.pbRrLoad('acctM', true)); await sleep(page, 1200);
      const rv = await page.evaluate(() => ({ row: (document.getElementById('cxRun0') || {}).innerText || '', n: window.pbRrWaitingCount('acctM') }));
      check('reviewed by the foreman, no production yet: not waiting on him any more, says "No production entered" (' + rv.row.replace(/\s+/g, ' ') + ')', rv.n === 0 && /Approved by Brandon Jones/.test(rv.row) && /No production entered/.test(rv.row) && !/Waiting for a foreman/.test(rv.row));
      await page.evaluate(() => localStorage.removeItem('__rrReviewed'));
      await page.evaluate(() => localStorage.setItem('__rrConfirmed', '1')); await page.evaluate(() => window.pbRrLoad('acctM', true)); await sleep(page, 1200);
      check('after a foreman enters production: "Production entered"', /Production entered/.test(await page.evaluate(() => (document.getElementById('cxRun0') || {}).innerText || '')));
      await ctx.close();
    }
    // ---- 2b. the foreman: View Run Report on his crew's run ----
    {
      const rec = JSON.parse(srv).runs['acctP|' + Object.values(JSON.parse(srv).runs)[0].record.id].record;
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctF', role: 'foreman', extra: { __rrsrv: srv, __rrCrew: JSON.stringify({ id: 'acctP', name: 'Mike Smith', sref: String(rec.id) }) } });
      await ctx.addInitScript(() => {
        const orig = window.__rpc;
        window.__rpc = async (fn, args) => {
          const c = JSON.parse(localStorage.getItem('__rrCrew') || 'null');
          if (fn === 'pb_prod_crew_live' && c) return { data: { foreman: true, today: new Date().toISOString().slice(0, 10), server_at: new Date().toISOString(), crew: [{ id: c.id, name: c.name, since: new Date().toISOString(), runs: [{ session_ref: c.sref, run_ref: 'r1', ended: true, mine: null, theirs: null, job_number: '26014', updated_at: new Date().toISOString(), status: { label: 'Start → End', jobNumber: '26014', totalFt: 200, laidFt: 50, ended: true } }] }] }, error: null };
          if (fn === 'pb_prod_crew_run_record') {
            window.__rpcLog.push({ fn, args });
            const srv = JSON.parse(localStorage.getItem('__rrsrv') || '{"runs":{}}'), x = srv.runs[args.p_pipelayer + '|' + args.p_session_ref];
            return x ? { data: { id: x.id, record: x.record, who: 'Mike Smith', job_number: x.record.jobNumber, label: 'Start to End', locked_at: x.record.lockTime, photo_count: 2 }, error: null } : { data: null, error: { message: 'pb:no_record' } };
          }
          return orig(fn, args);
        };
      });
      await page.reload(); await sleep(page, 2000); await M.dismiss(page);
      page.on('pageerror', e => errs.push(String(e)));
      await page.evaluate(() => pbOpenProdMine()); await sleep(page, 2500);
      await L.waitFor(page, () => !!document.querySelector('[id^="pmLiveRpt"]'), 10000);
      const b = await page.evaluate(() => { const e = document.querySelector('[id^="pmLiveRpt"]'); return e ? e.id + ' ' + e.textContent : ''; });
      check('foreman: his crew run has View Run Report (' + b + ')', /View Run Report/.test(b));
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/foreman_crew.png' });
      await page.click('[id^="pmLiveRpt"]'); await sleep(page, 1500);
      const t = await page.evaluate(() => ({ s: document.querySelector('.pb-screen.active').id, title: (document.getElementById('cxListTitle') || {}).textContent, text: (document.getElementById('cxRunText') || {}).textContent || '' }));
      check('it opens the run report (' + t.s + ', ' + t.title + ')', t.s === 'screen-cxList' && t.title === 'Run report' && t.text.length > 50);
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/foreman_report.png' });
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }).catch(() => null), page.click('#cxRunPdf')]);
      check('foreman: Save PDF works', !!dl && /\.pdf$/.test(dl.suggestedFilename()));
      await page.click('#cxRunBack'); await sleep(page, 800);
      check('Back returns to the crew screen', await page.evaluate(() => document.querySelector('.pb-screen.active').id) === 'screen-prodMine');
      await page.evaluate(() => localStorage.setItem('__rrCrew', JSON.stringify({ id: 'acctP', name: 'Mike Smith', sref: '999' })));
      await page.evaluate(() => window.pbRrCrewOpen('acctP', '999', 'Mike Smith')); await sleep(page, 1200);
      check('no record yet: says it comes from the crew member\'s phone', /hasn’t sent this run’s report yet/.test(await page.evaluate(() => document.getElementById('cxListBody').textContent)));
      await ctx.close();
    }
    // ---- 3. a pipelayer can't list ----
    {
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctQ', role: 'pipelayer', extra: { __rrsrv: srv } });
      await ctx.addInitScript(RRMOCK); await page.reload(); await sleep(page, 1800); await M.dismiss(page);
      const r = await page.evaluate(() => window.__rpc('pb_prod_company_runs', { p_days: 60 }));
      check('a pipelayer is refused the list', r && r.error && /pb:not_company_account/.test(r.error.message));
      check('a pipelayer has no Crew runs tile', !(await page.evaluate(() => !!document.getElementById('homeCxRuns2') && document.getElementById('homeCxRuns2').offsetParent !== null)));
      await ctx.close();
    }
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
