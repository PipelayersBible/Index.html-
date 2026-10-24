// Batch 29 ROLES updated copy of /home/claude/batch14/F/tests/t_live.js: a company pipelayer has no Foreman Production
// Entry now, so section 3's "pipelayer's own entry" is sent the way an OLDER app would send it (pb_prod_save straight to
// the server, same record and quantities), and the pipelayer's Results is checked to have no logs. Everything else is
// the original's.
// Batch 14 F: the foreman's live crew view (My production > My crew now), foreman production while a crew run is open
// (saved on the phone first, sent with signal), the pipelayer's own entry for that session marked covered on arrival,
// no double count on the company totals, a run that already counts is refused in plain words, and layouts at 390,
// 320 XL and 1280. Three phones share one mock server (localStorage '__psrv', copied between them).
const L = Object.assign({}, require('/home/claude/batch14/F/tests/lf_lib.js'), { SHOTS: '/home/claude/batch29/ROLES/logs/shots/' }); const { M, check } = L; // batch 29 ROLES copy: its own shots folder
const errs = [];
const card = (p) => p.evaluate(() => { const el = document.getElementById('pmLive0'); return el ? el.textContent.replace(/\s+/g, ' ') : ''; });
const live = (p) => p.evaluate(() => { const el = document.getElementById('pmLive'); return el ? el.textContent.replace(/\s+/g, ' ') : ''; });
const LINKS = [{ foreman: 'acctF', pipelayer: 'acctP', by: 'acctP', started: new Date().toISOString() }];
(async () => {
  const browser = await M.chromium.launch();
  let srv = null, sref = null;
  // ---------- 1. the pipelayer lays pipe; the phone sends the run's status ----------
  const P = await L.setupTouch(browser, { uid: 'acctP', role: 'pipelayer', extra: { __psrv: { entries: {}, plans: {}, links: LINKS }, __names: { acctF: 'Frank Ortiz', acctP: 'Wes Hall' } } });
  { const page = P.page;
    try {
      await M.lockRun(page);
      await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = '24-101'; e.jobsite = 'Elm St water main'; return window.__debugSaveRunArchive(); }); await page.waitForTimeout(300);
      await page.evaluate(() => pbLaidMark(4)); await page.waitForTimeout(300);
      check('pipelayer: status sent when there is signal (laid to 40.0, 5 of 11 rows)', await L.waitFor(page, () => (window.__statusPuts || []).some(x => x.rowsLaid === 5 && x.laidToStation === '40.0' && x.jobNumber === '24-101'), 15000));
      sref = await page.evaluate(() => String(window.__debugGetCurrentArchiveEntry().id));
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(800);
      check('pipelayer: no live crew section, and nothing says a foreman can see the run', !(await live(page)) && !/can see your (current )?run|foreman (can )?sees? your/i.test(await page.evaluate(() => document.body.textContent)));
      srv = await L.srvGet(page);
      await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(400);
    } finally { }
  }
  // another crew's pipelayer (not linked to Frank) also has a run today
  srv.status['acctP2|c1|99'] = { user: 'acctP2', company: 'c1', sref: '99', seq: 1, ended: false, work_date: new Date().toISOString().slice(0, 10), job_number: '24-202', status: { sessionRef: '99', laidFt: 10, totalFt: 50, rowsLaid: 2, rowsTotal: 6, jobNumber: '24-202' }, updated_at: new Date().toISOString() };
  // a run Wes sent BEFORE his current link with Frank began: never shown to Frank (review 1, owner default)
  srv.status['acctP|c1|555'] = { user: 'acctP', company: 'c1', sref: '555', seq: 1, ended: false, work_date: new Date().toISOString().slice(0, 10), created_at: new Date(Date.parse(LINKS[0].started) - 3600000).toISOString(), job_number: 'OLD-1', status: { sessionRef: '555', laidFt: 5, totalFt: 50, rowsLaid: 1, rowsTotal: 6, jobNumber: 'OLD-1' }, updated_at: new Date(Date.now() + 5000).toISOString() };
  // ---------- 2. the foreman's live view ----------
  { const { ctx, page } = await L.setupTouch(browser, { uid: 'acctF', role: 'foreman', extra: { __psrv: srv, __names: { acctF: 'Frank Ortiz', acctP: 'Wes Hall' } } });
    try {
      await page.evaluate(() => pbOpenProdMine());
      await L.waitFor(page, () => !!document.getElementById('pmLive0'));
      let c = await card(page);
      check('foreman: "My crew now" shows Wes Hall\'s current run: job, start → end, In progress', /Wes Hall/.test(c) && /Job 24-101 · Start → End/.test(c) && /In progress/.test(c));
      check('foreman: how far along: "Pipe laid: 40 of 100 ft, last h:mm" and "Laid to 40.0 · 5 of 11 rows"', /Pipe laid: 40 of 100 ft, last \d{1,2}:\d{2}/.test(c) && /Laid to 40\.0 · 5 of 11 rows/.test(c));
      check('foreman: an honest "Last update h:mm"', /Last update \d{1,2}:\d{2}/.test(c));
      check('foreman: a run Wes sent before their current link began is not shown (OLD-1)', !/OLD-1/.test(await live(page)));
      check('foreman: only his own crew (Walt, not linked to him, isn\'t shown)', !/24-202|Walt/.test(await live(page)) && await page.evaluate(() => document.querySelectorAll('#pmLive .pbp-livecard').length === 1));
      check('foreman: a progress bar with a text label (not colour alone)', await page.evaluate(() => { const b = document.querySelector('#pmLive0 .pbp-livebar'); return !!b && /Pipe laid 40 of 100 ft/.test(b.getAttribute('aria-label')) && Math.abs(parseFloat(b.firstChild.style.width) - 40) < 0.5; }));
      await page.screenshot({ path: L.SHOTS + 'live_390.png', fullPage: false });
      // stale: the pipelayer's phone went quiet
      await page.evaluate((k) => { const s = JSON.parse(localStorage.__psrv); s.status[k].updated_at = new Date(Date.now() - 32 * 60000).toISOString(); localStorage.__psrv = JSON.stringify(s); }, 'acctP|c1|' + sref);
      await page.click('#pmLiveRefresh'); await page.waitForTimeout(800);
      c = await card(page);
      check('quiet for 15+ min: neutral "No update since h:mm"', /No update since \d{1,2}:\d{2}/.test(c) && !/offline/.test(c));
      // offline: the last copy, with its time
      await page.evaluate(() => localStorage.setItem('__rpcMode', 'offline'));
      await page.reload(); await page.waitForTimeout(1500); await M.dismiss(page);
      await page.evaluate(() => pbOpenProdMine()); await L.waitFor(page, () => !!document.getElementById('pmLive0'));
      check('offline: the last copy is shown with "Copy from h:mm" / "No signal"', /Copy from|No signal/.test(await page.evaluate(() => document.getElementById('pmLiveStatus').textContent)) && /Pipe laid: 40 of 100 ft/.test(await card(page)));
      // enter production while the run is open (offline: saved on this phone first)
      await page.click('#pmLiveEnter0'); await page.waitForTimeout(300);
      const pre = await page.evaluate(() => [...document.querySelectorAll('#pmLiveForm input')].map(i => i.value));
      check('Enter production for this run: six categories plus crew man-hours and equipment hours (batch 29 ROLES); Pipe Installed pre-filled 40 from the laid rows', pre.length === 8 && pre[6] === '' && pre[7] === '' && pre[2] === '40' && /Filled in from the rows marked laid/.test(await page.evaluate(() => document.getElementById('pmLiveForm').textContent)));
      await page.fill('#pmLiveQ1', '55'); await page.fill('#pmLiveQ2', '42');
      await page.evaluate(() => pbLvRefresh()); await page.waitForTimeout(300);
      check('a refresh never overwrites what the foreman typed (42 stays)', await page.evaluate(() => document.getElementById('pmLiveQ2') && document.getElementById('pmLiveQ2').value === '42'));
      await page.click('#pmLiveSave');
      await L.waitFor(page, () => /Sends when there/.test(document.getElementById('pmLive0').textContent), 10000);
      c = await card(page);
      if (!/Sends when there/.test(c)) console.log('debug save card:', c);
      check('offline save: "Your production for this run: Excavation 55 LF · Pipe Installed 42 LF", "Saved on this phone. Sends when there\'s signal."', /Excavation 55 LF · Pipe Installed 42 LF/.test(c) && /Saved on this phone\. Sends when there’s signal\./.test(c));
      await page.reload(); await page.waitForTimeout(1500); await M.dismiss(page);
      await page.evaluate(() => pbOpenProdMine()); await L.waitFor(page, () => !!document.getElementById('pmLive0'));
      check('after a reload (still offline) it is still saved on this phone', /Excavation 55 LF · Pipe Installed 42 LF/.test(await card(page)) && /Saved on this phone/.test(await card(page)));
      await page.evaluate(() => localStorage.setItem('__rpcMode', 'ok'));
      await page.evaluate(() => { window.dispatchEvent(new Event('online')); pbProdSyncNow(); });
      check('signal: sent (pb_prod_crew_run_save) and "Synced: counts for the company"', await L.waitFor(page, () => /Synced: counts for the company/.test(document.getElementById('pmLive0').textContent), 20000));
      const call = await page.evaluate(() => (window.__rpcLog || []).filter(x => x.fn === 'pb_prod_crew_run_save').pop());
      check('the entry is tied to Wes\'s run session, with the company answer held at Save', !!call && call.args.p_pipelayer === 'acctP' && call.args.p_session_ref === sref && call.args.p_access_company === 'c1' && !!call.args.p_access_at);
      check('the foreman is told the pipelayer\'s own numbers will be marked covered', /own numbers for this run arrive, they’re marked as covered by yours/.test(await card(page)));
      srv = await L.srvGet(page);
      check('server: one foreman entry for that session (crewrun:acctP:' + sref + ')', Object.keys(srv.entries).filter(k => k.startsWith('acctF|crewrun:acctP:' + sref)).length === 1);
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 3. the pipelayer's own entry arrives: covered, never counted twice ----------
  { const { ctx, page } = P;
    try {
      await L.srvPut(page, srv); // the same phone, later: the server now has the foreman's entry
      await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(600);
      check('batch 29 ROLES: the pipelayer\'s Results has no Foreman Production Entry and says his foreman enters it', await page.evaluate(() => { const w = document.getElementById('pbRolesProd'); const t = (document.getElementById('pbRolesWho') || {}).textContent || ''; return !!w && w.hidden && /entered by your foreman/.test(t); }));
      // batch 29 ROLES: the pipelayer's own entry, as an older app sends it
      await page.evaluate(async (ref) => { const d = new Date(), day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        window.__rpcLog.push({ fn: 'pb_prod_save' }); return window.__rpc('pb_prod_save', { p_client_entry_id: 'run:oldapp' + ref, p_record: { jobNumber: '24-101', jobsite: 'Elm St water main', workDate: day, runRef: ref, sessionRef: ref, enteredBy: 'Wes', src: 'run' },
          p_items: [{ key: 'pipe', qty: 35, unit: 'LF' }, { key: 'excavation', qty: 50, unit: 'LF' }], p_expect_uid: 'acctP', p_access_company: 'c1', p_access_at: new Date(Date.now() - 60000).toISOString() }); }, sref);
      check('pipelayer\'s own entry for that session reaches the server', await L.waitFor(page, () => window.__rpcLog.some(x => x.fn === 'pb_prod_save'), 20000));
      srv = await L.srvGet(page);
      const mine = Object.values(srv.entries).find(e => e.user === 'acctP' && e.record && String(e.record.sessionRef) === sref);
      check('on arrival it is marked covered by the foreman (no claim needed)', mine && mine.crew && mine.crew.state === 'covered' && mine.crew.by === 'acctF');
      // batch 29 ROLES: no session on this phone to label (it came from an older app)
      check('the pipelayer\'s own reminder doesn\'t fire for it (nothing to assign or send)', await page.evaluate(() => !window.pbProdHomeAttention()));
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 4. the company totals: the foreman's numbers only ----------
  { const { ctx, page } = await L.setupTouch(browser, { uid: 'acctO', role: 'foreman', manager: true, extra: { __psrv: srv } });
    try {
      await page.evaluate(() => pbOpenProdDashboard()); await L.waitFor(page, () => !!document.getElementById('pdJob0'));
      const r = await page.evaluate(() => window.__rpc('pb_prod_company_dashboard', { p_today: null }));
      const job = r.data.jobs.find(j => j.job_key === '24-101');
      const cat = (k) => (job.cats.find(c => c.key === k) || {}).done;
      check('no double count: Pipe Installed 42 (the foreman\'s), not 77; Excavation 55, not 105', cat('pipe') === 42 && cat('excavation') === 55);
      // review 1 SF1: the company takes the foreman's entry off the totals -> Wes's own entry is no longer covered
      const fe = Object.values(srv.entries).find(e => e.user === 'acctF' && e.covers);
      await page.evaluate((id) => window.__rpc('pb_prod_void', { p_entry_id: id, p_reason: 'test', p_expect_uid: 'acctO' }), fe.id);
      let s2 = await L.srvGet(page), wes = Object.values(s2.entries).find(e => e.user === 'acctP' && e.record && String(e.record.sessionRef) === sref);
      const d2 = (await page.evaluate(() => window.__rpc('pb_prod_company_dashboard', { p_today: null }))).data.jobs.find(j => j.job_key === '24-101');
      check('void: Wes\'s entry is held for a foreman again (24 h from now), assigned to his linked foreman; nothing counts twice (pipe not 77)', wes.crew.state === 'pending' && wes.crew.assigned === 'acctF' && !((d2.cats.find(c => c.key === 'pipe') || {}).done > 42));
      await page.evaluate(() => { const s = JSON.parse(localStorage.__psrv); Object.values(s.entries).forEach(e => { if (e.user === 'acctP' && e.crew && e.crew.state === 'pending') e.crew.created -= 25 * 3600000; }); localStorage.__psrv = JSON.stringify(s); });
      const d3 = (await page.evaluate(() => window.__rpc('pb_prod_company_dashboard', { p_today: null }))).data.jobs.find(j => j.job_key === '24-101');
      check('void: nothing lost: after its 24 h Wes\'s own 35 counts (pipe 35)', (d3.cats.find(c => c.key === 'pipe') || {}).done === 35);
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 5. a run that already counts: refused in plain words; widths ----------
  const today = new Date().toISOString().slice(0, 10);
  srv.status['acctP|c1|777'] = { user: 'acctP', company: 'c1', sref: '777', seq: 5, ended: false, work_date: today, created_at: new Date().toISOString(), job_number: '24-101', run_ref: 'r777', status: { sessionRef: '777', runRef: 'r777', laidFt: 20, totalFt: 60, rowsLaid: 3, rowsTotal: 7, jobNumber: '24-101', label: 'MH-4 → MH-5', laidToStation: '20.0' }, updated_at: new Date(Date.now() + 1000).toISOString() };
  srv.entries['acctP|run:x777'] = { id: '00000000-0000-0000-0009-000000000777', user: 'acctP', email: 'acctP@x.com', company: 'c1', versions: [1], updated_at: new Date().toISOString(), record: { jobNumber: '24-101', workDate: today, sessionRef: '777', runRef: 'r777' }, items: [{ key: 'pipe', qty: 20, unit: 'LF' }], crew: { state: 'sent', created: Date.now(), by: 'acctP' } };
  for (const [w, xl, h, name] of [[390, false, 860, '390'], [320, true, 760, '320xl'], [1280, false, 900, '1280']]) {
    const { ctx, page } = await L.setupTouch(browser, { uid: 'acctF', role: 'foreman', width: w, height: h, xl, touch: false, extra: { __psrv: srv, __names: { acctF: 'Frank Ortiz', acctP: 'Wes Hall' } } });
    try {
      await page.evaluate(() => pbOpenProdMine()); await L.waitFor(page, () => !!document.getElementById('pmLive0'));
      if (name === '390') {
        check('the newest open run is the current one (MH-4 → MH-5); the other is under Today\'s other runs, read-only', /MH-4 → MH-5/.test(await page.evaluate(() => document.querySelector('#pmLive0 .pbp-liverun.cur').textContent)) && /Today’s other runs \(1\)/.test(await card(page)));
        await page.click('#pmLiveEnter0'); await page.fill('#pmLiveQ2', '21'); await page.click('#pmLiveSave');
        check('already counted: "Not sent: their own production for this run already counts for the company …. Nothing was counted."', await L.waitFor(page, () => /Not sent: their own production for this run already counts for the company \(use Counted runs you can still claim\)\. Nothing was counted\./.test(document.getElementById('pmLive0').textContent), 20000));
        check('the refused entry was not filed on the server', !Object.keys((await L.srvGet(page)).entries).some(k => k.includes('crewrun:acctP:777')));
      }
      const lay = await L.layout(page);
      check(name + ': no sideways scroll; live buttons at least 44 px', !lay.hscroll && !lay.small.some(s => /pmLive/.test(s)));
      await page.evaluate(() => document.getElementById('pmLive').scrollIntoView({ block: 'start' })); await page.waitForTimeout(200);
      await page.screenshot({ path: L.SHOTS + 'live_' + name + (name === '390' ? '_refused' : '') + '.png' });
      if (name !== '1280') { await page.click('#pmLiveEnter0').catch(() => null); await page.waitForTimeout(200); await page.evaluate(() => { const f = document.getElementById('pmLiveForm'); if (f) f.scrollIntoView({ block: 'start' }); }); await page.screenshot({ path: L.SHOTS + 'live_form_' + name + '.png' }); }
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 6. review 1 round 2: End Run, then the next run locked right away: the first run still reports "ended" ----------
  { const { ctx, page } = await L.setupTouch(browser, { uid: 'acctP', role: 'pipelayer', extra: { __psrv: { entries: {}, plans: {}, links: LINKS } } });
    try {
      await M.lockRun(page);
      const first = await page.evaluate(() => String(window.__debugGetCurrentArchiveEntry().id));
      await page.evaluate(() => pbLaidMark(3)); await page.waitForTimeout(300);
      await page.evaluate(() => pbEndRun()); await page.waitForTimeout(400); await M.dismiss(page); await page.waitForTimeout(200); await M.dismiss(page);
      await M.lockRun(page); // the next run, straight away
      const second = await page.evaluate(() => String(window.__debugGetCurrentArchiveEntry().id));
      check('End Run then lock the next run: the first run reports ended (within 15 s, not the 1-minute check)', second !== first && await L.waitFor(page, (f) => (window.__statusPuts || []).some(x => x.sessionRef === f && x.ended === true), 15000, first));
      const sv = await L.srvGet(page);
      check('server: the first run\'s status says ended; the new run is the one in progress', !!sv.status['acctP|c1|' + first] && sv.status['acctP|c1|' + first].ended === true && await L.waitFor(page, (n) => !!JSON.parse(localStorage.__psrv).status['acctP|c1|' + n], 15000, second));
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  check('JS errors: ' + (errs.length ? errs.join(' | ') : 'none'), !errs.length);
  console.log('JS errors: ' + (errs.length ? errs.join(' | ') : 'none'));
  await browser.close();
})();
