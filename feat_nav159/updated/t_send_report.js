// r15.2 SEND REPORT: a run report is sent in the app (owner, Oct 21). Part 1: a company pipelayer ends a run; Home >
// Current Work shows "Send Run Report"; the Archive shows Not sent, Send Report and Email a Copy (no Mark Sent); Send
// Report sends the office copy with pbOffice.send and the server's sent_at is kept on the run (Home card gone, Archive
// "Sent"). A second run the server sent automatically shows "Sent automatically". Part 2: the foreman's Home shows
// "Run reports to approve"; he opens the report and taps Reviewed. Server mocked with sql/05_report_send.sql's rules.
const L = require('/home/claude/batch14/F/tests/lf_lib.js'); const { M, check } = L;
const sleep = (p, ms) => p.waitForTimeout(ms);
const MOCK = () => {
  const orig = window.__rpc;
  window.__rpc = async (fn, args) => {
    const srv = JSON.parse(localStorage.getItem('__rrsrv') || '{"runs":{}}'), me = (JSON.parse(localStorage.getItem('__mockSess') || 'null') || {}).id;
    const save = () => localStorage.setItem('__rrsrv', JSON.stringify(srv));
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
  let srv = null, id1 = null;
  try {
    {
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctP', role: 'pipelayer' });
      await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 1800); await M.dismiss(page);
      page.on('pageerror', e => errs.push(String(e)));
      await M.lockRun(page, { dist: 200 }); await M.dismiss(page);
      id1 = await endRun(page); await sleep(page, 400);
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 1500);
      const card = await page.evaluate((id) => { const e = document.getElementById('homeWork_rrSend_' + id); return e ? e.innerText.replace(/\s+/g, ' ') : null; }, id1);
      check('Home > Current Work: "Send Run Report" for the ended run (' + card + ')', !!card && /Send Run Report/.test(card) && /Job 26014/.test(card) && /Not sent/.test(card));
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/send_home.png' });
      await page.evaluate(() => pbGotoTab('reports')); await sleep(page, 1200);
      const arch = await page.evaluate(() => { const r = document.querySelector('.pb-arch-run'); return r ? r.innerText.replace(/\s+/g, ' ') : ''; });
      check('Archive: Not sent, Send Report and Email a Copy, no Mark Sent / Send Email (' + arch.slice(0, 160) + ')', /Not sent/.test(arch) && /Send Report/.test(arch) && /Email a Copy/.test(arch) && !/Mark (Not )?Sent/.test(arch) && !/Send Email/.test(arch));
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/send_archive_before.png' });
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 800);
      await page.click('#homeWork_rrSend_' + id1); await sleep(page, 600);
      check('tapping it asks "Send Run Report" with Send Report / View Report / Not Now', await page.evaluate(() => /Send Run Report/.test(document.body.innerText) && [...document.querySelectorAll('button')].some(b => b.offsetParent && b.textContent.trim() === 'Not Now')));
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && x.textContent.trim() === 'Send Report'); b.click(); });
      await L.waitFor(page, () => window.__rpcLog.some(x => x.fn === 'pb_prod_run_record_put' && x.args.p_record.pbOffice && x.args.p_record.pbOffice.send === true), 15000);
      await sleep(page, 2500);
      const st = await page.evaluate((id) => { const e = window.__debugGetCurrentArchiveEntry(); return { sentAt: e.reportSentAt, how: e.reportSentHow, card: !!document.getElementById('homeWork_rrSend_' + id) }; }, id1);
      check('sent: the server\'s time is kept on the run, sent by the pipelayer, Home card gone', typeof st.sentAt === 'number' && st.how === 'pipelayer' && !st.card);
      await page.evaluate(() => pbGotoTab('reports')); await sleep(page, 1200);
      const arch2 = await page.evaluate(() => { const r = document.querySelector('.pb-arch-run'); return r ? r.innerText.replace(/\s+/g, ' ') : ''; });
      check('Archive: Sent, no Send Report button, Email a Copy stays', /Sent/.test(arch2) && !/Not sent/.test(arch2) && !/Send Report/.test(arch2) && /Email a Copy/.test(arch2));
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/send_archive_after.png' });
      // a second run, sent automatically by the server
      await page.evaluate(() => pbGoto('home')); await M.lockRun(page, { dist: 100 }); await M.dismiss(page);
      const id2 = await endRun(page);
      await page.evaluate((id) => localStorage.setItem('__autoSend', String(id)), id2);
      await page.evaluate(() => window.__pbRrDebug.send()); await sleep(page, 3000);
      const a2 = await page.evaluate((id) => { const e = runArchive.find(x => x.id === id); return e ? e.reportSentHow : 'no'; }, id2).catch(() => page.evaluate(() => window.__debugGetCurrentArchiveEntry().reportSentHow));
      check('a run the server sent automatically shows as sent automatically (' + a2 + ')', a2 === 'auto');
      srv = await page.evaluate(() => localStorage.getItem('__rrsrv'));
      await ctx.close();
    }
    {
      const { ctx, page } = await L.setupTouch(browser, { uid: 'acctF', role: 'foreman', extra: { __rrsrv: srv } });
      await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 2000); await M.dismiss(page);
      page.on('pageerror', e => errs.push(String(e)));
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 1000);
      // r15.38 (run report workflow P2): the foreman's Home tile "Run reports to approve" (#homeFmWait) is the one door; the Current Work row only shows a report the office sent back
      await L.waitFor(page, () => /^2\s+Run reports to approve/.test(((document.getElementById('homeFmWait') || {}).innerText || '').replace(/\s+/g, ' ').trim()), 15000);
      const c = await page.evaluate(() => (document.getElementById('homeFmWait') || {}).innerText || '');
      check('foreman Home: "Run reports to approve", 2 from his crew (' + c.replace(/\s+/g, ' ') + ')', /^2\s+Run reports to approve\s+From your crew/.test(c.replace(/\s+/g, ' ').trim()));
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/review_home.png' });
      await page.click('#homeFmWait'); await sleep(page, 1500);
      const row = await page.evaluate(() => (document.getElementById('cxRev0') || {}).innerText || '');
      check('the list: who, sent, Not reviewed (' + row.replace(/\s+/g, ' ') + ')', /Mike Smith/.test(row) && /Not approved/.test(row));
      await page.click('#cxRev0'); await sleep(page, 1500);
      await L.waitFor(page, () => !!document.getElementById('cxRunLiveQ0'), 15000);
      // r15.37 (feat_pdfview) + r16.08 cleanup: one "View Run Report" button opens the in-app PDF viewer screen (Download / Share / Text version live there); no PDF fold or text on the review itself
      check('a report opens with the production form, Approve Report and one View Run Report (no separate Reviewed)', await page.evaluate(() => !document.getElementById('cxRunReviewed') && !!document.getElementById('cxRunApproveBtn') && !!document.getElementById('cxRunLiveQ0') && document.querySelectorAll('#cxRunView').length === 1 && !document.getElementById('cxRunPdfFold') && !document.getElementById('cxRunText')));
      check('production is on top, View Run Report below it, no PDF drawn on the review', await page.evaluate(() => { const a = document.getElementById('cxRunApprove'), f = document.getElementById('cxRunReport'); return !!a && !!f && (a.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING) > 0 && !document.querySelector('#screen-cxList canvas'); }));
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/approve_top.png' });
      await page.click('#cxRunView'); await sleep(page, 300);
      await L.waitFor(page, () => !!document.querySelector('#screen-pdfView.active') && document.querySelectorAll('#pdfvPages canvas').length >= 1, 30000);
      const pv = await page.evaluate(() => { const c = document.querySelectorAll('#pdfvPages canvas'), p = document.querySelectorAll('#pdfvPages .pb-pdfv-page'); return { n: c.length, pages: p.length, w: c[0] ? c[0].getBoundingClientRect().width : 0, ink: (() => { try { const x = c[0].getContext('2d').getImageData(0, 0, c[0].width, Math.min(400, c[0].height)).data; let dark = 0; for (let i = 0; i < x.length; i += 16) if (x[i] < 128) dark++; return dark; } catch (e) { return -1; } })() }; });
      check('View Run Report: the report shows as its PDF in the app (viewer screen): the page drawn, fits the screen, has ink (' + JSON.stringify(pv) + ')', pv.n >= 1 && pv.pages >= 1 && pv.w > 250 && pv.w < 400 && pv.ink > 50);
      await page.click('#pdfvZoom'); await sleep(page, 2500); // r15.37: zoom cycles 100 / 150 / 200 %
      const zw = await page.evaluate(() => { const c = document.querySelector('#pdfvPages canvas'); return c ? c.getBoundingClientRect().width : 0; });
      check('zoom draws it bigger (' + Math.round(zw) + ' px)', zw > pv.w * 1.3);
      await page.click('#pdfvTextBtn'); await sleep(page, 400);
      check('Text version: the report text, a tap away', await page.evaluate(() => getComputedStyle(document.getElementById('pdfvText')).display !== 'none' && document.getElementById('pdfvText').textContent.length > 50));
      await page.click('#pdfvBack'); await sleep(page, 800);
      check('Back from the viewer returns to the review', await page.evaluate(() => (document.querySelector('.pb-screen.active') || {}).id === 'screen-cxList' && !!document.getElementById('cxRunApproveBtn')));
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/review_detail.png' });
      await page.click('#cxRunApproveBtn'); await sleep(page, 1200);
      const mm = await page.evaluate(() => { const ov = document.getElementById('pbModalOverlay'); if (!ov || getComputedStyle(ov).display === 'none') return null; return { msg: document.getElementById('pbModalMessage').textContent, buttons: [...document.querySelectorAll('#pbModalButtons button')].map(b => b.textContent) }; });
      check('Approve with nothing entered: asks "No production entered for this run. Approve the report anyway? Nothing is counted for it." (Cancel / Approve Without Production), not approved', !!mm && /^No production entered for this run\. Approve the report anyway\? Nothing is counted for it\.$/.test(mm.msg) && mm.buttons.join('|') === 'Cancel|Approve Without Production' && !(await page.evaluate(() => window.__rpcLog.some(x => x.fn === 'pb_prod_run_report_review'))));
      await page.evaluate(() => [...document.querySelectorAll('#pbModalButtons button')].find(b => b.textContent === 'Cancel').click()); await sleep(page, 400);
      const k = await page.evaluate(() => [...document.querySelectorAll('#cxRunProdBox label')].findIndex(l => /Pipe Installed/.test(l.textContent)));
      await page.fill('#cxRunLiveQ' + k, '140'); await sleep(page, 200);
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/approve_form.png' });
      await page.click('#cxRunApproveBtn'); await sleep(page, 3000);
      check('Approve Report: production saved for that run and the report approved, in one tap', await page.evaluate(() => window.__rpcLog.some(x => x.fn === 'pb_prod_run_report_review') && Object.values(window.__pbLvDebug().runs || {}).some(r => (r.items || []).some(i => i.key === 'pipe' && i.qty === 140)) && /Approved/.test((document.getElementById('cxRunApproved') || {}).textContent || '') && !document.getElementById('cxRunApproveBtn'))); // r16.08 cleanup: "Approved" said once, in the note under the production (not again in the sent line)
      await page.screenshot({ path: '/home/claude/feat_pmruns/shots/approved.png' });
      await page.click('#cxListBack'); await sleep(page, 1200);
      check('back to the list, that report now Approved', /Approved/.test(await page.evaluate(() => [...document.querySelectorAll('[id^="cxRev"]')].map(e => e.innerText).join(' | '))));
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 1500);
      await L.waitFor(page, () => /^1\s+Run reports to approve/.test(((document.getElementById('homeFmWait') || {}).innerText || '').replace(/\s+/g, ' ').trim()), 10000);
      const c2 = await page.evaluate(() => (document.getElementById('homeFmWait') || {}).innerText || '');
      check('Home: 1 left to review (' + c2.replace(/\s+/g, ' ') + ')', /^1\s+Run reports to approve\s+From your crew/.test(c2.replace(/\s+/g, ' ').trim()));
      await ctx.close();
    }
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
