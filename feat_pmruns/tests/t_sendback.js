// r15.3 SEND BACK + DELETE (owner, Oct 21): the office sends an approved report back to the foreman with a note
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
    if (fn === 'pb_prod_run_remove') { log(); const x = byId(args.p_id); if (!x || role !== 'foreman') return { data: null, error: { message: 'pb:not_allowed' } }; x.removed_at = new Date().toISOString(); x.removed_by_name = 'Brandon Jones'; save(); return { data: { ok: true, removed_at: x.removed_at, voided: 0 }, error: null }; }
    if (fn === 'pb_prod_run_report_send_back') {
      log(); const x = byId(args.p_id);
      if (localStorage.getItem('__manager') !== '1') return { data: null, error: { message: 'pb:not_manager' } };
      if (!x.reviewed_at) return { data: null, error: { message: 'pb:not_approved' } };
      if (String(args.p_note || '').trim().length < 3) return { data: null, error: { message: 'pb:note_needed' } };
      Object.assign(x, { reviewed_at: null, sent_back_at: new Date().toISOString(), sent_back_note: args.p_note }); save();
      return { data: { ok: true, sent_back_at: x.sent_back_at, foreman: 'Brandon Jones' }, error: null };
    }
    if (fn === 'pb_prod_company_runs' || fn === 'pb_prod_company_run_get') {
      if (localStorage.getItem('__manager') !== '1') return { data: null, error: { message: 'pb:not_company_account' } };
      const row = (x) => Object.assign({ id: x.id, entry_id: x.entry, job_number: x.record.jobNumber, label: 'Start to End', locked_at: x.record.lockTime, ended: true, distance_ft: x.record.distance, photo_count: 0, version: 1, who: 'Mike Smith', role: 'pipelayer', sent_at: x.sent_at, sent_how: x.sent_how, reviewed_at: x.reviewed_at || null, reviewed_by_name: x.reviewed_at ? 'Brandon Jones' : null, removed_at: x.removed_at || null, removed_by_name: x.removed_by_name || null, removed_reason: null, status: x.removed_at ? 'removed' : 'waiting', can_send_back: !!x.reviewed_at && !x.removed_at }, sb(x));
      if (fn === 'pb_prod_company_runs') return { data: { runs: all().filter(x => x.sent_at).map(row), server_at: new Date().toISOString() }, error: null };
      const x = byId(args.p_id); return x ? { data: Object.assign(row(x), { record: x.record }), error: null } : { data: null, error: { message: 'pb:not_found' } };
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
      check('setup: 2 runs sent (' + Object.keys(srv.runs).length + ')', Object.values(srv.runs).filter(x => x.sent_at).length === 2);
      Object.values(srv.runs)[0].reviewed_at = new Date().toISOString(); // the first is approved already
      await ctx.close();
    }
    { // the PM sends the approved one back
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctM', role: 'pm', manager: true, extra: { __rrsrv: JSON.stringify(srv) } });
      await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 2000); await M.dismiss(page);
      page.on('pageerror', e => errs.push(String(e)));
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 2000);
      await page.click('#homeCxRuns2'); await sleep(page, 1500);
      const rows = await page.evaluate(() => [...document.querySelectorAll('[id^="cxRun"]')].filter(e => /^cxRun\d+$/.test(e.id)).map(e => e.innerText.replace(/\s+/g, ' ')));
      const ai = rows.findIndex(r => /Approved by/.test(r)), ni = rows.findIndex(r => /Not approved yet/.test(r));
      check('office list: one approved, one not (' + rows.join(' | ').slice(0, 200) + ')', ai >= 0 && ni >= 0);
      await page.click('#cxRun' + ni); await sleep(page, 1500);
      check('a report not approved yet has no Send Back', await page.evaluate(() => !document.getElementById('cxSendBackBtn')));
      await page.click('#cxRunBack'); await sleep(page, 800);
      await page.click('#cxRun' + ai); await sleep(page, 1500);
      check('an approved report has "Send Back to Foreman"', /Send Back to Foreman/.test(await txt(page, 'cxSendBackBtn')));
      await page.click('#cxSendBackBtn'); await sleep(page, 500);
      check('Send Back opens a note box, focused', await page.evaluate(() => document.activeElement && document.activeElement.id === 'cxSendBackNote'));
      await page.click('#cxSendBackGo'); await sleep(page, 600);
      check('no note: says to type one, nothing sent', /Type what the foreman needs/.test(await txt(page, 'cxSendBackForm')) && !(await page.evaluate(() => window.__rpcLog.some(x => x.fn === 'pb_prod_run_report_send_back'))));
      await page.fill('#cxSendBackNote', 'Add the crew hours and the 2 services'); await sleep(page, 3500); // a redraw must keep the typing
      check('typed note survives the 1.5 s Home redraw', (await page.inputValue('#cxSendBackNote')) === 'Add the crew hours and the 2 services');
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/sendback_form.png' });
      await page.click('#cxSendBackGo'); await sleep(page, 2000);
      const call = await page.evaluate(() => (window.__rpcLog.find(x => x.fn === 'pb_prod_run_report_send_back') || {}).args);
      check('sent back with the run id, the note and this account (' + JSON.stringify(call) + ')', call && /^rr-/.test(call.p_id) && call.p_note === 'Add the crew hours and the 2 services' && call.p_expect_uid === 'acctM');
      check('it says it was sent back to Brandon Jones', /Sent back to Brandon Jones/.test(await page.evaluate(() => document.body.innerText)));
      await M.dismiss(page); await sleep(page, 500);
      const d = await txt(page, 'cxRunSentBack');
      check('the report shows "Sent back by" with the note, no Approved, no Send Back button (' + d + ')', /Sent back by/.test(d) && /crew hours/.test(d) && !(await page.evaluate(() => !!document.getElementById('cxSendBackBtn'))));
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/sendback_done.png' });
      await page.click('#cxRunBack'); await sleep(page, 1500);
      const r2 = await page.evaluate(() => [...document.querySelectorAll('[id^="cxRun"]')].filter(e => /^cxRun\d+$/.test(e.id)).map(e => e.innerText.replace(/\s+/g, ' ')).join(' | '));
      check('office list: "Sent back", nothing Approved now (' + r2.slice(0, 200) + ')', /Sent back/.test(r2) && !/Approved by/.test(r2));
      srv = JSON.parse(await page.evaluate(() => localStorage.getItem('__rrsrv')));
      await ctx.close();
    }
    { // the foreman: sees it sent back, approves again; deletes the other
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctF', role: 'foreman', extra: { __rrsrv: JSON.stringify(srv) } });
      await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 2000); await M.dismiss(page);
      page.on('pageerror', e => errs.push(String(e)));
      await page.evaluate(() => pbGotoTab('home'));
      await L.waitFor(page, () => !!document.getElementById('homeWork_rrReview'), 15000);
      const c = await txt(page, 'homeWork_rrReview');
      check('foreman Home: "1 sent back by the office" (' + c + ')', /2 run reports/.test(c) && /1 sent back by the office: see the note/.test(c));
      await page.click('#homeWork_rrReview'); await sleep(page, 1500);
      const rows = await page.evaluate(() => [...document.querySelectorAll('[id^="cxRev"]')].map(e => e.innerText.replace(/\s+/g, ' ')));
      const bi = rows.findIndex(r => /Sent back by Pat PM: Add the crew hours/.test(r));
      check('his list shows who sent it back and the note (' + rows.join(' | ').slice(0, 220) + ')', bi >= 0);
      await page.click('#cxRev' + bi); await sleep(page, 1500);
      await L.waitFor(page, () => !!document.getElementById('cxRunLiveQ0'), 15000);
      const n = await txt(page, 'cxRunSentBack');
      check('the report opens with the note on top and Approve Report (' + n + ')', /Sent back by Pat PM/.test(n) && /crew hours/.test(n) && await page.evaluate(() => !!document.getElementById('cxRunApproveBtn') && !document.getElementById('cxSendBackBtn')));
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/foreman_sentback.png' });
      const k = await page.evaluate(() => [...document.querySelectorAll('#cxRunProdBox label')].findIndex(l => /Pipe Installed/.test(l.textContent)));
      await page.fill('#cxRunLiveQ' + k, '160'); await page.click('#cxRunApproveBtn'); await sleep(page, 3000);
      check('approved again: the sent-back note is gone', await page.evaluate(() => window.__rpcLog.some(x => x.fn === 'pb_prod_run_report_review') && !document.getElementById('cxRunSentBack') && /Approved/.test((document.getElementById('cxRunSent') || {}).textContent || '')));
      await page.click('#cxRunBack'); await sleep(page, 1500);
      const rows2 = await page.evaluate(() => [...document.querySelectorAll('[id^="cxRev"]')].map(e => e.innerText.replace(/\s+/g, ' ')));
      const oi = rows2.findIndex(r => /Not approved/.test(r));
      await page.click('#cxRev' + oi); await sleep(page, 1500);
      await L.waitFor(page, () => !!document.getElementById('cxRunMore'), 15000);
      const fold = await page.evaluate(() => { const m = document.getElementById('cxRunMore'), b = document.getElementById('cxRunDelete'); return { open: m && m.open, seen: b ? b.checkVisibility() : null, last: !!m && !m.nextElementSibling }; });
      check('Delete Run is folded under "More" at the bottom, not out in the open (' + JSON.stringify(fold) + ')', fold.open === false && fold.seen === false && fold.last);
      await page.click('#cxRunMore summary'); await sleep(page, 300);
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/foreman_more.png' });
      await page.click('#cxRunDelete'); await sleep(page, 600);
      check('it asks first: "Delete this run?" with Delete Run and Cancel', await page.evaluate(() => /Delete this run\?/.test(document.body.innerText) && [...document.querySelectorAll('#pbModalButtons button')].map(b => b.textContent.trim()).join() === 'Cancel,Delete Run'));
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/foreman_confirm.png' });
      await page.evaluate(() => [...document.querySelectorAll('#pbModalButtons button')].find(b => b.textContent.trim() === 'Cancel').click()); await sleep(page, 500);
      check('Cancel: nothing deleted', !(await page.evaluate(() => window.__rpcLog.some(x => x.fn === 'pb_prod_run_remove'))));
      await page.click('#cxRunDelete'); await sleep(page, 600);
      await page.evaluate(() => [...document.querySelectorAll('#pbModalButtons button')].find(b => b.textContent.trim() === 'Delete Run').click()); await sleep(page, 2500);
      const rc = await page.evaluate(() => (window.__rpcLog.find(x => x.fn === 'pb_prod_run_remove') || {}).args);
      check('Delete Run: asks the server with the run and this account (' + JSON.stringify(rc) + ')', rc && /^rr-/.test(rc.p_id) && rc.p_expect_uid === 'acctF');
      const left = await page.evaluate(() => [...document.querySelectorAll('[id^="cxRev"]')].map(e => e.innerText.replace(/\s+/g, ' ')));
      check('back on his list, the deleted run is gone (' + left.length + ')', left.length === 1 && /Approved/.test(left[0]));
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 2000);
      check('Home: nothing left to review', !(await page.evaluate(() => !!document.getElementById('homeWork_rrReview'))));
      srv = JSON.parse(await page.evaluate(() => localStorage.getItem('__rrsrv')));
      await ctx.close();
    }
    { // the PM sees the deletion
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctM', role: 'pm', manager: true, extra: { __rrsrv: JSON.stringify(srv) } });
      await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 2000); await M.dismiss(page);
      page.on('pageerror', e => errs.push(String(e)));
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 2000);
      await page.click('#homeCxRuns2'); await sleep(page, 1500);
      const rows = await page.evaluate(() => [...document.querySelectorAll('[id^="cxRun"]')].filter(e => /^cxRun\d+$/.test(e.id)).map(e => e.innerText.replace(/\s+/g, ' ')));
      const di = rows.findIndex(r => /Deleted by Brandon Jones/.test(r));
      check('office list: "Deleted by Brandon Jones", no approve tag on it (' + rows.join(' | ').slice(0, 220) + ')', di >= 0 && !/Not approved|Waiting for a foreman/.test(rows[di]));
      check('the deleted run isn\'t counted as waiting (' + await page.evaluate(() => window.pbRrWaitingCount('acctM')) + ')', (await page.evaluate(() => window.pbRrWaitingCount('acctM'))) === 0);
      await page.click('#cxRun' + di); await sleep(page, 1500);
      const d = await txt(page, 'cxRunRemoved');
      check('it opens with "Deleted by Brandon Jones … the server keeps a copy", no Send Back (' + d + ')', /Deleted/.test(d) && /Brandon Jones/.test(d) && /keeps a copy/.test(d) && !(await page.evaluate(() => !!document.getElementById('cxSendBackBtn'))));
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/office_deleted.png' });
      await ctx.close();
    }
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
