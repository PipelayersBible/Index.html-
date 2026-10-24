// r15.20 feat_eqtab: used / idle / down hours per piece on the foreman's form. Copy of r15.8 t_equip_foreman.
const L = require('/home/claude/batch14/F/tests/lf_lib.js'); const { M, check } = L;
const sleep = (p, ms) => p.waitForTimeout(ms);
const MOCK = () => {
  const orig = window.__rpc;
  window.__rpc = async (fn, args) => {
    const srv = JSON.parse(localStorage.getItem('__rrsrv') || '{"runs":{}}'), me = (JSON.parse(localStorage.getItem('__mockSess') || 'null') || {}).id;
    const save = () => localStorage.setItem('__rrsrv', JSON.stringify(srv));
    if (fn === 'pb_prod_job_plan_crew') { window.__rpcLog.push({ fn, args }); return { data: { job_key: '26014', plan: { categories: [{ key: 'pipe', name: 'Pipe Installed', unit: 'LF', planned: 3000 }], equipment: [{ key: 'eq_cat320', name: 'CAT 320', unit_no: '12', cost_code: '02-300' }, { key: 'eq_loader', name: 'Loader' }] } }, error: null }; }
    if (fn === 'pb_prod_crew_autolink') return { data: { ok: true, linked: false, reason: 'no_match' }, error: null };
    if (fn === 'pb_prod_run_record_put') {
      window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args || {})) });
      const k = me + '|' + args.p_entry_id, old = srv.runs[k] || null, rec = args.p_record, ended = !!(rec.completed || rec.incomplete);
      const x = { id: old ? old.id : 'rr-' + Object.keys(srv.runs).length, pid: me, entry: args.p_entry_id, record: rec, sent_at: old ? old.sent_at : null, sent_how: old ? old.sent_how : null, reviewed_at: old ? old.reviewed_at : null };
      if (!x.sent_at && ended && rec.pbOffice && rec.pbOffice.send) { x.sent_at = new Date().toISOString(); x.sent_how = 'pipelayer'; }
      if (!x.sent_at && ended && localStorage.getItem('__autoSend') === String(args.p_entry_id)) { x.sent_at = new Date().toISOString(); x.sent_how = 'auto'; }
      srv.runs[k] = x; save();
      return { data: { ok: true, same: false, version: 1, sent_at: x.sent_at, sent_how: x.sent_how }, error: null };
    }
    if (fn === 'pb_prod_crew_live' && (localStorage.getItem('__role') || 'foreman') === 'foreman') {
      const runs = Object.values(srv.runs).map(x => ({ session_ref: x.entry, run_ref: 'r-' + x.entry, ended: true, mine: null, theirs: null, job_number: x.record.jobNumber, updated_at: new Date().toISOString(), status: { label: 'Start → End', jobNumber: x.record.jobNumber, totalFt: 200, laidFt: 0, ended: true } }));
      return { data: { foreman: true, today: new Date().toISOString().slice(0, 10), server_at: new Date().toISOString(), crew: [{ id: 'acctP', name: 'Mike Smith', since: new Date().toISOString(), runs }] }, error: null };
    }
    if (fn === 'pb_prod_crew_reports') {
      window.__rpcLog.push({ fn, args });
      return { data: { foreman: true, server_at: new Date().toISOString(), reports: Object.values(srv.runs).filter(x => x.sent_at).map(x => ({ id: x.id, pipelayer_id: x.pid, entry_id: x.entry, job_number: x.record.jobNumber, label: x.record.startLabel + ' to ' + x.record.endLabel, sent_at: x.sent_at, sent_how: x.sent_how, reviewed_at: x.reviewed_at, who: 'Mike Smith', status: 'waiting' })) }, error: null };
    }
    if (fn === 'pb_prod_crew_run_record') {
      const x = srv.runs[args.p_pipelayer + '|' + args.p_session_ref];
      if (!x) return { data: null, error: { message: 'pb:no_record' } };
      if (!x.sent_at) return { data: null, error: { message: 'pb:not_sent' } };
      return { data: { id: x.id, record: x.record, who: 'Mike Smith', job_number: x.record.jobNumber, label: 'run', locked_at: x.record.lockTime, photo_count: 0, sent_at: x.sent_at, sent_how: x.sent_how, reviewed_at: x.reviewed_at, can_review: true }, error: null };
    }
    if (fn === 'pb_prod_run_report_review') {
      window.__rpcLog.push({ fn, args });
      const x = Object.values(srv.runs).find(y => y.id === args.p_id); if (!x) return { data: null, error: { message: 'pb:not_found' } };
      const again = !!x.reviewed_at; if (!again) x.reviewed_at = new Date().toISOString(); save();
      return { data: { ok: true, reviewed_at: x.reviewed_at, again }, error: null };
    }
    return orig(fn, args);
  };
};
const endRun = (page) => page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = '26014'; e.completed = true; e.runEndTime = Date.now(); return window.__debugSaveRunArchive().then(() => e.id); });
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  let srv = null;
  try {
    { const { ctx, page } = await L.setupTouch(browser, { uid: 'acctP', role: 'pipelayer' });
      await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 1800); await M.dismiss(page);
      page.on('pageerror', e => errs.push(String(e)));
      await M.lockRun(page, { dist: 200 }); await M.dismiss(page);
      const id = await endRun(page); await page.evaluate((i) => localStorage.setItem('__autoSend', String(i)), id);
      await page.evaluate(() => window.__pbRrDebug.send()); await sleep(page, 2500);
      srv = await page.evaluate(() => localStorage.getItem('__rrsrv'));
      check('setup: a run sent', Object.values(JSON.parse(srv).runs).some(x => x.sent_at));
      await ctx.close(); }
    { const { ctx, page } = await L.setupTouch(browser, { uid: 'acctF', role: 'foreman', extra: { __rrsrv: srv } });
      await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 2000); await M.dismiss(page);
      page.on('pageerror', e => errs.push(String(e)));
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 1000);
      await L.waitFor(page, () => !!document.getElementById('homeWork_rrReview'), 15000);
      await page.click('#homeWork_rrReview'); await sleep(page, 1500);
      await page.click('#cxRev0'); await sleep(page, 1500);
      await L.waitFor(page, () => !!document.getElementById('cxRunLiveEqAdd'), 15000);
      const labs = await page.evaluate(() => [...document.querySelectorAll('#cxRunProdBox label')].map(l => l.textContent));
      check('foreman form: Equipment hours section, no single equipment total (' + labs.join(' | ') + ')', !labs.some(l => /^Equipment hours/.test(l)) && /Equipment hours/.test(await page.evaluate(() => document.getElementById('cxRunLiveEqSec').innerText)));
      const opts = await page.evaluate(() => [...document.querySelectorAll('#cxRunLiveEqAdd option')].map(o => o.textContent));
      check('add list: the job equipment and Other (' + opts.join(' | ') + ')', opts.join('|') === '+ Add equipment…|CAT 320 #12 · 02-300|Loader|Other equipment (not on the list)');
      const k = labs.findIndex(l => /Pipe Installed/.test(l)); await page.fill('#cxRunLiveQ' + k, '140');
      await page.selectOption('#cxRunLiveEqAdd', 'eq_cat320'); await sleep(page, 400);
      check('the typed footage stays after adding a piece', (await page.inputValue('#cxRunLiveQ' + k)) === '140');
      await page.fill('#cxRunLiveE0', '6');
      check('each piece: Used h / Idle h / Down h', await page.evaluate(() => [...document.querySelectorAll('#cxRunLiveEqSec .pbeq-piece')][0].innerText.replace(/\s+/g, ' ')).then(t => /Used h/.test(t) && /Idle h/.test(t) && /Down h/.test(t)));
      await page.fill('#cxRunLiveEI0', '2'); await page.fill('#cxRunLiveED0', '1');
      await page.selectOption('#cxRunLiveEqAdd', 'eq_other'); await sleep(page, 400);
      check('the typed hours stay after adding another', (await page.inputValue('#cxRunLiveE0')) === '6');
      await page.fill('#cxRunLiveE1', 'x'); await page.click('#cxRunApproveBtn'); await sleep(page, 1200);
      check('bad hours refused', /Other equipment: enter the used hours/.test(await page.evaluate(() => document.getElementById('cxRunApproveErr').textContent)));
      check('review: Approve Report is the one button (no Cancel / Save Production)', !(await page.isVisible('#cxRunLiveSave')) && await page.isVisible('#cxRunApproveBtn')); // feat_runedit
      await page.fill('#cxRunLiveE1', '1.5'); await sleep(page, 200);
      check('fixing the box clears the message', await page.evaluate(() => { const e = document.getElementById('cxRunApproveErr'); return !e || e.style.display === 'none' || !e.textContent; })); // feat_runedit
      await page.screenshot({ path: '/home/claude/feat_runedit/foreman_form.png' });
      await page.click('#cxRunApproveBtn'); await sleep(page, 3000);
      const items = await page.evaluate(() => (Object.values(window.__pbLvDebug().runs || {})[0] || {}).items || []);
      check('saved per piece: used, idle, down; total 7.5 is the used (' + JSON.stringify(items) + ')', JSON.stringify(items) === JSON.stringify([{ key: 'pipe', qty: 140, unit: 'LF' }, { key: '_eq_cat320', qty: 6, unit: 'h' }, { key: '_ei_cat320', qty: 2, unit: 'h' }, { key: '_ed_cat320', qty: 1, unit: 'h' }, { key: '_eq_other', qty: 1.5, unit: 'h' }, { key: '_equiphours', qty: 7.5, unit: 'h' }]));
      const shown = await page.evaluate(() => (document.getElementById('cxRunProdBox') || {}).innerText.replace(/\s+/g, ' '));
      check('shown: Equipment hours 7.5 h (CAT 320 #12 6 h, Other equipment 1.5 h) (' + shown.slice(0, 200) + ')', /Equipment hours 7\.5 h \(CAT 320 #12 6 h, CAT 320 #12 idle 2 h, CAT 320 #12 down 1 h, Other equipment 1\.5 h\)/.test(shown));
      await page.evaluate(() => { const b = [...document.querySelectorAll('#cxRunProdBox button')].find(x => /Change Production/.test(x.textContent)); b.click(); }); await sleep(page, 800);
      check('Change Production: pieces come back with used / idle / down', (await page.inputValue('#cxRunLiveE0')) === '6' && (await page.inputValue('#cxRunLiveEI0')) === '2' && (await page.inputValue('#cxRunLiveED0')) === '1' && (await page.inputValue('#cxRunLiveE1')) === '1.5');
      await ctx.close(); }
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
