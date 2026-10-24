// Batch 11 D: offline-first production sync from a run's Foreman Production Entry.
// A run session's quantities sync as one entry (mapped to the default categories), with the 5-argument save
// (expect uid + expect company); an edit sends a new version; no signal is not a failure and the entry waits;
// a different live session (wrong account) uploads nothing; left company and not-in-a-company are honest states.
const T = require('./pd_lib.js'); const { M, check } = T;
const waitSaves = async (page, n, ms = 8000) => { for (let t = 0; t < ms; t += 250) { if ((await T.saves(page)).length >= n) return true; await page.waitForTimeout(250); } return false; };
(async () => {
  const browser = await M.chromium.launch();
  const { ctx, page } = await T.setup(browser, {});
  try {
    await T.runWithProduction(page, { job: '24-101', exc: '120', pipe: '80', by: 'Frank' });
    await waitSaves(page, 1);
    let sv = await T.saves(page);
    const a = sv[0] && sv[0].args;
    check('a saved run session syncs once (pb_prod_save, 6 arguments)', sv.length === 1 && a && ['p_client_entry_id', 'p_record', 'p_items', 'p_expect_uid', 'p_access_company', 'p_access_at'].every(k => k in a));
    check('expect uid = this account; access company/at = the answer held at save (server time, verbatim)', a.p_expect_uid === 'acctA' && a.p_access_company === 'c1' && typeof a.p_access_at === 'string' && Number.isFinite(Date.parse(a.p_access_at)) && !('savedAt' in a.p_record));
    const today = await page.evaluate(() => window.__pdDay(0));
    check('record: job number, work date (today), entered by, run + session refs', a.p_record.jobNumber === '24-101' && a.p_record.workDate === today && a.p_record.enteredBy === 'Frank' && a.p_record.runRef && a.p_record.sessionRef && /^run:/.test(a.p_client_entry_id));
    check('mapping: Feet excavated -> excavation LF, Feet of pipe installed -> pipe LF; blanks not sent', JSON.stringify(a.p_items) === JSON.stringify([{ key: 'excavation', qty: 120, unit: 'LF' }, { key: 'pipe', qty: 80, unit: 'LF' }]));
    let P = await T.prod(page);
    check('state: Synced', P.sessions.length === 1 && P.sessions[0].state === 'ok');
    // My production shows it, with an honest word
    await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(900);
    let mine = await page.evaluate(() => ({ scr: document.querySelector('.pb-screen.active').id, st: pmStatus.textContent, today: pmToday.innerText, jobs: pmJobs.innerText }));
    check('My production: today\'s entry with its quantities and "Synced"', mine.scr === 'screen-prodMine' && /Job 24-101/.test(mine.today) && /Excavation 120 LF/.test(mine.today) && /Pipe Installed 80 LF/.test(mine.today) && /Synced/.test(mine.today) && /All production synced/.test(mine.st));
    check('My production: the job\'s company progress (no plan: amounts, no fake %)', /Job 24-101/.test(mine.jobs) && /Add planned quantities to see % complete/.test(mine.jobs) && /No % yet/.test(mine.jobs) && !/0%/.test(mine.jobs));
    // edit -> a new version
    await page.evaluate(() => pbResumeLastRunResults && pbResumeLastRunResults()); await page.waitForTimeout(500);
    await page.fill('#fpPipeInstalled', '90'); await page.evaluate(() => pbSaveForemanData()); await page.waitForTimeout(600); await M.dismiss(page);
    await waitSaves(page, 2);
    sv = await T.saves(page);
    check('an edit sends the entry again (same client id, new quantities)', sv.length === 2 && sv[1].args.p_client_entry_id === a.p_client_entry_id && sv[1].args.p_items.find(x => x.key === 'pipe').qty === 90);
    check('server kept 2 versions', await page.evaluate(() => Object.values(JSON.parse(localStorage.__psrv).entries)[0].versions.length === 2));
    // no change -> nothing sent
    await page.evaluate(() => pbProdSyncNow()); await page.waitForTimeout(1500);
    check('nothing changed: nothing sent again', (await T.saves(page)).length === 2);
    // OFFLINE: queued, not a failure
    await page.evaluate(() => { localStorage.__rpcMode = 'offline'; });
    await page.fill('#fpExcavated', '130'); await page.evaluate(() => pbSaveForemanData()); await page.waitForTimeout(600); await M.dismiss(page);
    await waitSaves(page, 3);
    await page.waitForTimeout(500);
    P = await T.prod(page);
    const cid = a.p_client_entry_id, s1 = P.st.items[cid];
    check('no signal: the change waits ("Waiting to sync"), not counted as a failure', P.sessions[0].state === 'wait' && !s1.failH && !s1.refused);
    await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(600);
    mine = await page.evaluate(() => ({ st: pmStatus.textContent, today: pmToday.innerText }));
    check('My production says 1 not synced yet, the run says Waiting', /1 run session not synced yet/.test(mine.st) && /Waiting to sync|Waiting for signal/.test(mine.today));
    const nOff = (await T.saves(page)).length;
    await page.evaluate(() => { localStorage.__rpcMode = 'ok'; window.dispatchEvent(new Event('online')); });
    await waitSaves(page, nOff + 1, 14000); await page.waitForTimeout(400);
    P = await T.prod(page);
    check('signal back: it syncs on its own', P.sessions[0].state === 'ok' && (await T.saves(page)).slice(-1)[0].args.p_items.find(x => x.key === 'excavation').qty === 130);
    // SERVER ERROR: back-off, honest words
    await page.evaluate(() => { localStorage.__rpcMode = 'boom'; });
    await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(400);
    const nB = (await T.saves(page)).length;
    await page.fill('#fpExcavated', '140'); await page.evaluate(() => pbSaveForemanData()); await page.waitForTimeout(600); await M.dismiss(page);
    await waitSaves(page, nB + 1);
    await page.waitForTimeout(400);
    P = await T.prod(page);
    check('a server error: retried later with back-off ("will try again")', P.st.items[cid].failH && P.st.items[cid].nextAt > Date.now() && P.sessions[0].state === 'wait');
    const n5 = (await T.saves(page)).length;
    await page.evaluate(() => { window.dispatchEvent(new Event('visibilitychange')); }); await page.waitForTimeout(6000);
    check('…not hammered meanwhile (background pass respects the back-off)', (await T.saves(page)).length === n5);
    // WRONG ACCOUNT: the live session is another account -> nothing uploaded
    await page.evaluate(() => { localStorage.__rpcMode = 'ok'; localStorage.__mockSess = JSON.stringify({ id: 'acctB', email: 'b@x.com' }); });
    await page.evaluate(() => pbProdSyncNow()); await page.waitForTimeout(2500);
    check('wrong account (live session is someone else): nothing uploaded', (await T.saves(page)).length === n5);
    await page.evaluate(() => { localStorage.__mockSess = JSON.stringify({ id: 'acctA', email: 'a@x.com' }); });
    const nA = (await T.saves(page)).length;
    await page.evaluate(() => pbProdSyncNow()); await waitSaves(page, nA + 1); await page.waitForTimeout(400);
    check('same account again + Sync now: it goes', (await T.prod(page)).sessions[0].state === 'ok');
    // LEFT COMPANY: the server refuses edits; the phone says why, keeps it, stops retrying
    await page.evaluate(() => { localStorage.__company = 'c2'; });
    await page.evaluate(() => pbResumeLastRunResults()); await page.waitForTimeout(400);
    const nL = (await T.saves(page)).length;
    await page.fill('#fpExcavated', '150'); await page.evaluate(() => pbSaveForemanData()); await page.waitForTimeout(600); await M.dismiss(page);
    await waitSaves(page, nL + 1); await page.waitForTimeout(400);
    P = await T.prod(page);
    await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(500);
    mine = await page.evaluate(() => pmToday.innerText);
    check('left company: "Not sent: you have left the company it was sent to"', P.sessions[0].state === 'refused' && /Not sent: you have left the company it was sent to/.test(mine));
    const n7 = (await T.saves(page)).length;
    await page.evaluate(() => pbProdSyncNow()); await page.waitForTimeout(1500);
    check('…and is not retried until it changes', (await T.saves(page)).length === n7);
    check('the run itself is unchanged (150 ft excavated still on the phone)', await page.evaluate(() => window.__debugGetCurrentArchiveEntry().foreman.feetExcavated === 150));
    // NOT IN A COMPANY: a new run stays on the phone, said plainly
    await page.evaluate(() => { localStorage.__company = 'c1'; localStorage.__member = '0'; });
    await T.runWithProduction(page, { job: '24-303', exc: '10', pipe: null, by: 'Frank' });
    await page.waitForTimeout(4500);
    await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(600);
    mine = await page.evaluate(() => ({ warn: getComputedStyle(pmNoCompany).display !== 'none', today: pmToday.innerText }));
    check('not in a company: "On this phone only (not in a company)" + the Not in a company note', mine.warn && /On this phone only \(not in a company\)/.test(mine.today));
    check('no JS errors', page._errors.length === 0);
    if (page._errors.length) console.log(page._errors);
  } finally { await ctx.close(); }
  // EARLIER production (saved before this version ran: no answer held at save) is never sent, and there is no "send anyway"
  { const { ctx: c3, page: p3 } = await T.setup(browser, {});
    try {
      await T.runWithProduction(p3, { job: '24-101', exc: '50', pipe: null });
      await waitSaves(p3, 1);
      const before = (await T.saves(p3)).length;
      // pretend that save happened before this version: no state for it at all
      await p3.evaluate(async () => { const s = window.__debugProd(); s.st.items = {}; localStorage.setItem('acctA:prodSync', JSON.stringify(s.st)); });
      await p3.evaluate(() => { localStorage.__company = 'c1'; pbProdSyncNow(); }); await p3.waitForTimeout(2500);
      await p3.evaluate(() => pbOpenProdMine()); await p3.waitForTimeout(600);
      const m = await p3.evaluate(() => ({ wrap: getComputedStyle(pmEarlierWrap).display !== 'none', today: pmToday.innerText }));
      check('a session with no answer held at save is not sent; no Send Earlier offer; it says how to send it', !m.wrap && /Not sent yet: tap Save Production on this run to send it/.test(m.today) && (await T.saves(p3)).length === before);
      check('no JS errors (earlier)', p3._errors.length === 0);
    } finally { await c3.close(); }
  }
  await browser.close();
  console.log('JS errors: none');
})().catch(e => { console.log('SCRIPT ERROR', e); process.exit(1); });
