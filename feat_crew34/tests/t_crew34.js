// feat_crew34 (r15.34): the CREW-side fixes from the overnight sweep (/home/claude/night/crew.md), the probes' "BUG:" checks
// flipped. Brought up to r16.22 (Nov 11): r15.38 one door (Home tile -> Run reports to approve -> the report's production form,
// Approve Report saves it), r15.48 role wording, r16.00 End Run sends the report, r16.07 no hour boxes on the production form.
// Runs on the site run_t.sh serves (PB_TEST_DIR); the push rows (block D) go through batch 13 P's Pages-origin harness
// on the same site. Mock: ./clib.js (= night/crew/clib.js with distance_ft / laid_ft / ended_at on the report rows, as
// feat_pmruns/sql/05 fills them, and a __planDelay switch that makes the job plan answer late).
process.env.PB_P_SITE = process.env.PB_TEST_DIR || '/home/claude/feat_crew34/out/site';
const P = require('/home/claude/batch13/P/tests/push_lib.js');
const C = require('./clib.js'); const { M, T, check } = C;
const fs = require('fs'); const SH = '/home/claude/feat_crew34/tests/shots/'; fs.mkdirSync(SH, { recursive: true });
const cardTxt = (p) => p.evaluate(() => { const el = document.getElementById('pmLive0'); return el ? el.innerText.replace(/\s+/g, ' ').trim() : ''; });
const labelsOf = (p, sel) => p.evaluate((s) => [...document.querySelectorAll(s + ' label')].map(l => l.textContent.trim()), sel);
const lastCall = (p, fn) => p.evaluate((f) => (window.__rpcLog || []).filter(x => x.fn === f).pop() || null, fn);
const calls = (p, fn) => p.evaluate((f) => (window.__rpcLog || []).filter(x => x.fn === f).length, fn);
const endRun = async (page) => { await page.evaluate(() => pbEndRun()); await page.waitForTimeout(600); await M.dismiss(page); await page.waitForTimeout(300); await M.dismiss(page); await page.waitForTimeout(300); await M.dismiss(page); };
// r15.38 (job question at Lock) / r15.57 (no foreman picked): a company member's Lock stops on "Which Job Is This Run On?"
// when the form has no job, and a pipelayer's with no foreman on "No Foreman Picked". Answer them as a person would while
// lib.js's lockRun waits for Results: type the job (default 24-101) and "Lock anyway". (Same as batch14 lf_lib / roles_lib.)
const lockRun0 = M.lockRun;
M.lockRun = async function lockRun(page, opts = {}) {
  const job = opts.job === undefined ? '24-101' : opts.job; let done = false;
  const answer = (async () => { while (!done) { try { await page.evaluate((j) => {
    const ov = document.getElementById('pbModalOverlay'); if (!ov || getComputedStyle(ov).display === 'none') return;
    const t = (document.getElementById('pbModalTitle') || {}).textContent || '';
    if (t === 'No Foreman Picked') { const b = [...document.querySelectorAll('#pbModalButtons button')].find(x => x.textContent.trim() === 'Lock anyway'); if (b) b.click(); }
    else if (t === 'Which Job Is This Run On?') { const i = document.getElementById('rfJobType'), g = document.getElementById('rfJobTypeGo'); if (j && i && g) { i.value = j; g.click(); } }
  }, job); } catch (e) {} await new Promise(r => setTimeout(r, 200)); } })();
  try { return await lockRun0(page, opts); } finally { done = true; await answer; }
};
(async () => {
  const browser = await M.chromium.launch();
  try {
    // ================= A. Wes: a laid run and a dry hole, both reports sent =================
    let srv = null, rr = null, s1 = null, s2 = null;
    { const { ctx, page } = await C.setup(browser, { who: 'pipelayer' });
      await M.lockRun(page);
      await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = '24-101'; e.jobsite = 'Elm St water main'; return window.__debugSaveRunArchive(); }); await page.waitForTimeout(300);
      await page.evaluate(() => pbLaidMark(4)); await page.waitForTimeout(400);
      s1 = await page.evaluate(() => String(window.__debugGetCurrentArchiveEntry().id));
      await endRun(page);
      await page.evaluate((id) => window.pbRrSendNow(Number(id)), s1); await page.waitForTimeout(2000);
      await M.lockRun(page);
      await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = '24-101'; e.jobsite = 'Elm St water main'; return window.__debugSaveRunArchive(); }); await page.waitForTimeout(300);
      s2 = await page.evaluate(() => String(window.__debugGetCurrentArchiveEntry().id));
      await endRun(page);
      await page.evaluate((id) => window.pbRrSendNow(Number(id)), s2); await page.waitForTimeout(1500); await page.evaluate(() => window.__pbRrDebug.send());
      check('A control: Wes sent both run reports (one with 4 rows laid, one dry hole)', await C.waitFor(page, () => Object.values(JSON.parse(localStorage.getItem('__rrsrv') || '{"runs":{}}').runs).filter(x => x.sent_at).length === 2, 30000));
      check('A control: both runs report ended', await C.waitFor(page, () => (window.__statusPuts || []).filter(x => x.ended === true).length >= 2, 15000));
      await page.waitForTimeout(1000);
      srv = await C.srv(page); rr = await page.evaluate(() => localStorage.getItem('__rrsrv'));
      check('A: Wes, no page errors', !page._errors.length, page._errors.join(' | '));
      await ctx.close(); }

    // ================= B. Frank: Home, the form while the plan is slow, Approve, what follows =================
    // r15.38 (feat_runflow P2–P5): the foreman's one door is the Home tile "Run reports to approve" -> the report list -> the
    // run's report, whose "Production for this run" form (the My crew now form, ids cxRunLive*) is saved by Approve Report.
    // r16.07 (prodfill): the Crew hours (h) / Equipment hours (h) total boxes left the production form (the daily report has
    // them); Excavation and Backfill fill with the pipe feet. The equipment pieces (used · idle · down per machine) stay.
    { const { ctx, page } = await C.setup(browser, { who: 'foreman', extra: { __psrv: srv, __rrsrv: rr, __planDelay: '2500' } });
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(3500);
      let home = await C.screenText(page);
      check('B control: Home tile "4 Run reports to approve · From your crew" (r15.38 one door: Wes’s 2 reports + his held run + Walt’s change); no "Runs need production" tile', /4\nRun reports to approve\nFrom your crew/.test(home) && !/Runs need production/.test(home), home.slice(0, 500));
      check('B7: no "Crew runs" row while no run is in progress (the tile is the door)', !/Crew runs\n/.test(home) && !/Enter production for each run/.test(home), home.slice(0, 500));
      await page.click('#homeFmWait'); await C.waitFor(page, () => document.querySelectorAll('[id^="cxRev"]').length >= 2, 15000); await page.waitForTimeout(500);
      let list = await page.evaluate(() => [...document.querySelectorAll('[id^="cxRev"]')].map(b => b.innerText.replace(/\s+/g, ' ')));
      check('B5: the two rows read differently: one "100 ft run · 40 ft marked laid · ended …", the other "100 ft run · 0 ft marked laid · ended …", both Not approved', list.length === 2 && list[0] !== list[1] && list.some(t => /100 ft run · 40 ft marked laid · ended /.test(t) && /Not approved/.test(t)) && list.some(t => /100 ft run · 0 ft marked laid · ended /.test(t) && /Not approved/.test(t)), list.join(' || '));
      const iLaid = list.findIndex(t => /40 ft marked laid/.test(t));
      await page.click('#cxRev' + iLaid); await C.waitFor(page, () => !!document.getElementById('cxRunApproveBtn') && !!document.getElementById('cxRunLiveQ0'), 15000); await page.waitForTimeout(200);
      let labels = await labelsOf(page, '#cxRunProdBox');
      const kOf = (re) => labels.findIndex(l => re.test(l));
      check('B control: the laid run’s report opened with its production form, Pipe Installed pre-filled 40 (Excavation and Backfill follow it, r16.07)', (await page.inputValue('#cxRunLiveQ' + kOf(/^Pipe Installed/))) === '40' && (await page.inputValue('#cxRunLiveQ' + kOf(/^Excavation/))) === '40' && (await page.inputValue('#cxRunLiveQ' + kOf(/^Backfill/))) === '40', labels.join(' | ') + ' :: ' + JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#cxRunProdBox input')].map(i => i.value))));
      check('B control: before the plan answers, no pieces section yet and (r16.07) no plain "Equipment hours (h)" / "Crew hours (h)" boxes', !(await page.$('#cxRunLiveEqAdd')) && !labels.includes('Equipment hours (h)') && !labels.includes('Crew hours (h)'), labels.join(' | '));
      check('B4: nothing on the form says "man-hours"', !labels.some(l => /man-hours/.test(l)) && !/man-hours/.test(await C.screenText(page)), labels.join(' | '));
      const excK = kOf(/^Excavation/);
      await page.click('#cxRunLiveQ' + excK); await page.keyboard.press('Control+A'); await page.keyboard.type('55');
      // the plan lands while the box has focus
      check('B control: the plan answered', await C.waitFor(page, () => (window.__rpcLog || []).some(x => x.fn === 'pb_prod_job_plan_crew') && !!document.getElementById('cxRunLiveEqAdd'), 10000));
      await page.waitForTimeout(300);
      labels = await labelsOf(page, '#cxRunProdBox');
      check('B1: with a box focused, the form redrew when the plan landed: cost-code labels and the pieces section', labels.some(l => /Excavation \(LF\) · 02-100/.test(l)) && labels.some(l => /Pipe Installed \(LF\) · 02-200/.test(l)) && !!(await page.$('#cxRunLiveEqAdd')) && !labels.includes('Equipment hours (h)'), labels.join(' | '));
      check('B1: the focus stayed on the box being typed in (the keyboard did not close)', (await page.evaluate(() => document.activeElement && document.activeElement.id)) === 'cxRunLiveQ' + excK, await page.evaluate(() => document.activeElement && document.activeElement.id));
      check('B1: what was typed before the redraw is still there (Excavation 55), the pre-fills too (Pipe 40)', (await page.inputValue('#cxRunLiveQ' + excK)) === '55' && (await page.inputValue('#cxRunLiveQ' + kOf(/^Pipe Installed/))) === '40');
      // adding a piece while a box has focus shows it at once
      await page.selectOption('#cxRunLiveEqAdd', 'eq_excavator'); await page.waitForTimeout(400);
      check('B1: picking a piece shows it at once (used · idle · down boxes, no tap outside needed) and keeps what was typed', !!(await page.$('#cxRunLiveE0')) && !!(await page.$('#cxRunLiveEI0')) && !!(await page.$('#cxRunLiveED0')) && (await page.inputValue('#cxRunLiveQ' + excK)) === '55' && /Excavator #312 · 05-100/.test(await C.screenText(page)));
      await page.fill('#cxRunLiveE0', '8'); await page.fill('#cxRunLiveEI0', '1.5');
      await page.screenshot({ path: SH + 'B_form.png', fullPage: true });
      check('B control: the form’s own Save Production button is not offered here: Approve Report saves it (r15.38 P2)', !(await page.evaluate(() => { const b = document.getElementById('cxRunLiveSave'); return b && b.getClientRects().length > 0; })));
      await page.click('#cxRunApproveBtn');
      check('B control: approved (the report shows Approved)', await C.waitFor(page, () => !!document.getElementById('cxRunApproved'), 20000));
      check('B control: the production reached the server (pb_prod_crew_run_save answered ok)', await C.waitFor(page, () => (window.__rpcLog || []).some(x => x.fn === 'pb_prod_crew_run_save') && Object.values(JSON.parse(localStorage.getItem('__psrv') || '{"entries":{}}').entries).some(e => e.user === 'acctF' && e.record && e.record.src === 'crewrun'), 20000)); // the Synced chip is checked in My production below
      await page.waitForTimeout(800);
      const call = await lastCall(page, 'pb_prod_crew_run_save');
      check('B1: the server call carries pipe 40, excavation 55, backfill 40, _eq_excavator 8, _ei_excavator 1.5, _equiphours 8 — no _manhours / _eq_other (r16.07: hours boxes gone)', !!call && JSON.stringify(call.args.p_items) === JSON.stringify([{ key: 'pipe', qty: 40, unit: 'LF' }, { key: 'excavation', qty: 55, unit: 'LF' }, { key: 'backfill', qty: 40, unit: 'LF' }, { key: '_eq_excavator', qty: 8, unit: 'h' }, { key: '_ei_excavator', qty: 1.5, unit: 'h' }, { key: '_equiphours', qty: 8, unit: 'h' }]), JSON.stringify(call && call.args.p_items));
      const rep = await C.screenText(page);
      check('B6: the report shows the production it now carries: "Pipe Installed 40 LF · Excavation 55 LF · Backfill 40 LF" and "Equipment hours 8 h (Excavator #312 used 8 h · idle 1.5 h)", with Change Production', /Pipe Installed 40 LF · Excavation 55 LF · Backfill 40 LF/.test(rep) && /Equipment hours 8 h \(Excavator #312 used 8 h · idle 1\.5 h\)/.test(rep) && !!(await page.$('#cxRunLiveEdit0')), rep.slice(0, 600));
      await page.screenshot({ path: SH + 'B_after_save.png', fullPage: true });
      // 7: the sent report of that session is approved with its production
      check('B7: Approve Report filed the production AND approved the session’s sent report (pb_prod_run_report_review called once)', (await calls(page, 'pb_prod_run_report_review')) === 1);
      const reviewed = await page.evaluate(() => { const r = JSON.parse(localStorage.getItem('__rrsrv')).runs; return Object.values(r).filter(x => x.reviewed_at).map(x => x.entry); });
      check('B7: …the laid run’s report, not the dry hole’s', reviewed.length === 1 && reviewed[0] === s1, JSON.stringify(reviewed) + ' s1=' + s1);
      await page.click('#cxListBack'); await C.waitFor(page, () => document.querySelectorAll('[id^="cxRev"]').length >= 2, 15000); await page.waitForTimeout(500);
      list = await page.evaluate(() => [...document.querySelectorAll('[id^="cxRev"]')].map(b => b.innerText.replace(/\s+/g, ' ')));
      check('B7: the list shows the laid run Approved and the dry hole Not approved', list.some(t => /40 ft marked laid/.test(t) && /Approved/.test(t) && !/Not approved/.test(t)) && list.some(t => /0 ft marked laid/.test(t) && /Not approved/.test(t)), list.join(' || '));
      await page.screenshot({ path: SH + 'B_list.png', fullPage: true });
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(2500);
      home = await C.screenText(page);
      check('B7: Home after: tile "3 Run reports to approve" (the dry hole, the held run, the change)', /3\nRun reports to approve\nFrom your crew/.test(home), home.slice(0, 500));
      // 6 + 4: My production › Today lists the crew-run entry; "Your work today" lists the work only
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(2500);
      const status = await C.text(page, 'pmStatus'), today = await C.text(page, 'pmToday'), mine = await C.screenText(page);
      check('B6: My production status no longer says "Nothing entered yet…" after a crew-run entry', !/^Nothing entered yet/.test(status || '') && /All production synced/.test(status || ''), status);
      check('B6: Today lists "Wes Hall’s run · Job 24-101 · Today — Pipe Installed 40 LF · Excavation 55 LF · Backfill 40 LF" with the equipment line and the Synced chip', /Wes Hall’s run · Job 24-101 · Today/.test(today || '') && /Pipe Installed 40 LF · Excavation 55 LF · Backfill 40 LF/.test(today || '') && /Equipment hours 8 h \(Excavator #312 used 8 h · idle 1\.5 h\)/.test(today || '') && /Synced: counts for the company/.test(today || '') && !/Nothing entered today yet/.test(today || ''), today);
      const yw = (mine.match(/Your work today:[^\n]*/) || [''])[0];
      check('B4: "Your work today" lists the work only: Backfill 40 LF · Excavation 175 LF · Pipe Installed 140 LF, no hours, no pieces', /^Your work today: Backfill 40 LF · Excavation 175 LF · Pipe Installed 140 LF$/.test(yw.trim()), yw);
      const c2 = await cardTxt(page);
      check('B6: My crew now: the dry hole still waits ("Ended run waiting for your production" once, with Open Run Report); the entered run no longer waits', (c2.match(/Ended run waiting for your production/g) || []).length === 1 && !/2 ended runs waiting/.test(c2) && /Open Run Report/.test(c2) && !/Entered just now/.test(c2), c2);
      await page.screenshot({ path: SH + 'B_mine.png', fullPage: true });
      // ---- 2: the dry hole ----
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(1500);
      await page.click('#homeFmWait'); await C.waitFor(page, () => document.querySelectorAll('[id^="cxRev"]').length >= 2, 15000); await page.waitForTimeout(500);
      list = await page.evaluate(() => [...document.querySelectorAll('[id^="cxRev"]')].map(b => b.innerText.replace(/\s+/g, ' ')));
      const i2 = list.findIndex(t => /Not approved/.test(t));
      await page.click('#cxRev' + i2);
      await C.waitFor(page, () => !!document.getElementById('cxRunApproveBtn'), 15000); await page.waitForTimeout(1500);
      const vals = await page.evaluate(() => [...document.querySelectorAll('#cxRunProdBox input')].map(i => i.value));
      check('B2 control: the dry hole’s form opens empty (nothing laid: nothing pre-filled)', vals.length > 0 && vals.every(v => v === ''), JSON.stringify(vals));
      const saves0 = await calls(page, 'pb_prod_crew_run_save');
      await page.click('#cxRunApproveBtn'); await page.waitForTimeout(800);
      let m = await C.modal(page);
      check('B2: Approve Report asks once: "No production entered for this run. Approve the report anyway? Nothing is counted for it." with Cancel / Approve Without Production', !!m && /^No production entered for this run\. Approve the report anyway\? Nothing is counted for it\.$/.test(m.msg) && m.buttons.join('|') === 'Cancel|Approve Without Production', JSON.stringify(m));
      check('B2: no "Enter at least one quantity." and the button is still "Approve Report"', !(await C.text(page, 'cxRunApproveErr')) && (await C.text(page, 'cxRunApproveBtn')) === 'Approve Report');
      await C.click(page, '^Cancel$'); await page.waitForTimeout(300);
      check('B2: Cancel keeps the form and approves nothing', !!(await page.$('#cxRunApproveBtn')) && !(await page.$('#cxRunApproved')) && (await calls(page, 'pb_prod_run_report_review')) === 1);
      await page.click('#cxRunApproveBtn'); await page.waitForTimeout(500); await C.click(page, '^Approve Without Production$');
      check('B2: Approve Without Production marks the report approved', await C.waitFor(page, () => !!document.getElementById('cxRunApproved'), 20000));
      await page.waitForTimeout(800);
      check('B2: nothing was filed for the run (no pb_prod_crew_run_save)', (await calls(page, 'pb_prod_crew_run_save')) === saves0);
      const det = await C.screenText(page);
      check('B2: the report says "Approved without production. If there is some, enter it here." with an Enter Production button instead of an empty form (r15.38 P10 wording)', /Approved without production\. If there is some, enter it here\./.test(det) && !!(await page.$('#cxRunProdLate')) && !(await page.$('#cxRunProdBox input')), det.slice(0, 700));
      await page.screenshot({ path: SH + 'B_dry_hole.png', fullPage: true });
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(2500);
      home = await C.screenText(page);
      check('B2: Home: tile "2 Run reports to approve" (both reports approved; the held run and the change remain)', /2\nRun reports to approve\nFrom your crew/.test(home) && !/Runs need production/.test(home), home.slice(0, 500));
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(2000);
      const c3 = await cardTxt(page);
      check('B2: My crew now: nothing waits for production any more', !/waiting for your production/.test(c3), c3);
      srv = await C.srv(page);
      check('B: Frank, no page errors', !page._errors.length, page._errors.join(' | '));
      await ctx.close(); }

    // ================= C. a run with no job number (3) =================
    // r15.38: Lock asks "Which Job Is This Run On?", so a run with no job number is only an older one; made here by clearing
    // the job after Lock. r16.00 (P1): End Run sends the report itself, so its door is the report (Open Run Report), where the
    // production form (cxRunLive*) carries the Job number box.
    { const { ctx, page } = await C.setup(browser, { who: 'pipelayer', uid: 'acctP2' });
      await M.lockRun(page);
      await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = ''; e.jobsite = ''; return window.__debugSaveRunArchive(); }); await page.waitForTimeout(300);
      await page.evaluate(() => pbLaidMark(3)); await page.waitForTimeout(400);
      await endRun(page);
      check('C control: Walt’s run (no job number) reports ended', await C.waitFor(page, () => (window.__statusPuts || []).some(x => x.ended === true && !x.jobNumber), 15000));
      check('C control: its report was sent by End Run itself (r16.00 P1)', await C.waitFor(page, () => Object.values(JSON.parse(localStorage.getItem('__rrsrv') || '{"runs":{}}').runs).some(x => x.sent_at), 20000));
      await page.waitForTimeout(500);
      srv = await C.srv(page); srv.links = (srv.links || []).concat([{ foreman: 'acctF', pipelayer: 'acctP2', by: 'acctF', started: new Date(Date.now() - 20 * 86400000).toISOString() }]); // Walt is on Frank's crew too
      rr = await page.evaluate(() => localStorage.getItem('__rrsrv'));
      await ctx.close(); }
    { const { ctx, page } = await C.setup(browser, { who: 'foreman', extra: { __psrv: srv, __rrsrv: rr } });
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(2500);
      const cards = await page.evaluate(() => [...document.querySelectorAll('.pbp-livecard')].map((c, i) => ({ i, name: c.querySelector('.pbp-livename').textContent, head: [...c.querySelectorAll('.pbp-ehead')].map(h => h.textContent.trim()), btn: (c.querySelector('[id^="pmLiveEnter"], [id^="pmLiveRpt"]') || {}).id, txt: c.innerText.replace(/\s+/g, ' ') })));
      const w = cards.find(c => c.head.some(h => /^No job number/.test(h)));
      check('C control: a crew card with an ended run that has no job number, waiting for production, its door the run report', !!w && /Ended run waiting for your production/.test(w.txt) && /Open Run Report/.test(w.txt), JSON.stringify(cards));
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(1500);
      await page.click('#homeFmWait'); await C.waitFor(page, () => [...document.querySelectorAll('[id^="cxRev"]')].some(x => /Walt Ruiz/.test(x.innerText)), 15000); await page.waitForTimeout(300);
      const nj = await page.evaluate(() => { const r = [...document.querySelectorAll('[id^="cxRev"]')].find(x => /Walt Ruiz/.test(x.innerText)); return r ? r.innerText.replace(/\s+/g, ' ') : ''; });
      check('C control: the report list names it "No job number · Start → End … 100 ft run · 30 ft marked laid"', /^No job number · Start → End/.test(nj) && /100 ft run · 30 ft marked laid/.test(nj), nj);
      await page.evaluate(() => { const r = [...document.querySelectorAll('[id^="cxRev"]')].find(x => /Walt Ruiz/.test(x.innerText)); r.click(); });
      await C.waitFor(page, () => !!document.getElementById('cxRunApproveBtn') && !!document.getElementById('cxRunLiveQ0'), 15000); await page.waitForTimeout(800);
      const form = await page.evaluate(() => document.getElementById('cxRunProdBox').innerText.replace(/\s+/g, ' '));
      check('C3: the form has a "Job number" box and says why: "This run has no job number, so its production would count toward no job."', !!(await page.$('#cxRunLiveJob')) && /Job number/.test(form) && /This run has no job number, so its production would count toward no job\./.test(form), form.slice(0, 300));
      const opts = await page.evaluate(() => [...document.querySelectorAll('#cxRunLiveJobList option')].map(o => o.value));
      check('C3: the company’s jobs are offered as choices (24-101 among them)', opts.includes('24-101'), JSON.stringify(opts));
      check('C3: Pipe Installed pre-filled 30 from the rows marked laid', (await page.inputValue('#cxRunLiveQ0')) === '30');
      const saves0 = await calls(page, 'pb_prod_crew_run_save');
      await page.click('#cxRunApproveBtn'); await page.waitForTimeout(1000);
      const err = await page.evaluate(() => { const e = document.querySelector('#cxRunProdBox .pbp-manmsg') || document.getElementById('cxRunApproveErr'); return e ? e.textContent : ''; });
      check('C3: Approve with the job empty is refused: "Enter the job number: this run has none, so its production would count toward no job." — nothing filed, nothing approved', /Enter the job number: this run has none, so its production would count toward no job\./.test(err) && (await calls(page, 'pb_prod_crew_run_save')) === saves0 && !(await page.$('#cxRunApproved')) && (await C.text(page, 'cxRunApproveBtn')) === 'Approve Report', err);
      await page.fill('#cxRunLiveJob', '24-101'); await page.click('#cxRunApproveBtn');
      check('C3: with a job typed it saves and syncs', await C.waitFor(page, () => !!document.getElementById('cxRunApproved') && (window.__rpcLog || []).some(x => x.fn === 'pb_prod_crew_run_save'), 20000));
      const call = await lastCall(page, 'pb_prod_crew_run_save');
      check('C3: filed under Job 24-101 with Pipe Installed 30 LF', !!call && call.args.p_record.jobNumber === '24-101' && call.args.p_items[0].key === 'pipe' && call.args.p_items[0].qty === 30, JSON.stringify(call && [call.args.p_record.jobNumber, call.args.p_items]));
      await page.screenshot({ path: SH + 'C_nojob.png', fullPage: true });
      // 4: the crew-link dialog (foreman side)
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(1500);
      await C.waitFor(page, () => !!document.getElementById('pmCrewRemove0'), 10000);
      await page.click('#pmCrewRemove0'); await page.waitForTimeout(300);
      let m = await C.modal(page);
      check('C4: "Remove" says "Their runs then leave your crew view; production you already entered for their runs stays." (no "wait for any foreman")', !!m && /Their runs then leave your crew view; production you already entered for their runs stays\./.test(m.msg) && !/wait for any foreman|stay assigned/.test(m.msg), m && m.msg);
      await C.click(page, '^Cancel$');
      check('C: Frank, no page errors', !page._errors.length, page._errors.join(' | '));
      await ctx.close(); }
    // 4: the crew-link dialog (pipelayer side)
    { const { ctx, page } = await C.setup(browser, { who: 'pipelayer' });
      await page.evaluate(() => pbOpenProdMine()); await C.waitFor(page, () => !!document.getElementById('pmEndLinkBtn'), 15000);
      await page.click('#pmEndLinkBtn'); await page.waitForTimeout(300);
      const m = await C.modal(page);
      check('C4: "No Foreman" says "Your runs then show in no foreman’s crew view until a foreman adds you (or you pick one again). You can pick a foreman any time."', !!m && /Your runs then show in no foreman’s crew view until a foreman adds you \(or you pick one again\)\. You can pick a foreman any time\./.test(m.msg) && !/reminders/.test(m.msg), m && m.msg);
      await C.click(page, '^Cancel$');
      check('C: Wes, no page errors', !page._errors.length, page._errors.join(' | '));
      await ctx.close(); }

    // ================= D. the notification rows (4), Pages-origin push harness =================
    const CHAIN = () => { const crew = window.__rpc, push = window.__pushRpc; window.__rpc = (fn, a) => /^pb_push_/.test(fn) ? push(fn, a) : crew(fn, a); };
    const KEEP = () => { window.__pushRpc = window.__rpc; };
    for (const who of ['foreman', 'pipelayer']) {
      const uid = who === 'foreman' ? 'acctF' : 'acctP';
      const seed = { __psrv: JSON.stringify(C.seed()), __role: who, __foremen: JSON.stringify([{ id: 'acctF', name: 'Frank Ortiz' }]), __pipelayers: JSON.stringify([{ id: 'acctP', name: 'Wes Hall' }]), __names: JSON.stringify({ acctF: 'Frank Ortiz', acctP: 'Wes Hall' }), __perm: 'granted' };
      seed[uid + ':cachedSubscription'] = JSON.stringify({ tier: 'contractor', status: 'active', companyName: 'DIG Civil Construction', companyRole: who, companyId: 'c1' });
      const ctx = await P.ctxFor(browser, { ua: P.ANDROID, uid, email: uid + '@x.com', seed });
      await ctx.addInitScript(KEEP); await ctx.addInitScript(T.RPC); await ctx.addInitScript(C.EXTRA); await ctx.addInitScript(C.CREW_EXTRA); await ctx.addInitScript(CHAIN);
      const page = await P.open(ctx); await page.waitForTimeout(2500);
      await P.openNotif(page); await page.waitForTimeout(600);
      if (await P.visible(page, 'notifOnBtn')) { await page.click('#notifOnBtn'); await page.waitForTimeout(1500); }
      const s = await P.state(page);
      check('D control: ' + who + ' turned notifications on', !!s && s.code === 'on', s && s.text);
      await page.waitForTimeout(800);
      const rows = await page.evaluate(() => [...document.querySelectorAll('#notifTypesSection label.pb-set-switch')].filter(l => !l.hidden && l.offsetParent !== null).map(l => l.querySelector('.name').textContent + ' — ' + l.querySelector('.sub').textContent));
      if (who === 'pipelayer') {
        check('D4: a pipelayer gets no "Crew production reminders" row (he has no crew)', !rows.some(r => /^Crew production reminders/.test(r)), rows.join(' | '));
        // r15.48 access: the row is worded for the account's own role: a pipelayer's are his own runs, a foreman's his pipelayers'
        check('D4: "Runs waiting for me" says whose it is: for a pipelayer "Your runs still waiting for a foreman" (r15.48)', rows.some(r => r === 'Runs waiting for me — Your runs still waiting for a foreman') && !rows.some(r => /Foreman: pipelayers’ runs/.test(r)), rows.join(' | '));
      } else {
        check('D4: the foreman keeps "Runs waiting for me" and "Crew production reminders" (on by default)', rows.some(r => /^Runs waiting for me — Foreman:/.test(r)) && rows.some(r => /^Crew production reminders — When your crew starts or finishes a run/.test(r)) && await page.evaluate(() => document.getElementById('notifTypeCrew').checked), rows.join(' | '));
        check('D control: no "Management reports arrived" row for a foreman', !rows.some(r => /Management reports/.test(r)));
      }
      await page.screenshot({ path: SH + 'D_notif_' + who + '.png', fullPage: true });
      check('D: ' + who + ', no page errors', !page._errors.length, page._errors.join(' | '));
      await ctx.close();
    }
  } catch (e) { check('script ran', false, e && e.stack); }
  await browser.close();
})();
