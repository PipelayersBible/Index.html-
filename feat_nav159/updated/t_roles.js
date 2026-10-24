// Batch 29 ROLES: production and crew hours are the foreman's, never a company pipelayer's.
// Must FAIL on the base (r15 = integrate15 manual + TABBAR) and PASS with batch 29 ROLES.
// Run (inside the lock, >= 2 GB free): PB_TEST_DIR=<site> PB_TEST_PORT=<port> /home/claude/test/run.sh <this file> 800
const R = require('./roles_lib.js'); const { M, shown, text, waitFor, rpcs, iso, today } = R;
const check = (l, c, d) => { console.log((c ? 'OK  ' : '*** FAIL ***') + ' - ' + l + (c || d === undefined ? '' : ' :: ' + String(d).slice(0, 400))); if (!c) process.exitCode = 1; };
const LINK = (by) => ({ foreman: 'acctF', pipelayer: 'acctP', by: by || 'acctP', started: iso(Date.now() - 2 * 86400000) });
const logsShown = async (page) => ({ prod: await shown(page, 'fpPipeInstalled'), crew: await shown(page, 'crewLogList'), save: await page.evaluate(() => { const b = [...document.querySelectorAll('#screen-results button')].find(x => /Save Production/.test(x.textContent)); if (!b) return false; let x = b; while (x) { if (x.hidden || getComputedStyle(x).display === 'none') return false; x = x.parentElement; } return true; }) });
const screenText = (page) => page.evaluate(() => { const s = document.getElementById('screen-results'); return s ? s.innerText : ''; });
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  try {
    // ================= 1. a company pipelayer, linked to Frank Ortiz =================
    { const { ctx, page } = await R.setup(browser, { uid: 'acctP', role: 'pipelayer', extra: { __psrv: { entries: {}, plans: {}, links: [LINK()] } } });
      try {
        await M.lockRun(page); await M.dismiss(page);
        await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = '24-101'; return window.__debugSaveRunArchive(); }); await page.waitForTimeout(400);
        const L = await logsShown(page);
        check('pipelayer Results: no Foreman Production Entry (Feet of pipe installed, Save Production)', !L.prod && !L.save, JSON.stringify(L));
        check('pipelayer Results: no Crew & Equipment Log', !L.crew, JSON.stringify(L));
        const txt = await screenText(page);
        check('pipelayer Results: neither heading is on the screen', !/Foreman Production Entry/i.test(txt) && !/Crew\s*(&|and)\s*Equipment Log/i.test(txt), txt.slice(-600));
        const ok = await waitFor(page, () => /your foreman: Frank Ortiz\./.test((document.getElementById('pbRolesWho') || {}).textContent || ''), 15000);
        check('pipelayer Results ends with "Production and crew hours are entered by your foreman: Frank Ortiz."', ok && (await text(page, 'pbRolesWho')) === 'Production and crew hours are entered by your foreman: Frank Ortiz.' && await shown(page, 'pbRolesWho'), await text(page, 'pbRolesWho'));
        // the logs' functions refuse, nothing changes
        await page.evaluate(() => { window.__rpcLog.length = 0; pbSaveForemanData(); }); await page.waitForTimeout(500);
        const md = await R.modal(page);
        check('pbSaveForemanData() is refused for a pipelayer, plainly ("entered by your foreman")', !!md && /entered by your foreman/i.test(md.msg), md && JSON.stringify(md));
        if (md) await R.click(page, '^OK$');
        await page.evaluate(() => pbAddCrewLogEntry()); await page.waitForTimeout(300); if (await R.modal(page)) await R.click(page, '^OK$');
        check('…nothing was saved on the run (no foreman object, no crew)', await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); return !e.foreman && !(e.crewLog || []).length; }));
        // the run still goes to the foreman: laid marks in the live status
        await page.evaluate(() => { window.__statusPuts = []; pbLaidMark(1); }); await page.waitForTimeout(400);
        const put = await waitFor(page, () => (window.__statusPuts || []).some(s => Number(s.laidToFt) > 0), 30000);
        check('the run still goes to the foreman: its status with the rows marked laid is sent (batch 14 F)', put);
        check('…and no production entry is sent for it', (await rpcs(page, 'pb_prod_save')).length === 0);
        // Reports: the My production row and screen
        await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(800);
        check('Reports: the My production row says "Your foreman, and runs you sent before"', (await text(page, 'archiveProdMineSub')) === 'Your foreman, and runs you sent before', await text(page, 'archiveProdMineSub'));
        check('Reports: no "Work without a run" row for a pipelayer', !(await shown(page, 'archiveNoRunBtn')));
        await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(1500);
        check('My production: "Production and crew hours are entered by your foreman: Frank Ortiz."', (await text(page, 'pmStatus')) === 'Production and crew hours are entered by your foreman: Frank Ortiz.', await text(page, 'pmStatus'));
        check('My production: no empty production lists (Today / Earlier), My foreman still there', !(await shown(page, 'pmToday')) && !(await shown(page, 'pmEarlier')) && await shown(page, 'pmMyForeman'));
        check('My production: the help no longer says to enter it in Foreman Production Entry', !/Foreman Production Entry/.test(await text(page, 'pmHelp')), await text(page, 'pmHelp'));
        // production entered before this change: kept, read-only
        await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(800); await M.dismiss(page);
        await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); const t = Date.now() - 3 * 3600000; e.foreman = { enteredBy: 'Wes', feetPipeInstalled: 35, feetExcavated: 40, enteredAt: t }; e.crewLog = [{ id: 'crew-old', name: 'Joe Lopez', type: 'Laborer', category: 'Excavation', status: 'out', log: [{ action: 'Checked In', time: t }, { action: 'Checked Out', time: t + 2 * 3600000 }] }]; return window.__debugSaveRunArchive(); });
        await page.evaluate(() => window.pbRolesApply && window.pbRolesApply()); await page.waitForTimeout(300);
        const lp = await text(page, 'pbRolesLegacyProd'), lc = await text(page, 'pbRolesLegacyCrew');
        check('earlier production stays, read-only: "Feet excavated: 40 · Feet of pipe installed: 35 (entered by Wes)"', /Feet excavated: 40 · Feet of pipe installed: 35 \(entered by Wes\)/.test(lp || ''), lp);
        check('…and the earlier crew log, read-only: "Joe Lopez (Laborer) · 2.00 h", with no buttons', /Joe Lopez \(Laborer\) · 2\.00 h/.test(lc || '') && await page.evaluate(() => !document.querySelector('#pbRolesLegacy button')), lc);
        check('…the run record keeps it as it was', await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); return e.foreman.feetPipeInstalled === 35 && e.crewLog.length === 1; }));
        check('…and the logs are still not shown', !(await logsShown(page)).prod);
        errs.push(...page._errors);
      } catch (e) { check('SCRIPT ERROR ' + String(e && e.message).slice(0, 200), false); } finally { await ctx.close(); }
    }
    // ================= 2. a foreman: his own run has the logs; his pipelayer's runs take his production and hours =================
    { const now = Date.now(), d = today();
      const st = (sref, o) => ({ user: 'acctP', company: 'c1', sref, seq: 2, ended: !!o.ended, work_date: d, job_number: '24-101', run_ref: 'r-' + sref, updated_at: iso(o.upd), created_at: iso(now - 5 * 3600000), phone_at: iso(o.upd),
        status: Object.assign({ sessionRef: sref, runRef: 'r-' + sref, jobNumber: '24-101', jobsite: 'Elm St', label: o.label, workDate: d, totalFt: 200, rowsTotal: 5 }, o.s) });
      const status = { 'acctP|c1|s100': st('s100', { label: 'MH-7 → MH-8', upd: now - 60000, s: { laidFt: 30, laidToFt: 30, laidToStation: '30.0', rowsLaid: 2 } }),
        'acctP|c1|s99': st('s99', { label: 'MH-6 → MH-7', ended: true, upd: now - 1800000, s: { ended: true, laidFt: 30, laidToFt: 30, laidToStation: '130.0', rowsLaid: 2, endLate: true, endStation: '140.0', endFt: 140, endSessFt: 40, endVia: 'next_day' } }) };
      const { ctx, page } = await R.setup(browser, { uid: 'acctF', role: 'foreman', extra: { __psrv: { entries: {}, plans: {}, links: [LINK('acctF')], status } } });
      try {
        await M.lockRun(page); await M.dismiss(page); await page.waitForTimeout(600);
        const L = await logsShown(page);
        check('foreman Results (his own run): Foreman Production Entry and Crew & Equipment Log are there', L.prod && L.crew && L.save, JSON.stringify(L));
        check('foreman Results: no "entered by your foreman" line', !(await shown(page, 'pbRolesLine')));
        await page.evaluate(() => pbOpenProdMine()); await waitFor(page, () => !!document.getElementById('pmLiveEnter0'), 15000);
        check('My crew now: Wes Hall’s open run has "Enter production for this run"', await shown(page, 'pmLiveEnter0'));
        check('…and so has his ended run with no entry of his (pmLiveEnter0_1)', await page.evaluate(() => !!document.getElementById('pmLiveEnter0_1')));
        // the open run: pipe from the laid marks, plus the two hour fields
        await page.evaluate(() => pbLvFormOpen(0, 0)); await page.waitForTimeout(300);
        const labels = await page.$$eval('#pmLiveForm label', x => x.map(e => e.textContent));
        check('the form has Crew man-hours (h) and Equipment hours (h)', labels.includes('Crew man-hours (h)') && labels.includes('Equipment hours (h)'), labels.join(' | '));
        check('the open run: pipe filled in from the rows marked laid (30)', (await page.$eval('#pmLiveQ2', e => e.value)) === '30' && /Filled in from the rows marked laid\. Change it if it isn’t right\./.test(await text(page, 'pmLiveForm')));
        await page.evaluate(() => pbLvFormCancel()); await page.waitForTimeout(200);
        // the ended run (end entered the next day, batch 17 END): pipe to where it ended
        await page.evaluate(() => { pbLvDayToggle(0, true); pbLvFormOpen(0, 1); }); await page.waitForTimeout(300);
        check('the ended run: pipe filled in from where the run ended (40, not the 30 laid), and says so', (await page.$eval('#pmLiveQ2', e => e.value)) === '40' && /Filled in from where the run ended \(140\.0, entered later\)\. Change it if it isn’t right\./.test(await text(page, 'pmLiveForm')), await text(page, 'pmLiveForm'));
        check('without the server keeping endSessFt, the end is still worked out (140 − (130 − 30) = 40)', await page.evaluate(() => { const p = window.pbRolesEndPre({ endLate: true, endFt: 140, endStation: '1+40', laidToStation: '1+30', laidToFt: 30, laidFt: 30 }); return !!p && p.ft === 40; }));
        await page.evaluate(() => { const set = (i, v) => { const el = document.getElementById('pmLiveQ' + i); el.value = v; el.dispatchEvent(new Event('input')); }; set(1, '45'); set(6, '16'); set(7, '6'); });
        await page.evaluate(() => pbLvFormSave());
        const sent = await waitFor(page, () => window.__rpcLog.some(x => x.fn === 'pb_prod_crew_run_save' && x.args.p_session_ref === 's99'), 20000);
        const sv = (await rpcs(page, 'pb_prod_crew_run_save')).filter(x => x.args.p_session_ref === 's99').pop();
        const it = (k) => sv && (sv.args.p_items.find(i => i.key === k) || {}).qty;
        check('saved for Wes Hall’s run: pipe 40, excavation 45, crew man-hours 16 h, equipment hours 6 h', sent && it('pipe') === 40 && it('excavation') === 45 && it('_manhours') === 16 && it('_equiphours') === 6, sv && JSON.stringify(sv.args.p_items));
        check('…filed for that pipelayer and session (crewrun, batch 14 F rules)', sv && sv.args.p_pipelayer === 'acctP' && sv.args.p_record.src === 'crewrun');
        await page.waitForTimeout(1500);
        check('…and shown with its hours ("Crew hours 16 h · Equipment hours 6 h")', /Crew hours 16 h/.test(await text(page, 'pmLive') || '') && /Equipment hours 6 h/.test(await text(page, 'pmLive') || ''), await text(page, 'pmLive'));
        errs.push(...page._errors);
      } catch (e) { check('SCRIPT ERROR ' + String(e && e.message).slice(0, 200), false); } finally { await ctx.close(); }
    }
    // ================= 3. a claimed pipelayer run: the foreman enters crew and equipment hours =================
    { const now = Date.now(), d = today();
      const entries = {
        'acctP|run:p1': { id: '00000000-0000-0000-0000-0000000000e1', user: 'acctP', email: 'p@x.com', company: 'c1', versions: [1], updated_at: iso(now - 3600000), record: { jobNumber: '24-101', workDate: d, enteredBy: 'Wes Hall', sessionRef: 's1' }, items: [{ key: 'pipe', qty: 40, unit: 'LF' }], crew: { state: 'claimed', created: now - 3600000, by: 'acctF', claim: '00000000-0000-0000-0002-0000000000c1' } },
        'acctF|claim:00000000-0000-0000-0000-0000000000e1': { id: '00000000-0000-0000-0002-0000000000c1', user: 'acctF', email: 'f@x.com', company: 'c1', source: '00000000-0000-0000-0000-0000000000e1', versions: [1], updated_at: iso(now - 1800000), record: { jobNumber: '24-101', workDate: d, claimedFrom: '00000000-0000-0000-0000-0000000000e1', claimedFromName: 'Wes Hall', enteredBy: null }, items: [{ key: 'pipe', qty: 40, unit: 'LF' }] } };
      const { ctx, page } = await R.setup(browser, { uid: 'acctF', role: 'foreman', extra: { __psrv: { entries, plans: {}, links: [LINK('acctF')] } } });
      try {
        await page.evaluate(() => pbOpenProdMine()); const okc = await waitFor(page, () => !!document.getElementById('pmClaimed0'), 20000);
        check('Runs you claimed: Wes Hall’s run', okc && /From Wes Hall/.test(await text(page, 'pmClaimed0')));
        await page.evaluate(() => pbCrewEditOpen(0)); await page.waitForTimeout(300);
        const labels = await page.$$eval('#pmClaimed0 label', x => x.map(e => e.textContent));
        check('its Edit has every category (Excavation too, not only the pipe it came with)', labels.includes('Excavation (LF)') && labels.includes('Pipe Installed (LF)'), labels.join(' | '));
        check('…and Crew man-hours (h) and Equipment hours (h)', labels.includes('Crew man-hours (h)') && labels.includes('Equipment hours (h)'), labels.join(' | '));
        const idx = (l) => labels.indexOf(l);
        await page.fill('#pmEdit' + idx('Excavation (LF)'), '55'); await page.fill('#pmEdit' + idx('Crew man-hours (h)'), '24'); await page.fill('#pmEdit' + idx('Equipment hours (h)'), '8');
        await page.evaluate(() => { window.__rpcLog.length = 0; pbCrewEditSave(); });
        const ok = await waitFor(page, () => window.__rpcLog.some(x => x.fn === 'pb_prod_claimed_edit'), 20000);
        const sv = (await rpcs(page, 'pb_prod_claimed_edit')).pop(), it = (k) => sv && (sv.args.p_items.find(i => i.key === k) || {}).qty;
        check('saved through the claim’s own edit (pb_prod_claimed_edit): pipe 40, excavation 55, crew man-hours 24 h, equipment hours 8 h', ok && it('pipe') === 40 && it('excavation') === 55 && it('_manhours') === 24 && it('_equiphours') === 8, sv && JSON.stringify(sv.args));
        await waitFor(page, () => /Equipment hours 8 h/.test((document.getElementById('pmClaimed0') || {}).textContent || ''), 15000);
        check('…and the claimed run shows them ("Crew hours 24 h", "Equipment hours 8 h")', /Crew hours 24 h/.test(await text(page, 'pmClaimed0')) && /Equipment hours 8 h/.test(await text(page, 'pmClaimed0')), await text(page, 'pmClaimed0'));
        errs.push(...page._errors);
      } catch (e) { check('SCRIPT ERROR ' + String(e && e.message).slice(0, 200), false); } finally { await ctx.close(); }
    }
    // ================= 4. role not known yet (offline at the first start): shown, as before (lead, Oct 21) =================
    { const { ctx, page } = await R.setup(browser, { uid: 'acctF', role: 'foreman', offline: true });
      try {
        await M.lockRun(page); await M.dismiss(page); await page.waitForTimeout(500);
        check('offline first start, role unknown: the logs are shown, as before (only a confirmed pipelayer is hidden)', (await logsShown(page)).prod && (await logsShown(page)).crew && !(await shown(page, 'pbRolesLine')));
        await page.evaluate(() => { localStorage.removeItem('__rpcMode'); localStorage.removeItem('__failSub'); window.dispatchEvent(new Event('online')); pbProdSyncNow(); });
        await page.waitForTimeout(4000);
        check('signal: the server says foreman: still shown', (await logsShown(page)).prod && !(await shown(page, 'pbRolesLine')));
        errs.push(...page._errors);
      } catch (e) { check('SCRIPT ERROR ' + String(e && e.message).slice(0, 200), false); } finally { await ctx.close(); }
    }
    { const { ctx, page } = await R.setup(browser, { uid: 'acctP', role: 'pipelayer', offline: true });
      try {
        await M.lockRun(page); await M.dismiss(page); await page.waitForTimeout(500);
        check('a pipelayer before the very first answer (offline): shown (accepted)', (await logsShown(page)).prod);
        await page.evaluate(() => { localStorage.removeItem('__rpcMode'); localStorage.removeItem('__failSub'); window.dispatchEvent(new Event('online')); pbProdSyncNow(); });
        const ok = await waitFor(page, () => { const w = document.getElementById('pbRolesProd'); return !!w && w.hidden; }, 20000);
        check('…the server says pipelayer: hidden at once (no reload), with the foreman line', ok && /entered by your foreman/.test(await text(page, 'pbRolesWho') || ''));
        await page.evaluate(() => { localStorage.__rpcMode = 'offline'; localStorage.__failSub = '1'; }); await page.reload(); await page.waitForTimeout(2500); await M.dismiss(page);
        await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(1000); await M.dismiss(page);
        check('…next start, offline: the cached role is known: still hidden', !(await logsShown(page)).prod && await page.evaluate(() => window.pbRolesKind() === 'pipelayer'));
        errs.push(...page._errors);
      } catch (e) { check('SCRIPT ERROR ' + String(e && e.message).slice(0, 200), false); } finally { await ctx.close(); }
    }
    // ================= 5. role change: pipelayer -> foreman -> pipelayer; an account switch starts over =================
    { const { ctx, page } = await R.setup(browser, { uid: 'acctP', role: 'pipelayer' });
      try {
        await M.lockRun(page); await M.dismiss(page); await page.waitForTimeout(500);
        check('as a pipelayer: no logs', !(await logsShown(page)).prod);
        await page.evaluate(() => { localStorage.__role = 'foreman'; }); await page.reload(); await page.waitForTimeout(2500); await M.dismiss(page);
        await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(1000); await M.dismiss(page);
        check('made a foreman: the logs show on the same run', (await logsShown(page)).prod && (await logsShown(page)).crew);
        await page.evaluate(() => { localStorage.__role = 'pipelayer'; }); await page.reload(); await page.waitForTimeout(2500); await M.dismiss(page);
        await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(1000); await M.dismiss(page);
        check('back to pipelayer: hidden again', !(await logsShown(page)).prod && /entered by your foreman/.test(await text(page, 'pbRolesWho') || ''));
        // another account on this phone, while offline: its role isn't known, so nothing of the last account's carries over
        await page.evaluate(() => { localStorage.__role = 'foreman'; localStorage.__rpcMode = 'offline'; localStorage.__failSub = '1'; localStorage.__mockSess = JSON.stringify({ id: 'acctF2', email: 'acctF2@x.com' }); localStorage.lastKnownUserId = 'acctF2'; localStorage.setItem('acctF2:cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active' })); });
        await page.reload(); await page.waitForTimeout(2500); await M.dismiss(page);
        check('account switch (offline) from the pipelayer: the new account isn’t a confirmed pipelayer, so nothing carries over: shown', await page.evaluate(() => window.pbRolesKind() === 'show') && (await page.evaluate(() => (document.getElementById('pbRolesProd') || {}).hidden)) === false);
        errs.push(...page._errors);
      } catch (e) { check('SCRIPT ERROR ' + String(e && e.message).slice(0, 200), false); } finally { await ctx.close(); }
    }
    // ================= 6. an individual account (no company): keeps the logs =================
    { const { ctx, page } = await R.setup(browser, { uid: 'acctI', role: 'pipelayer', member0: true, sub: { tier: 'individual', status: 'active' } });
      try {
        await M.lockRun(page); await M.dismiss(page); await page.waitForTimeout(600);
        check('individual account (server: not in a company): the logs are there, no foreman line', (await logsShown(page)).prod && (await logsShown(page)).crew && !(await shown(page, 'pbRolesLine')));
        check('…pbRolesKind says show', await page.evaluate(() => window.pbRolesKind() === 'show'));
        errs.push(...page._errors);
      } catch (e) { check('SCRIPT ERROR ' + String(e && e.message).slice(0, 200), false); } finally { await ctx.close(); }
    }
    { const { ctx, page } = await R.setup(browser, { uid: 'acctI', role: 'pipelayer', offline: true, sub: { tier: 'individual', status: 'active' } });
      try {
        await M.lockRun(page); await M.dismiss(page); await page.waitForTimeout(600);
        check('individual plan, offline at the first start (clearly individual): the logs are there', (await logsShown(page)).prod && await page.evaluate(() => window.pbRolesKind() === 'show'));
        errs.push(...page._errors);
      } catch (e) { check('SCRIPT ERROR ' + String(e && e.message).slice(0, 200), false); } finally { await ctx.close(); }
    }
  } catch (e) { check('SCRIPT ERROR ' + (e && e.message), false); }
  check('no JS errors', errs.length === 0, errs.join(' | '));
  await browser.close();
})();
