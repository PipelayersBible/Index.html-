// feat_permitdue (r15.26): the active permit's due times reach pb_permit_due_set; Emergency and a close clear them.
const L = require('/home/claude/batch14/F/tests/lf_lib.js'); const { M, check } = L;
const sleep = (p, ms) => p.waitForTimeout(ms);
const MOCK = () => { const o = window.__rpc; window.__rpc = async (fn, args) => {
  if (fn === 'pb_permit_due_set') { window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args)), at: Date.now() }); return { data: { ok: true, queued: (args.p_atmo_due ? 1 : 0) + (args.p_comm_due ? 1 : 0) }, error: null }; }
  if (fn === 'pb_permit_open_put') return { data: { ok: true }, error: null };
  if (fn === 'pb_permit_backup') return { data: { ok: true, id: 'x' }, error: null };
  return o(fn, args); }; };
(async () => {
  const browser = await M.chromium.launch(); const errs = [];
  try {
    const { ctx, page } = await L.setupTouch(browser, { uid: 'acctP', role: 'pipelayer' });
    await ctx.addInitScript(MOCK); await page.reload(); await sleep(page, 2500);
    page.on('pageerror', e => errs.push(String(e)));
    const calls = () => page.evaluate(() => window.__rpcLog.filter(x => x.fn === 'pb_permit_due_set').map(x => x.args));
    const tick = (force) => page.evaluate((f) => window.__pbPermitDueTick(!!f), !!force);
    // a permit with a 15-minute air re-check and a 5-minute comm check
    await page.evaluate(() => pbGoto('confinedPermit')); await sleep(page, 500);
    const now = new Date(), hm = (d) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    const vals = { cpJobsite: 'Test Job', cpJobNumber: '26014', cpAddress: '1 Main St', cpSpace: 'MH1', cpPurpose: 'Inspect', cpDate: now.toISOString().slice(0, 10), cpStart: hm(new Date(now - 600000)), cpEnd: hm(new Date(+now + 3 * 3600000)),
      cpSupervisor: 'Tom', cpSupervisorInitials: 'TF', cpAttendant: 'Brandon Jones', cpComms: 'Radio', cpHazards: 'None', cpControls: 'Vent', cpVentFail: 'Monitor', cpRescue: '911', cpCommInterval: '5', cpAtmoInterval: '15' };
    for (const k in vals) await page.fill('#' + k, vals[k]);
    await page.evaluate(() => pbLockConfinedPermit()); await sleep(page, 1500);
    check('locked: on the Active Permit screen', await page.evaluate(() => document.querySelector('.pb-screen.active').id === 'screen-confinedActive'));
    await tick(true); await sleep(page, 400);
    let c = await calls();
    check('before anyone is inside: nothing due is sent (' + c.length + ')', c.length === 0 || (c[c.length - 1].p_atmo_due === null && c[c.length - 1].p_comm_due === null));
    // an air reading and a check-in start both timers
    const modalLast = async () => { for (let i = 0; i < 4; i++) { if (await page.evaluate(() => { const m = document.getElementById('pbModalMessage'); return !!(m && m.offsetParent); })) { await page.evaluate(() => [...document.querySelectorAll('#pbModalButtons button')].pop().click()); await sleep(page, 600); } } };
    await page.evaluate(() => pbOpenRosterAddForm()); await page.fill('#cpRosterName', 'Wes Hall'); await page.selectOption('#cpRosterRole', 'Entrant'); await page.evaluate(() => pbAddRosterPerson()); await sleep(page, 1000);
    await page.evaluate(() => pbQuickAddAtmoTest()); await page.fill('#cpAtmoO2', '20.9'); await page.fill('#cpAtmoLEL', '0'); await page.fill('#cpAtmoTester', 'Tom'); await page.evaluate(() => pbSaveAtmoReading()); await sleep(page, 1200); await modalLast();
    await page.evaluate(() => pbToggleRosterStatus(0)); await sleep(page, 1200); await modalLast();
    const running = await page.evaluate(() => ({ atmo: !!window.__pbPermitDueState && true, cd: document.getElementById('cpCommCountdown').textContent, ad: document.getElementById('cpAtmoCountdown').textContent }));
    await tick(); await sleep(page, 600);
    c = await calls(); const last = c[c.length - 1];
    check('after the check-in: both due times sent, ref = the permit session, space MH1 (' + JSON.stringify(last) + ')', !!last && last.p_atmo_due && last.p_comm_due && last.p_space === 'MH1' && /^[0-9]{10,}$/.test(String(last.p_permit_ref)) && last.p_expect_uid === 'acctP');
    const dueIn = (iso) => Math.round((new Date(iso) - Date.now()) / 60000);
    check('air due in about 15 min, comm in about 5 (' + dueIn(last.p_atmo_due) + ', ' + dueIn(last.p_comm_due) + ')', Math.abs(dueIn(last.p_atmo_due) - 15) <= 1 && Math.abs(dueIn(last.p_comm_due) - 5) <= 1);
    const n1 = c.length; await tick(); await sleep(page, 400);
    check('nothing changed: no second call', (await calls()).length === n1);
    // a new air reading moves the air due time: one more call
    await page.evaluate(() => pbQuickAddAtmoTest()); await page.fill('#cpAtmoO2', '20.8'); await page.fill('#cpAtmoLEL', '0'); await page.fill('#cpAtmoTester', 'Tom'); await page.evaluate(() => pbSaveAtmoReading()); await sleep(page, 1200); await modalLast();
    await tick(); await sleep(page, 400); c = await calls();
    check('a new reading: sent again with the comm time unchanged', c.length === n1 + 1 && c[c.length - 1].p_comm_due === last.p_comm_due);
    // Emergency pauses the timers: cleared on the server
    await page.evaluate(() => pbTriggerEmergency()); await sleep(page, 1000); await modalLast();
    const emg = await page.evaluate(() => ({ panel: getComputedStyle(document.getElementById('cpEmergencyPanel')).display, cd: document.getElementById('cpCommCountdown').textContent }));
    check('Emergency panel open, chips Paused (' + JSON.stringify(emg) + ')', emg.panel === 'block' && emg.cd === 'Paused');
    await tick(); await sleep(page, 400); c = await calls();
    check('Emergency: due times cleared on the server (nulls)', c[c.length - 1].p_atmo_due === null && c[c.length - 1].p_comm_due === null);
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
