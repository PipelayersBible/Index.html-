// feat_phonechk (r15.30): K1 the live "closed" status reaches the company at closeout (not only on the minute tick);
// K2 Log Out remembers notifications were on for the account, and the same account signing back in gets them back
// (a different account does not); K3 the closeout email card is gone, the notice points at the PDF; K4 the unfinished-
// permits list offers "Open on this phone" for the permit live on this phone. Supabase is the pd_lib mock (acctA, company c1).
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { check } = T;
const L = require('/home/claude/test/lib.js');
const wait = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await L.chromium.launch();
  const { ctx, page } = await (async () => {
    const o = await T.setup(browser, { extra: { '__role': 'pipelayer' } });
    return o;
  })();
  // more mocked RPCs for this test: the permit-side server functions, recorded
  await page.evaluate(() => {
    const prev = window.__rpc; window.__statusPuts = []; window.__openRows = [];
    window.__rpc = async (fn, args) => {
      if (fn === 'pb_prod_permit_status_put') { window.__statusPuts.push(JSON.parse(JSON.stringify(args.p_status))); return { data: { ok: true }, error: null }; }
      if (fn === 'pb_permit_open_put' || fn === 'pb_permit_backup' || fn === 'pb_permit_due_set' || fn === 'pb_permit_open_clear') return { data: { ok: true }, error: null };
      if (fn === 'pb_permit_open_mine') return { data: window.__openRows, error: null };
      return prev(fn, args);
    };
  });
  // ---- a permit, locked ----
  await page.evaluate(() => pbGoto('confinedPermit')); await page.waitForTimeout(300);
  for (const [k, v] of [['cpJobsite', 'Check Job'], ['cpJobNumber', 'J-30'], ['cpAddress', '30 St'], ['cpSpace', 'MH-30'], ['cpPurpose', 'Inspect'], ['cpDate', '2026-09-30'], ['cpStart', '00:00'], ['cpEnd', '23:30'], ['cpAtmoInterval', '15'], ['cpHazards', 'H2S'], ['cpControls', 'plug'], ['cpVentFail', 'monitor'], ['cpMinO2', '19.5'], ['cpMaxLEL', '10'], ['cpRescue', 'Fire dept'], ['cpComms', 'voice'], ['cpSupervisor', 'Sam Super'], ['cpSupervisorInitials', 'SS'], ['cpAttendant', 'Ava Attend']]) await page.fill('#' + k, v);
  await page.click('button[onclick="pbLockConfinedPermit()"]'); await page.waitForSelector('#screen-confinedActive.active'); await page.waitForTimeout(600); await L.dismiss(page);
  const sid = await page.evaluate(() => window.__debugGetConfinedPermit().sessionId);
  // K4: Records > Unfinished permits, with this phone's permit (the server's copy) and another phone's
  await page.evaluate((sid) => { window.__openRows = [
    { client_permit_id: 'cps-' + sid, space: 'MH-30', jobsite: 'Check Job', job_number: 'J-30', saved_at: new Date().toISOString(), snapshot: {} },
    { client_permit_id: 'cps-123', space: 'Other vault', jobsite: 'J', job_number: '1', saved_at: new Date().toISOString(), snapshot: {} }]; }, sid);
  await page.evaluate(() => window.pbOpenUnfinishedPermits()); await page.waitForTimeout(1200);
  const k4html = await page.evaluate(() => document.querySelector('#screen-companyPermits').innerHTML);
  check('K4: the row for the permit live on this phone has "Open on this phone"; the other row only View', (k4html.match(/Open on this phone/g) || []).length === 1 && (k4html.match(/>View</g) || []).length === 2, k4html.slice(0, 300));
  await page.click('button:has-text("Open on this phone")'); await page.waitForTimeout(300);
  check('K4: tapping it opens the Active Permit screen', await page.evaluate(() => !!document.querySelector('#screen-confinedActive.active')));
  // K1: the live status: an open status first (the tick ran on lock), then "closed" within two seconds of the closeout
  await page.evaluate(() => window.__pbLivePermitTick()); await page.waitForTimeout(800);
  const open1 = await page.evaluate(() => window.__statusPuts.filter(s => s.closed === false).length);
  check('K1 setup: the open permit\'s live status reached the company (' + open1 + ')', open1 >= 1);
  await page.evaluate(() => pbCloseConfinedPermit()); await page.waitForTimeout(2000); await L.dismiss(page); await page.waitForTimeout(300); await L.dismiss(page);
  const closed1 = await page.evaluate(() => window.__statusPuts.filter(s => s.closed === true));
  check('K1: within two seconds of the closeout the company has the permit as closed, 0 inside (not at the next minute)', closed1.length >= 1 && closed1[0].inside === 0 && String(closed1[0].permitRef) === String(sid), JSON.stringify(closed1));
  // K3: no email card; the notice says where the PDF is
  const k3 = await page.evaluate(() => ({ panel: document.getElementById('cpCloseoutPanel').style.display !== 'none', hidden: document.querySelector('#cpCloseoutPanel .pb-section').hidden, notice: document.querySelector('#cpCloseoutPanel .pb-clean').textContent, emailVisible: !!(document.getElementById('cpCloseoutEmail') && document.getElementById('cpCloseoutEmail').offsetParent), finishVisible: !!document.querySelector('#cpCloseoutPanel button[onclick="pbFinishCloseOut()"]').offsetParent }));
  check('K3: the closeout panel shows, the email card is hidden, the address box is not visible, Finish is', k3.panel && k3.hidden === true && !k3.emailVisible && k3.finishVisible, JSON.stringify(k3));
  check('K3: the notice says the permit is in Records with its PDF, nothing about emailing', /saved in Records, with its PDF/.test(k3.notice) && !/[Ee]mail/.test(k3.notice), k3.notice);
  await page.evaluate(() => pbFinishCloseOut()); await page.waitForTimeout(500);
  check('K1: Finish & Return Home does not send a second, different status (same closed status, deduped)', (await page.evaluate(() => window.__statusPuts.filter(s => s.closed === true).length)) === closed1.length);
  // ---- K2: notifications remembered through Log Out and restored for the same account ----
  const U = 'acctA', OTHER = 'acctB';
  await page.evaluate((u) => localStorage.setItem('pbPushDevice', JSON.stringify({ uid: u, want: 'on', synced: true, why: '', endpoint: 'https://push.example/e1', at: Date.now() })), U);
  await page.evaluate(() => window.pbPushBeforeSignOut(false)); await page.waitForTimeout(400);
  const d1 = await page.evaluate(() => JSON.parse(localStorage.getItem('pbPushDevice')));
  check('K2: after Log Out the phone record is off and remembers which account had them on', !!d1 && d1.want === 'off' && d1.why === 'signed_out' && d1.wasOn === U && d1.uid === null, JSON.stringify(d1));
  await page.evaluate(() => { try { Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'granted', requestPermission: () => Promise.resolve('granted') } }); } catch (e) {} window.__debugPushHost = true; window.__syncCalls = 0; window.pbPushSync = () => { window.__syncCalls++; return Promise.resolve('ok'); }; });
  await page.evaluate((o) => window.pbAccountLoadHooks.forEach(h => { try { h(o); } catch (e) {} }), OTHER); await page.waitForTimeout(600);
  const d2 = await page.evaluate(() => JSON.parse(localStorage.getItem('pbPushDevice')));
  check('K2: another account signing in gets nothing back (record stays off)', !!d2 && d2.want === 'off' && d2.uid === null, JSON.stringify(d2));
  await page.evaluate((u) => window.pbAccountLoadHooks.forEach(h => { try { h(u); } catch (e) {} }), U); await page.waitForTimeout(600);
  const d3 = await page.evaluate(() => JSON.parse(localStorage.getItem('pbPushDevice')));
  check('K2: the same account signing back in gets them back (on, to be registered)', !!d3 && d3.uid === U && d3.want === 'on' && d3.synced === false, JSON.stringify(d3));
  await wait(5500);
  const d4 = await page.evaluate(() => JSON.parse(localStorage.getItem('pbPushDevice')));
  check('K2: a background sync ran to register the phone again (the record shows its outcome; still on)', !!d4 && d4.want === 'on' && d4.uid === U && (d4.synced === true || d4.why !== ''), JSON.stringify(d4));
  check('no page errors', !page._errors || page._errors.length === 0, (page._errors || []).join(' | '));
  await browser.close();
})();
