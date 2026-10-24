// Batch 11 D, review 1: production is never filed under the wrong company (B1), stable entry ids (S7),
// a removed run's production can be taken off the totals (S6, Keep is the default), and a storage read that
// fails never resets the sync state (S1) and recovers (N5).
const T = require('./pd_lib.js'); const { M, check } = T;
const waitFor = async (page, fn, ms = 9000) => { for (let t = 0; t < ms; t += 250) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(250); } return false; };
const filed = (p) => p.evaluate(() => (window.__filed || []).slice());
const sess = async (p) => (await T.prod(p)).sessions;
(async () => {
  const browser = await M.chromium.launch();
  // ---------- A. saved while NOT in a company, joined a company later ----------
  { const { ctx, page } = await T.setup(browser, { extra: { __member: '0' } });
    try {
      await T.runWithProduction(page, { job: 'OTHER-1', exc: '500', pipe: null });
      await page.waitForTimeout(4500);
      let s = await sess(page);
      check('A: saved while not in a company -> "Not sent to a company: saved while you weren\'t in one"', s.length === 1 && s[0].state === 'nocompany' && /saved while you weren.t in one/.test(s[0].label));
      // now the account joins company c2
      await page.evaluate(() => { localStorage.__member = '1'; localStorage.__company = 'c2'; localStorage.__joinedAt = new Date().toISOString(); });
      await page.evaluate(() => pbProdSyncNow()); await page.waitForTimeout(3000);
      await page.evaluate(() => pbProdSyncNow()); await page.waitForTimeout(2500);
      s = await sess(page);
      check('A: after joining c2 it is still never filed (no pb_prod_save, nothing on the server)', (await T.saves(page)).length === 0 && (await filed(page)).length === 0 && s[0].state === 'nocompany');
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(800);
      const m = await page.evaluate(() => ({ t: pmEarlier.innerText + pmToday.innerText, send: getComputedStyle(pmEarlierWrap).display !== 'none', btns: [...document.querySelectorAll('#screen-prodMine button')].map(b => b.textContent.trim()) }));
      check('A: My production says so plainly, and offers no way to file it anyway', /Not sent to a company: saved while you weren.t in one/.test(m.t) && !m.send && !m.btns.some(b => /send|file/i.test(b) && b !== 'Send Earlier Production'));
      check('A: the run and its 500 ft stay on the phone', await page.evaluate(() => window.__debugGetCurrentArchiveEntry().foreman.feetExcavated === 500));
      check('no JS errors (A)', page._errors.length === 0);
    } finally { await ctx.close(); }
  }
  // ---------- B. the company answer was NOT loaded when the work was saved ----------
  { const { ctx, page } = await T.setup(browser, { extra: { __accessDown: '1' } });
    try {
      check('B: no production access known on this phone yet', (await T.prod(page)).acc === null);
      await T.runWithProduction(page, { job: '24-101', exc: '70', pipe: null });
      await page.waitForTimeout(4500);
      let s = await sess(page);
      check('B: no answer held at save -> held at once, "saved before this phone first checked in with the server", nothing sent', s[0].state === 'nocompany' && /before this phone first checked in with the server/.test(s[0].label) && (await T.saves(page)).length === 0);
      // the account is now in c2, joined AFTER the save; the answer comes back
      await page.evaluate(() => { localStorage.__company = 'c2'; localStorage.__joinedAt = new Date(Date.now() + 1000).toISOString(); localStorage.__accessDown = '0'; });
      await page.waitForTimeout(1200);
      await page.evaluate(() => pbProdSyncNow()); await page.waitForTimeout(3500);
      s = await sess(page);
      // review 3: no answer was held at save, so a later answer never decides it: held, said plainly
      check('B: joined c2 after the save; the phone had no server answer before the save -> never filed, said plainly', s[0].state === 'nocompany' && /before this phone first checked in with the server/.test(s[0].label) && (await filed(page)).length === 0 && (await T.saves(page)).length === 0);
      check('no JS errors (B)', page._errors.length === 0);
    } finally { await ctx.close(); }
  }
  // B control: the phone heard from the server before (clock offset known), but the company answer can't be
  // fetched at save time; it comes back later, the account has been in c1 since before the save -> it goes, as c1
  { const { ctx, page } = await T.setup(browser, {});
    try {
      await page.evaluate(() => { localStorage.__accessDown = '1'; });
      await T.runWithProduction(page, { job: '24-101', exc: '70', pipe: null });
      await page.waitForTimeout(2500);
      await page.evaluate(() => { localStorage.__accessDown = '0'; });
      await page.evaluate(() => pbProdSyncNow()); await waitFor(page, () => (window.__filed || []).length > 0);
      const sv = await T.saves(page);
      check('B control: answer (c1) held from before the save, company check down at save -> sent with that answer and filed under c1', sv.length === 1 && sv[0].args.p_access_company === 'c1' && (await filed(page))[0][1] === 'c1' && (await sess(page))[0].state === 'ok');
    } finally { await ctx.close(); }
  }
  // ---------- C. company A, then company B before it synced ----------
  { const { ctx, page } = await T.setup(browser, {});
    try {
      await page.evaluate(() => { localStorage.__rpcMode = 'offline'; });
      await T.runWithProduction(page, { job: '24-101', exc: '90', pipe: null });
      await page.waitForTimeout(3000);
      check('C: saved in c1 (stamped c1 from the verified answer), not sent yet (no signal)', (await T.prod(page)).st.items[(await sess(page))[0].cid].stamp.companyId === 'c1' && (await filed(page)).length === 0);
      await page.evaluate(() => { localStorage.__company = 'c2'; localStorage.__joinedAt = new Date().toISOString(); localStorage.__rpcMode = 'ok'; window.dispatchEvent(new Event('online')); });
      await waitFor(page, () => window.__debugProd().sessions.some(x => x.state === 'nocompany') || (window.__filed || []).length > 0, 25000); await page.waitForTimeout(500);
      const sv = await T.saves(page), s = await sess(page);
      check('C: it is sent as c1 (never re-stamped as c2), the server refuses, a FRESH answer confirms (joined c2 after the save), nothing is filed under c2', sv.every(x => x.args.p_access_company === 'c1') && (await filed(page)).length === 0 && s[0].state === 'nocompany' && /saved while you were in another company/.test(s[0].label));
      check('no JS errors (C)', page._errors.length === 0);
    } finally { await ctx.close(); }
  }
  // ---------- S7: a run whose clientRunId is filled in after its first sync keeps its entry id ----------
  { const { ctx, page } = await T.setup(browser, {});
    try {
      await M.lockRun(page);
      await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.jobNumber = '24-101'; delete e.clientRunId; return window.__debugSaveRunArchive(); }); await page.waitForTimeout(300);
      await page.fill('#fpExcavated', '40'); await page.evaluate(() => pbSaveForemanData()); await page.waitForTimeout(600); await M.dismiss(page);
      await waitFor(page, () => window.__rpcLog.filter(x => x.fn === 'pb_prod_save').length >= 1);
      await page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); e.clientRunId = 'filled-in-later-uuid'; return window.__debugSaveRunArchive(); }); await page.waitForTimeout(300);
      await page.fill('#fpExcavated', '45'); await page.evaluate(() => pbSaveForemanData()); await page.waitForTimeout(600); await M.dismiss(page);
      await waitFor(page, () => window.__rpcLog.filter(x => x.fn === 'pb_prod_save').length >= 2);
      const sv = await T.saves(page);
      check('S7: same entry id before and after clientRunId is filled in (one server entry, 2 versions)', sv.length === 2 && sv[0].args.p_client_entry_id === sv[1].args.p_client_entry_id && /^run:id\d+$/.test(sv[0].args.p_client_entry_id)
        && await page.evaluate(() => { const e = Object.values(JSON.parse(localStorage.__psrv).entries); return e.length === 1 && e[0].versions.length === 2; }));
      check('S7: the id is kept in prodSync', await page.evaluate((cid) => { const st = JSON.parse(localStorage.getItem('acctA:prodSync')); return Object.values(st.ids).includes(cid); }, sv[0].args.p_client_entry_id));
      // ---------- S6: removing the run asks; Keep is the default ----------
      const idx = await page.evaluate(() => window.__debugGetArchive().findIndex(e => e.kind === 'run'));
      await page.evaluate((i) => pbDeleteArchiveEntry(i), idx); await page.waitForTimeout(300);
      let md = await T.modal(page);
      await page.evaluate(() => { const b = [...document.querySelectorAll('#pbModalButtons button')].find(x => /^Delete/.test(x.textContent.trim())) || [...document.querySelectorAll('#pbModalButtons button')].pop(); b.click(); });
      await waitFor(page, () => /Company Production/.test((document.getElementById('pbModalTitle') || {}).textContent || '') && getComputedStyle(pbModalOverlay).display !== 'none', 6000);
      md = await T.modal(page);
      const prim = await page.evaluate(() => (document.querySelector('#pbModalButtons button.primary, #pbModalButtons .pb-btn:not(.secondary):not(.ghost)') || {}).textContent || '');
      check('S6: removing a run with synced production asks "Also take its production off the company totals?" with Keep and Remove', md && /Also take its production off the company totals\?/.test(md.msg) && md.buttons.includes('Keep') && md.buttons.includes('Remove'));
      check('S6: Keep is the default (the primary button)', /Keep/.test(prim) || await page.evaluate(() => { const b = [...document.querySelectorAll('#pbModalButtons button')].find(x => x.textContent.trim() === 'Keep'); return !!b && (document.activeElement === b || /primary/.test(b.className)); }));
      await T.click(page, '^Remove$'); await page.waitForTimeout(500);
      await waitFor(page, () => window.__rpcLog.some(x => x.fn === 'pb_prod_void_mine'), 8000); await page.waitForTimeout(500);
      const vm = await page.evaluate(() => window.__rpcLog.filter(x => x.fn === 'pb_prod_void_mine'));
      check('S6: Remove sends a voiding version for that entry; the server keeps its history', vm.length === 1 && vm[0].args.p_client_entry_id === sv[0].args.p_client_entry_id && await page.evaluate(() => { const e = Object.values(JSON.parse(localStorage.__psrv).entries)[0]; return e.voided === true && e.versions.length === 3; }));
      check('S6: marked as taken off on the phone (not retried)', await page.evaluate((cid) => JSON.parse(localStorage.getItem('acctA:prodSync')).items[cid].voided === true, sv[0].args.p_client_entry_id));
      check('no JS errors (S7/S6)', page._errors.length === 0);
    } finally { await ctx.close(); }
  }
  // S6: Keep leaves it on the totals
  { const { ctx, page } = await T.setup(browser, {});
    try {
      await T.runWithProduction(page, { job: '24-101', exc: '33', pipe: null });
      await waitFor(page, () => window.__rpcLog.some(x => x.fn === 'pb_prod_save'));
      const idx = await page.evaluate(() => window.__debugGetArchive().findIndex(e => e.kind === 'run'));
      await page.evaluate((i) => pbDeleteArchiveEntry(i), idx); await page.waitForTimeout(300);
      await page.evaluate(() => { const b = [...document.querySelectorAll('#pbModalButtons button')].find(x => /^Delete/.test(x.textContent.trim())) || [...document.querySelectorAll('#pbModalButtons button')].pop(); b.click(); });
      await waitFor(page, () => /Company Production/.test((document.getElementById('pbModalTitle') || {}).textContent || '') && getComputedStyle(pbModalOverlay).display !== 'none', 6000);
      await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
      check('S6: Enter on the question = Keep: nothing voided', await page.evaluate(() => !window.__rpcLog.some(x => x.fn === 'pb_prod_void_mine') && !Object.values(JSON.parse(localStorage.__psrv).entries)[0].voided));
    } finally { await ctx.close(); }
  }
  // ---------- S1 / N5: a storage read that fails never resets the state, and recovers ----------
  { const { ctx, page } = await T.setup(browser, {});
    try {
      await T.runWithProduction(page, { job: '24-101', exc: '12', pipe: null });
      await waitFor(page, () => window.__rpcLog.some(x => x.fn === 'pb_prod_save'));
      const before = await page.evaluate(() => localStorage['acctA:prodSync']);
      // from now on, reading prodSync throws (as a storage failure would); the app is reloaded
      await ctx.addInitScript(() => { const g = Storage.prototype.getItem; Storage.prototype.getItem = function (k) { if (g.call(this, '__failProd') === '1' && /prodSync$/.test(String(k))) throw new Error('storage read failed'); return g.call(this, k); }; });
      await page.evaluate(() => { localStorage.__failProd = '1'; });
      await page.reload(); await page.waitForTimeout(2500); await M.dismiss(page);
      const P = await T.prod(page);
      check('S1: a failed read = Sync paused (nothing reset, nothing written)', P.failed === true && await page.evaluate(() => localStorage['acctA:prodSync']) === before);
      await page.evaluate(() => pbOpenProdMine()); await page.waitForTimeout(500);
      const ui = await page.evaluate(() => ({ warn: getComputedStyle(pmFailWarn).display !== 'none' ? pmFailWarn.textContent : '', retry: getComputedStyle(pmRetryWrap).display !== 'none' }));
      check('N5: says so, offers Try Again, and no "reload" advice', /Sync paused/.test(ui.warn) && ui.retry && !/reload/i.test(ui.warn));
      await page.evaluate(() => { localStorage.__failProd = '0'; }); await page.click('#pmRetryBtn'); await page.waitForTimeout(1200);
      const P2 = await T.prod(page);
      check('N5: Try Again recovers the same state (the synced entry is still synced)', P2.failed === false && P2.sessions[0].state === 'ok');
      check('no JS errors (S1)', page._errors.length === 0);
    } finally { await ctx.close(); }
  }
  await browser.close();
  console.log('JS errors: none');
})().catch(e => { console.log('SCRIPT ERROR', e); process.exit(1); });
