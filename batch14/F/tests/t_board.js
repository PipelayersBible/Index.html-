// Batch 14 F, owner decisions A and B (Oct 19 15:04): the permit phone's live status (display only, never touches the
// permit), the company's "Live now" board (runs + permits, honest wording), the "Crew production reminders" switch and
// time zone, and the push link to My crew now. Server-side push stages are tested in SQL (sql/TEST_RESULT_05.txt).
const L = require('./lf_lib.js'); const { M, check } = L;
const H = require('/home/claude/test/hunt14/permit_live/h.js');
const errs = [];
(async () => {
  const browser = await M.chromium.launch();
  // ---------- 1. the permit holder's phone ----------
  { const { ctx, page } = await L.setupTouch(browser, { uid: 'acctA', role: 'foreman' });
    try {
      await H.lockPermit(page, { cpSpace: 'MH-4', cpJobsite: 'Elm St' });
      await H.reading(page, { o2: '20.9', lel: '0' }); await M.dismiss(page); // entry needs a reading first
      await H.addPerson(page, 'Ed Entrant', 'Entrant'); await H.toggle(page, 'Ed Entrant', 'Entrant'); await M.dismiss(page);
      const before = await page.evaluate(() => localStorage.getItem('acctA:activeConfinedSession'));
      await page.evaluate(() => window.__pbLivePermitTick()); await page.waitForTimeout(1500);
      const after = await page.evaluate(() => localStorage.getItem('acctA:activeConfinedSession'));
      const put = await page.evaluate(() => (window.__permitPuts || []).pop() || null);
      check('permit status sent: space MH-4, jobsite Elm St, 1 inside, last air reading within limits, no emergency', !!put && put.space === 'MH-4' && put.jobsite === 'Elm St' && put.inside === 1 && put.airOk === true && typeof put.lastAirAt === 'number' && put.emergency === false && typeof put.activeSince === 'number');
      check('display only: the stored permit is byte-for-byte unchanged by sending its status', before === after);
      await page.evaluate(() => localStorage.setItem('__rpcMode', 'offline'));
      await H.toggle(page, 'Ed Entrant', 'Entrant'); await page.evaluate(() => window.__pbLivePermitTick()); await page.waitForTimeout(1200);
      check('offline: the new status (0 inside) waits on this phone', await page.evaluate(() => { const q = window.__pbLiveDebug().q; return !!q && !!q.permits && Object.values(q.permits).some(x => x.inside === 0); }));
      check('offline: the permit screen still works (checked out, nothing waits on the status)', /Ed Entrant — Entrant:out/i.test((await H.roster(page)).join(',')));
      await page.evaluate(() => { localStorage.setItem('__rpcMode', 'ok'); window.dispatchEvent(new Event('online')); });
      check('signal: sent (0 inside)', await L.waitFor(page, () => (window.__permitPuts || []).some(x => x.inside === 0), 15000));
      // B. the switch and the time zone
      await page.evaluate(() => window.pbOpenNotifications()); await page.waitForTimeout(500);
      check('Settings > Notifications: "Crew production reminders", on by default', await page.evaluate(() => { const el = document.getElementById('notifTypeCrew'); return !!el && el.checked && /Crew production reminders/.test(el.closest('label').textContent); }));
      await page.evaluate(() => localStorage.setItem('__rpcMode', 'offline'));
      await page.evaluate(() => { const el = document.getElementById('notifTypeCrew'); el.checked = false; el.dispatchEvent(new Event('change')); }); await page.waitForTimeout(500);
      check('switched off with no signal: "Saved on this phone. The change is sent when there\'s signal."', await page.evaluate(() => { const m = document.getElementById('notifCrewMsg'); return !m.hidden && /Saved on this phone/.test(m.textContent); }));
      await page.evaluate(() => { localStorage.setItem('__rpcMode', 'ok'); window.dispatchEvent(new Event('online')); });
      check('signal: sent with this phone\'s time zone', await L.waitFor(page, () => (window.__rpcLog || []).some(x => x.fn === 'pb_prod_push_prefs_set' && x.args.p_crew_production === false && typeof x.args.p_tz === 'string' && x.args.p_tz.length > 2), 15000));
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 2. the company's Live now board ----------
  const now = new Date(), iso = (m) => new Date(now.getTime() - m * 60000).toISOString();
  const srv = { entries: {}, plans: {}, links: [],
    status: { 'acctP|c1|11': { user: 'acctP', company: 'c1', sref: '11', seq: 3, ended: false, work_date: now.toISOString().slice(0, 10), job_number: '24-101', status: { totalFt: 400, laidFt: 120, rowsLaid: 7, rowsTotal: 21, label: 'MH-1 → MH-2', lastLaidAt: iso(3) }, updated_at: iso(2), created_at: iso(60) } },
    permits: { 'acctF|c1|77': { user: 'acctF', company: 'c1', ref: '77', seq: 9, closed: false, status: { space: 'MH-9', jobsite: 'Oak Ave', inside: 2, activeSince: iso(90), lastAirAt: iso(20), airOk: false, emergency: true, emergencyAt: iso(5) }, updated_at: iso(4) },
      'acctF2|c1|78': { user: 'acctF2', company: 'c1', ref: '78', seq: 2, closed: false, status: { space: 'Vault 3', jobsite: 'Elm St', inside: 0, activeSince: iso(30), lastAirAt: iso(10), airOk: true, emergency: false }, updated_at: iso(1) } } };
  for (const [w, xl, h, name] of [[390, false, 860, '390'], [320, true, 760, '320xl'], [1280, false, 900, '1280']]) {
    const { ctx, page } = await L.setupTouch(browser, { uid: 'acctO', role: 'foreman', manager: true, width: w, height: h, xl, touch: false, extra: { __psrv: srv, __names: { acctP: 'Marco Ruiz', acctF: 'Frank Ortiz', acctF2: 'Fiona Foreman' } } });
    try {
      await page.evaluate(() => pbOpenProdDashboard()); await L.waitFor(page, () => !!document.getElementById('pdLivePermit0'));
      const t = await page.evaluate(() => document.getElementById('pdLive').textContent.replace(/\s+/g, ' '));
      if (name === '390') {
        check('board: "Live now", with "Not live if a phone is offline, and nobody is alerted from this board."', /Live now/.test(t) && /Not live if a phone is offline, and nobody is alerted from this board\./.test(t));
        check('board: the emergency permit first-class: "EMERGENCY declared on the permit phone at h:mm (as last reported). This board alerts no one."', /EMERGENCY declared on the permit phone at \d{1,2}:\d{2}[^.]*\(as last reported\)\. This board alerts no one\./.test(t));
        check('board: permit lines: space · jobsite, "2 inside · active since", "Last air reading h:mm: OUTSIDE LIMITS", who + "Last update h:mm, not live if the phone is offline"', /MH-9 · Oak Ave/.test(t) && /2 inside · active since/.test(t) && /Last air reading \d{1,2}:\d{2}[^:]*: OUTSIDE LIMITS/.test(t) && /Frank Ortiz · Last update \d{1,2}:\d{2}[^,]*, not live if the phone is offline/.test(t));
        check('board: the other permit "within limits"; the run: Marco Ruiz, Job 24-101 · MH-1 → MH-2, "Pipe laid: 120 of 400 ft, last h:mm"', /Vault 3 · Elm St/.test(t) && /within limits/.test(t) && /Marco Ruiz/.test(t) && /Job 24-101 · MH-1 → MH-2/.test(t) && /Pipe laid: 120 of 400 ft, last \d{1,2}:\d{2}/.test(t));
        check('board: never claims monitoring or a response', !/monitor|we will respond|help is on the way|dispatch/i.test(t));
      }
      const lay = await L.layout(page);
      check(name + ': board fits (no sideways scroll), its buttons at least 44 px', !lay.hscroll && !lay.small.some(s => /pdLive/.test(s)));
      await page.evaluate(() => document.getElementById('pdLive').scrollIntoView({ block: 'start' })); await page.waitForTimeout(200);
      await page.screenshot({ path: L.SHOTS + 'board_' + name + '.png' });
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  // ---------- 3. not the company account: no board ----------
  { const { ctx, page } = await L.setupTouch(browser, { uid: 'acctF', role: 'foreman', touch: false, extra: { __psrv: srv } });
    try {
      await page.evaluate(() => window.pbPushOpen('#/prod/crew')); await page.waitForTimeout(900);
      check('a crew production push opens My production (My crew now)', (await L.screen(page)) === 'screen-prodMine');
      check('a foreman (not the company account) gets no board and no board request', await page.evaluate(() => { pbOpenProdMine(); const el = document.getElementById('pdLive'); return (!el || !el.textContent) && !(window.__rpcLog || []).some(x => /company_live/.test(x.fn)); }));
      errs.push(...page._errors);
    } finally { await ctx.close(); }
  }
  check('JS errors: ' + (errs.length ? errs.join(' | ') : 'none'), !errs.length);
  console.log('JS errors: ' + (errs.length ? errs.join(' | ') : 'none'));
  await browser.close();
})();
