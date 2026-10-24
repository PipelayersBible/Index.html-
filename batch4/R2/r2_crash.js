// Batch 4 (R2): crash reports to Sentry. Fails on base (no reporter, no switch), passes on R2.
// Every Sentry request is caught by page.route, so nothing real is ever sent.
//  1. a dirty error -> exactly one envelope, scrubbed (no email / phone / base64 / name / job number / jobsite /
//     address / account id / reset-link code), only the allowed fields, <= 500-character message
//  2. the same error again -> not sent again (dedupe); 3. at most 10 per page load (rate limit)
//  4. unhandled promise rejection is reported; a caught save failure is reported (fixed wording, warning)
//  5. offline -> waits (memory + small phone queue), sent when back online, and after the app is reopened
//  6. Settings switch: default on, (i) explains, off -> nothing sent (also after reopening), off deletes waiting reports
//  9. report screens / anonymous report sends: nothing captured, queued or sent; waiting reports held
//  1b. review cases: free-text messages withheld (type only); app-raised failures send a fixed label only
//  7. the reporter failing (server 500, network refused, fetch throwing, storage throwing, context throwing) never
//     breaks the app; 8. localhost without the test flag sends nothing (the harness guard)
const L = require('/home/claude/test/lib.js');
const INGEST = /o4512143154806784\.ingest\.us\.sentry\.io\/api\/4512143200616448\/envelope\//;
const U = 'uR2crash-7f3e2a10-0000-4000-8000-123456789abc';
const seed = (flag, tier) => (a) => {
  if (!sessionStorage.getItem('__r2seeded')) { sessionStorage.setItem('__r2seeded', '1'); }
  localStorage.setItem('lastKnownUserId', a.u);
  localStorage.setItem(a.u + ':cachedSubscription', JSON.stringify({ tier: a.tier, status: 'active' }));
  if (a.flag) localStorage.setItem('pbCrashTestSend', '1');
};
async function ctxWith(browser, { flag = true, tier = 'contractor', status = 200, mode = 'ok' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 900 } });
  await ctx.addInitScript(seed(), { u: U, flag, tier });
  const sent = [];
  ctx._mode = mode; ctx._status = status;
  await ctx.route(INGEST, async (route) => {
    const req = route.request();
    sent.push({ url: req.url(), body: req.postData() || '', headers: req.headers() });
    if (ctx._mode === 'abort') return route.abort('connectionrefused');
    return route.fulfill({ status: ctx._status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' });
  });
  return { ctx, sent };
}
async function open(ctx, query) {
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  page._errors = []; page.on('pageerror', e => page._errors.push(e.message));
  await page.goto(L.ORIGIN + (query || '')); await page.waitForTimeout(900);
  await L.dismiss(page);
  return page;
}
// A browser-shaped runtime error (its message is kept), distinct per label.
const slug = (m) => 'pb_' + String(m).replace(/[^A-Za-z0-9]+/g, '_');
const throwLater = (page, msg) => page.evaluate((m) => { setTimeout(() => { throw new TypeError(m + ' is not a function'); }, 0); }, slug(msg));
// Any other message: thrown as is (its text must be withheld). pad puts each on its own line, so each is distinct.
const throwRaw = (page, msg, type, pad) => page.evaluate('setTimeout(() => {' + '\n'.repeat(pad || 0) + ' throw new ' + (type || 'Error') + '(' + JSON.stringify(msg) + '); }, 0);');
const parse = (body) => { const [h, i, e] = body.split('\n'); return { h: JSON.parse(h), i: JSON.parse(i), e: JSON.parse(e) }; };
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await L.chromium.launch();
  try {
    // ---------------- 1-4: one page, flag on ----------------
    {
      const { ctx, sent } = await ctxWith(browser);
      const page = await open(ctx, '?code=RESETCODE998877&type=recovery#access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.sig');
      const st = await page.evaluate(() => window.pbCrash && window.pbCrash.state());
      L.check('the reporter is built in and on by default [' + JSON.stringify(st) + ']', !!st && st.enabled === true && st.local === true && st.testSend === true);
      L.check('no Sentry SDK and nothing fetched to run it (no script src to sentry)', await page.evaluate(() => ![...document.scripts].some(s => /sentry/i.test(s.src))));
      L.check('nothing sent at start-up', sent.length === 0);
      await page.evaluate(() => pbOpenNewRun()); await page.waitForTimeout(400);
      await page.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; }; set('saJobsite', 'Westlake Pump Station'); set('saJobNumber', 'WLK7781'); set('saPipelayer', 'Dale Hargrove'); });
      const DIRTY = 'Save failed for Westlake Pump Station job JOB-4471 (WLK7781) at 123 Main Street, foreman John Smith, pipelayer Dale Hargrove, '
        + 'john.smith@acme-civil.com, cell 555-123-4567, user ' + U + ', photo data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD' + 'Q'.repeat(3000);
      await throwRaw(page, DIRTY); await page.waitForTimeout(800);
      L.check('a real error sends exactly one envelope [' + sent.length + ']', sent.length === 1);
      const env = sent[0] ? parse(sent[0].body) : null, ev = env && env.e;
      L.check('…to the project envelope URL with sentry_key and sentry_version, no Referer', !!sent[0] && /sentry_key=fc0dde343b7650455bf703d226d6bb0e/.test(sent[0].url) && /sentry_version=7/.test(sent[0].url) && !sent[0].headers.referer);
      L.check('…envelope header has event_id + dsn, item type event', !!env && env.h.event_id === ev.event_id && /^[0-9a-f]{32}$/.test(ev.event_id) && /ingest\.us\.sentry\.io\/4512143200616448$/.test(env.h.dsn) && env.i.type === 'event');
      const raw = sent[0] ? sent[0].body : '';
      const leaks = ['acme', 'john', 'Smith', '4471', 'WLK7781', 'Westlake', 'Hargrove', 'Main Street', '555-123', '4567', 'base64,', '/9j/', 'QQQQQQQQ', U, 'uR2crash', 'RESETCODE', '998877', 'access_token', 'eyJhbGci', 'recovery']
        .filter(x => raw.toLowerCase().includes(x.toLowerCase()));
      L.check('…no email, phone, base64, names, job number, jobsite, address, user id or reset-link code leaks [' + leaks.join(',') + ']', leaks.length === 0);
      const ex = ev && ev.exception.values[0];
      L.check('…type kept, a free-text message is withheld entirely [' + (ex && ex.type + ': ' + ex.value) + ']', !!ex && ex.type === 'Error' && ex.value === '[message withheld]');
      const fr = ex && ex.stacktrace && ex.stacktrace.frames || [];
      L.check('…stack frames: file name only (no query or hash), function, line [' + JSON.stringify(fr[fr.length - 1]) + ']', fr.length >= 1 && fr.every(f => typeof f.filename === 'string' && !/[?#\/]/.test(f.filename) && typeof f.lineno === 'number' && typeof f['function'] === 'string'));
      const keys = Object.keys(ev || {}).sort().join(',');
      L.check('…only the allowed fields (no user, request, breadcrumbs, extra, server_name) [' + keys + ']', keys === 'contexts,environment,event_id,exception,level,platform,release,sdk,tags,timestamp');
      L.check('…app build, screen, plan, online tag [' + JSON.stringify(ev && ev.tags) + ' ' + (ev && ev.release) + ']', !!ev && /^pipelayers-bible@/.test(ev.release) && ev.tags.screen === 'input' && /^(none|individual|contractor)$/.test(ev.tags.plan) && ev.tags.online === 'yes' && ev.environment === 'test');
      L.check('…plan tier is the seeded contractor plan [' + (ev && ev.tags.plan) + ']', !!ev && ev.tags.plan === 'contractor');
      L.check('…browser / OS summary only (name + version), not the whole user-agent [' + JSON.stringify(ev && ev.contexts) + ']', !!ev && Object.keys(ev.contexts).sort().join() === 'browser,os' && !/Mozilla|AppleWebKit/.test(JSON.stringify(ev.contexts)));
      L.check('…asks Sentry not to infer the IP address', !!ev && ev.sdk && ev.sdk.settings && ev.sdk.settings.infer_ip === 'never');
      L.check('…timestamp is now', !!ev && Math.abs(ev.timestamp * 1000 - Date.now()) < 60000);

      // a frame from the page's own script: file name with the reset link's query and hash removed
      await page.evaluate(() => { setTimeout(() => { window.pbSetTextSize({ valueOf() { throw new RangeError('inline boom'); }, toString() { throw new RangeError('inline boom'); } }); }, 0); });
      await page.waitForTimeout(600);
      const ib = sent.map(s => parse(s.body).e).find(e => e.exception.values[0].type === 'RangeError');
      const ibf = ib && ib.exception.values[0].stacktrace && ib.exception.values[0].stacktrace.frames || [];
      L.check('frames from the app\'s own code are named by file only, the reset-link query and hash gone [' + JSON.stringify(ibf.filter(f => f.filename === 'app.html')) + ']', ibf.some(f => f.filename === 'app.html' && /pbApplyTextSize|pbSetTextSize/.test(f['function']) && f.lineno > 1000) && !/RESETCODE|access_token|\?/.test(JSON.stringify(ibf)));
      // 2. dedupe
      await throwRaw(page, DIRTY); await page.waitForTimeout(600);
      L.check('the same error again is not sent again [' + sent.length + ']', sent.length === 2);
      // 4a. unhandled rejection
      await page.evaluate(() => { Promise.reject(new TypeError("Cannot read properties of null (reading 'crewList')")); }); await page.waitForTimeout(600);
      const rj = sent[2] && parse(sent[2].body).e;
      L.check('an unhandled promise rejection is reported; a browser-shaped message is kept [' + (rj && rj.exception.values[0].type + ': ' + rj.exception.values[0].value) + ']', !!rj && rj.exception.values[0].type === 'TypeError' && rj.exception.values[0].value === "Cannot read properties of null (reading 'crewList')" && rj.exception.values[0].mechanism.type === 'onunhandledrejection');
      await page.evaluate(() => { Promise.reject(new TypeError('rejected thing for ops@crew.org')); }); await page.waitForTimeout(600);
      const rj2 = sent[3] && parse(sent[3].body).e;
      L.check('…an app-worded rejection is withheld [' + (rj2 && rj2.exception.values[0].value) + ']', !!rj2 && rj2.exception.values[0].type === 'TypeError' && rj2.exception.values[0].value === '[message withheld]');
      // 4b. a caught save failure (central pbNoteStoreFailure), via Text Size
      await page.evaluate(() => { window.__r2o = localStorage.setItem.bind(localStorage); localStorage.setItem = (k, v) => { if (/textSize/.test(k)) throw new Error('QuotaExceededError'); return window.__r2o(k, v); }; });
      await page.evaluate(() => pbOpenSettings()); await page.waitForTimeout(400);
      await page.click('#textSizeToggle button[data-val="120"]'); await page.waitForTimeout(800);
      await page.evaluate(() => { localStorage.setItem = window.__r2o; });
      const sv = sent.map(s => parse(s.body).e).find(e => /^Save failed \(/.test(e.exception.values[0].value));
      L.check('a caught save failure is reported with fixed wording, as a warning, no ref [' + (sv && sv.exception.values[0].value + ' ' + sv.level) + ']', !!sv && /^Save failed \((room|blocked)\)$/.test(sv.exception.values[0].value) && sv.level === 'warning' && sv.exception.values[0].mechanism.handled === true && sv.tags.screen === 'settings');
      L.check('control: the app still shows its own save-failure message', await page.evaluate(() => { const m = document.getElementById('textSizeMsg'); return m && m.style.display !== 'none' && /couldn.t be saved/.test(m.textContent); }));
      await page.click('#textSizeToggle button[data-val="100"]'); await page.waitForTimeout(300);
      // 3. rate limit
      for (let i = 0; i < 15; i++) await throwLater(page, 'distinct failure number ' + String.fromCharCode(65 + i));
      await page.waitForTimeout(1500);
      const st2 = await page.evaluate(() => window.pbCrash.state());
      L.check('at most 10 reports per page load [' + sent.length + ' sent, taken ' + st2.taken + ']', sent.length === 10 && st2.taken === 10);
      L.check('control: the app still works (Home opens)', await page.evaluate(async () => { pbGoto('home'); await new Promise(r => setTimeout(r, 300)); return !!document.querySelector('#screen-home.active'); }));
      await ctx.close();
    }

    // ---------------- 1b: review cases and app labels (own page) ----------------
    {
      const { ctx, sent } = await ctxWith(browser);
      const page = await open(ctx);
      // review cases (independent review, Oct 18): every one is withheld; the error type still goes
      const REVIEW = ["Cannot read properties of undefined (reading 'joe smith')", 'report by joe smith failed', 'Failed for Smith, John on job 2417', 'Mike said the trench at 1234 N Main is 9 ft deep',
        "Entry O'Brien foreman failed", 'JOHN SMITH entered permit CS-12 with H2S 15 ppm', 'Riverside Dr and 5th Ave, permit for Juan P\u00e9rez', '\u00c9MILE DURAND / \u00c9mile Durand',
        'Description: Foreman Dave keeps skipping the gas test at the Henderson job', 'JSON at position 12: {"reporter":"Ann Lee","body":"crew is drinking"}', 'Job number 2417 for Acme Excavating'];
      const before = sent.length;
      for (let i = 0; i < REVIEW.length && i < 8; i++) await throwRaw(page, REVIEW[i], i % 2 ? 'TypeError' : 'Error', 3 + i);
      await page.waitForTimeout(900);
      const rv = sent.slice(before).map(x => parse(x.body).e.exception.values[0]);
      const rvRaw = sent.slice(before).map(x => x.body).join('\n').toLowerCase();
      L.check('review cases (lowercase / reversed names, 4-digit job, no-suffix address): 8 sent, all "[message withheld]" [' + rv.map(v => v.type + ':' + v.value).join(' | ') + ']', rv.length === 8 && rv.every(v => v.value === '[message withheld]'));
      L.check('…none of their words reach the envelope', !['joe', 'smith', 'john', '2417', '1234', 'main', 'mike', 'trench'].some(w => rvRaw.includes(w)));
      // app-raised notes carry the fixed label only
      await page.evaluate(() => window.pbCrash.note('Cloud sync refused', 'duplicate key for job 2417 (joe smith, joe@x.com)'));
      await page.evaluate(() => window.pbCrash.capture(new Error('boot broke for Joe Smith'), { source: 'startup', handled: true, label: 'Start-up failed' }));
      await page.waitForTimeout(700);
      const notes = sent.slice(before + rv.length).map(x => parse(x.body).e.exception.values[0]);
      L.check('app-raised failures send their fixed label only, never the detail [' + notes.map(v => v.type + ':' + v.value).join(' | ') + ']', notes.length === 2 && notes[0].value === 'Cloud sync refused' && notes[1].value === 'Start-up failed' && !/joe|2417|smith/i.test(sent.slice(before + rv.length).map(x => x.body).join()));
      await ctx.close();
    }

    // ---------------- 9: report screens and anonymous sends ----------------
    {
      const { ctx, sent } = await ctxWith(browser);
      const page = await open(ctx);
      await page.evaluate(() => { window.__r2c = window.pbCrashContext; window.pbCrashContext = () => Object.assign(window.__r2c(), { screen: 'reportIssue' }); });
      await throwLater(page, 'while on report screen'); await page.waitForTimeout(700);
      L.check('on a report screen: nothing is sent and nothing is queued [' + sent.length + ' ' + JSON.stringify(await page.evaluate(() => window.pbCrash.state())) + ']', sent.length === 0 && await page.evaluate(() => window.pbCrash.state().queued === 0 && window.pbCrash.state().taken === 0));
      await page.evaluate(() => { window.pbCrashContext = window.__r2c; window.pbReportAnonInFlight = 1; });
      await throwLater(page, 'while anon in flight'); await page.waitForTimeout(700);
      L.check('while an anonymous report call is on its way (pbReportAnonInFlight): nothing is sent or queued', sent.length === 0 && await page.evaluate(() => window.pbCrash.state().queued === 0));
      // a report that was already waiting is held (not sent) during the anonymous call, then sent after
      await page.evaluate(() => { window.pbReportAnonInFlight = 0; });
      await ctx.setOffline(true); await page.waitForTimeout(200);
      await throwLater(page, 'queued before anon'); await page.waitForTimeout(500);
      await page.evaluate(() => { window.pbReportAnonInFlight = 1; });
      await ctx.setOffline(false); await page.waitForTimeout(1000);
      L.check('…a report waiting from before is held during the anonymous call [' + sent.length + ']', sent.length === 0 && await page.evaluate(() => window.pbCrash.state().queued === 1));
      await page.evaluate(() => { window.pbReportAnonInFlight = 0; window.pbCrash.flush(); }); await page.waitForTimeout(800);
      L.check('…and sent once it is over [' + sent.length + ']', sent.length === 1);
      // the real report screens, when this build has them (merged with R3)
      const has = await page.evaluate(() => !!document.getElementById('screen-reportIssue'));
      if (has) {
        for (const scr of ['reportIssue', 'myReports', 'reportsInbox', 'reportReceipt']) {
          const ok = await page.evaluate((n) => { if (!document.getElementById('screen-' + n)) return false; pbGoto(n); return true; }, scr); await page.waitForTimeout(500); await L.dismiss(page);
          const on = await page.evaluate((n) => !!document.querySelector('#screen-' + n + '.active'), scr);
          if (!ok || !on) { console.log('note: could not open ' + scr + ' here (' + ok + '/' + on + ')'); continue; }
          const n0 = sent.length;
          await throwLater(page, 'on real ' + scr); await page.waitForTimeout(600);
          L.check('real ' + scr + ' screen: nothing sent or queued', sent.length === n0 && await page.evaluate(() => window.pbCrash.state().queued === 0));
        }
        await page.evaluate(() => pbGoto('home')); await page.waitForTimeout(400);
      } else console.log('note: this build has no report screens (R3 not merged): real-screen checks skipped');
      await throwLater(page, 'back home after reports'); await page.waitForTimeout(700);
      L.check('control: off the report screens, errors are sent again', sent.some(x => /back_home_after_reports/.test(x.body)));
      await ctx.close();
    }

    // ---------------- 5: offline queue ----------------
    {
      const { ctx, sent } = await ctxWith(browser);
      const page = await open(ctx);
      await ctx.setOffline(true); await page.waitForTimeout(200);
      await throwLater(page, 'broke while offline'); await page.waitForTimeout(800);
      const q = await page.evaluate(() => ({ s: window.pbCrash.state(), stored: JSON.parse(localStorage.getItem('pbCrashQueue') || '[]').length }));
      L.check('offline: nothing is sent, the report waits in memory and on the phone [' + JSON.stringify(q) + ']', sent.length === 0 && q.s.queued === 1 && q.stored === 1);
      await ctx.setOffline(false); await page.waitForTimeout(1200);
      const q2 = await page.evaluate(() => ({ s: window.pbCrash.state(), stored: localStorage.getItem('pbCrashQueue') }));
      L.check('back online: the waiting report is sent once and the queue is emptied [' + sent.length + ' ' + JSON.stringify(q2) + ']', sent.length === 1 && parse(sent[0].body).e.exception.values[0].value === slug('broke while offline') + ' is not a function' && q2.s.queued === 0 && q2.stored === null);
      // waits across closing the app
      await ctx.setOffline(true); await page.waitForTimeout(200);
      await throwLater(page, 'broke offline then closed'); await page.waitForTimeout(600);
      const id = await page.evaluate(() => JSON.parse(localStorage.getItem('pbCrashQueue'))[0].event_id);
      await page.close(); await ctx.setOffline(false);
      const page2 = await open(ctx); await page2.waitForTimeout(3500);
      const ids = sent.map(s => parse(s.body).e.event_id);
      L.check('a report waiting when the app closed is sent the next time it opens [' + sent.length + ']', sent.length === 2 && ids[1] === id);
      L.check('…and is gone from the phone afterwards', await page2.evaluate(() => localStorage.getItem('pbCrashQueue') === null));
      // the stored queue stays small
      await ctx.setOffline(true); await page2.waitForTimeout(200);
      for (let i = 0; i < 10; i++) await throwLater(page2, 'offline burst ' + String.fromCharCode(65 + i) + ' ' + 'z'.repeat(55));
      await page2.waitForTimeout(800);
      const sz = await page2.evaluate(() => ({ n: JSON.parse(localStorage.getItem('pbCrashQueue') || '[]').length, len: (localStorage.getItem('pbCrashQueue') || '').length, mem: window.pbCrash.state().queued }));
      L.check('the phone queue stays small (<= 10 reports, <= 16,000 characters) [' + JSON.stringify(sz) + ']', sz.n <= 10 && sz.n >= 1 && sz.len <= 16000 && sz.mem <= 20);
      await ctx.close();
    }

    // ---------------- 6: Settings switch ----------------
    {
      const { ctx, sent } = await ctxWith(browser);
      const page = await open(ctx);
      await page.evaluate(() => pbOpenSettings()); await page.waitForTimeout(400);
      const sw = await page.evaluate(() => { const t = document.getElementById('crashReportsToggle'), l = t && t.closest('label'), r = l && l.getBoundingClientRect(), h = document.getElementById('crashReportsHelp'), d = document.getElementById('crashReportsMore');
        return t && { on: t.checked, role: t.getAttribute('role'), label: document.getElementById('crashReportsLabel').textContent, h: r.height, w: r.width, vw: innerWidth, helpShown: d.open || h.getClientRects().length > 0 && getComputedStyle(h).contentVisibility !== 'hidden' && !d.matches(':not([open])'), help: h.textContent, inSection: !!t.closest('#settingsPrivacySection') }; });
      L.check('Settings has "Send crash reports" (a switch), on by default [' + JSON.stringify(sw && { on: sw.on, role: sw.role, label: sw.label }) + ']', !!sw && sw.on && sw.role === 'switch' && sw.label === 'Send crash reports' && sw.inSection);
      L.check('…its row is a >= 48 px target and fits the screen', !!sw && sw.h >= 48 && sw.w <= sw.vw);
      L.check('…the explanation is behind the (i) and lists what is sent and what never is [' + JSON.stringify(sw && { shown: sw.helpShown, help: sw.help.slice(0, 60) }) + ']', !!sw && !sw.helpShown && /Sent:/.test(sw.help) && /Never sent:/.test(sw.help) && /plan type/.test(sw.help) && /job numbers/.test(sw.help));
      await page.click('#crashReportsMore > summary'); await page.waitForTimeout(200);
      L.check('…tapping (i) shows it', await page.evaluate(() => document.getElementById('crashReportsMore').open && document.getElementById('crashReportsHelp').getBoundingClientRect().height > 20));
      // off deletes waiting reports
      await ctx.setOffline(true); await page.waitForTimeout(200);
      await throwLater(page, 'waiting then switched off'); await page.waitForTimeout(500);
      L.check('control: a report is waiting (offline)', await page.evaluate(() => window.pbCrash.state().queued === 1));
      await page.click('label[for="crashReportsToggle"]'); await page.waitForTimeout(400);
      const off = await page.evaluate(() => ({ checked: document.getElementById('crashReportsToggle').checked, saved: localStorage.getItem('pbCrashReports'), s: window.pbCrash.state(), q: localStorage.getItem('pbCrashQueue') }));
      L.check('turning it off is saved on this phone and deletes the waiting report [' + JSON.stringify(off) + ']', !off.checked && off.saved === '0' && !off.s.enabled && off.s.queued === 0 && off.q === null);
      await ctx.setOffline(false); await page.waitForTimeout(800);
      await throwLater(page, 'error while switched off'); await page.waitForTimeout(800);
      L.check('switched off: nothing is sent [' + sent.length + ']', sent.length === 0);
      await page.reload(); await page.waitForTimeout(900); await L.dismiss(page);
      await page.evaluate(() => pbOpenSettings()); await page.waitForTimeout(400);
      L.check('…still off after reopening the app', await page.evaluate(() => !document.getElementById('crashReportsToggle').checked && !window.pbCrash.state().enabled));
      await throwLater(page, 'error after reopen while off'); await page.waitForTimeout(800);
      L.check('…and still nothing is sent [' + sent.length + ']', sent.length === 0);
      await page.click('label[for="crashReportsToggle"]'); await page.waitForTimeout(300);
      await throwLater(page, 'error after switching back on'); await page.waitForTimeout(800);
      L.check('control: switched back on, errors are sent again [' + sent.length + ']', sent.length === 1 && await page.evaluate(() => localStorage.getItem('pbCrashReports') === '1'));
      // the switch's own save failing is said, and the choice still holds for now
      await page.evaluate(() => { window.__r2o = localStorage.setItem.bind(localStorage); localStorage.setItem = (k, v) => { if (k === 'pbCrashReports') throw new Error('full'); return window.__r2o(k, v); }; });
      await page.click('label[for="crashReportsToggle"]'); await page.waitForTimeout(400);
      const f = await page.evaluate(() => { const m = document.getElementById('crashReportsMsg'); return { shown: m.style.display !== 'none', t: m.textContent, en: window.pbCrash.state().enabled }; });
      L.check('if the choice can\'t be saved, Settings says so (and it is off for now) [' + f.t.slice(0, 70) + ']', f.shown && /couldn.t be saved/.test(f.t) && f.en === false);
      await page.evaluate(() => { localStorage.setItem = window.__r2o; });
      await ctx.close();
    }

    // ---------------- 7: reporter failure never breaks the app ----------------
    {
      const { ctx, sent } = await ctxWith(browser, { status: 500 });
      const page = await open(ctx);
      await throwLater(page, 'server says 500'); await page.waitForTimeout(800);
      L.check('server error: tried once, kept for later, app fine [' + sent.length + ']', sent.length === 1 && await page.evaluate(() => window.pbCrash.state().queued === 1));
      ctx._mode = 'abort';
      await throwLater(page, 'network refused'); await page.waitForTimeout(800);
      await page.evaluate(() => { window.__r2f = window.fetch; window.fetch = () => { throw new Error('fetch exploded'); }; });
      await throwLater(page, 'fetch throws'); await page.waitForTimeout(500);
      await page.evaluate(() => { window.fetch = window.__r2f; });
      await page.evaluate(() => { window.__r2o = localStorage.setItem.bind(localStorage); localStorage.setItem = (k, v) => { if (k === 'pbCrashQueue') throw new Error('full'); return window.__r2o(k, v); }; window.__r2c = window.pbCrashContext; window.pbCrashContext = () => { throw new Error('ctx broke'); }; });
      await throwLater(page, 'storage and context broken'); await page.waitForTimeout(500);
      await page.evaluate(() => { localStorage.setItem = window.__r2o; window.pbCrashContext = window.__r2c; });
      const extra = page._errors.filter(m => !/server_says_500|network_refused|fetch_throws|storage_and_context_broken/.test(m));
      L.check('the reporter itself raised no error of its own [' + extra.join(' | ') + ']', extra.length === 0);
      L.check('…and the app still works: New Run opens and calculates', await page.evaluate(async () => { pbOpenNewRun(); await new Promise(r => setTimeout(r, 300)); return !!document.querySelector('#screen-input.active'); }));
      await page.evaluate(() => pbGoto('home')); await page.waitForTimeout(300);
      L.check('…Home still renders', await page.evaluate(() => !!document.querySelector('#screen-home.active') && document.getElementById('homeTileNewRun') !== null));
      await ctx.close();
    }

    // ---------------- 8: harness guard ----------------
    {
      const { ctx, sent } = await ctxWith(browser, { flag: false });
      const page = await open(ctx);
      await throwLater(page, 'local without the flag'); await page.waitForTimeout(800);
      const st = await page.evaluate(() => window.pbCrash.state());
      L.check('localhost without the test flag: nothing is sent or kept [' + JSON.stringify(st) + ']', sent.length === 0 && st.local && !st.testSend && st.queued === 0 && st.taken === 0);
      await ctx.close();
    }
  } catch (e) { console.log('*** FAIL *** - test crashed: ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { await browser.close(); }
})();
