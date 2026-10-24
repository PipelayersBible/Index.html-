// feat_sentry (r15.28): the crash reporter's release tag follows the build; console.error(<Error>) is reported under the same
// gate and scrubbing; Settings has a "Send a test report" button. Every Sentry request is caught by page.route (nothing real).
const L = require('/home/claude/test/lib.js');
const INGEST = /o4512143154806784\.ingest\.us\.sentry\.io\/api\/4512143200616448\/envelope\//;
const U = 'uSentry-7f3e2a10-0000-4000-8000-123456789abc';
const parse = (body) => { const [h, i, e] = body.split('\n'); return { h: JSON.parse(h), i: JSON.parse(i), e: JSON.parse(e) }; };
(async () => {
  const browser = await L.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 400, height: 900 } });
  await ctx.addInitScript((a) => { localStorage.setItem('lastKnownUserId', a.u); localStorage.setItem(a.u + ':cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active' })); localStorage.setItem('pbCrashTestSend', '1'); }, { u: U });
  const sent = [];
  await ctx.route(INGEST, async (route) => { sent.push(parse(route.request().postData() || '')); return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' }); });
  const page = await ctx.newPage(); page.on('dialog', d => d.accept());
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(L.ORIGIN); await page.waitForTimeout(900); await L.dismiss(page);
  const st = await page.evaluate(() => window.pbCrash.state());
  L.check('S1: the reporter\'s release follows the app build [' + st.build + ']', /^pipelayers-bible@r\d+\.\d+$/.test(st.build) && st.build === 'pipelayers-bible@' + String(await page.evaluate(() => window.PB_APP_BUILD)).split(' ')[0]);
  // S2: an Error the app caught and only logged
  await page.evaluate(() => { try { const o = {}; o.go(); } catch (e) { console.error('save failed', e); } }); await page.waitForTimeout(900);
  L.check('S2: console.error(<Error>) sends one report', sent.length === 1);
  const ev = sent[0] && sent[0].e, ex = ev && ev.exception.values[0];
  L.check('S2: it carries the release, the browser-shaped message, frames, source "console", handled', !!ex && ev.release === st.build && /^o\.go is not a function$/.test(ex.value) && ex.stacktrace && ex.stacktrace.frames.length > 0 && ex.mechanism.type === 'console' && ex.mechanism.handled === true);
  L.check('S2: nothing personal in it (no email, no account id, no data URL, only the allowed top-level fields)', !/[\w.+-]+@[\w-]+\.[a-z]|data:|[0-9a-f]{8}-[0-9a-f]{4}-/i.test(JSON.stringify(ev)) && Object.keys(ev).sort().join(',') === 'contexts,environment,event_id,exception,level,platform,release,sdk,tags,timestamp');
  await page.evaluate(() => { console.error('save failed', new TypeError('Failed to fetch')); console.error('plain string only'); console.error({ message: 'server says no', code: 'PGRST301' }); console.error(new Error('Load failed')); }); await page.waitForTimeout(900);
  L.check('S2: network-shaped errors, plain strings and non-Error objects are not reported', sent.length === 1);
  await page.evaluate(() => { try { const o = {}; o.go(); } catch (e) { console.error('again', e); } }); await page.waitForTimeout(600);
  L.check('S2: the same error again is not sent again (dedupe)', sent.length === 1);
  await page.evaluate(() => { try { null.x; } catch (e) { console.error(e); } }); await page.waitForTimeout(900);
  L.check('S2: a different error is a second report, its message kept (browser shape) [' + (sent[1] && sent[1].e.exception.values[0].value) + ']', sent.length === 2 && /Cannot read propert/.test(sent[1].e.exception.values[0].value));
  await page.evaluate(() => { try { throw new Error('Job 24-101 at 1450 East Reservoir Rd for frank@example.test'); } catch (e) { console.error(e); } }); await page.waitForTimeout(900);
  L.check('S2: an app-worded message is withheld (the shape gate), frames kept', sent.length === 3 && sent[2].e.exception.values[0].value === '[message withheld]' && !/24-101|Reservoir|frank/.test(JSON.stringify(sent[2].e)));
  // offline: a logged error is not reported (expected noise with no signal); the window.onerror path still queues
  await ctx.setOffline(true);
  await page.evaluate(() => { try { undefinedThing.go(); } catch (e) { console.error(e); } }); await page.waitForTimeout(600);
  const q1 = await page.evaluate(() => window.pbCrash.state().queued);
  L.check('S2: offline, console.error reports nothing (not queued either)', sent.length === 3 && q1 === 0);
  await ctx.setOffline(false); await page.waitForTimeout(300);
  // S3: Settings > Privacy > details > Send a test report
  await page.evaluate(() => pbGoto('settings')); await page.waitForTimeout(400);
  await page.evaluate(() => { const d = document.getElementById('crashReportsMore'); if (d) d.open = true; });
  const vis = await page.isVisible('#crashTestSendBtn');
  L.check('S3: the button sits inside "What crash reports send" and is visible when it is open', vis);
  await page.click('#crashTestSendBtn'); await page.waitForTimeout(900);
  const msg1 = await page.textContent('#crashTestSendMsg');
  L.check('S3: tapping it sends one report with the fixed label, level info, the release and the screen; the row says Sent [' + msg1 + ']', sent.length === 4 && sent[3].e.exception.values[0].value === 'Test report from Settings' && sent[3].e.level === 'info' && sent[3].e.tags.screen === 'settings' && sent[3].e.release === st.build && /^Sent\./.test(msg1 || ''));
  await page.click('#crashTestSendBtn'); await page.waitForTimeout(600);
  const msg2 = await page.textContent('#crashTestSendMsg');
  L.check('S3: a second tap sends nothing more and says so [' + msg2 + ']', sent.length === 4 && /Already sent/.test(msg2 || ''));
  await page.evaluate(() => pbSetCrashReports(false)); await page.waitForTimeout(300);
  await page.click('#crashTestSendBtn'); await page.waitForTimeout(600);
  L.check('S3: with the switch off it sends nothing and says the reports are off', sent.length === 4 && /off on this phone/.test(await page.textContent('#crashTestSendMsg')));
  await page.evaluate(() => pbSetCrashReports(true));
  L.check('no page errors', errs.length === 0, errs.join(' | '));
  await browser.close();
})();
