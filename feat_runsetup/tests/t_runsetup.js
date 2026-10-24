// r15.7 feat_runsetup: the office (intended) and the foreman (field, wins) change a sent run's setup. From r15.6 feat_pmedit: the office enters / changes a run report's production, approves and deletes it, like the foreman. Harness from r15.3 SEND BACK + DELETE (owner, Oct 21): the office sends an approved report back to the foreman with a note
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
    const rsEff = (S) => { const base = S.base, I = S.intended || {}, Fd = S.field || {}; const pick = (k) => k in Fd ? Fd[k] : k in I ? I[k] : base[k];
      const parts = base.parts.map(p => { const n = String(p.n), o = Object.assign({}, p, (I.parts || {})[n] || {}, (Fd.parts || {})[n] || {}); return o; });
      return { job_number: pick('job_number'), jobsite: pick('jobsite'), parts }; };
    const rsJson = (x) => { const S = x.setup || (x.setup = { base: { job_number: x.record.jobNumber, jobsite: null, parts: [{ n: 1, pipe: { id: null, name: '8in SDR 35' }, bed: null, shade: null, bed_thk: 0.5, width: 3, shade_thk: null, od_in: 8.625 }] }, intended: null, field: null, version: 0 });
      return Object.assign({}, S, { effective: rsEff(S), intended_by_name: S.intended ? 'Pat PM' : null, field_by_name: S.field ? 'Brandon Jones' : null, materials: [{ id: '11111111-1111-1111-1111-111111111111', name: 'Fine sand', use: 'bedding', cost_code: '02-100' }, { id: '22222222-2222-2222-2222-222222222222', name: '8in SDR 35', use: 'pipe', cost_code: null }] }); };
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
      return { data: Object.assign({ id: x.id, record: x.record, who: 'Mike Smith', job_number: x.record.jobNumber, label: 'run', locked_at: x.record.lockTime, photo_count: 0, sent_at: x.sent_at, sent_how: x.sent_how, reviewed_at: x.reviewed_at || null, reviewed_by_name: x.reviewed_at ? 'Brandon Jones' : null, can_review: true, setup: rsJson(x) }, sb(x)), error: null };
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
    if (fn === 'pb_prod_run_setup_save') { log(); const x = byId(args.p_id); rsJson(x); const S = x.setup;
      const side = localStorage.getItem('__manager') === '1' ? 'intended' : 'field';
      if (args.p_expect_version !== S.version) return { data: null, error: { message: 'pb:changed' } };
      const cur = S[side] || {}; const ch = args.p_change;
      Object.keys(ch).forEach(k => { if (k === 'parts') { cur.parts = cur.parts || {}; Object.keys(ch.parts).forEach(n => { cur.parts[n] = Object.assign(cur.parts[n] || {}, ch.parts[n]); }); } else if (k === 'clear') ch.clear.forEach(c => { const [n, f] = c.split('.'); if (f) { if (cur.parts && cur.parts[n]) delete cur.parts[n][f]; } else delete cur[n]; }); else cur[k] = ch[k]; });
      S[side] = cur; S.version++; save(); return { data: { ok: true, side, setup: rsJson(x) }, error: null }; }
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
      const x = byId(args.p_id); return x ? { data: Object.assign(row(x), { record: x.record, can_edit: !x.removed_at, setup: rsJson(x), prod: x.prod || null, plan: [{ key: 'pipe', name: 'Pipe Installed - Main', unit: 'LF', cost_code: '02-100' }, { key: 'laterals', name: 'Laterals', unit: 'EA', cost_code: '02-200' }] }), error: null } : { data: null, error: { message: 'pb:not_found' } };
    }
    return orig(fn, args);
  };
};
const txt = (page, id) => page.evaluate((i) => ((document.getElementById(i) || {}).innerText || '').replace(/\s+/g, ' '), id);
const setupTxt = (page) => page.evaluate(() => ((document.getElementById('cxRunSetup') || {}).innerText || '').replace(/\s+/g, ' '));
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  let srv = null;
  try {
    { const { ctx, page } = await L.setupTouch(browser, { uid: 'acctP', role: 'pipelayer' });
      await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 1800); await M.dismiss(page);
      page.on('pageerror', e => errs.push(String(e)));
      await page.evaluate(() => pbGoto('home')); await M.lockRun(page, { dist: 200 }); await M.dismiss(page);
      await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = '26014'; e.completed = true; e.runEndTime = Date.now(); return window.__debugSaveRunArchive(); });
      await page.evaluate(() => window.__pbRrDebug.send()); await sleep(page, 2000);
      srv = JSON.parse(await page.evaluate(() => localStorage.getItem('__rrsrv')));
      check('setup: a run sent', Object.values(srv.runs).filter(x => x.sent_at).length === 1);
      await ctx.close(); }
    { // the PM: intended setup
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctM', role: 'pm', manager: true, extra: { __rrsrv: JSON.stringify(srv) } });
      await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 2000); await M.dismiss(page);
      page.on('pageerror', e => errs.push(String(e)));
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 2000);
      await page.click('#homeCxRuns2'); await sleep(page, 1500);
      await page.evaluate(() => window.pbRrOpen(0)); await sleep(page, 1500);
      let t = await setupTxt(page);
      check('office: Run setup with the crew values (' + t.slice(0, 200) + ')', /Job: 26014/.test(t) && /Pipe: 8in SDR 35/.test(t) && /Bedding thickness: 0\.5 ft/.test(t) && /Trench width: 3 ft/.test(t) && /intended setup/.test(t));
      await page.tap('#cxRunSetupEdit'); await sleep(page, 400);
      check('form: job, jobsite, picks from the job list, numbers', !!(await page.$('#cxRsJob')) && (await page.inputValue('#cxRs_1_width')) === '3' && (await page.evaluate(() => [...document.querySelectorAll('#cxRs_1_bed option')].map(o => o.textContent).join('|'))) === 'None|Fine sand · 02-100');
      await page.fill('#cxRs_1_width', '500'); await page.tap('#cxRunSetupSave'); await sleep(page, 400);
      check('a bad width is refused on the phone', /Trench width: enter a number from 0\.01 to 100/.test((await txt(page, 'cxRunSetupErr'))) && !(await page.evaluate(() => window.__rpcLog.some(x => x.fn === 'pb_prod_run_setup_save'))));
      await page.fill('#cxRs_1_width', '3.5'); await page.selectOption('#cxRs_1_bed', { label: 'Fine sand · 02-100' }); await page.tap('#cxRunSetupSave'); await sleep(page, 1200);
      let a = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_prod_run_setup_save').pop() || {}).args);
      check('saved only the changes, version 0 (' + JSON.stringify(a && a.p_change) + ')', a && a.p_expect_version === 0 && JSON.stringify(a.p_change) === JSON.stringify({ parts: { 1: { bed: { id: '11111111-1111-1111-1111-111111111111', name: 'Fine sand' }, width: 3.5 } } }));
      t = await setupTxt(page);
      check('shows 3.5 ft and Fine sand, marked PM (' + t.slice(0, 260) + ')', /Bedding: Fine sand PM/.test(t) && /Trench width: 3\.5 ft PM/.test(t) && /PM: Pat PM/.test(t));
      srv = JSON.parse(await page.evaluate(() => localStorage.getItem('__rrsrv')));
      await ctx.close(); }
    { // the foreman: field setup wins; undo
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctF', role: 'foreman', extra: { __rrsrv: JSON.stringify(srv) } });
      await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 2000); await M.dismiss(page);
      page.on('pageerror', e => errs.push(String(e)));
      const x = Object.values(srv.runs)[0];
      await page.evaluate(([p, s]) => window.pbRrCrewOpen(p, s, 'Mike Smith', 'crewreports'), [x.pid, x.entry]); await sleep(page, 2500);
      let t = await setupTxt(page);
      check('foreman sees the PM’s setup (' + t.slice(0, 200) + ')', /Trench width: 3\.5 ft PM/.test(t) && /field setup/.test(t));
      await page.tap('#cxRunSetupEdit'); await sleep(page, 400);
      check('foreman form starts from the result (3.5)', (await page.inputValue('#cxRs_1_width')) === '3.5');
      await page.fill('#cxRs_1_width', '4'); await page.tap('#cxRunSetupSave'); await sleep(page, 1200);
      let a = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_prod_run_setup_save').pop() || {}).args);
      check('foreman sends width 4, version 1', a && a.p_expect_version === 1 && JSON.stringify(a.p_change) === JSON.stringify({ parts: { 1: { width: 4 } } }));
      t = await setupTxt(page);
      check('4 ft marked Foreman, "PM intended: 3.5 ft", Undo (' + t.slice(0, 300) + ')', /Trench width: 4 ft Foreman/.test(t) && /PM intended: 3\.5 ft/.test(t) && /Undo My Change/.test(t));
      await page.evaluate(() => [...document.querySelectorAll('#cxRunSetup button')].find(b => /Undo My Change/.test(b.textContent)).click()); await sleep(page, 1200);
      a = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_prod_run_setup_save').pop() || {}).args);
      t = await setupTxt(page);
      check('Undo: clears his width, back to the PM’s 3.5 (' + t.slice(0, 160) + ')', a && JSON.stringify(a.p_change) === JSON.stringify({ clear: ['1.width'] }) && /Trench width: 3\.5 ft PM/.test(t));
      await page.screenshot({ path: '/home/claude/feat_runsetup/foreman_setup.png', fullPage: false });
      srv = JSON.parse(await page.evaluate(() => localStorage.getItem('__rrsrv')));
      await ctx.close(); }
    { // the PM moves it to another job; a stale version is reported
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctM', role: 'pm', manager: true, extra: { __rrsrv: JSON.stringify(srv) } });
      await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 2000); await M.dismiss(page);
      page.on('pageerror', e => errs.push(String(e)));
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 2000);
      await page.click('#homeCxRuns2'); await sleep(page, 1500);
      await page.evaluate(() => window.pbRrOpen(0)); await sleep(page, 1500);
      await page.tap('#cxRunSetupEdit'); await sleep(page, 400);
      check('office form starts from its own intended 3.5', (await page.inputValue('#cxRs_1_width')) === '3.5');
      await page.fill('#cxRsJob', '26015'); await page.tap('#cxRunSetupSave'); await sleep(page, 1200);
      const a = await page.evaluate(() => (window.__rpcLog.filter(x => x.fn === 'pb_prod_run_setup_save').pop() || {}).args);
      check('job change sent alone', a && JSON.stringify(a.p_change) === JSON.stringify({ job_number: '26015' }));
      check('report shows Job 26015', /Job: 26015 PM/.test(await setupTxt(page)) && /26015/.test(await page.evaluate(() => (document.querySelector('#cxList .pbx-h2') || document.querySelector('.pbx-h2') || {}).textContent || '')));
      await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('__rrsrv')); Object.values(s.runs)[0].setup.version = 99; localStorage.setItem('__rrsrv', JSON.stringify(s)); });
      await page.tap('#cxRunSetupEdit'); await sleep(page, 400); await page.fill('#cxRsSite', 'Main St'); await page.tap('#cxRunSetupSave'); await sleep(page, 1200);
      check('someone changed it meanwhile: says so', /changed this run’s setup since you opened it/.test(await txt(page, 'cxRunSetupErr')));
      await ctx.close(); }
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
