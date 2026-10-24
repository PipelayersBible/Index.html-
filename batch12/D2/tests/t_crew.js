// Batch 12 D2: Demo on the run; crew runs held for a foreman (assign / send, claim / already counted / edit, the
// 24 hours, honest words when someone else got there first, offline queue); crew links (My foreman / My crew).
// The mock server follows 03_crew_claims.sql (tests/pd_lib.js).
const T = require('./pd_lib.js'); const { M, check } = T;
const waitFor = async (page, fn, ms = 15000, arg) => { for (let t = 0; t < ms; t += 250) { if (await page.evaluate(fn, arg)) return true; await page.waitForTimeout(250); } return false; };
const srv = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('__psrv') || '{"entries":{}}'));
const setSrv = (p, f, arg) => p.evaluate(([fs, a]) => { const s = JSON.parse(localStorage.getItem('__psrv') || '{"entries":{},"plans":{}}'); (new Function('s', 'a', fs))(s, a); localStorage.setItem('__psrv', JSON.stringify(s)); }, [f, arg]);
const errs = [];
const held = (id, user, name, job, items, extra) => [user + '|run:' + id, Object.assign({ id, user, email: user + '@crew.test', company: 'c1', versions: [1], updated_at: new Date().toISOString(), record: { jobNumber: job, workDate: new Date().toISOString().slice(0, 10), enteredBy: name }, items, crew: { state: 'pending', created: Date.now() } }, extra || {})];
(async () => {
  const browser = await M.chromium.launch();
  // ---------- 1. Demo on the run (foreman + company account) ----------
  { const { ctx, page } = await T.setup(browser, { manager: true });
    try {
      check('Demo: the run\'s Foreman Production Entry has a "Feet of demo completed" field', await page.evaluate(() => { const el = document.getElementById('fpDemo'); return !!el && el.type === 'number' && /Feet of demo completed/.test(el.closest('.pb-field').textContent); }));
      await M.lockRun(page);
      await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = '24-101'; return window.__debugSaveRunArchive(); }); await page.waitForTimeout(300);
      await page.fill('#fpForeman', 'Frank'); await page.fill('#fpExcavated', '50'); await page.fill('#fpDemo', '35');
      await page.evaluate(() => pbSaveForemanData()); await page.waitForTimeout(600); await M.dismiss(page);
      check('Demo: saved on the run like the other feet (feetDemo 35)', await page.evaluate(() => window.__debugGetCurrentArchiveEntry().foreman.feetDemo === 35));
      await waitFor(page, () => window.__rpcLog.some(x => x.fn === 'pb_prod_save'));
      const sv = (await T.saves(page)).pop();
      check('Demo: synced as category demo, 35 LF', sv && sv.args.p_items.some(i => i.key === 'demo' && i.qty === 35 && i.unit === 'LF'));
      await page.evaluate(() => pbOpenProdDashboard()); await waitFor(page, () => !!document.getElementById('pdJob0'));
      await page.evaluate(() => pbOpenProdJob(0)); await waitFor(page, () => !!document.getElementById('pjEditBtn'));
      await page.evaluate(() => pbProdPlanEdit()); await page.waitForTimeout(300);
      const row = await page.evaluate(() => { const r = [...document.querySelectorAll('#ppRows fieldset')].find(f => (f.querySelector('input') || {}).value === 'Demo'); return r ? r.textContent : ''; });
      check('Demo: the plan editor says Demo is "Filled in from crews’ runs"', /Filled in from crews’ runs/.test(row));
      check('Demo: manual entry is still there for Demo', await page.evaluate(() => { pbProdPlanCancel(); return [...document.querySelectorAll('#pmanCat option')].some(o => o.value === 'demo'); }));
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 2. a pipelayer's run is held; reminders; assign; send (offline first) ----------
  { const { ctx, page } = await T.setup(browser, { extra: { __role: 'pipelayer' } });
    try {
      await T.runWithProduction(page, { job: '24-101', exc: '100', pipe: null, by: 'Wes' });
      await waitFor(page, () => window.__debugProd().sessions.some(s => /Waiting for a foreman/.test(s.label)));
      let s = (await T.prod(page)).sessions[0];
      check('pipelayer: synced, held for a foreman ("Waiting for a foreman until …: assign it or send it")', /Waiting for a foreman until .*assign it or send it/.test(s.label));
      const sv = await srv(page); const row = Object.values(sv.entries)[0];
      check('pipelayer: on the server it is held (pending), not counted', row.crew && row.crew.state === 'pending');
      await page.evaluate(() => pbGoto('home')); await page.waitForTimeout(500);
      const home = await page.evaluate(() => { const el = document.getElementById('homeAttention_prodCrew'); return el ? el.textContent : ''; });
      check('reminder on Home: "1 run waiting: assign to a foreman or send to the company"', /1 run waiting: assign to a foreman or send to the company/.test(home));
      check('reminder: a badge on the Reports tab', await page.evaluate(() => { const b = document.getElementById('pbProdTabBadge'); return !!b && !b.hidden && b.textContent === '1'; }));
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(800);
      check('My production: "Runs waiting for a foreman" with Assign / Send', await page.evaluate(() => !!document.getElementById('pmHeld') && !!document.getElementById('pmAssign0') && !!document.getElementById('pmSend0')));
      await page.click('#pmAssign0'); await waitFor(page, () => !!document.getElementById('pmPick1'));
      const names = await page.evaluate(() => [...document.querySelectorAll('#pmCrewPick .pbp-pick')].map(b => b.textContent));
      check('assign: picks from the company\'s foremen', names.join(',') === 'Frank Ortiz,Fiona Foreman');
      await page.click('#pmPick1');
      await waitFor(page, () => window.__rpcLog.some(x => x.fn === 'pb_prod_crew_assign'));
      await waitFor(page, () => /Assigned to Fiona Foreman/.test(JSON.stringify(window.__debugProd().sessions)));
      check('assign: sent; the run says "Assigned to Fiona Foreman, waiting for them to claim it"', /Assigned to Fiona Foreman, waiting for them to claim it/.test((await T.prod(page)).sessions[0].label) && Object.values((await srv(page)).entries)[0].crew.assigned === 'acctF2');
      check('assign: the reminder is satisfied (no badge, no Home line)', await page.evaluate(() => { const b = document.getElementById('pbProdTabBadge'); return (!b || b.hidden) && !window.pbProdHomeAttention(); }));
      // review 1 SF2: Fiona is no longer a foreman -> the run counts as unassigned again and the reminder comes back
      await page.evaluate(() => { localStorage.__foremen = JSON.stringify([{ id: 'acctF', name: 'Frank Ortiz' }]); pbOpenProdMine(); });
      await waitFor(page, () => /Waiting for a foreman/.test(JSON.stringify(window.__debugProd().sessions)));
      check('assignee demoted: "Waiting for a foreman" again, and the badge is back', /Waiting for a foreman/.test((await T.prod(page)).sessions[0].label) && await page.evaluate(() => { const b = document.getElementById('pbProdTabBadge'); return !!b && !b.hidden; }));
      await page.evaluate(() => { localStorage.removeItem('__foremen'); });
      // a second run, sent to the company while offline; survives a reload
      await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(300);
      await T.runWithProduction(page, { job: '24-102', exc: '40', pipe: null, by: 'Wes' });
      await waitFor(page, () => window.__debugProd().sessions.some(s => s.rec.jobNumber === '24-102' && /Waiting for a foreman/.test(s.label)));
      const cid = (await T.prod(page)).sessions.find(x => x.rec.jobNumber === '24-102').cid;
      await page.evaluate(() => { localStorage.__rpcMode = 'offline'; });
      await page.evaluate((c) => pbCrewSend(c), cid); await page.waitForTimeout(200);
      const md = await T.modal(page);
      check('send: asks first, naming the note', md && /Sent by the pipelayer without a foreman/.test(md.msg));
      await T.click(page, '^Send to the Company$'); await page.waitForTimeout(800);
      check('send offline: queued on this phone, said so', /Send to the company: saved on this phone, goes as soon as there.s signal/.test((await T.prod(page)).sessions.find(x => x.cid === cid).label) && (await T.prod(page)).st.actions.length === 1);
      await page.reload(); await page.waitForTimeout(2500); await M.dismiss(page);
      check('send offline: still queued after a reload', ((await T.prod(page)).st.actions || []).length === 1);
      await page.evaluate(() => { localStorage.__rpcMode = 'ok'; window.dispatchEvent(new Event('online')); pbProdSyncNow(); });
      await waitFor(page, () => (window.__debugProd().st.actions || []).length === 0, 20000);
      const r2 = Object.values((await srv(page)).entries).find(e => e.record.jobNumber === '24-102');
      check('send: on the server it is sent (counts now)', r2 && r2.crew.state === 'sent');
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(800);
      const pm = await page.evaluate(() => document.getElementById('screen-prodMine').innerText);
      check('send: My production says what happened', /Sent to the company with the note/.test(pm) && /Sent to the company without a foreman/.test(pm));
      // Tommy 11:29: the pipelayer changes the run that already counted (sent) -> waits for approval, the earlier numbers count
      await page.evaluate(() => { const e = window.__debugGetArchive().find(x => x.kind === 'run' && x.jobNumber === '24-102'); e.foreman.feetExcavated = 50; return window.__debugSaveRunArchive(); });
      await page.evaluate(() => pbProdSyncNow());
      await waitFor(page, () => !!(JSON.parse(localStorage.__psrv).entries[Object.keys(JSON.parse(localStorage.__psrv).entries).find(k => JSON.parse(localStorage.__psrv).entries[k].record.jobNumber === '24-102')] || {}).pendingEdit, 15000);
      let r3 = Object.values((await srv(page)).entries).find(e => e.record.jobNumber === '24-102');
      check('edit after counted: stored as a pending edit (50); the counted numbers stay 40', r3.pendingEdit.items[0].qty === 50 && r3.items[0].qty === 40);
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(800);
      check('edit after counted: My production says "Your change is waiting for approval"', /Your change is waiting for approval/.test(await page.evaluate(() => document.getElementById('screen-prodMine').innerText)) && await page.evaluate(() => !!document.getElementById('pmMyEdits')));
      check('edit after counted: no nagging (no badge, no Home line for it)', await page.evaluate(() => { const b = document.getElementById('pbProdTabBadge'); return (!b || b.hidden) && !window.pbProdHomeAttention(); }));
      await page.evaluate(() => { const e = window.__debugGetArchive().find(x => x.kind === 'run' && x.jobNumber === '24-102'); e.foreman.feetExcavated = 60; return window.__debugSaveRunArchive(); });
      await page.evaluate(() => pbProdSyncNow());
      await waitFor(page, () => { const S = JSON.parse(localStorage.__psrv); const e = Object.values(S.entries).find(x => x.record.jobNumber === '24-102'); return e.pendingEdit && e.pendingEdit.items[0].qty === 60; }, 15000);
      r3 = Object.values((await srv(page)).entries).find(e => e.record.jobNumber === '24-102');
      check('edit while pending: the newer change replaces the pending one (the older is kept as replaced)', r3.pendingEdit.items[0].qty === 60 && r3.editHist.some(h => h.decision === 'replaced' && h.items[0].qty === 50) && r3.items[0].qty === 40);
      check('a pipelayer gets no approval list (can\'t approve their own change)', await page.evaluate(() => !document.getElementById('pmEdits')));
      // review 1: a queued Assign for a run the server refused for good says so and what to do (never "waits for signal" forever)
      await page.evaluate(() => { localStorage.__rpcMode = 'offline'; });
      await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(300);
      await T.runWithProduction(page, { job: '24-103', exc: '7', pipe: null, by: 'Wes' }); await page.waitForTimeout(800);
      await page.evaluate(() => { const P = window.__debugProd(), x = P.sessions.find(s => s.rec.jobNumber === '24-103'), st = P.st; st.items[x.cid] = Object.assign({}, st.items[x.cid] || {}, { held: 'other' }); st.actions = (st.actions || []).concat([{ id: 'atest', at: Date.now(), t: 'assign', cid: x.cid, foreman: 'acctF', name: 'Frank Ortiz' }]); });
      await page.evaluate(() => { localStorage.__rpcMode = 'ok'; window.dispatchEvent(new Event('online')); pbProdSyncNow(); });
      await waitFor(page, () => !(window.__debugProd().st.actions || []).some(a => a.id === 'atest'), 15000); await page.waitForTimeout(500);
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(500);
      check('refused run: "Assign to Frank Ortiz: not done, because the company server didn\u2019t accept this run \u2026 Fix the run first"', /Assign to Frank Ortiz: not done, because the company server didn.t accept this run.*Fix the run first/.test(await page.evaluate(() => document.getElementById('pmCrew').innerText)) && await page.evaluate(() => window.__rpcLog.filter(x => x.fn === 'pb_prod_crew_assign').length === 0)); // never sent (the log restarts at the reload above)
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 3. a foreman: runs waiting for me; claim (offline queue), edit, already counted, someone else first ----------
  { const { ctx, page } = await T.setup(browser, { extra: { __names: { acctP: 'Wes Hall' } } });
    try {
      await setSrv(page, `const add = (k, v) => { s.entries[k] = v; };
        a.forEach(([k, v]) => add(k, v));`, [
        held('p1', 'acctP', 'Wes Hall', '24-101', [{ key: 'excavation', qty: 100, unit: 'LF' }]),
        held('p2', 'acctP', 'Wes Hall', '24-101', [{ key: 'pipe', qty: 60, unit: 'LF' }], { crew: { state: 'pending', created: Date.now(), assigned: 'acctF2' } }),
        held('p5', 'acctP', 'Wes Hall', '24-101', [{ key: 'structures', qty: 2, unit: 'EA' }], { crew: { state: 'pending', created: Date.now(), assigned: 'acctGone' } }),
        held('p6', 'acctP', 'Wes Hall', '24-101', [{ key: 'pipe', qty: 10, unit: 'LF' }], { crew: { state: 'sent', created: Date.now(), by: 'acctP' }, pendingEdit: { id: 900, record: { jobNumber: '24-101', workDate: new Date().toISOString().slice(0, 10), enteredBy: 'Wes Hall' }, items: [{ key: 'pipe', qty: 50, unit: 'LF' }], saved_at: new Date().toISOString(), by: 'acctP' } }),
        held('p7', 'acctP', 'Wes Hall', '24-102', [{ key: 'backfill', qty: 8, unit: 'LF' }], { crew: { state: 'sent', created: Date.now(), by: 'acctP' }, pendingEdit: { id: 901, record: { jobNumber: '24-102', workDate: new Date().toISOString().slice(0, 10), enteredBy: 'Wes Hall' }, items: [{ key: 'backfill', qty: 80, unit: 'LF' }], saved_at: new Date().toISOString(), by: 'acctP' } }),
        held('p3', 'acctP', 'Wes Hall', '24-101', [{ key: 'pipe', qty: 30, unit: 'LF' }]),
        held('p4', 'acctP', 'Wes Hall', '24-101', [{ key: 'backfill', qty: 20, unit: 'LF' }])]);
      await page.evaluate(() => pbOpenProdMine()); await waitFor(page, () => !!document.getElementById('pmWait0'));
      const w = await page.evaluate(() => [...document.querySelectorAll('#pmWaiting li')].map(li => li.textContent));
      check('foreman: "Runs waiting for you" shows the unassigned ones only (not one assigned to another foreman)', w.length === 4 && w.every(t => /Wes Hall/.test(t)) && !w.some(t => /Pipe Installed 60/.test(t)));
      check('review 1 SF2: a run assigned to someone no longer a foreman is shown to any foreman', w.some(t => /Structures 2/.test(t)));
      await page.evaluate(() => pbGoto('home')); await page.waitForTimeout(500);
      check('foreman: Home says "4 runs waiting for you · 2 edits waiting for approval"', /4 runs waiting for you · 2 edits waiting for approval/.test(await page.evaluate(() => (document.getElementById('homeAttention_prodCrew') || {}).textContent || '')));
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(600);
      // claim p1 while offline
      await page.evaluate(() => { localStorage.__rpcMode = 'offline'; });
      const i1 = await page.evaluate(() => [...document.querySelectorAll('#pmWaiting li')].findIndex(li => /Excavation 100/.test(li.textContent)));
      await page.click('#pmClaim' + i1); await page.waitForTimeout(400);
      check('claim offline: queued, said so', /Claim: saved on this phone, goes as soon as there.s signal/.test(await page.evaluate(() => document.getElementById('pmWaiting').textContent)));
      // p4: queued claim, but another foreman claims it first
      const i4 = await page.evaluate(() => [...document.querySelectorAll('#pmWaiting li')].findIndex(li => /Backfill 20/.test(li.textContent)));
      await page.click('#pmClaim' + i4); await page.waitForTimeout(300);
      await setSrv(page, `s.entries['acctP|run:p4'].crew.state = 'claimed'; s.entries['acctP|run:p4'].crew.by = 'acctF2';`);
      await page.evaluate(() => { localStorage.__rpcMode = 'ok'; window.dispatchEvent(new Event('online')); pbProdSyncNow(); });
      await waitFor(page, () => (window.__debugProd().st.actions || []).length === 0, 20000); await page.waitForTimeout(1500);
      const S = await srv(page), copy = Object.values(S.entries).find(e => e.source === 'p1');
      check('claim: the quantities became my entry, linked to the original; the original stops counting', copy && copy.user === 'acctA' && copy.items[0].qty === 100 && S.entries['acctP|run:p1'].crew.state === 'claimed');
      const pm = await page.evaluate(() => document.getElementById('screen-prodMine').innerText);
      check('someone else first: "Already claimed by another foreman." and nothing claimed', /Already claimed by another foreman\. Nothing was changed\./.test(pm) && !Object.values(S.entries).some(e => e.source === 'p4'));
      check('claim: shown under "Runs you claimed"', await page.evaluate(() => !!document.getElementById('pmClaimed0') && /From Wes Hall/.test(document.getElementById('pmClaimed').textContent)));
      // edit the claimed copy
      await page.click('#pmEdit0'); await page.waitForTimeout(200);
      await page.fill('#pmEdit0', '90'); await page.click('#pmEditSave');
      await waitFor(page, () => (window.__debugProd().st.actions || []).length === 0 && window.__rpcLog.some(x => x.fn === 'pb_prod_claimed_edit'), 15000); await page.waitForTimeout(800);
      const S2 = await srv(page), copy2 = Object.values(S2.entries).find(e => e.source === 'p1');
      check('edit: my copy is 90 (a new version); the pipelayer\'s original stays 100', copy2.items[0].qty === 90 && copy2.versions.length === 2 && S2.entries['acctP|run:p1'].items[0].qty === 100);
      // review 1 SF1: the run changed after the foreman's list loaded -> refused, list refreshed, honest words
      await setSrv(page, `const e = s.entries['acctP|run:p5']; e.items = [{ key: 'structures', qty: 9, unit: 'EA' }]; e.versions.push(1);`);
      const i5 = await page.evaluate(() => [...document.querySelectorAll('#pmWaiting li')].findIndex(li => /Structures 2/.test(li.textContent)));
      await page.click('#pmClaim' + i5);
      await waitFor(page, () => /This run changed since you opened it/.test(document.getElementById('pmCrew').innerText), 15000); await page.waitForTimeout(1500);
      check('stale claim: "This run changed since you opened it. Check the new numbers." and nothing claimed', !Object.values((await srv(page)).entries).some(e => e.source === 'p5'));
      check('stale claim: the list shows the new numbers', /Structures 9/.test(await page.evaluate(() => document.getElementById('pmWaiting').textContent)));
      // already counted
      const i3 = await page.evaluate(() => [...document.querySelectorAll('#pmWaiting li')].findIndex(li => /Pipe Installed 30/.test(li.textContent)));
      await page.click('#pmCover' + i3); await page.waitForTimeout(200);
      check('already counted: asks first', /already covers this work/.test(((await T.modal(page)) || {}).msg || ''));
      await T.click(page, '^Already Counted$');
      await waitFor(page, () => (window.__debugProd().st.actions || []).length === 0, 15000); await page.waitForTimeout(500);
      check('already counted: marked on the server, never counted', (await srv(page)).entries['acctP|run:p3'].crew.state === 'covered');
      // Tommy 11:29: edits waiting for approval, with before -> after
      const edl = await page.evaluate(() => (document.getElementById('pmEdits') || {}).innerText || '');
      check('approver: "Edits waiting for approval" with "Pipe Installed: 10 LF \u2192 50 LF"', /Edits waiting for approval/.test(edl) && /Pipe Installed: 10 LF \u2192 50 LF/.test(edl) && /Backfill: 8 LF \u2192 80 LF/.test(edl));
      const ia = await page.evaluate(() => [...document.querySelectorAll('#pmEdits li')].findIndex(li => /Pipe Installed: 10/.test(li.textContent)));
      await page.click('#pmApprove' + ia); await page.waitForTimeout(200); await T.click(page, '^Approve$');
      await waitFor(page, () => (window.__debugProd().st.actions || []).length === 0 && window.__rpcLog.some(x => x.fn === 'pb_prod_edit_decide'), 15000); await page.waitForTimeout(1500);
      const S6 = (await srv(page)).entries['acctP|run:p6'];
      check('approve: the edited numbers count (50); who decided is kept', S6.items[0].qty === 50 && S6.lastEdit.decision === 'approved' && S6.lastEdit.by === 'acctA');
      const ir = await page.evaluate(() => [...document.querySelectorAll('#pmEdits li')].findIndex(li => /Backfill: 8/.test(li.textContent)));
      await page.click('#pmReject' + ir); await page.waitForTimeout(200); await T.click(page, '^Reject$');
      await waitFor(page, () => (window.__debugProd().st.actions || []).length === 0 && window.__rpcLog.filter(x => x.fn === 'pb_prod_edit_decide').length === 2, 15000); await page.waitForTimeout(1500);
      const S7 = (await srv(page)).entries['acctP|run:p7'];
      check('reject: the earlier numbers keep counting (8)', S7.items[0].qty === 8 && S7.lastEdit.decision === 'rejected' && !S7.pendingEdit);
      check('approve/reject: the approver sees what happened', /Approved Wes Hall.s change/.test(await page.evaluate(() => document.getElementById('pmCrew').innerText)) && /Rejected Wes Hall.s change/.test(await page.evaluate(() => document.getElementById('pmCrew').innerText)));
      // owner decision 2: foremen don't edit job plans (only the company account)
      check('foreman: no Edit Plan on My production', !(await page.evaluate(() => !!document.querySelector('#screen-prodMine #pjEditBtn, #screen-prodMine [onclick*="pbProdPlanEdit"]'))));
      await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(400);
      const md2 = await T.modal(page);
      check('foreman: Company production (and its plan editor) is refused: company account only', md2 && /Only your company account/.test(md2.msg) && (await T.screen(page)) !== 'screen-prodDashboard');
      await M.dismiss(page);
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 4. the company: counting, waiting count, the crew list on the job page ----------
  { const { ctx, page } = await T.setup(browser, { manager: true, extra: { __names: { acctP: 'Wes Hall', acctF2: 'Fiona Foreman' } } });
    try {
      const old = Date.now() - 25 * 3600000;
      await setSrv(page, `a.forEach(([k, v]) => { s.entries[k] = v; });`, [
        ['acctF|run:f1', { id: 'f1', user: 'acctF', email: 'f@crew.test', company: 'c1', versions: [1], updated_at: new Date().toISOString(), record: { jobNumber: '24-301', workDate: new Date().toISOString().slice(0, 10), enteredBy: 'Frank' }, items: [{ key: 'excavation', qty: 100, unit: 'LF' }] }],
        held('w1', 'acctP', 'Wes Hall', '24-301', [{ key: 'excavation', qty: 100, unit: 'LF' }]),
        held('w2', 'acctP', 'Wes Hall', '24-301', [{ key: 'pipe', qty: 40, unit: 'LF' }], { crew: { state: 'claimed', created: Date.now(), by: 'acctF2' } }),
        ['acctF2|claim:w2', { id: 'c2', user: 'acctF2', email: 'fi@crew.test', company: 'c1', source: 'w2', versions: [1], updated_at: new Date().toISOString(), record: { jobNumber: '24-301', workDate: new Date().toISOString().slice(0, 10), claimedFromName: 'Wes Hall' }, items: [{ key: 'pipe', qty: 40, unit: 'LF' }] }],
        held('w3', 'acctP', 'Wes Hall', '24-301', [{ key: 'restoration', qty: 25, unit: 'LF' }], { crew: { state: 'pending', created: old } }),
        held('w4', 'acctP', 'Wes Hall', '24-301', [{ key: 'backfill', qty: 10, unit: 'LF' }], { crew: { state: 'sent', created: Date.now(), by: 'acctP' }, pendingEdit: { id: 950, record: { jobNumber: '24-301', workDate: new Date().toISOString().slice(0, 10), enteredBy: 'Wes Hall' }, items: [{ key: 'backfill', qty: 15, unit: 'LF' }], saved_at: new Date().toISOString(), by: 'acctP' } })]);
      await page.evaluate(() => pbOpenProdDashboard()); await waitFor(page, () => !!document.getElementById('pdJob0'));
      const card = await page.evaluate(() => document.getElementById('pdJob0').textContent);
      check('dashboard: "1 run waiting for a foreman" on the job', /1 run waiting for a foreman/.test(card));
      await page.evaluate(() => pbOpenProdJob(0)); await waitFor(page, () => !!document.getElementById('pjCrewSec'));
      const tbl = await page.evaluate(() => [...document.querySelectorAll('#pjTableSec tbody tr')].map(r => r.textContent).join('|'));
      check('totals: foreman 100 excavation (the held pipelayer 100 is not added), the claimed pipe once (40), the 24-hour one (25), the sent one (10: its change waits for approval)', /Excavation100 LF/.test(tbl) && /Pipe Installed40 LF/.test(tbl) && /Restoration25 LF/.test(tbl) && /Backfill10 LF/.test(tbl));
      const crew = await page.evaluate(() => document.getElementById('pjCrewSec').innerText);
      check('job page: pipelayers\' runs listed with status and notes', /Waiting for a foreman · not counted/.test(crew) && /Claimed by a foreman by Fiona Foreman · not counted/.test(crew) && /Not claimed by a foreman within 24 hours/.test(crew) && /Sent by the pipelayer without a foreman/.test(crew));
      check('dashboard: "1 edit waiting for approval" on the job', /1 edit waiting for approval/.test(card));
      check('job page: "Edit waiting for approval" with "Backfill: 10 LF \u2192 15 LF" and who', /Edit waiting for approval/.test(crew) && /Backfill: 10 LF \u2192 15 LF/.test(crew) && /By Wes Hall/.test(crew));
      const ix = await page.evaluate(() => [...document.querySelectorAll('#pjApprovalsSec li')].findIndex(li => /Backfill: 10 LF/.test(li.textContent)));
      await page.click('#pjApprove' + ix); await page.waitForTimeout(200); await T.click(page, '^Approve$');
      await waitFor(page, () => /Backfill15 LF/.test([...document.querySelectorAll('#pjTableSec tbody tr')].map(r => r.textContent).join('|')), 15000);
      check('company account approves: the new numbers count (Backfill 15) and "Last change approved" shows', /Last change approved/.test(await page.evaluate(() => document.getElementById('pjCrewSec').innerText)));
      check('job page: the claimed copy says where it came from', /claimed from Wes Hall’s run/.test(await page.evaluate(() => document.getElementById('pjRecentSec').innerText)));
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 6. Tommy 11:53: a foreman claims a run after it counted; the company approves or rejects; never double counted ----------
  for (const decision of ['approve', 'reject']) {
    let S_after;
    // the foreman's phone
    const { ctx, page } = await T.setup(browser, { extra: { __names: { acctP: 'Wes Hall' }, __mockSess: { id: 'acctF', email: 'f@x.com' }, lastKnownUserId: 'acctF', 'acctF:cachedSubscription': { tier: 'contractor', status: 'active' } } });
    let S;
    try {
      await setSrv(page, `a.forEach(([k, v]) => { s.entries[k] = v; });`, [held('q1', 'acctP', 'Wes Hall', '24-501', [{ key: 'pipe', qty: 10, unit: 'LF' }], { crew: { state: 'sent', created: Date.now(), by: 'acctP' } })]);
      await page.evaluate(() => pbOpenProdMine()); await waitFor(page, () => !!document.getElementById('pmLateClaim0'));
      await page.click('#pmLateClaim0'); await page.waitForTimeout(200);
      check(decision + ': claiming a counted run asks first and says the company approves', /company approves your claim first/.test(((await T.modal(page)) || {}).msg || ''));
      await T.click(page, '^Claim$');
      await waitFor(page, () => (window.__debugProd().st.actions || []).length === 0 && window.__rpcLog.some(x => x.fn === 'pb_prod_crew_claim'), 15000); await page.waitForTimeout(1500);
      check(decision + ': the claimed copy waits for the company ("waiting for the company\u2019s approval")', /waiting for the company.s approval/.test(await page.evaluate(() => document.getElementById('pmClaimed').innerText)));
      // the foreman changes the copy while it waits: still waits for the company
      await page.click('#pmEdit0'); await page.waitForTimeout(200); await page.fill('#pmEdit0', '12'); await page.click('#pmEditSave');
      await waitFor(page, () => (window.__debugProd().st.actions || []).length === 0 && window.__rpcLog.some(x => x.fn === 'pb_prod_claimed_edit'), 15000); await page.waitForTimeout(800);
      S = await srv(page);
      errs.push(...page._errors);
    } finally { await ctx.close(); }
    // the company account
    { const { ctx: c2, page: p2 } = await T.setup(browser, { manager: true, extra: { __names: { acctP: 'Wes Hall' } } });
      try {
        await p2.evaluate((srvState) => { localStorage.setItem('__psrv', JSON.stringify(srvState)); }, S);
        const tot = async () => { await p2.evaluate(() => pbOpenProdDashboard()); await waitFor(p2, () => !!document.getElementById('pdJob0')); await p2.evaluate(() => pbOpenProdJob(0)); await waitFor(p2, () => !!document.getElementById('pjTableSec') && !document.getElementById('pjRefreshBtn').disabled); await p2.waitForTimeout(800); return p2.evaluate(() => [...document.querySelectorAll('#pjTableSec tbody tr')].map(r => r.textContent).join('|')); };
        let t = await tot();
        check(decision + ': before the company decides, the pipelayer\u2019s 10 count (not 10 + 12)', /Pipe Installed10 LF/.test(t) && !/22 LF|12 LF/.test(t));
        const ap = await p2.evaluate(() => (document.getElementById('pjApprovalsSec') || {}).innerText || '');
        check(decision + ': the company sees "Frank Ortiz claimed Wes Hall\u2019s run after it counted" with "Pipe Installed: 10 LF \u2192 12 LF"', /claimed Wes Hall.s run after it counted/.test(ap) && /Pipe Installed: 10 LF \u2192 12 LF/.test(ap));
        await p2.click(decision === 'approve' ? '#pjApprove0' : '#pjReject0'); await p2.waitForTimeout(200); await T.click(p2, decision === 'approve' ? '^Approve$' : '^Reject$');
        await waitFor(p2, () => window.__rpcLog.some(x => x.fn === 'pb_prod_edit_decide'), 15000); await p2.waitForTimeout(1500);
        t = await tot();
        if (decision === 'approve') check('approve: now the copy counts instead (12), never 22', /Pipe Installed12 LF/.test(t) && !/22 LF|10 LF/.test(t));
        else check('reject: the pipelayer\u2019s 10 keep counting, the copy never does', /Pipe Installed10 LF/.test(t) && !/22 LF|12 LF/.test(t));
        const S2 = JSON.parse(await p2.evaluate(() => localStorage.__psrv));
        check(decision + ': the original is ' + (decision === 'approve' ? 'claimed' : 'still counting') + ' on the server', S2.entries['acctP|run:q1'].crew.state === (decision === 'approve' ? 'claimed' : 'sent'));
        S_after = S2;
        errs.push(...p2._errors);
      } finally { await c2.close(); }
    }
    if (decision === 'reject') { // Tommy 12:21: after a reject the run can be claimed again; a new pending copy, the rejected one stays in history
      let S3;
      { const { ctx, page } = await T.setup(browser, { extra: { __names: { acctP: 'Wes Hall' }, __mockSess: { id: 'acctF', email: 'f@x.com' }, lastKnownUserId: 'acctF', 'acctF:cachedSubscription': { tier: 'contractor', status: 'active' } } });
        try {
          await page.evaluate((x) => { localStorage.setItem('__psrv', JSON.stringify(x)); }, S_after);
          await page.evaluate(() => pbOpenProdMine()); await waitFor(page, () => !!document.getElementById('pmLateClaim0'));
          check('re-claim: after the reject the same foreman can claim the run again', true);
          await page.click('#pmLateClaim0'); await page.waitForTimeout(200); await T.click(page, '^Claim$');
          await waitFor(page, () => (window.__debugProd().st.actions || []).length === 0 && window.__rpcLog.some(x => x.fn === 'pb_prod_crew_claim'), 15000); await page.waitForTimeout(1500);
          S3 = await srv(page);
          const copies = Object.values(S3.entries).filter(x => x.source === S3.entries['acctP|run:q1'].id);
          check('re-claim: a new pending copy, the rejected copy stays in history', copies.length === 2 && copies.filter(x => x.late === 'rejected').length === 1 && copies.filter(x => x.late === 'pending').length === 1);
          errs.push(...page._errors);
        } finally { await ctx.close(); }
      }
      { const { ctx: c2, page: p2 } = await T.setup(browser, { manager: true, extra: { __names: { acctP: 'Wes Hall' } } });
        try {
          await p2.evaluate((x) => { localStorage.setItem('__psrv', JSON.stringify(x)); }, S3);
          const tot = async () => { await p2.evaluate(() => pbOpenProdDashboard()); await waitFor(p2, () => !!document.getElementById('pdJob0')); await p2.evaluate(() => pbOpenProdJob(0)); await waitFor(p2, () => !!document.getElementById('pjTableSec') && !document.getElementById('pjRefreshBtn').disabled); await p2.waitForTimeout(800); return p2.evaluate(() => [...document.querySelectorAll('#pjTableSec tbody tr')].map(r => r.textContent).join('|')); };
          let t = await tot();
          check('re-claim: while the new claim waits, the pipelayer\u2019s 10 count (not 20)', /Pipe Installed10 LF/.test(t) && !/20 LF|22 LF/.test(t));
          await p2.click('#pjApprove0'); await p2.waitForTimeout(200); await T.click(p2, '^Approve$');
          await waitFor(p2, () => window.__rpcLog.some(x => x.fn === 'pb_prod_edit_decide'), 15000); await p2.waitForTimeout(1500);
          t = await tot();
          check('re-claim: approved, the new copy counts (10), the original and the rejected copy do not (never 20)', /Pipe Installed10 LF/.test(t) && !/20 LF|22 LF|12 LF/.test(t));
          const S4 = JSON.parse(await p2.evaluate(() => localStorage.__psrv));
          const cp = Object.values(S4.entries).filter(x => x.source === S4.entries['acctP|run:q1'].id);
          check('re-claim: the original is claimed by the new copy on the server; the rejected copy stays rejected', S4.entries['acctP|run:q1'].crew.state === 'claimed' && cp.filter(x => x.late === 'rejected').length === 1 && cp.filter(x => x.late === 'approved').length === 1);
          errs.push(...p2._errors);
        } finally { await c2.close(); }
      }
    }
  }
  // ---------- 6b. Review round 2, R2-1: the reviewer's 10 -> 80 -> 10 case. A late claim made at 10; the pipelayer's correction to 80 is approved;
  // the company can't approve the stale claim (80 keeps counting); the foreman claims again; approving it counts 80, never 10 or 160 ----------
  { const fSetup = { extra: { __names: { acctP: 'Wes Hall' }, __mockSess: { id: 'acctF', email: 'f@x.com' }, lastKnownUserId: 'acctF', 'acctF:cachedSubscription': { tier: 'contractor', status: 'active' } } };
    const claimOnce = async (st) => { const { ctx, page } = await T.setup(browser, fSetup); try {
        if (st) await page.evaluate((x) => { localStorage.setItem('__psrv', JSON.stringify(x)); }, st);
        else await setSrv(page, `a.forEach(([k, v]) => { s.entries[k] = v; });`, [held('q2', 'acctP', 'Wes Hall', '24-701', [{ key: 'pipe', qty: 10, unit: 'LF' }], { crew: { state: 'sent', created: Date.now(), by: 'acctP' } })]);
        await page.evaluate(() => pbOpenProdMine()); await waitFor(page, () => !!document.getElementById('pmLateClaim0'));
        const before = await page.evaluate(() => (document.getElementById('pmClaimed') || {}).innerText || '');
        await page.click('#pmLateClaim0'); await page.waitForTimeout(200); await T.click(page, '^Claim$');
        await waitFor(page, () => (window.__debugProd().st.actions || []).length === 0 && window.__rpcLog.some(x => x.fn === 'pb_prod_crew_claim'), 15000); await page.waitForTimeout(1500);
        errs.push(...page._errors); return { S: await srv(page), before };
      } finally { await ctx.close(); } };
    const company = async (st, fn) => { const { ctx: c2, page: p2 } = await T.setup(browser, { manager: true, extra: { __names: { acctP: 'Wes Hall' } } }); try {
        await p2.evaluate((x) => { localStorage.setItem('__psrv', JSON.stringify(x)); }, st);
        const tot = async () => { await p2.evaluate(() => pbOpenProdDashboard()); await waitFor(p2, () => !!document.getElementById('pdJob0')); await p2.evaluate(() => pbOpenProdJob(0)); await waitFor(p2, () => !!document.getElementById('pjTableSec') && !document.getElementById('pjRefreshBtn').disabled); await p2.waitForTimeout(800); return p2.evaluate(() => [...document.querySelectorAll('#pjTableSec tbody tr')].map(r => r.textContent).join('|')); };
        const out = await fn(p2, tot); errs.push(...p2._errors); return Object.assign({ S: JSON.parse(await p2.evaluate(() => localStorage.__psrv)) }, out);
      } finally { await c2.close(); } };
    const approve = async (p2) => { await p2.click('#pjApprove0'); await p2.waitForTimeout(200); await T.click(p2, '^Approve$'); await waitFor(p2, () => window.__rpcLog.some(x => x.fn === 'pb_prod_edit_decide'), 15000); await p2.waitForTimeout(1500); };
    let { S } = await claimOnce(null);
    // the pipelayer corrects 10 -> 80 and another foreman approves it (server state, as pb_prod_edit_decide leaves it)
    S.entries['acctP|run:q2'].items = [{ key: 'pipe', qty: 80, unit: 'LF' }]; S.entries['acctP|run:q2'].versions.push(1); S.entries['acctP|run:q2'].lastEdit = { decision: 'approved', by: 'acctF2' };
    let R = await company(S, async (p2, tot) => { const t0 = await tot(); await approve(p2); const msg = ((await T.modal(p2)) || {}).msg || ''; return { t0, msg, t1: await tot() }; });
    check('R2-1: the approved correction counts (80), the stale claim of 10 doesn\u2019t', /Pipe Installed80 LF/.test(R.t0) && !/10 LF|90 LF/.test(R.t0));
    check('R2-1: the company can\u2019t approve the stale claim: "The pipelayer\u2019s run changed since this claim. The foreman needs to claim it again."', /run changed since this claim\. The foreman needs to claim it again/.test(R.msg));
    check('R2-1: after the refusal 80 still counts (not 10)', /Pipe Installed80 LF/.test(R.t1) && !/10 LF/.test(R.t1) && R.S.entries['acctP|run:q2'].crew.state === 'sent');
    const again = await claimOnce(R.S);
    check('R2-1: the foreman is told the run changed since the claim and can claim it again', /run changed since this claim/.test(again.before));
    const cps = Object.values(again.S.entries).filter(x => x.source === again.S.entries['acctP|run:q2'].id);
    check('R2-1: claiming again refreshes the waiting claim to 80 (one copy, no second one)', cps.length === 1 && cps[0].late === 'pending' && cps[0].pendingEdit.items[0].qty === 80);
    R = await company(again.S, async (p2, tot) => { const tw = await tot(); await approve(p2); return { tw, t2: await tot() }; });
    check('R2-1: while the refreshed claim waits, the pipelayer\u2019s 80 count (not 160)', /Pipe Installed80 LF/.test(R.tw) && !/160 LF|10 LF/.test(R.tw));
    check('R2-1: approved now, the claim counts 80 instead of the pipelayer\u2019s 80, never 10 or 160', /Pipe Installed80 LF/.test(R.t2) && !/10 LF|160 LF/.test(R.t2) && R.S.entries['acctP|run:q2'].crew.state === 'claimed');
  }
  // the company account sees crew pairings read-only on Company production
  { const { ctx, page } = await T.setup(browser, { manager: true });
    try {
      await setSrv(page, `s.entries['acctF|run:f9'] = { id: 'f9', user: 'acctF', email: 'f@x', company: 'c1', versions: [1], updated_at: new Date().toISOString(), record: { jobNumber: '24-601', workDate: new Date().toISOString().slice(0, 10), enteredBy: 'Frank' }, items: [{ key: 'pipe', qty: 1, unit: 'LF' }] }; s.links = [{ foreman: 'acctF', pipelayer: 'acctP', by: 'acctP', started: new Date().toISOString() }];`);
      await page.evaluate(() => pbOpenProdDashboard()); await waitFor(page, () => !!document.getElementById('pdLinkList'));
      const t = await page.evaluate(() => document.getElementById('pdLinks').innerText);
      check('company: "Crew pairings" read-only (Frank Ortiz · Wes Hall), no buttons to change them', /Crew pairings/.test(t) && /Frank Ortiz/.test(t) && /Wes Hall/.test(t) && await page.evaluate(() => !document.querySelector('#pdLinks button')));
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 5. crew links: My foreman (pipelayer), My crew (foreman), the other side's change is shown ----------
  { const { ctx, page } = await T.setup(browser, { extra: { __role: 'pipelayer' } });
    try {
      await page.evaluate(() => pbOpenProdMine()); await waitFor(page, () => !!document.getElementById('pmMyForeman'));
      check('pipelayer: "My foreman" says None', /None/.test(await page.evaluate(() => document.getElementById('pmMyForemanName').textContent)));
      await page.click('#pmPickForemanBtn'); await waitFor(page, () => !!document.getElementById('pmPick0'));
      await page.click('#pmPick0'); // Frank Ortiz
      await waitFor(page, () => window.__rpcLog.some(x => x.fn === 'pb_prod_crew_link_set') && (window.__debugProd().st.actions || []).length === 0, 15000); await page.waitForTimeout(800);
      check('pipelayer: picked Frank Ortiz as My foreman (no approval)', /Frank Ortiz/.test(await page.evaluate(() => document.getElementById('pmMyForemanName').textContent)) && (await srv(page)).links.some(l => l.foreman === 'acctF' && l.pipelayer === 'acctA' && !l.ended));
      await T.runWithProduction(page, { job: '24-101', exc: '12', pipe: null, by: 'Wes' });
      await waitFor(page, () => /Assigned to Frank Ortiz/.test(JSON.stringify(window.__debugProd().sessions)));
      check('linked: my new run goes to my foreman automatically ("Assigned to Frank Ortiz")', true);
      check('linked: no reminder for a run already assigned', await page.evaluate(() => !window.pbProdHomeAttention()));
      // the foreman ends it from their side
      await setSrv(page, `s.links.forEach(l => { if (!l.ended) { l.ended = new Date().toISOString(); l.reason = 'ended_by_foreman'; } });`);
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(2000);
      check('the other side\'s change is shown: "You no longer have a linked foreman"', /You no longer have a linked foreman/.test(await page.evaluate(() => document.getElementById('screen-prodMine').innerText)));
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  { const { ctx, page } = await T.setup(browser, {});
    try {
      await page.evaluate(() => pbOpenProdMine()); await waitFor(page, () => !!document.getElementById('pmMyCrew'));
      await page.click('#pmAddCrewBtn'); await waitFor(page, () => !!document.getElementById('pmPick1'));
      await page.click('#pmPick1'); // Walt Ruiz
      await waitFor(page, () => (window.__debugProd().st.actions || []).length === 0 && window.__rpcLog.some(x => x.fn === 'pb_prod_crew_link_set'), 15000); await page.waitForTimeout(800);
      check('foreman: added Walt Ruiz to My crew', /Walt Ruiz/.test(await page.evaluate(() => document.getElementById('pmMyCrew').textContent)));
      await page.click('#pmCrewRemove0'); await page.waitForTimeout(200);
      await T.click(page, '^Remove From Crew$');
      await waitFor(page, () => window.__rpcLog.some(x => x.fn === 'pb_prod_crew_link_end') && (window.__debugProd().st.actions || []).length === 0, 15000); await page.waitForTimeout(800);
      check('foreman: removed; the link is ended on the server (kept in the history)', (await srv(page)).links.every(l => l.ended) && (await srv(page)).links.length === 1);
      check('the company account has no link screen: nothing about links on Company production', !(await page.evaluate(() => /crew link|My crew/i.test(document.getElementById('screen-prodDashboard').innerHTML))));
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  check('no JS errors', errs.length === 0); if (errs.length) console.log(errs);
  await browser.close();
  console.log('JS errors: none');
})().catch(e => { console.log('SCRIPT ERROR', e); process.exit(1); });
