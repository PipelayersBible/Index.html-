// feat_core33 (r15.33): the overnight core sweep's 13 findings, fixed (/home/claude/night/core.md). The probes'
// "BUG:" checks are flipped here; their controls are kept. Fails on r15.32, passes on feat_core33/out/site.
process.env.PB_P_SITE = process.env.PB_P_SITE || process.env.PB_TEST_DIR || '/home/claude/feat_core33/out/site';
const L = require('/home/claude/test/lib.js');
const P = require('/home/claude/batch13/P/tests/push_lib.js');
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M } = T;
const SHOTS = '/home/claude/feat_core33/shots/';
const txt = (p, s) => p.evaluate((q) => { const e = document.querySelector(q); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, s);
const modal = (p) => p.evaluate(() => { const ov = document.getElementById('pbModalOverlay'); return getComputedStyle(ov).display === 'none' ? null : { title: document.getElementById('pbModalTitle').textContent, msg: document.getElementById('pbModalMessage').textContent, buttons: [...document.querySelectorAll('#pbModalButtons button')].map(b => b.textContent) }; });
async function open(browser, { tier, uid }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await ctx.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await ctx.addInitScript((a) => {
    if (a.uid) { localStorage.setItem('lastKnownUserId', a.uid); localStorage.setItem(a.uid + ':cachedSubscription', JSON.stringify({ tier: a.tier, status: a.tier === 'none' ? 'inactive' : 'active' })); }
    localStorage.setItem('legacyDataMigrated', 'true');
  }, { tier, uid });
  const page = await ctx.newPage(); page.on('dialog', d => d.accept());
  page._errors = []; page.on('pageerror', e => page._errors.push(e.message));
  await page.goto(L.ORIGIN); await page.waitForTimeout(1200); await L.dismiss(page);
  return page;
}
const SUP = () => { const o = window.__rpc; window.__rpc = async (fn, args) => {
  if (fn === 'pb_support_is_admin') return { data: true, error: null };
  if (fn === 'pb_support_inbox') return { data: JSON.parse(localStorage.getItem('__supRows') || '[]'), error: null };
  if (fn === 'pb_company_settings_get') return { data: { ok: true, company_id: 'c1', is_owner: true, tz: 'America/Chicago', digest_time: '06:00', owner_copies: true, tz_set: true, server_at: new Date().toISOString() }, error: null };
  return o(fn, args); }; };
const ROWS = [
  { id: 'a1', created_at: '2026-10-22T14:05:00Z', status: 'new', sender_email: 'dale@crew.example', app_build: 'r15.28', screen: 'input', body: 'What happened:\nThe cutsheet import kept spinning.' },
  { id: 'a2', created_at: '2026-10-20T09:00:00Z', status: 'read', sender_email: 'kim@crew.example', app_build: 'r15.27', screen: 'results', body: 'What happened:\nPDF had the wrong date.' }
];
const CREW = () => { const o = window.__rpc; window.__rpc = async (fn, args) => {
  if (fn === 'pb_prod_push_prefs_set') { (window.__crewCalls = window.__crewCalls || []).push(args); return { data: null, error: { message: 'boom' } }; }
  return o(fn, args); }; };
(async () => {
  const browser = await L.chromium.launch();
  try {
    // ---------- K1: cached account, no signal, no plan ----------
    {
      const page = await open(browser, { tier: 'none', uid: 'uCore33A' });
      const foot = await txt(page, '#homeAccountFoot');
      L.check('K1: Home band says the sign-in could not be confirmed and whose records are open, over Log Out / Lock This Phone [' + foot + ']', /Not signed in \(no signal to confirm it\) — the last account’s records are open/.test(foot) && /Log Out \/ Lock This Phone/.test(foot) && !/log in to use the app/.test(foot));
      await page.evaluate(() => pbGotoTab('calculators')); await page.waitForTimeout(300);
      const m = await modal(page);
      L.check('K1: a locked tab says logging in needs signal, not "Log in first" [' + (m && m.msg) + ']', !!m && /Logging in to check it needs signal/.test(m.msg) && /no active subscription/.test(m.msg) && !/Log in first/.test(m.msg));
      await L.dismiss(page);
      await page.evaluate(() => pbOpenSettings()); await page.waitForTimeout(400);
      const acct = await txt(page, '#settingsAccountSection');
      L.check('K1: Settings › Account agrees with its button; "records are open" said once [' + acct.slice(0, 200) + ']', /no signal to confirm it/.test(acct) && !/log in to use the app/.test(acct) && (acct.match(/records are open/g) || []).length === 1 && /Lock This Phone hides those records/.test(acct));
      await page.context().close();
    }
    // ---------- K1 control: a fresh phone (no cached account) still says "log in to use the app" ----------
    {
      const page = await open(browser, { tier: 'none', uid: null });
      await page.evaluate(() => pbGoto('home', false, true)); await page.waitForTimeout(300);
      const foot = await txt(page, '#homeAccountFoot');
      L.check('control: no account at all: "Not signed in — log in to use the app" with Log In [' + foot + ']', /Not signed in — log in to use the app/.test(foot) && /Log In/.test(foot));
      // K13: Report an App Problem says Log in first at once, with a Log In button
      await page.evaluate(() => pbOpenSettings()); await page.waitForTimeout(300);
      await page.evaluate(() => pbOpenAppProblem()); await page.waitForTimeout(400);
      const e1 = await page.evaluate(() => { const e = document.getElementById('apError'); return { shown: e.style.display !== 'none' && e.getClientRects().length > 0, text: e.innerText.replace(/\s+/g, ' ').trim(), login: !!e.querySelector('button[onclick*="pbOpenLogin"]'), h: Math.round((e.querySelector('button') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height) }; });
      L.check('K13: no account: "Log in first…" is shown before anything is typed, with a Log In button (' + e1.h + ' px) [' + e1.text + ']', e1.shown && /^Log in first\./.test(e1.text) && e1.login && e1.h >= 40);
      await page.fill('#apWhat', 'something broke'); await page.click('#apSendBtn'); await page.waitForTimeout(300);
      const e2 = await page.evaluate(() => { const e = document.getElementById('apError'); return { text: e.innerText.replace(/\s+/g, ' ').trim(), login: !!e.querySelector('button[onclick*="pbOpenLogin"]') }; });
      L.check('K13: Send still refuses with the same line and keeps the Log In button', /Log in first/.test(e2.text) && e2.login);
      await page.fill('#apWhat', ''); await page.evaluate(() => document.querySelector('#apError button').click()); await page.waitForTimeout(400);
      L.check('K13: its Log In button opens the Log In screen', await page.evaluate(() => document.querySelector('.pb-screen.active').id === 'screen-login'));
      L.check('no page errors [' + page._errors.join(' | ') + ']', page._errors.length === 0);
      await page.context().close();
    }
    // ---------- K2: Notifications › Crew production reminders (push harness, server answers with an error) ----------
    {
      const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
      const ctx = await P.ctxFor(browser, { ua: UA });
      await ctx.addInitScript(CREW);
      const page = await P.open(ctx);
      await page.evaluate(() => pbOpenNotifications()); await page.waitForTimeout(900);
      await page.click('#notifOnBtn'); await page.waitForTimeout(8000); // past the 6 s account-load flush
      const st = await P.state(page);
      L.check('control: state is "on", the phone has signal [' + (st && st.code) + ']', !!st && st.code === 'on');
      L.check('control: the crew preference was sent and the server answered with an error', await page.evaluate(() => (window.__crewCalls || []).length) >= 1);
      const hid = await page.evaluate(() => document.getElementById('notifCrewMsg').hidden);
      L.check('K2: nothing was changed on this phone, so the Crew production row carries no note', hid);
      await page.evaluate(() => pbGoto('home')); await page.waitForTimeout(300);
      await page.evaluate(() => pbOpenNotifications()); await page.waitForTimeout(600);
      L.check('K2: …and none on the next visit', await page.evaluate(() => document.getElementById('notifCrewMsg').hidden));
      await page.evaluate(() => { const el = document.getElementById('notifTypeCrew'); el.checked = false; el.dispatchEvent(new Event('change')); }); await page.waitForTimeout(1200);
      const m1 = await txt(page, '#notifCrewMsg');
      L.check('K2: switched off with signal, server error: "Couldn’t be saved to the server. It is tried again later." [' + m1 + ']', /Couldn’t be saved to the server\. It is tried again later\./.test(m1 || ''));
      await ctx.setOffline(true); await page.evaluate(() => { const el = document.getElementById('notifTypeCrew'); el.checked = true; el.dispatchEvent(new Event('change')); }); await page.waitForTimeout(800);
      const m2 = await txt(page, '#notifCrewMsg');
      L.check('control: switched again with no signal: "Saved on this phone. The change is sent when there’s signal." [' + m2 + ']', /Saved on this phone\. The change is sent when there’s signal\./.test(m2 || ''));
      await ctx.setOffline(false);
      L.check('no page errors [' + page._errors.join(' | ') + ']', page._errors.length === 0);
      await ctx.close();
    }
    // ---------- K5, K8, K7, K6, K3, K12, K11, K10: signed-out contractor ----------
    {
      const page = await open(browser, { tier: 'contractor', uid: 'uCore33C' });
      // K5
      await page.evaluate(() => pbOpenBeddingCalc(null)); await page.waitForTimeout(200);
      await page.fill('#beddingThk', '0.5'); await page.waitForTimeout(150);
      const helpers = await page.evaluate(() => ['beddingThkFtIn', 'beddingThkUnitEcho'].map(id => { const e = document.getElementById(id); return e && e.getClientRects().length ? e.textContent.trim() : null; }));
      L.check('K5: bedding thickness 0.5 has the one inch helper (F09), not the feat_weight one too [' + helpers.join(' | ') + ']', helpers[0] === null && /6 in/.test(helpers[1] || ''));
      await page.evaluate(() => pbOpenVolumeCalc()); await page.waitForTimeout(200);
      await page.fill('#volRectD', '0.5'); await page.waitForTimeout(150);
      L.check('control: Material Volume depth keeps its feat_weight helper', await page.evaluate(() => /6 in/.test((document.getElementById('volRectDFtIn') || {}).textContent || '')));
      // K12
      await page.fill('#volRectL', '10'); await page.fill('#volRectW', '3'); await page.fill('#volRectD', '4.5');
      await page.evaluate(() => pbCalcVolume()); await page.waitForTimeout(300);
      const a = await txt(page, '#volumeResult');
      await page.click('#volUnitToggle button[data-val="gal"]'); await page.waitForTimeout(300);
      const b = await txt(page, '#volumeResult');
      await page.click('#volUnitToggle button[data-val="ft3"]'); await page.waitForTimeout(300);
      const c = await txt(page, '#volumeResult');
      L.check('K12: yd³ view: "Volume 5.00 yd³ 135.00 ft³ · 1009.9 gal" (the main unit not repeated) [' + a.slice(0, 60) + ']', /^Volume 5\.00 yd³ 135\.00 ft³ · 1009\.9 gal/.test(a));
      L.check('K12: gal view: the sub-row has no second gallons figure [' + b.slice(0, 60) + ']', /^Volume 1009\.87 gal 5\.00 yd³ · 135\.00 ft³ /.test(b) && (b.match(/gal/g) || []).length === 1);
      L.check('K12: ft³ view: "135.00 ft³ 5.00 yd³ · 1009.9 gal" [' + c.slice(0, 60) + ']', /^Volume 135\.00 ft³ 5\.00 yd³ · 1009\.9 gal/.test(c) && /Weight in tons/.test(c));
      // K8
      await page.evaluate(() => pbOpenRodElevCalc(null)); await page.waitForTimeout(200);
      const lenker = await page.evaluate(() => { const d = [...document.querySelectorAll('#screen-rodElevCalc details.pb-more')].find(x => /Lenker/.test(x.querySelector('summary').textContent)); return d ? d.querySelector('p').textContent.trim() : null; });
      L.check('K8: the Lenker (i) body no longer opens with the question [' + (lenker || '').slice(0, 50) + ']', !!lenker && /^You don't need this: the number on a Lenker rod/.test(lenker));
      await page.evaluate(() => pbOpenSettings()); await page.waitForTimeout(300);
      const fp = await page.evaluate(() => document.getElementById('settingsHelpPassword').textContent.trim());
      L.check('K8: Settings › Help "Forgot your password?" body starts "On the Log In screen" [' + fp + ']', fp === 'On the Log In screen, tap Forgot password? (it needs signal).');
      // K7
      await page.evaluate(() => pbGotoTab('tools')); await page.waitForFunction(() => document.querySelectorAll('#toolsAllList .name').length > 0, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(300);
      const tools = await page.evaluate(() => [...document.querySelectorAll('#toolsAllList section')].map(s => ({ h: (s.querySelector('h2') || {}).textContent || '', rows: [...s.querySelectorAll('.name')].map(n => n.textContent.trim()) })));
      console.log('   Tools groups: ' + JSON.stringify(tools));
      L.check('K7: "Learn" heads the reference rows (no heading equal to its first row)', tools.some(g => g.h === 'Learn' && g.rows[0] === 'Education & Reference') && !tools.some(g => g.h && g.h === g.rows[0]));
      L.check('K7: the Edit Home shortcuts row has no heading over it', tools.some(g => g.h === '' && g.rows.length === 1 && g.rows[0] === 'Edit Home shortcuts'));
      L.check('K7: no Ask row on Tools (the Ask tab is in the bar); search still finds Ask', !tools.some(g => g.rows.some(r => /Ask a Question/.test(r))) && await page.evaluate(() => { const b = document.getElementById('toolsAllSearchBox'); b.value = 'ask'; b.dispatchEvent(new Event('input')); const hit = !!document.querySelector('#toolsAllResults [data-dest="aiAsk"]'); b.value = ''; b.dispatchEvent(new Event('input')); return hit; }));
      L.check('control: Tools still lists Education & Reference, Confined Space Reference and Stats', await page.evaluate(() => ['edu', 'confinedRef', 'stats'].every(id => !!document.querySelector('#toolsAllList [data-dest="' + id + '"]'))));
      await page.screenshot({ path: SHOTS + 'tools_tab.png', fullPage: true });
      // K6
      await page.evaluate(() => pbGotoTab('calculators')); await page.waitForFunction(() => document.querySelectorAll('#toolsList .name').length > 0, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(300);
      await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(100);
      await page.click('#calcCatBtnSafety'); await page.waitForTimeout(900);
      const jump = await page.evaluate(() => { const s = document.querySelector('#toolsList section[aria-label="Safety"]'), h = document.querySelector('#screen-calcHub .pb-header'); const b = s.getBoundingClientRect(), hb = h.getBoundingClientRect(); return { screen: document.querySelector('.pb-screen.active').id, top: Math.round(b.top), headBottom: Math.round(hb.bottom), y: Math.round(scrollY) }; });
      L.check('K6: "Safety" scrolls the tab to its heading (stays on Calculators, heading just under the header) [' + JSON.stringify(jump) + ']', jump.screen === 'screen-calcHub' && jump.y > 0 && jump.top >= jump.headBottom - 2 && jump.top < jump.headBottom + 40);
      await page.click('#calcCatBtnStruct'); await page.waitForTimeout(900);
      const jumpS = await page.evaluate(() => { const s = document.querySelector('#toolsList section[aria-label="Structures"]'), bar = document.getElementById('pbTabBar'); const b = s.getBoundingClientRect(); return { screen: document.querySelector('.pb-screen.active').id, top: Math.round(b.top), barTop: Math.round(bar.getBoundingClientRect().top), atBottom: Math.round(scrollY + innerHeight) >= document.documentElement.scrollHeight - 2 }; });
      L.check('K6: "Structures" (the last group) scrolls to the page end with its heading on screen above the tab bar [' + JSON.stringify(jumpS) + ']', jumpS.screen === 'screen-calcHub' && jumpS.atBottom && jumpS.top > 62 && jumpS.top < jumpS.barTop - 60);
      await page.screenshot({ path: SHOTS + 'calc_jump_structures.png' });
      await page.click('#calcCatBtnGrade'); await page.waitForTimeout(900);
      const jump2 = await page.evaluate(() => { const s = document.querySelector('#toolsList section[aria-label="Grade & Elevation"]'), h = document.querySelector('#screen-calcHub .pb-header'); return { top: Math.round(s.getBoundingClientRect().top), headBottom: Math.round(h.getBoundingClientRect().bottom) }; });
      L.check('K6: "Grade & Elevation" scrolls back up to its heading [' + JSON.stringify(jump2) + ']', jump2.top >= jump2.headBottom - 2 && jump2.top < jump2.headBottom + 60);
      L.check('control: the category screens are still reachable directly (pbGoto) with their tiles', await page.evaluate(() => { pbGoto('calcCatPipe'); return document.querySelector('.pb-screen.active').id === 'screen-calcCatPipe' && document.querySelectorAll('#screen-calcCatPipe .pb-home-tile').length >= 5; }));
      await page.evaluate(() => pbGotoTab('calculators')); await page.waitForTimeout(300);
      await page.screenshot({ path: SHOTS + 'calculators_tab.png' });
      // K10 (opened from Settings reached from Home)
      await page.evaluate(() => pbGoto('home')); await page.waitForTimeout(300);
      await page.evaluate(() => pbOpenSettings()); await page.waitForTimeout(300);
      await page.evaluate(() => { document.getElementById('apWhere').value = ''; pbOpenAppProblem(); }); await page.waitForTimeout(400);
      const facts = await txt(page, '#apFacts');
      L.check('K10: from Home, the facts line says "Home" and Which screen? is prefilled "Home" [' + (await page.inputValue('#apWhere')) + ' | ' + facts.slice(0, 90) + ']', (await page.inputValue('#apWhere')) === 'Home' && /the screen you were on, Home\./.test(facts) && !/Pipelayer/.test(facts));
      L.check('K13 control: with an account the form shows no "Log in first" line', await page.evaluate(() => document.getElementById('apError').style.display === 'none'));
      // K3: cutsheet rows
      await page.evaluate(() => pbOpenNewRun()); await page.waitForTimeout(300); await L.dismiss(page);
      await page.evaluate(() => pbOpenCutsheetImport()); await page.waitForTimeout(300);
      await (await page.$('#cutsheetPdfInput')).setInputFiles('/home/claude/test/cutsheet_sample_2.pdf');
      await page.waitForFunction(() => /Extracted/.test(document.getElementById('cutsheetPdfStatus').textContent), null, { timeout: 45000 });
      await page.evaluate(() => pbSelectCutsheetSegment('0')); await page.waitForTimeout(400);
      const tbl = await page.evaluate(() => { const w = document.querySelector('#cutsheetRowTable .pb-table-wrap'), rows = [...document.querySelectorAll('#cutsheetRowTable tbody tr')]; const wr = w.getBoundingClientRect(); return { total: rows.length, wrapH: Math.round(wr.height), scrollH: w.scrollHeight, clientH: w.clientHeight, rowH: Math.round(rows[0].getBoundingClientRect().height), maxH: getComputedStyle(w).maxHeight, inv: rows[0].children[6].innerText.replace(/\s+/g, ' ').trim() }; });
      console.log('   rows table: ' + JSON.stringify(tbl));
      L.check('K3: the rows table grows with the page (no inner scroll box: max-height none, nothing hidden inside)', tbl.maxH === 'none' && tbl.scrollH <= tbl.clientH + 2 && tbl.total > 10);
      L.check('K3: a row is two lines tall (' + tbl.rowH + ' px), not five', tbl.rowH < 70);
      L.check('control: the invert cell still carries its working [' + tbl.inv + ']', /^\d+\.\d\d \d+\.\d\d [−+] (cut|fill) \d+\.\d\d/.test(tbl.inv));
      await page.evaluate(() => { document.querySelector('#cutsheetRowTable').scrollIntoView({ block: 'start' }); }); await page.waitForTimeout(200);
      await page.screenshot({ path: SHOTS + 'cutsheet_rows.png' });
      L.check('control: no sideways page scroll on the cutsheet screen', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      // K11: the AI photo button offline
      await page.context().setOffline(true); await page.waitForTimeout(200);
      await page.evaluate(() => { localStorage.setItem('pbAiPrivacyAck', '1'); window.__picks = 0; document.getElementById('cutsheetAiPhotoInput').addEventListener('click', (e) => { window.__picks++; e.preventDefault(); }); pbCutsheetAiPhotoPick(); }); await page.waitForTimeout(300);
      const ps = await txt(page, '#cutsheetAiPhotoStatus');
      L.check('K11: offline, "Read a Photo of the Sheet (AI)" says "No signal… nothing was sent" and never opens the picker [' + ps + ' | picks ' + await page.evaluate(() => window.__picks) + ']', /^No signal\./.test(ps || '') && /nothing was sent/.test(ps || '') && (await page.evaluate(() => window.__picks)) === 0 && !(await modal(page)));
      await page.context().setOffline(false);
      await page.evaluate(() => { pbCutsheetAiPhotoPick(); }); await page.waitForTimeout(300);
      L.check('control: with signal the picker opens', (await page.evaluate(() => window.__picks)) === 1);
      L.check('no page errors [' + page._errors.join(' | ') + ']', page._errors.length === 0);
      await page.context().close();
    }
    // ---------- K4, K9: the owner ----------
    {
      const { ctx, page } = await T.setup(browser, { manager: true, height: 844, extra: { __ownerCo: '1', __supRows: ROWS } });
      await ctx.addInitScript(SUP); await page.reload(); await page.waitForTimeout(3000); await M.dismiss(page);
      page.on('pageerror', e => page._errors.push(String(e)));
      await page.evaluate(() => pbOpenSettings()); await page.waitForTimeout(2500);
      const tz = await page.evaluate(() => { const v = document.querySelector('#settingsCoTimeRow .pbx-namerow-v'); const r = document.getElementById('settingsCoTimeRow').getBoundingClientRect(); return v ? { text: v.textContent.trim(), clipped: v.scrollWidth > v.clientWidth + 1, ws: getComputedStyle(v).whiteSpace, rowH: Math.round(r.height), lines: Math.round(v.getBoundingClientRect().height / parseFloat(getComputedStyle(v).lineHeight)) } : null; });
      console.log('   time zone row: ' + JSON.stringify(tz));
      L.check('K4: the Time zone value "' + (tz && tz.text) + '" is not clipped at 390 px (wraps)', !!tz && !tz.clipped && tz.ws === 'normal' && /morning email 6:00 AM/.test(tz.text));
      L.check('control: the row is still a >= 44 px target', !!tz && tz.rowH >= 44);
      await page.evaluate(() => document.getElementById('settingsCompanySection').scrollIntoView()); await page.waitForTimeout(200);
      await page.screenshot({ path: SHOTS + 'timezone_row.png' });
      await page.click('#settingsAppProblemsBtn'); await page.waitForTimeout(1200);
      L.check('control: App problems opens with the list', await page.evaluate(() => document.querySelector('.pb-screen.active').id === 'screen-appProblems') && /dale@crew\.example/.test(await txt(page, '#apInboxList')));
      const lead = await page.evaluate(() => document.querySelector('#screen-appProblems .pb-w10-lead').textContent);
      L.check('K9: the lead no longer says "Read only" and "you can mark" [' + lead + ']', !/Read only/.test(lead) && /Mark each one read or closed; nothing else can be changed here\./.test(lead));
      const whens = await page.evaluate(() => [...document.querySelectorAll('#apInboxList .pb-w10-ap-when')].map(e => e.textContent));
      L.check('K9: times without seconds or the year, as the sender\'s list (' + whens.join(' | ') + ')', whens.length === 2 && whens.every(w => /^[A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} [AP]M$/.test(w)));
      const scr = await page.evaluate(() => [...document.querySelectorAll('#apInboxList .pb-w10-ap-meta')].map(p => p.textContent.replace(/\s+/g, ' ')).filter(t => /Screen/.test(t)));
      L.check('K9: the Screen column names the screen, id kept (' + scr.join(' | ') + ')', scr.some(t => /Screen Run Setup \(input\)/.test(t)) && scr.some(t => /Screen Run Results \(results\)/.test(t)));
      await page.screenshot({ path: SHOTS + 'app_problems.png', fullPage: true });
      L.check('no page errors [' + page._errors.join(' | ') + ']', page._errors.length === 0);
      await ctx.close();
    }
  } catch (e) { console.log('*** FAIL *** - test crashed: ' + (e && e.stack || e)); process.exitCode = 1; }
  await browser.close();
})();
