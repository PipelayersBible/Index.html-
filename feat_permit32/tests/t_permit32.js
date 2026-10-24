// feat_permit32 (r15.32) regression: flipped from the overnight permit probes (/home/claude/night/permit/p0*.js).
//  P1 after closeout the Active Permit screen hides the live controls and the hero says "Closed out"
//  P2 a closeout reason that contradicts the permit is asked about once (normal over unsafe; aborted after a check-in)
//  P3 the lock review says plainly when the window has already ended
//  P4 the tester name survives a save; the open form has Cancel and hides "+ Add Test Reading"
//  P5 Set reminder tap target >= 44 px;  P6/P8 one reminders line, no "Off" + "every 15 min" on the same row
//  P10 Send Report Email after closeout points to Records;  P11 one "No air test logged" line, Details rows
//  P9 Unfinished permits eyebrow + labelled snapshot view;  P12 Records row says "Closed <time>"
const H = require('/home/claude/feat_permit32/tests/h.js'); const { M } = H;
const check = (l, c, d) => { console.log((c ? 'OK  ' : '*** FAIL ***') + ' - ' + l + (c || d === undefined ? '' : ' :: ' + String(d).slice(0, 600))); if (!c) process.exitCode = 1; };
const T = (hm) => new Date('2026-10-23T' + hm + ':00').getTime();
const Tpd = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const L = require('/home/claude/test/lib.js');
(async () => {
  const browser = await M.chromium.launch();
  // ---- part 1: the permit mock ----
  { const { ctx, page } = await H.setup(browser, { clockAt: T('07:00') });
    try {
      // P3 review note for a window that has already ended (the lock itself still goes through)
      await page.evaluate(() => pbOpenConfinedPermitForm()); await page.waitForTimeout(300); await M.dismiss(page);
      await page.evaluate(() => { for (const [i, v] of Object.entries({ cpDate: '2026-10-01', cpStart: '06:00', cpEnd: '16:00' })) document.getElementById(i).value = v; document.getElementById(i = 'cpDate').dispatchEvent(new Event('input', { bubbles: true })); if (typeof pbCpReviewRefresh === 'function') pbCpReviewRefresh(); });
      await page.waitForTimeout(300);
      await page.evaluate(() => { document.getElementById('cpEnd').dispatchEvent(new Event('change', { bubbles: true })); });
      await page.waitForTimeout(300);
      const review = await page.evaluate(() => document.getElementById('cpLockReview').textContent);
      check('P3 the review says the window has already ended', /window has already ended/.test(review), review.slice(0, 300));
      // lock a fresh permit (today) with full details
      await H.lockPermit(page, { cpAtmoInterval: '15', cpCommInterval: '10', cpHazards: 'Oxygen deficiency, H2S', cpControls: 'Upstream plug set, blower running', cpVentFail: 'Attendant checks duct airflow', cpRescue: '911, Fresno FD technical rescue', cpComms: 'Radio check every 10 min' }); await H.drain(page, 'lock');
      const fresh = await page.evaluate(() => ({
        notMeasured: (document.getElementById('cpStatusGrid').textContent.match(/Not measured on this permit yet/g) || []).length,
        noAir: (document.getElementById('cpStatusGrid').textContent.match(/No air test logged on this permit yet/g) || []).length,
        detailKeys: [...document.querySelectorAll('#cpSummaryGrid .k')].map(e => e.textContent),
        windowTimes: (document.getElementById('screen-confinedActive').innerText.match(/Authorized Window/g) || []).length,
        remTimes: (document.getElementById('screen-confinedActive').innerText.match(/air test re-check every 15 min; communication check every 10 min/g) || []).length,
        setH: ['cpAtmoTimerSection', 'cpCommTimerSection'].map(id => { const b = document.querySelector('#' + id + ' .cp-tc-set'); return b ? parseFloat(getComputedStyle(b).minHeight) || 0 : 0; }),
      }));
      check('P11 one "No air test logged on this permit yet." line, no four "Not measured" lines', fresh.noAir === 1 && fresh.notMeasured === 0, JSON.stringify(fresh));
      check('P11 Permit Details has Hazards / Controls / Ventilation / Rescue / Communication rows', ['Hazards', 'Controls', 'Ventilation', 'Rescue', 'Communication'].every(k => fresh.detailKeys.some(x => new RegExp(k).test(x))), fresh.detailKeys.join(' | '));
      check('P11 the Authorized Window and the Reminders line appear once each', fresh.windowTimes === 1 && fresh.remTimes <= 1, JSON.stringify([fresh.windowTimes, fresh.remTimes]));
      check('P5 Set reminder has a 44 px minimum height', fresh.setH.every(h => h >= 44), JSON.stringify(fresh.setH));
      // P4 the air form
      await H.reading(page, { tester: 'Al Att' }); await H.drain(page);
      await page.evaluate(() => pbQuickAddAtmoTest()); await page.waitForTimeout(300);
      const form = await page.evaluate(() => ({ tester: document.getElementById('cpAtmoTester').value, addWrap: document.getElementById('cpAtmoAddWrap').offsetParent !== null, buttons: [...document.querySelectorAll('#cpAtmoLogSection button')].filter(b => b.offsetParent).map(b => b.textContent.trim()) }));
      check('P4 the tester name is kept after a save', form.tester === 'Al Att', form.tester);
      check('P4 open form: Cancel shown, "+ Add Test Reading" hidden', form.buttons.some(b => /Cancel/.test(b)) && !form.addWrap && !form.buttons.includes('+ Add Test Reading'), JSON.stringify(form.buttons));
      await page.evaluate(() => pbCpAtmoFormOpen(false)); await page.waitForTimeout(200);
      check('P4 Cancel closes the form and brings "+ Add Test Reading" back', await page.evaluate(() => document.getElementById('cpAtmoAddWrap').offsetParent !== null && document.getElementById('cpAtmoAddForm').offsetParent === null));
      // P6/P8 reminders line: a late reminder set during the entry does not print "Off" next to "every 15 min"
      await H.addPerson(page, 'Ed'); await H.drain(page);
      await page.clock.runFor(60000); await H.toggle(page, 'Ed'); await H.drain(page);
      await page.clock.runFor(60000); await H.toggle(page, 'Ed'); await H.drain(page);
      // P2: closeout as "Completed Normally" over an unsafe last reading asks once
      await H.reading(page, { o2: '20.9', lel: '15' }); const ev = await H.modal(page); await H.drain(page);
      check('LEL 15 on a 10% permit sounds EVACUATE', !!ev && /EVACUATE/.test(ev.msg || ''), JSON.stringify(ev));
      const unsafeUp = await page.evaluate(() => getComputedStyle(document.getElementById('cpUnsafeBanner')).display !== 'none');
      await page.evaluate(() => pbCloseConfinedPermit()); await page.waitForTimeout(600);
      const q = await H.modal(page);
      check('P2 Completed Normally over an unsafe last reading asks "Check the Closeout Reason"', unsafeUp && !!q && /Check the Closeout Reason/.test(q.title) && /outside this permit/.test(q.msg), JSON.stringify(q));
      check('P2 the permit is still open after Cancel', !!(await H.click(page, 'Cancel')) && await page.evaluate(() => !!window.__debugGetConfinedPermit()));
      // pick the matching reason and close
      await page.click('#cpCloseoutReasonToggle button[data-val="other"]'); await page.waitForTimeout(200);
      await page.evaluate(() => pbCloseConfinedPermit()); await page.waitForTimeout(1500); await H.drain(page, 'closeout');
      const s = await page.evaluate(() => {
        const vis = (el) => !!el && el.offsetParent !== null;
        const q = (s) => [...document.querySelectorAll(s)].filter(vis);
        return {
          permit: !!window.__debugGetConfinedPermit(), closed: document.getElementById('screen-confinedActive').classList.contains('is-closed'),
          panel: vis(document.getElementById('cpCloseoutPanel')),
          checkInButtons: q('#cpRosterList button').filter(b => /Check In/.test(b.textContent)).length,
          addPerson: q('#screen-confinedActive button').some(b => /\+ Add Person/.test(b.textContent)),
          addTest: q('#screen-confinedActive button').some(b => /\+ Add Test Reading/.test(b.textContent)),
          logComm: q('#screen-confinedActive button').some(b => /\+ Log Communication Check/.test(b.textContent)),
          closeOutBtn: q('#cpCloseSection button').some(b => /Close Out Permit/.test(b.textContent)),
          reasonToggle: vis(document.getElementById('cpCloseoutReasonToggle')),
          emergencyBtn: vis(document.querySelector('.pb-emergency-btn')),
          hero: document.getElementById('cpHero').innerText.replace(/\s+/g, ' ').trim(),
          finish: q('#screen-confinedActive button').some(b => /Finish/.test(b.textContent)),
        };
      });
      check('P1 closed out: record saved, panel shown, screen marked is-closed', !s.permit && s.panel && s.closed, JSON.stringify(s));
      check('P1 no Check In buttons, no + Add Person / Test Reading / Log Communication Check', s.checkInButtons === 0 && !s.addPerson && !s.addTest && !s.logComm, JSON.stringify(s));
      check('P1 no Close Out Permit button, reason toggle or EMERGENCY button on the closed permit', !s.closeOutBtn && !s.reasonToggle && !s.emergencyBtn, JSON.stringify(s));
      check('P1 the hero names the space and says Closed out; Finish stays', /Closed out/.test(s.hero) && /MH|Manhole|space/i.test(s.hero) && s.finish, s.hero);
      // P10 Send Report Email after closeout points to Records
      await page.evaluate(() => pbSendEmergencyReport()); await page.waitForTimeout(300);
      const m = await H.modal(page); await M.dismiss(page);
      check('P10 Send Report Email after closeout points to Records, not the removed closeout screen card', !!m && /Records/.test(m.msg) && !/closeout screen/.test(m.msg), JSON.stringify(m));
      await page.evaluate(() => pbFinishCloseOut()); await page.waitForTimeout(400);
      // P2b: "Aborted Before Entry" after a check-in asks once
      await H.lockPermit(page, { cpSpace: 'MH-2' }); await H.drain(page, 'lock2');
      await H.reading(page); await H.drain(page); await H.addPerson(page, 'Joe'); await H.drain(page);
      await page.clock.runFor(60000); await H.toggle(page, 'Joe'); await H.drain(page);
      await page.clock.runFor(60000); await H.toggle(page, 'Joe'); await H.drain(page);
      await page.click('#cpCloseoutReasonToggle button[data-val="aborted"]'); await page.waitForTimeout(200);
      await page.evaluate(() => pbCloseConfinedPermit()); await page.waitForTimeout(600);
      const q2 = await H.modal(page);
      check('P2 Aborted Before Entry after a check-in asks once', !!q2 && /Check the Closeout Reason/.test(q2.title) && /checked in/.test(q2.msg), JSON.stringify(q2));
      await H.click(page, 'OK|Close|Yes|Continue'); await page.waitForTimeout(1500); await H.drain(page);
      const rec2 = (await M.archive(page, 'acctA')).filter(e => e.kind === 'confined' && e.space === 'MH-2')[0];
      check('P2 confirming closes it with the chosen reason', !!rec2 && rec2.permit.closeoutReason === 'Aborted Before Entry', rec2 && rec2.permit.closeoutReason);
      check('no JS errors (part 1)', page._errors.length === 0, page._errors.join(' | '));
    } catch (e) { check('part 1 ran', false, e && e.stack); }
    await ctx.close(); }
  // ---- part 2: Records (pd_lib company mock) ----
  { const { ctx, page } = await Tpd.setup(browser, { extra: { '__role': 'pipelayer' } });
    try {
      await page.evaluate(() => {
        const prev = window.__rpc; window.__openRows = [];
        window.__rpc = async (fn, args) => {
          if (fn === 'pb_prod_permit_status_put' || fn === 'pb_permit_open_put' || fn === 'pb_permit_backup' || fn === 'pb_permit_due_set' || fn === 'pb_permit_open_clear') return { data: { ok: true }, error: null };
          if (fn === 'pb_permit_open_mine') return { data: window.__openRows, error: null };
          return prev(fn, args);
        };
      });
      await page.evaluate(() => window.pbOpenUnfinishedPermits()); await page.waitForTimeout(1000);
      const e0 = await page.evaluate(() => ({ eyebrow: document.querySelector('#screen-companyPermits .pb-eyebrow span').textContent, title: document.getElementById('cprTitle').textContent }));
      check('P9 the eyebrow over "Unfinished permits" says RECORDS', e0.title === 'Unfinished permits' && e0.eyebrow === 'RECORDS', JSON.stringify(e0));
      await page.evaluate(() => pbGoto('confinedPermit')); await page.waitForTimeout(300);
      for (const [k, v] of [['cpJobsite', 'Check Job'], ['cpJobNumber', 'J-30'], ['cpAddress', '30 St'], ['cpSpace', 'MH-30'], ['cpPurpose', 'Inspect'], ['cpDate', '2026-09-30'], ['cpStart', '00:00'], ['cpEnd', '23:30'], ['cpAtmoInterval', '15'], ['cpHazards', 'H2S'], ['cpControls', 'plug'], ['cpVentFail', 'monitor'], ['cpRescue', 'Fire dept'], ['cpComms', 'voice'], ['cpSupervisor', 'Sam Super'], ['cpSupervisorInitials', 'SS'], ['cpAttendant', 'Ava Attend']]) await page.fill('#' + k, v);
      await page.click('button[onclick="pbLockConfinedPermit()"]'); await page.waitForSelector('#screen-confinedActive.active'); await page.waitForTimeout(600); await L.dismiss(page);
      await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('acctA:activeConfinedSession')); d.permit.space = 'Other vault'; d.permit.sessionId = 123; window.__openRows = [{ client_permit_id: 'cps-123', space: 'Other vault', jobsite: 'Other Job', job_number: '1', saved_at: new Date(Date.now() - 3600000).toISOString(), snapshot: d }]; });
      await page.evaluate(() => window.pbOpenUnfinishedPermits()); await page.waitForTimeout(1200);
      await page.evaluate(() => pbCprToggle(0)); await page.waitForTimeout(300);
      const snap = await page.evaluate(() => document.getElementById('cprView0').textContent);
      check('P9 View reads like a permit, not a stored object', !/sessionId: /.test(snap) && !/eqPPE: /.test(snap) && !/windowStartMs: /.test(snap) && /Other vault/.test(snap), snap.slice(0, 300));
      check('P9 the snapshot is labelled (space / job / window / air tests)', /Space|Job/.test(snap) && /Air tests|AIR TESTS/i.test(snap), snap.slice(0, 300));
      await page.click('#screen-companyPermits .pb-back'); await page.waitForTimeout(400);
      // close out and look at the Records row
      await page.evaluate(() => pbGoto('confinedActive')); await page.waitForTimeout(300);
      await page.evaluate(() => pbCloseConfinedPermit()); await page.waitForTimeout(2000); await L.dismiss(page); await page.waitForTimeout(300); await L.dismiss(page);
      await page.evaluate(() => pbFinishCloseOut()); await page.waitForTimeout(400);
      await page.evaluate(() => pbGoto('archive')); await page.waitForTimeout(600);
      const row = await page.evaluate(() => { const r = document.querySelector('#archiveList .pb-arch-confined'); return r ? { date: r.querySelector('.pb-arch-date').textContent } : null; });
      check('P12 the Records row labels the time "Closed …"', !!row && /^Closed /.test(row.date), JSON.stringify(row));
      check('no JS errors (part 2)', !page._errors || page._errors.length === 0, (page._errors || []).join(' | '));
    } catch (e) { check('part 2 ran', false, e && e.stack); }
    await ctx.close(); }
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 2; });
