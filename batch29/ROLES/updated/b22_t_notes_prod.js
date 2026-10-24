// Batch 29 ROLES updated copy of /home/claude/batch22/NOTES/tests/t_notes_prod.js: B's pipelayer production is made as it can arise now
// (saved before the change). The checks are the original's, plus one: the Results has no production log for the pipelayer.
// Batch 22 NOTES v2 (owner ruling on review S1/S2): the entries are information, not production quantities. They go to
// the company as their own stream (pb_prod_site_log_put), never inside the production record: no pb_prod_save is made
// for them and the record keeps its old shape, so no quantity approval can come from them. A pipelayer's entries on a run
// a foreman claimed still go. Edits are re-sent as a new version. Not in a company: kept on the phone, and the screen says
// so. On batch 14 F's production mock plus the stream mock in nl_lib.
// Run: flock /home/claude/pw.lock env PB_TEST_DIR=/home/claude/batch22/NOTES/site_d PB_TEST_PORT=8822 ./run.sh /home/claude/batch22/NOTES/tests/t_notes_prod.js 300
const T = require('/home/claude/batch22/NOTES/tests/nl_lib.js'); const { M, check } = T;
const saves = (page) => page.evaluate(() => window.__rpcLog.filter(x => x.fn === 'pb_prod_save'));
const srvSl = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('__slsrv') || '{}'));
(async () => {
  const browser = await M.chromium.launch();
  // ---- A. a foreman ----
  let { ctx, page } = await T.setupStream(browser, { uid: 'acctA', role: 'foreman', touch: false });
  try {
    await T.runWithProduction(page, { job: '24-101', exc: '120', pipe: '80', by: 'Frank' });
    await T.waitFor(page, () => window.__rpcLog.some(x => x.fn === 'pb_prod_save'), 15000);
    const n0 = (await saves(page)).length;
    await T.fill(page, 'delay', { reason: 'utility', hours: '1.5' }); await T.save(page);
    await T.fill(page, 'delay', { reason: 'inspector', start: T.ago(3), end: T.ago(2) }); await T.save(page);
    await T.fill(page, 'rework', { reason: 'grade', hours: '2', sta: 2, sta2: 4 }); await T.save(page);
    await T.fill(page, 'utility', { what: 'unknown', sta: { ft: 33.5 }, damaged: 'no', notified: 'Inspector Ruiz', photo: T.IMG }); await T.save(page);
    await T.fill(page, 'equip', { machineName: 'Loader 950', hours: '4', brk: 'yes', down: '0.5' }); await T.save(page);
    const sent = await T.waitFor(page, () => Object.keys(JSON.parse(localStorage.getItem('__slsrv') || '{}')).length === 5, 20000);
    const srv = await srvSl(page), it = Object.values(srv).map(r => r.item);
    console.log('PUT', JSON.stringify(it[3]).slice(0, 400));
    check('A: the 5 entries reach the company as their own stream (pb_prod_site_log_put)', sent && it.length === 5);
    check('A: each carries the run session, job, work date, author times and zone, and the photo count (not the photo)', it.every(x => x.session_ref && x.run_ref && x.job_number === '24-101' && /^\d{4}-\d\d-\d\d$/.test(x.work_date) && /Z$/.test(x.at) && !!x.tz && x.version === 1)
      && it.find(x => x.type === 'utility').photos === 1 && !/data:image/.test(JSON.stringify(it)));
    check('A: the entry’s fields go as typed (inspector delay 1 h from the times)', it.some(x => x.type === 'delay' && x.d.reason === 'inspector' && x.d.hours === 1 && x.d.hoursSrc === 'times'));
    await page.waitForTimeout(3500);
    const sv = await saves(page);
    check('A (S2): no pb_prod_save was made for the entries, and no record ever carries them', sv.length === n0 && sv.every(x => !('siteLog' in x.args.p_record)));
    check('A: Results says they went on their own, not as production', /These entries go to the company on their own, not as production quantities: 5 sent to the company/.test(await page.evaluate(() => document.getElementById('pbSlProd').textContent)));
    // an edit: re-sent as version 2
    const id = (await T.items(page))[0].id;
    await page.evaluate((i) => pbSlOpen('delay', i), id); await page.waitForTimeout(100); await page.fill('#pbSlHours', '2'); await T.save(page);
    const v2 = await T.waitFor(page, (i) => { const s = JSON.parse(localStorage.getItem('__slsrv') || '{}'); const r = Object.values(s).find(x => x.item.id === i); return !!r && r.version === 2 && r.item.d.hours === 2 && !!r.item.edited_at; }, 20000, id);
    check('A: an edit is sent again as version 2 (with its edit time)', v2);
    check('A: still no pb_prod_save from the edit', (await saves(page)).length === n0);
    await page.evaluate(() => pbGoto('prodMine')); await page.waitForTimeout(800);
    check('A: My production shows the totals line under the session (built on the phone)', /^Hours lost: 3\.0 \(inspector 1\.0, utility conflict 2\.0\)|^Hours lost: 3\.0 \(utility conflict 2\.0, inspector 1\.0\)/.test(await page.evaluate(() => (document.querySelector('#pmToday .pbp-sl') || {}).textContent || '')));
    check('A: no JS errors' + (page._errors.length ? ': ' + page._errors.join(' | ') : ''), !page._errors.length);
  } catch (e) { console.log('TEST ERROR', e); process.exitCode = 1; } finally { await ctx.close(); }
  // ---- B. a pipelayer whose run a foreman claimed: later entries still go, and never through production ----
  ({ ctx, page } = await T.setupStream(browser, { uid: 'acctP', role: 'pipelayer', touch: false }));
  try {
    // batch 29 ROLES: a pipelayer's production can only be from before the change: saved while the phone was a foreman's,
    // filed by the server as the pipelayer's (held), then the phone is the pipelayer's again (the logs hidden)
    await page.evaluate(() => { localStorage.__role = 'foreman'; }); await page.reload(); await page.waitForTimeout(2500); await M.dismiss(page);
    await T.runWithProduction(page, { job: '24-101', exc: '50', pipe: '40', by: 'Wes' });
    await page.evaluate(() => { localStorage.__role = 'pipelayer'; });
    await T.waitFor(page, () => window.__rpcLog.some(x => x.fn === 'pb_prod_save'), 15000);
    await page.reload(); await page.waitForTimeout(2500); await M.dismiss(page);
    await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(800); await M.dismiss(page);
    check('batch 29 ROLES: the pipelayer\u2019s Results has no production log, and the delay / utility entries are still there', await page.evaluate(() => { const w = document.getElementById('pbRolesProd'); return !!w && w.hidden; }));
    // the foreman claims it on the server
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('__psrv')); Object.values(s.entries).forEach(e => { if (e.user === 'acctP' && e.crew) { e.crew.state = 'claimed'; e.crew.by = 'acctF'; } }); localStorage.setItem('__psrv', JSON.stringify(s)); });
    const n0 = (await saves(page)).length;
    await T.fill(page, 'delay', { reason: 'inspector', hours: '2', note: 'after the claim' }); await T.save(page);
    const ok = await T.waitFor(page, () => Object.values(JSON.parse(localStorage.getItem('__slsrv') || '{}')).some(r => r.user === 'acctP' && r.item.d.note === 'after the claim'), 20000);
    await page.waitForTimeout(3000);
    check('B (S1): the pipelayer’s entry after the claim reaches the company', ok);
    check('B (S2): it made no production save, so no edit approval can come from it', (await saves(page)).length === n0 && !(await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('__psrv')).entries).some(e => e.pendingEdit))));
    check('B: no JS errors' + (page._errors.length ? ': ' + page._errors.join(' | ') : ''), !page._errors.length);
  } catch (e) { console.log('TEST ERROR', e); process.exitCode = 1; } finally { await ctx.close(); }
  // ---- C. not in a company (review N6), then the company changed (refused) ----
  ({ ctx, page } = await T.setupStream(browser, { uid: 'acctA', role: 'foreman', touch: false, extra: { __member: '0' } }));
  try {
    await M.lockRun(page); await M.dismiss(page);
    await T.fill(page, 'delay', { reason: 'weather', hours: '3' }); await T.save(page);
    await page.waitForTimeout(4500);
    const st = await page.evaluate(() => document.getElementById('pbSlProd').textContent);
    console.log('C', st);
    check('C (N6): not in a company: kept on the phone and the screen says so (no "Save Production Data")', /not in a company/.test(st) && !/Save Production Data/.test(st) && Object.keys(await srvSl(page)).length === 0);
    // an entry stamped with company c9 when saved, sent while in c1: refused, shown as not sent
    await page.evaluate(() => { localStorage.setItem('__member', '1'); const e = window.__debugGetCurrentArchiveEntry(); e.siteLog.items[0].co = 'c9'; return window.__debugSaveRunArchive(); });
    await page.evaluate(() => pbProdSyncNow()); await page.waitForTimeout(4000);
    const st2 = await page.evaluate(() => document.getElementById('pbSlProd').textContent);
    console.log('C2', st2);
    check('C: saved under another company: refused, not filed, and shown as not sent', /not sent \(it was saved while you were in another company\)/.test(st2) && Object.keys(await srvSl(page)).length === 0);
    check('C: no JS errors' + (page._errors.length ? ': ' + page._errors.join(' | ') : ''), !page._errors.length);
  } catch (e) { console.log('TEST ERROR', e); process.exitCode = 1; } finally { await ctx.close(); }
  await browser.close();
})();
