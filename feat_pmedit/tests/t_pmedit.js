// r15.6 feat_pmedit: the office enters / changes a run report's production, approves and deletes it, like the foreman. Harness from r15.3 SEND BACK + DELETE (owner, Oct 21): the office sends an approved report back to the foreman with a note
// (it reopens); the foreman sees "sent back" on Home, in his list and on the report, and approves again. The foreman
// can delete a run from "More" with one confirm; it leaves his list and the office sees "Deleted by". Server mocked
// with sql/06_sendback_remove.sql's rules.
const L = require('/home/claude/batch14/F/tests/lf_lib.js'); const { M, check } = L;
const sleep = (p, ms) => p.waitForTimeout(ms);
const MOCK = () => {
  const orig = window.__rpc;
  window.__rpc = async (fn, args) => {
    const srv = JSON.parse(localStorage.getItem('__rrsrv') || '{"runs":{}}'), me = (JSON.parse(localStorage.getItem('__mockSess') || 'null') || {}).id;
    const save = () => localStorage.setItem('__rrsrv', JSON.stringify(srv)), all = () => Object.values(srv.runs), byId = (id) => all().find(y => y.id === id);
    const log = () => window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args || {})) });
    if (fn === 'pb_prod_crew_autolink') return { data: { ok: true, linked: false, reason: 'no_match' }, error: null };
    if (fn === 'pb_prod_run_record_put') {
      log(); const k = me + '|' + args.p_entry_id, old = srv.runs[k] || {}, rec = args.p_record;
      const x = Object.assign({ id: 'rr-' + Object.keys(srv.runs).length, pid: me, entry: args.p_entry_id, sent_at: null }, old, { record: rec });
      if (!x.sent_at && (rec.completed || rec.incomplete)) { x.sent_at = new Date().toISOString(); x.sent_how = 'auto'; }
      srv.runs[k] = x; save(); return { data: { ok: true, version: 1, sent_at: x.sent_at, sent_how: x.sent_how }, error: null };
    }
    const role = localStorage.getItem('__role') || 'foreman';
    if (fn === 'pb_prod_crew_live' && role === 'foreman') {
      const runs = all().filter(x => !x.removed_at).map(x => ({ session_ref: x.entry, run_ref: 'r-' + x.entry, ended: true, mine: null, theirs: null, job_number: x.record.jobNumber, updated_at: new Date().toISOString(), status: { label: 'Start → End', jobNumber: x.record.jobNumber, totalFt: 200, laidFt: 0, ended: true } }));
      return { data: { foreman: true, today: new Date().toISOString().slice(0, 10), server_at: new Date().toISOString(), crew: [{ id: 'acctP', name: 'Mike Smith', since: new Date().toISOString(), runs }] }, error: null };
    }
    const sb = (x) => ({ sent_back_at: x.sent_back_at || null, sent_back_note: x.sent_back_note || null, sent_back_by_name: x.sent_back_at ? 'Pat PM' : null });
    if (fn === 'pb_prod_crew_reports') return { data: { foreman: true, server_at: new Date().toISOString(), reports: all().filter(x => x.sent_at && !x.removed_at).map(x => Object.assign({ id: x.id, pipelayer_id: x.pid, entry_id: x.entry, job_number: x.record.jobNumber, label: 'Start to End', sent_at: x.sent_at, sent_how: x.sent_how, reviewed_at: x.reviewed_at || null, reviewed_by_name: x.reviewed_at ? 'Brandon Jones' : null, who: 'Mike Smith', status: 'waiting' }, sb(x))) }, error: null };
    if (fn === 'pb_prod_crew_run_record') {
      const x = srv.runs[args.p_pipelayer + '|' + args.p_session_ref];
      if (!x) return { data: null, error: { message: 'pb:no_record' } };
      if (x.removed_at) return { data: null, error: { message: 'pb:removed' } };
      return { data: Object.assign({ id: x.id, record: x.record, who: 'Mike Smith', job_number: x.record.jobNumber, label: 'run', locked_at: x.record.lockTime, photo_count: 0, sent_at: x.sent_at, sent_how: x.sent_how, reviewed_at: x.reviewed_at || null, reviewed_by_name: x.reviewed_at ? 'Brandon Jones' : null, can_review: true }, sb(x)), error: null };
    }
    if (fn === 'pb_prod_run_report_review') { log(); const x = byId(args.p_id); x.reviewed_at = new Date().toISOString(); x.sent_back_at = null; save(); return { data: { ok: true, reviewed_at: x.reviewed_at }, error: null }; }
    if (fn === 'pb_prod_run_remove') { log(); const x = byId(args.p_id); if (!x || (role !== 'foreman' && localStorage.getItem('__manager') !== '1')) return { data: null, error: { message: 'pb:not_allowed' } }; x.removed_at = new Date().toISOString(); x.removed_by_name = 'Brandon Jones'; save(); return { data: { ok: true, removed_at: x.removed_at, voided: 0 }, error: null }; }
    if (fn === 'pb_prod_run_report_send_back') {
      log(); const x = byId(args.p_id);
      if (localStorage.getItem('__manager') !== '1') return { data: null, error: { message: 'pb:not_manager' } };
      if (!x.reviewed_at) return { data: null, error: { message: 'pb:not_approved' } };
      if (String(args.p_note || '').trim().length < 3) return { data: null, error: { message: 'pb:note_needed' } };
      Object.assign(x, { reviewed_at: null, sent_back_at: new Date().toISOString(), sent_back_note: args.p_note }); save();
      return { data: { ok: true, sent_back_at: x.sent_back_at, foreman: 'Brandon Jones' }, error: null };
    }
    if (fn === 'pb_prod_company_run_prod_save') { log(); const x = byId(args.p_id);
      if (localStorage.getItem('__manager') !== '1') return { data: null, error: { message: 'pb:not_company_account' } };
      if (!x || x.removed_at) return { data: null, error: { message: 'pb:removed' } };
      const v = x.prod ? x.prod.version : 0; if (args.p_expect_version != null && args.p_expect_version !== v) return { data: null, error: { message: 'pb:changed' } };
      x.prod = x.prod ? Object.assign(x.prod, { version: v + 1, items: args.p_items, edited_by_name: x.prod.mine ? null : 'Pat PM' }) : { entry_id: 'e-' + x.id, version: 1, role: 'manager', mine: true, by_name: 'Pat PM', items: args.p_items };
      save(); return { data: { ok: true, id: x.prod.entry_id, version: x.prod.version, new: v === 0 }, error: null }; }
    if (fn === 'pb_prod_company_runs' || fn === 'pb_prod_company_run_get') {
      if (localStorage.getItem('__manager') !== '1') return { data: null, error: { message: 'pb:not_company_account' } };
      const row = (x) => Object.assign({ id: x.id, entry_id: x.entry, job_number: x.record.jobNumber, label: 'Start to End', locked_at: x.record.lockTime, ended: true, distance_ft: x.record.distance, photo_count: 0, version: 1, who: 'Mike Smith', role: 'pipelayer', sent_at: x.sent_at, sent_how: x.sent_how, reviewed_at: x.reviewed_at || null, reviewed_by_name: x.reviewed_at ? 'Brandon Jones' : null, removed_at: x.removed_at || null, removed_by_name: x.removed_by_name || null, removed_reason: null, status: x.removed_at ? 'removed' : 'waiting', can_send_back: !!x.reviewed_at && !x.removed_at }, sb(x));
      if (fn === 'pb_prod_company_runs') return { data: { runs: all().filter(x => x.sent_at).map(row), server_at: new Date().toISOString() }, error: null };
      const x = byId(args.p_id); return x ? { data: Object.assign(row(x), { record: x.record, can_edit: !x.removed_at, prod: x.prod || null, plan: [{ key: 'pipe', name: 'Pipe Installed - Main', unit: 'LF', cost_code: '02-100' }, { key: 'laterals', name: 'Laterals', unit: 'EA', cost_code: '02-200' }] }), error: null } : { data: null, error: { message: 'pb:not_found' } };
    }
    return orig(fn, args);
  };
};
const txt = (page, id) => page.evaluate((i) => ((document.getElementById(i) || {}).innerText || '').replace(/\s+/g, ' '), id);
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  let srv = null;
  try {
    { // the pipelayer: two ended runs, sent
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctP', role: 'pipelayer' });
      await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 1800); await M.dismiss(page);
      page.on('pageerror', e => errs.push(String(e)));
      for (const d of [200, 120]) {
        await page.evaluate(() => pbGoto('home')); await M.lockRun(page, { dist: d }); await M.dismiss(page);
        await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = '26014'; e.completed = true; e.runEndTime = Date.now(); return window.__debugSaveRunArchive(); });
        await page.evaluate(() => window.__pbRrDebug.send()); await sleep(page, 2000);
      }
      srv = JSON.parse(await page.evaluate(() => localStorage.getItem('__rrsrv')));
      check('setup: 2 runs sent', Object.values(srv.runs).filter(x => x.sent_at).length === 2);
      Object.values(srv.runs)[1].prod = { entry_id: 'ef', version: 1, role: 'foreman', mine: false, by_name: 'Brandon Jones', items: [{ key: 'pipe', qty: 100, unit: 'LF' }] }; // the foreman entered the second
      await ctx.close();
    }
    const { ctx, page } = await L.setupTouch(browser, { uid: 'acctM', role: 'pm', manager: true, extra: { __rrsrv: JSON.stringify(srv) } });
    await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 2000); await M.dismiss(page);
    page.on('pageerror', e => errs.push(String(e)));
    await page.evaluate(() => pbGotoTab('home')); await sleep(page, 2000);
    await page.click('#homeCxRuns2'); await sleep(page, 1500);
    // open the run with no production: rows are listed newest first; find by trying each
    let found = -1;
    for (let k = 0; k < 2 && found < 0; k++) { await page.evaluate((i) => window.pbRrOpen(i), k); await sleep(page, 1500); if (await page.$('#cxRunOffNone')) found = k; else { await page.evaluate(() => window.pbRrClose()); await sleep(page, 600); } }
    check('office opens a run with no production: "No production entered", Enter Production and Approve Report', found >= 0 && !!(await page.$('#cxRunOffEdit')) && /Enter Production/.test(await txt(page, 'cxRunOffEdit')) && !!(await page.$('#cxRunOffApprove')));
    await page.tap('#cxRunOffEdit'); await sleep(page, 500);
    const labels = await page.evaluate(() => [...document.querySelectorAll('#cxRunOffForm label')].map(l => l.textContent));
    check('form: plan names and codes, laterals, hours (' + labels.join(' | ') + ')', labels.includes('Pipe Installed - Main (LF) · 02-100') && labels.includes('Laterals (EA) · 02-200') && labels.some(l => /Crew man-hours/.test(l)) && labels.some(l => /Excavat/.test(l)));
    const li = labels.indexOf('Laterals (EA) · 02-200'), pi = labels.indexOf('Pipe Installed - Main (LF) · 02-100'), hi = labels.findIndex(l => /Crew man-hours/.test(l));
    await page.fill('#cxRunOffQ' + pi, 'abc'); await page.tap('#cxRunOffSave'); await sleep(page, 500);
    check('a bad number is refused on the phone', /Pipe Installed - Main: enter a plain number/.test(await txt(page, 'cxRunOffErr')) && !(await page.evaluate(() => window.__rpcLog.some(x => x.fn === 'pb_prod_company_run_prod_save'))));
    await page.fill('#cxRunOffQ' + pi, '180'); await page.fill('#cxRunOffQ' + li, '3'); await page.fill('#cxRunOffQ' + hi, '16');
    await page.tap('#cxRunOffSave'); await sleep(page, 1200);
    let a = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_prod_company_run_prod_save').pop() || {}).args);
    check('saved: pipe 180 LF, laterals 3 EA, hours 16, no version yet (' + JSON.stringify(a && a.p_items) + ')', a && a.p_expect_version === null && JSON.stringify(a.p_items) === JSON.stringify([{ key: 'pipe', qty: 180, unit: 'LF' }, { key: 'laterals', qty: 3, unit: 'EA' }, { key: '_hours', qty: 16, unit: 'h' }].map(x => x.key === '_hours' ? Object.assign(x, { key: a.p_items[2].key }) : x)));
    check('shows it: Pipe Installed - Main 180, Laterals 3, entered by you (' + await txt(page, 'cxRunOffProd') + ')', /Pipe Installed - Main 180/.test(await txt(page, 'cxRunOffQty')) && /Laterals 3/.test(await txt(page, 'cxRunOffQty')) && /Entered by you/.test(await txt(page, 'cxRunOffBy')));
    await page.tap('#cxRunOffEdit'); await sleep(page, 400);
    check('Change Production: the form opens with 180', (await page.inputValue('#cxRunOffQ' + pi)) === '180');
    await page.fill('#cxRunOffQ' + pi, '190');
    await page.tap('#cxRunOffCancel'); await sleep(page, 300);
    check('Cancel keeps 180', /180/.test(await txt(page, 'cxRunOffQty')));
    await page.tap('#cxRunOffEdit'); await sleep(page, 400); await page.fill('#cxRunOffQ' + pi, '190');
    await page.tap('#cxRunOffSave'); await sleep(page, 1200);
    a = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_prod_company_run_prod_save').pop() || {}).args);
    check('the change sends version 1 and 190', a && a.p_expect_version === 1 && a.p_items[0].qty === 190);
    await page.tap('#cxRunOffApprove'); await sleep(page, 1500);
    check('Approve Report: approved (' + await txt(page, 'cxRunSent') + ')', await page.evaluate(() => window.__rpcLog.some(x => x.fn === 'pb_prod_run_report_review')) && !(await page.$('#cxRunOffApprove')) && /Approved/.test(await txt(page, 'cxRunSent')));
    await page.screenshot({ path: '/home/claude/feat_pmedit/office_prod.png' });
    // the other run: the foreman's production, changed by the office
    await page.evaluate(() => window.pbRrClose()); await sleep(page, 600);
    await page.evaluate((i) => window.pbRrOpen(i), 1 - found); await sleep(page, 1500);
    check('the foreman’s production shows: Pipe Installed - Main 100, by Brandon Jones (foreman) (' + await txt(page, 'cxRunOffProd') + ')', /Pipe Installed - Main 100/.test(await txt(page, 'cxRunOffQty')) && /Entered by Brandon Jones \(foreman\)/.test(await txt(page, 'cxRunOffBy')));
    await page.tap('#cxRunOffEdit'); await sleep(page, 400);
    await page.fill('#cxRunOffQ' + pi, '110'); await page.tap('#cxRunOffSave'); await sleep(page, 1200);
    check('changed: 110, "changed by you" (' + await txt(page, 'cxRunOffBy') + ')', /Pipe Installed - Main 110/.test(await txt(page, 'cxRunOffQty')) && /changed by you/.test(await txt(page, 'cxRunOffBy')));
    // stale: someone else changed it
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('__rrsrv')); Object.values(s.runs).forEach(x => { if (x.prod && x.prod.entry_id === 'ef') x.prod.version = 9; }); localStorage.setItem('__rrsrv', JSON.stringify(s)); });
    await page.tap('#cxRunOffEdit'); await sleep(page, 400); await page.fill('#cxRunOffQ' + pi, '111'); await page.tap('#cxRunOffSave'); await sleep(page, 1200);
    check('someone changed it meanwhile: says so, form kept', /changed this run’s production since you opened it/.test(await txt(page, 'cxRunOffErr')) && !!(await page.$('#cxRunOffForm')));
    await page.tap('#cxRunOffCancel'); await sleep(page, 300);
    // delete
    await page.evaluate(() => { document.getElementById('cxRunOffMore').open = true; }); await page.tap('#cxRunOffDelete'); await sleep(page, 500);
    const modal = await page.evaluate(() => (document.querySelector('.pb-modal, [role="dialog"]') || {}).innerText || '');
    check('Delete asks first (' + modal.replace(/\s+/g, ' ').slice(0, 140) + ')', /Delete this run\?/.test(modal) && /server keeps a copy/.test(modal) && !/office sees that you deleted/.test(modal));
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Delete Run' && b.closest('.pb-modal, [role="dialog"]')).click()); await sleep(page, 1500);
    check('deleted: back on the list, shown deleted', await page.evaluate(() => window.__rpcLog.some(x => x.fn === 'pb_prod_run_remove')) && /Deleted by/.test(await page.evaluate(() => document.body.innerText)));
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
