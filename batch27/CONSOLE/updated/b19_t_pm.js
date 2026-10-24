// Batch 27 CONSOLE updated copy of /home/claude/batch19/PM/tests/t_pm.js (cx_shim: the company job page shows all its sections, as before the tabs).
// Batch 19 PM: project managers, names and Nudge foreman in the app (mocked server; see pm_lib.js).
// Run with tests/serve.sh SITE_DIR tests/t_pm.js [shots dir]. Must FAIL on the base site (site0) and PASS on this batch.
const T = require('/home/claude/batch19/PM/tests/pm_lib.js'); const { M, check } = T;
require('/home/claude/batch27/CONSOLE/tests/cx_shim.js')(M); // batch 27 CONSOLE: the job page's sections all shown, as this test expects
const SHOTS = process.argv[2] || null;
(async () => {
  const browser = await M.chromium.launch();
  let ctx, page;
  const fresh = async (opts) => { if (ctx) await ctx.close(); ({ ctx, page } = await T.setup(browser, opts)); };
  const shot = async (name) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/' + name + '.png', fullPage: false }); };
  try {
    // ---------------- the owner (company account) ----------------
    await fresh({ who: 'owner' });
    await T.openCrew(page);
    check('owner: Crew members offers the Project manager role', await T.shown(page, 'crRolePm'));
    await page.evaluate(() => { const b = document.getElementById('crRolePm'); if (b) b.click(); });
    await page.fill('#crEmail', 'dana2' + String.fromCharCode(64) + 'example.test');
    await page.evaluate(() => { const n = document.getElementById('crName'); if (n) n.value = '  Dana   Two '; });
    await page.click('#crAddBtn'); await page.waitForTimeout(900);
    let f = (await T.fn(page)).pop();
    check('owner invites a Project manager with a name: role pm and the cleaned name go to crew-admin', f && f.body.action === 'invite' && f.body.role === 'pm' && f.body.name === 'Dana Two', JSON.stringify(f && f.body));
    check('owner: Frank (foreman) has Make Project Manager', (await T.rowBtn(page, 'Frank Ortiz', 'pm')) === 'clicked');
    let m = await T.modal(page);
    check('making a PM explains: company view, paid seat, can’t touch billing / owner / other PMs', m && /paid seat/.test(m.msg) && /billing or ownership/.test(m.msg) && /another PM/.test(m.msg), m && m.msg);
    await T.click(page, 'Make Project manager'); await page.waitForTimeout(900);
    f = (await T.fn(page)).pop();
    check('confirm: set_role with role pm', f && f.body.action === 'set_role' && f.body.role === 'pm' && f.body.user_id.endsWith('f1'));
    const dana = await T.rowText(page, 'Dana Pruitt');
    check('a PM row shows "Project manager", not "Manager"; no Make Manager; can go back to Foreman or Pipelayer',
      /Project manager/.test(dana) && !/Manager(?!\s*\(| access)/.test(dana.replace(/Project manager/g, '')) && (await T.rowBtn(page, 'Dana Pruitt', 'manager')) === 'no button'
      && (await page.evaluate(() => { const r = [...document.querySelectorAll('#crList .pbc-row')].find(x => x.textContent.includes('Dana Pruitt')); return !!r.querySelector('[data-crew-act="role-pipelayer"]') && !!r.querySelector('[data-crew-act="role"]'); })), dana);
    // names on the Crew members list
    const wes = await T.rowText(page, 'Wes (crew 2)');
    check('names: company name first, email as the second line, their own name beside it', wes && wes.includes('Wes (crew 2)') && wes.includes('wes' + String.fromCharCode(64) + 'example.test') && wes.includes('Their own name: Wes Hall'), wes);
    check('names: Edit Name on a crew row', (await T.rowBtn(page, 'Wes (crew 2)', 'name')) === 'clicked' && await T.shown(page, 'crNameEdit'));
    await page.fill('#crNameEdit', '  Wes  H. ');
    await page.click('#crNameSave'); await page.waitForTimeout(900);
    let r = (await T.rpcs(page, 'pb_crew_set_name')).pop();
    check('Edit Name saves the cleaned name through pb_crew_set_name', r && r.args.p_name === 'Wes H.' && r.args.p_expect_uid === 'acctA' && /Name saved/.test(await page.evaluate(() => document.getElementById('crStatus').textContent)), JSON.stringify(r));
    // alerts card (owner)
    check('owner: Job alerts card with own-copies switch, time and zone', await T.shown(page, 'crAlerts') && await T.shown(page, 'crAlertsCopies') && await T.shown(page, 'crAlertsTime'));
    await page.evaluate(() => { document.getElementById('crAlertsCopies').checked = false; document.getElementById('crAlertsTime').value = '07:00'; document.getElementById('crAlertsTz').value = 'America/Denver'; });
    await page.click('#crAlertsSave'); await page.waitForTimeout(900);
    r = (await T.rpcs(page, 'pb_pm_settings_set')).pop();
    check('owner saves alert settings (copies off, 7:00 AM, Mountain)', r && r.args.p_owner_copies === false && r.args.p_digest_time === '07:00' && r.args.p_tz === 'America/Denver', JSON.stringify(r));
    await shot('owner_crew_390');
    // job page: Assigned PMs + Nudge
    await T.openJob(page);
    check('job page: Assigned PMs section', await T.shown(page, 'pjPmSec') && /No PM assigned/.test(await page.evaluate(() => document.getElementById('pjPmSec').textContent)));
    await page.click('#pjPmEdit'); await page.waitForTimeout(300);
    check('picker lists the company’s PMs', await T.shown(page, 'pjPmC0'));
    const pick = await page.evaluate(() => { const c = [...document.querySelectorAll('#pjPmSec input[type=checkbox]')].find(x => x.closest('label').textContent.includes('Dana Pruitt')); if (!c) return null; c.click(); return c.dataset.uid; });
    await page.click('#pjPmSave'); await page.waitForTimeout(900);
    r = (await T.rpcs(page, 'pb_job_pms_set')).pop();
    check('Save PMs sends the picked PM for this job; the list shows them', pick && r && r.args.p_job_number === '24-101' && JSON.stringify(r.args.p_user_ids) === JSON.stringify([pick])
      && /Dana Pruitt/.test(await page.evaluate(() => document.getElementById('pjPmList').textContent)), JSON.stringify(r));
    check('nudge: waiting runs get Nudge Foreman / Nudge Pipelayer; a claimed run gets none',
      (await page.evaluate(() => (document.getElementById('pjNudge0') || {}).textContent)) === 'Nudge Foreman' && (await page.evaluate(() => (document.getElementById('pjNudge1') || {}).textContent)) === 'Nudge Pipelayer'
      && !(await page.evaluate(() => !!document.getElementById('pjNudge2'))));
    await page.click('#pjNudge0'); await page.waitForTimeout(300);
    m = await T.modal(page);
    check('nudge asks first, naming the assigned foreman and the quiet hours', m && /Frank Ortiz/.test(m.msg) && /9 PM and 6 AM/.test(m.msg), m && m.msg);
    await T.click(page, 'Nudge Foreman'); await page.waitForTimeout(900);
    r = (await T.rpcs(page, 'pb_prod_crew_nudge')).pop();
    const line0 = await page.evaluate(() => (document.getElementById('pjNudgeLine0') || {}).textContent || '');
    check('nudge sent: "Nudged <time> by <name> (to the foreman)", and the button waits an hour', r && r.args.p_entry_id.startsWith('e1') && /^Nudged .+ by DIG Civil Construction \(to the foreman\)\.$/.test(line0)
      && (await page.evaluate(() => document.getElementById('pjNudge0').disabled)) && /Next nudge after/.test(await page.evaluate(() => document.getElementById('pjNudge0').textContent)), line0);
    await page.evaluate(() => localStorage.setItem('__quiet', '1'));
    await page.click('#pjNudge1'); await page.waitForTimeout(300);
    m = await T.modal(page);
    check('no foreman assigned: the nudge goes to the pipelayer, and says so', m && /No foreman is assigned/.test(m.msg) && /Wes Hall/.test(m.msg), m && m.msg);
    await T.click(page, 'Nudge Pipelayer'); await page.waitForTimeout(900);
    m = await T.modal(page);
    check('quiet hours: the screen says the nudge is held until 6 AM', m && m.title === 'Nudge Held' && /quiet hours/.test(m.msg) && /held until/.test(await page.evaluate(() => (document.getElementById('pjNudgeLine1') || {}).textContent || '')), m && m.msg);
    await T.click(page, 'OK');
    await shot('owner_job_390');
    check('PDF helper: name AND email, never a made-up name', await page.evaluate(() => window.pbPersonLine && pbPersonLine(' Wes  H. ', 'w' + String.fromCharCode(64) + 'example.test') === 'Wes H. (w' + String.fromCharCode(64) + 'example.test)' && pbPersonLine('', 'w' + String.fromCharCode(64) + 'example.test') === 'w' + String.fromCharCode(64) + 'example.test' && pbPersonLine(null, null) === ''));
    check('owner runs: no JS errors', page._errors.length === 0, page._errors.join(' | '));

    // ---------------- a project manager (own login, company view) ----------------
    await fresh({ who: 'pm' });
    await page.waitForTimeout(2500); // the prompt waits 2.5 s after sign-in
    m = await T.modal(page);
    check('first sign-in after joining with no name: asked once for a name (can be skipped)', m && m.title === 'Your Name' && m.buttons.includes('Skip'), m && m.title);
    if (m) await T.click(page, 'Skip');
    const line = await page.evaluate(() => document.getElementById('loggedInAs').textContent);
    check('PM: signed-in line says Project manager at the company', /Project manager at DIG Civil Construction/.test(line), line);
    await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(600);
    check('PM gets the company view: Company production and Crew members rows', await T.shown(page, 'archiveProdDashBtn') && await T.shown(page, 'archiveCrewBtn'));
    await page.evaluate(() => pbOpenCrewMembers()); await page.waitForTimeout(900);
    check('PM: no Project manager role button (owner only)', !(await T.shown(page, 'crRolePm')) && (await page.evaluate(() => !!document.getElementById('crRolePm'))));
    check('PM: another PM’s row says only the owner can change it', /Only the owner can change or remove a project manager/.test(await T.rowText(page, 'Dana Pruitt') || ''));
    check('PM: alert settings are read-only', await T.shown(page, 'crAlertsRead') && !(await T.shown(page, 'crAlertsSave')));
    await shot('pm_crew_390');
    await page.evaluate(() => pbGoto('settings')); await page.waitForTimeout(900);
    check('Settings: Your name', await T.shown(page, 'settingsNameWrap'));
    await page.click('#settingsNameRow'); // batch 27 CONSOLE: Your name is one compact row; the editor opens in place
    await page.fill('#settingsName', '  Pat   Morgan ');
    await page.click('#settingsNameSave'); await page.waitForTimeout(800);
    r = (await T.rpcs(page, 'pb_my_name_set')).pop();
    check('Your name saves the cleaned name for this account', r && r.args.p_name === 'Pat Morgan' && r.args.p_expect_uid === 'acctA' && /Saved/.test(await page.evaluate(() => document.getElementById('settingsNameMsg').textContent)), JSON.stringify(r));
    await page.reload(); await page.waitForTimeout(3500);
    m = await T.modal(page);
    check('the name prompt is not asked again', !m || m.title !== 'Your Name', m && m.title);
    check('a nudge push opens My production (the claim screen)', await page.evaluate(() => { window.pbPushOpen('#/prod/waiting'); return true; }) && (await page.waitForTimeout(800), await page.evaluate(() => (document.querySelector('.pb-screen.active') || {}).id)) === 'screen-prodMine');
    // review S4: a PM can't take another PM off a job
    await page.evaluate(() => window.__pmRpc('pb_job_pms_set', { p_job_number: '24-101', p_user_ids: ['00000000-0000-4000-8000-0000000000c7'] }));
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('__pmSrv')); s.job['24-101'] = ['00000000-0000-4000-8000-0000000000c7']; localStorage.setItem('__pmSrv', JSON.stringify(s)); });
    await T.openJob(page);
    await page.click('#pjPmEdit'); await page.waitForTimeout(300);
    const lock = await page.evaluate(() => { const c = [...document.querySelectorAll('#pjPmSec input[type=checkbox]')].find(x => x.closest('label').textContent.includes('Dana Pruitt')); return c ? { checked: c.checked, disabled: c.disabled } : null; });
    check('PM: another PM on the job can’t be unticked, and the screen says only the owner can', lock && lock.checked && lock.disabled && await T.shown(page, 'pjPmOwnerNote'), JSON.stringify(lock));
    // PDF names helper
    const lbl = await page.evaluate(async () => { const a = await window.pbMemberLabel('00000000-0000-4000-8000-0000000000f2'); const bad = await window.pbMemberLabel('nope'); return { a, bad }; });
    check('pbMemberLabel(userId) gives { name, email } for the PDFs; nonsense ids give null', lbl.a && lbl.a.name === 'Wes (crew 2)' && lbl.a.email === 'wes' + String.fromCharCode(64) + 'example.test' && lbl.bad === null, JSON.stringify(lbl));
    check('PM runs: no JS errors', page._errors.length === 0, page._errors.join(' | '));

    // ---------------- phone width + extra large text ----------------
    await fresh({ who: 'owner', width: 320, height: 760, xl: true });
    await T.openCrew(page);
    let L = await T.layout(page);
    check('320 px, extra large text: Crew members has no sideways scroll or clipped buttons', !L.hscroll && !L.clipped.length, JSON.stringify(L));
    await shot('owner_crew_320xl');
    await T.openJob(page);
    await page.click('#pjPmEdit'); await page.waitForTimeout(300);
    L = await T.layout(page);
    check('320 px, extra large text: job page (Assigned PMs open, nudges) fits', !L.hscroll && !L.clipped.length, JSON.stringify(L));
    await shot('owner_job_320xl');
    check('320 runs: no JS errors', page._errors.length === 0, page._errors.join(' | '));
  } catch (e) { console.log('SCRIPT ERROR', e); process.exitCode = 1; }
  await browser.close();
})();
