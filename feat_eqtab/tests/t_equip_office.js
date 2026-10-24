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
      const x = byId(args.p_id); return x ? { data: Object.assign(row(x), { record: x.record, can_edit: !x.removed_at, prod: x.prod || null, plan: [{ key: 'pipe', name: 'Pipe Installed - Main', unit: 'LF', cost_code: '02-100' }], equipment: [{ key: 'eq_cat320', name: 'CAT 320', unit_no: '12', cost_code: '02-300' }, { key: 'eq_loader', name: 'Loader' }] }), error: null } : { data: null, error: { message: 'pb:not_found' } };
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
    { const { ctx, page } = await L.setupTouch(browser, { uid: 'acctP', role: 'pipelayer' });
      await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 1800); await M.dismiss(page);
      await page.evaluate(() => pbGoto('home')); await M.lockRun(page, { dist: 200 }); await M.dismiss(page);
      await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = '26014'; e.completed = true; e.runEndTime = Date.now(); return window.__debugSaveRunArchive(); });
      await page.evaluate(() => window.__pbRrDebug.send()); await sleep(page, 2000);
      srv = JSON.parse(await page.evaluate(() => localStorage.getItem('__rrsrv')));
      Object.values(srv.runs)[0].prod = { entry_id: 'ef', version: 1, role: 'foreman', mine: false, by_name: 'Brandon Jones', items: [{ key: 'pipe', qty: 100, unit: 'LF' }, { key: '_equiphours', qty: 4, unit: 'h' }] }; // an old total, no pieces
      await ctx.close(); }
    const { ctx, page } = await L.setupTouch(browser, { uid: 'acctM', role: 'pm', manager: true, extra: { __rrsrv: JSON.stringify(srv) } });
    await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 2000); await M.dismiss(page);
    page.on('pageerror', e => errs.push(String(e)));
    await page.evaluate(() => pbGotoTab('home')); await sleep(page, 2000);
    await page.click('#homeCxRuns2'); await sleep(page, 1500);
    await page.evaluate(() => window.pbRrOpen(0)); await sleep(page, 1500);
    await page.tap('#cxRunOffEdit'); await sleep(page, 400);
    check('office form: an old total without pieces comes in as Other equipment 4', /Other equipment[\s\S]*Used h/.test(await page.evaluate(() => document.getElementById('cxRunOffEqSec').innerText)) && (await page.inputValue('#cxRunOffE0')) === '4');
    await page.selectOption('#cxRunOffEqAdd', 'eq_loader'); await sleep(page, 300);
    await page.fill('#cxRunOffE1', '3'); await page.tap('#cxRunOffSave'); await sleep(page, 1200);
    const a = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_prod_company_run_prod_save').pop() || {}).args);
    check('office saves pieces + total 7 (' + JSON.stringify(a && a.p_items) + ')', a && JSON.stringify(a.p_items.filter(i => i.key.charAt(0) === '_')) === JSON.stringify([{ key: '_eq_other', qty: 4, unit: 'h' }, { key: '_eq_loader', qty: 3, unit: 'h' }, { key: '_equiphours', qty: 7, unit: 'h' }]));
    check('shown with the pieces', /Equipment hours 7 h \(Other equipment 4 h, Loader 3 h\)/.test(await page.evaluate(() => document.getElementById('cxRunOffProd').innerText.replace(/\s+/g, ' '))));
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
