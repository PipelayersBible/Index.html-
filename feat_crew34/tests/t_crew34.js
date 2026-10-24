// feat_crew34 (r15.34): the CREW-side fixes from the overnight sweep (/home/claude/night/crew.md), the probes' "BUG:" checks
// flipped. Runs on the site run_t.sh serves (PB_TEST_DIR); the push rows (block C) go through batch 13 P's Pages-origin harness
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

    // ================= B. Frank: Home, the form while the plan is slow, Save, what follows =================
    { const { ctx, page } = await C.setup(browser, { who: 'foreman', extra: { __psrv: srv, __rrsrv: rr, __planDelay: '2500' } });
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(3500);
      let home = await C.screenText(page);
      check('B control: Home tile "2 Runs need production", row "Run reports to approve · 2 run reports from your crew"', /2\nRuns need production/.test(home) && /2 run reports from your crew/.test(home), home.slice(0, 500));
      check('B7: no "Crew runs" row while no run is in progress (the tile and the report row are the doors)', !/Crew runs\n/.test(home) && !/Enter production for each run/.test(home), home.slice(0, 500));
      await page.click('#homeFmWait'); await C.waitFor(page, () => !!document.querySelector('#pmLive0 [id^="pmLiveEnter"]'), 15000); await page.waitForTimeout(500);
      // open the run whose card says 40 of 100 ft: the buttons are in the same block, pick by pre-fill after opening
      let opened = false;
      for (const id of await page.evaluate(() => [...document.querySelectorAll('#pmLive0 [id^="pmLiveEnter"]')].map(b => b.id))) {
        await page.click('#' + id); await page.waitForTimeout(300);
        const labels = await labelsOf(page, '#pmLiveForm'), k = labels.findIndex(l => /^Pipe Installed/.test(l));
        if (k >= 0 && (await page.inputValue('#pmLiveQ' + k)) === '40') { opened = true; break; }
        await page.evaluate(() => pbLvFormCancel()); await page.waitForTimeout(300);
      }
      check('B control: "Enter production for this run" opened for the laid run (Pipe Installed pre-filled 40), the first box focused', opened && (await page.evaluate(() => document.activeElement && document.activeElement.id)) === 'pmLiveQ0', await page.evaluate(() => document.activeElement && document.activeElement.id));
      let labels = await labelsOf(page, '#pmLiveForm');
      check('B control: before the plan answers, the form has the plain "Equipment hours (h)" box and no pieces', labels.includes('Equipment hours (h)') && !(await page.$('#pmLiveEqAdd')), labels.join(' | '));
      check('B4: the form says "Crew hours (h)" like every list (not "Crew man-hours")', labels.includes('Crew hours (h)') && !labels.some(l => /man-hours/.test(l)), labels.join(' | '));
      const manK = labels.indexOf('Crew hours (h)'), eqK = labels.indexOf('Equipment hours (h)');
      await page.click('#pmLiveQ' + manK); await page.keyboard.type('24');
      await page.click('#pmLiveQ' + eqK); await page.keyboard.type('6');
      // the plan lands while the box has focus
      check('B control: the plan answered', await C.waitFor(page, () => (window.__rpcLog || []).some(x => x.fn === 'pb_prod_job_plan_crew') && !!document.getElementById('pmLiveEqAdd'), 10000));
      await page.waitForTimeout(300);
      labels = await labelsOf(page, '#pmLiveForm');
      check('B1: with a box focused, the form redrew when the plan landed: cost-code labels and the pieces section', labels.some(l => /Excavation \(LF\) · 02-100/.test(l)) && !!(await page.$('#pmLiveEqAdd')) && !labels.includes('Equipment hours (h)'), labels.join(' | '));
      const eqSec = await page.evaluate(() => { const e = document.getElementById('pmLiveEqSec'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
      check('B1: the 6 h typed in the total box became an "Other equipment" row, used 6', /Other equipment/.test(eqSec) && (await page.inputValue('#pmLiveE0')) === '6', eqSec);
      check('B1: the focus moved with his number to the Other equipment box (the keyboard did not close)', (await page.evaluate(() => document.activeElement && document.activeElement.id)) === 'pmLiveE0', await page.evaluate(() => document.activeElement && document.activeElement.id));
      const manK2 = labels.indexOf('Crew hours (h)'), excK = labels.findIndex(l => /^Excavation/.test(l));
      check('B1: what was typed before the redraw is still there (Crew hours 24)', (await page.inputValue('#pmLiveQ' + manK2)) === '24');
      await page.click('#pmLiveQ' + excK); await page.keyboard.type('55');
      // adding a piece while a box has focus shows it at once
      await page.selectOption('#pmLiveEqAdd', 'eq_excavator'); await page.waitForTimeout(400);
      check('B1: picking a piece shows it at once (no tap outside needed) and keeps what was typed', !!(await page.$('#pmLiveE1')) && (await page.inputValue('#pmLiveQ' + excK)) === '55' && (await page.inputValue('#pmLiveE0')) === '6');
      await page.fill('#pmLiveE1', '8'); await page.fill('#pmLiveEI1', '1.5');
      await page.screenshot({ path: SH + 'B_form.png', fullPage: true });
      await page.click('#pmLiveSave');
      check('B control: saved and synced', await C.waitFor(page, () => /Synced: counts for the company/.test((document.getElementById('pmLive0') || {}).textContent || ''), 20000));
      await page.waitForTimeout(800);
      const call = await lastCall(page, 'pb_prod_crew_run_save');
      check('B1: the server call carries excavation 55, pipe 40, _manhours 24, _eq_other 6, _eq_excavator 8, _ei_excavator 1.5, _equiphours 14', !!call && JSON.stringify(call.args.p_items) === JSON.stringify([{ key: 'excavation', qty: 55, unit: 'LF' }, { key: 'pipe', qty: 40, unit: 'LF' }, { key: '_manhours', qty: 24, unit: 'h' }, { key: '_eq_other', qty: 6, unit: 'h' }, { key: '_eq_excavator', qty: 8, unit: 'h' }, { key: '_ei_excavator', qty: 1.5, unit: 'h' }, { key: '_equiphours', qty: 14, unit: 'h' }]), JSON.stringify(call && call.args.p_items));
      // 6: the just-saved run stays open in the card
      const vis = await page.evaluate(() => { const el = document.getElementById('pmLive0'); const d = el.querySelector('details'); const open = el.cloneNode(true); open.querySelectorAll('details:not([open])').forEach(x => x.remove()); return { all: el.innerText.replace(/\s+/g, ' '), visible: open.innerText.replace(/\s+/g, ' '), folded: d ? d.innerText.replace(/\s+/g, ' ') : '' }; });
      check('B6: right after Save the run stays open: "Entered just now" with "Your production for this run … Synced: counts for the company" in view (not folded away)', /Entered just now/.test(vis.visible) && /Your production for this run/.test(vis.visible) && /Excavation 55 LF · Pipe Installed 40 LF/.test(vis.visible) && /Synced: counts for the company/.test(vis.visible), vis.visible);
      check('B6: the dry hole still waits ("Ended run waiting for your production" once, for it)', (vis.visible.match(/Ended run waiting for your production/g) || []).length === 1 && !/ended runs waiting/.test(vis.visible), vis.visible);
      check('B6: the hours line reads "Crew hours 24 h · Equipment hours 14 h (Other equipment 6 h, Excavator #312 8 h, Excavator #312 idle 1.5 h)"', /Crew hours 24 h · Equipment hours 14 h \(Other equipment 6 h, Excavator #312 8 h, Excavator #312 idle 1\.5 h\)/.test(vis.visible), vis.visible);
      await page.screenshot({ path: SH + 'B_after_save.png', fullPage: true });
      // 7: the sent report of that session is approved too
      check('B7: saving from My crew now approved the session’s sent report (pb_prod_run_report_review called once)', await C.waitFor(page, () => (window.__rpcLog || []).filter(x => x.fn === 'pb_prod_run_report_review').length === 1, 10000));
      const reviewed = await page.evaluate(() => { const r = JSON.parse(localStorage.getItem('__rrsrv')).runs; return Object.values(r).filter(x => x.reviewed_at).map(x => x.entry); });
      check('B7: …the laid run’s report, not the dry hole’s', reviewed.length === 1 && reviewed[0] === s1, JSON.stringify(reviewed) + ' s1=' + s1);
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(2500);
      home = await C.screenText(page);
      check('B7: Home after: tile "1 Runs need production" (the dry hole), "1 run report from your crew" (the dry hole’s)', /1\nRuns need production/.test(home) && /1 run report from your crew/.test(home), home.slice(0, 500));
      // 6 + 4: My production › Today lists the crew-run entry; "Your work today" lists the work only
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(2500);
      const status = await C.text(page, 'pmStatus'), today = await C.text(page, 'pmToday'), mine = await C.screenText(page);
      check('B6: My production status no longer says "Nothing entered yet…" after a crew-run entry', !/^Nothing entered yet/.test(status || '') && /All production synced/.test(status || ''), status);
      check('B6: Today lists "Wes Hall’s run · Job 24-101 · Today — Excavation 55 LF · Pipe Installed 40 LF" with the hours line and the Synced chip', /Wes Hall’s run · Job 24-101 · Today/.test(today || '') && /Excavation 55 LF · Pipe Installed 40 LF/.test(today || '') && /Crew hours 24 h · Equipment hours 14 h/.test(today || '') && /Synced: counts for the company/.test(today || '') && !/Nothing entered today yet/.test(today || ''), today);
      const yw = (mine.match(/Your work today:[^\n]*/) || [''])[0];
      check('B4: "Your work today" lists the work only: Excavation 175 LF · Pipe Installed 140 LF, no hours, no pieces', /^Your work today: Excavation 175 LF · Pipe Installed 140 LF$/.test(yw.trim()), yw);
      const c2 = await cardTxt(page);
      check('B6: back on the screen the saved run is folded under "Today’s other runs" again; the dry hole still waits', /Today’s other runs \(1\)/.test(c2) && /Ended run waiting for your production/.test(c2) && !/Entered just now/.test(c2), c2);
      await page.screenshot({ path: SH + 'B_mine.png', fullPage: true });
      // ---- 5 + 2: the report list and the dry hole ----
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(1500);
      await page.click('#homeWork_rrReview'); await page.waitForTimeout(2000);
      const list = await page.evaluate(() => [...document.querySelectorAll('[id^="cxRev"]')].map(b => b.innerText.replace(/\s+/g, ' ')));
      check('B5: the two rows read differently: one "100 ft run · 40 ft marked laid · ended …", the other "100 ft run · 0 ft marked laid · ended …"', list.length === 2 && list[0] !== list[1] && list.some(t => /100 ft run · 40 ft marked laid · ended /.test(t)) && list.some(t => /100 ft run · 0 ft marked laid · ended /.test(t)), list.join(' || '));
      check('B7: the list shows the laid run Approved and the dry hole Not approved', list.some(t => /40 ft marked laid/.test(t) && /Approved/.test(t) && !/Not approved/.test(t)) && list.some(t => /0 ft marked laid/.test(t) && /Not approved/.test(t)), list.join(' || '));
      await page.screenshot({ path: SH + 'B_list.png', fullPage: true });
      const i2 = list.findIndex(t => /Not approved/.test(t));
      await page.click('#cxRev' + i2);
      await C.waitFor(page, () => !!document.getElementById('cxRunApproveBtn'), 15000); await page.waitForTimeout(1500);
      const vals = await page.evaluate(() => [...document.querySelectorAll('#cxRunProdBox input')].map(i => i.value));
      check('B2 control: the dry hole’s form opens empty', vals.length > 0 && vals.every(v => v === ''), JSON.stringify(vals));
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
      check('B2: the report says "No production was entered for this run. If there is some, enter it from My crew now (My production)." instead of an empty form', /No production was entered for this run\. If there is some, enter it from My crew now \(My production\)\./.test(det) && !(await page.$('#cxRunProdBox input')), det.slice(0, 700));
      await page.screenshot({ path: SH + 'B_dry_hole.png', fullPage: true });
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(2500);
      home = await C.screenText(page);
      check('B2: Home: "0 Runs need production" and no "Run reports to approve" row (both reports approved)', /0\nRuns need production/.test(home) && !/Run reports to approve/.test(home), home.slice(0, 500));
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(2000);
      const c3 = await cardTxt(page);
      check('B2: My crew now: nothing waits for production; both runs under "Today’s other runs (2)" (the dry hole can still take an entry there)', !/waiting for your production/.test(c3) && /Today’s other runs \(2\)/.test(c3), c3);
      srv = await C.srv(page);
      check('B: Frank, no page errors', !page._errors.length, page._errors.join(' | '));
      await ctx.close(); }

    // ================= C. a run with no job number (3) =================
    { const { ctx, page } = await C.setup(browser, { who: 'pipelayer', uid: 'acctP2' });
      await M.lockRun(page);
      await page.evaluate(() => pbLaidMark(3)); await page.waitForTimeout(400);
      await endRun(page);
      check('C control: Walt’s run (no job number) reports ended', await C.waitFor(page, () => (window.__statusPuts || []).some(x => x.ended === true), 15000));
      srv = await C.srv(page); srv.links = (srv.links || []).concat([{ foreman: 'acctF', pipelayer: 'acctP2', by: 'acctF', started: new Date(Date.now() - 20 * 86400000).toISOString() }]); // Walt is on Frank's crew too
      await ctx.close(); }
    { const { ctx, page } = await C.setup(browser, { who: 'foreman', extra: { __psrv: srv } });
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(2500);
      const cards = await page.evaluate(() => [...document.querySelectorAll('.pbp-livecard')].map((c, i) => ({ i, name: c.querySelector('.pbp-livename').textContent, head: [...c.querySelectorAll('.pbp-ehead')].map(h => h.textContent.trim()), btn: (c.querySelector('[id^="pmLiveEnter"]') || {}).id })));
      const w = cards.find(c => c.head.some(h => /^No job number/.test(h)) && c.btn);
      check('C control: a crew card with an ended run that has no job number and an Enter production button', !!w, JSON.stringify(cards));
      if (w) {
        await page.click('#' + w.btn); await page.waitForTimeout(800);
        const form = await page.evaluate(() => document.getElementById('pmLiveForm').innerText.replace(/\s+/g, ' '));
        check('C3: the form has a "Job number" box and says why: "This run has no job number, so its production would count toward no job."', !!(await page.$('#pmLiveJob')) && /Job number/.test(form) && /This run has no job number, so its production would count toward no job\./.test(form), form.slice(0, 300));
        const opts = await page.evaluate(() => [...document.querySelectorAll('#pmLiveJobList option')].map(o => o.value));
        check('C3: the company’s jobs are offered as choices (24-101 among them)', opts.includes('24-101'), JSON.stringify(opts));
        const saves0 = await calls(page, 'pb_prod_crew_run_save');
        await page.click('#pmLiveSave'); await page.waitForTimeout(800);
        const err = await page.evaluate(() => { const e = document.querySelector('#pmLiveForm .pbp-manmsg'); return e ? e.textContent : ''; });
        check('C3: Save with the job empty is refused: "Enter the job number: this run has none, so its production would count toward no job."', /Not savedEnter the job number: this run has none, so its production would count toward no job\./.test(err) && (await calls(page, 'pb_prod_crew_run_save')) === saves0, err);
        await page.fill('#pmLiveJob', '24-101'); await page.click('#pmLiveSave');
        check('C3: with a job typed it saves and syncs', await C.waitFor(page, () => [...document.querySelectorAll('.pbp-livecard')].some(c => /Synced: counts for the company/.test(c.textContent)) && (window.__rpcLog || []).some(x => x.fn === 'pb_prod_crew_run_save'), 20000));
        const call = await lastCall(page, 'pb_prod_crew_run_save');
        check('C3: filed under Job 24-101 with Pipe Installed 30 LF', !!call && call.args.p_record.jobNumber === '24-101' && call.args.p_items[0].key === 'pipe' && call.args.p_items[0].qty === 30, JSON.stringify(call && [call.args.p_record.jobNumber, call.args.p_items]));
        await page.screenshot({ path: SH + 'C_nojob.png', fullPage: true });
      }
      // 4: the crew-link dialog (foreman side)
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
        check('D4: "Runs waiting for me" says whose it is: "Foreman: pipelayers’ runs assigned or held for you"', rows.some(r => r === 'Runs waiting for me — Foreman: pipelayers’ runs assigned or held for you'), rows.join(' | '));
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
