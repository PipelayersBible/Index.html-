// Night sweep (daily): Log in / Forgot password screens at 390 px, signed out; validation, keyboards, offline.
// Run: bash /home/claude/batch29/ROLES/tests/run_t.sh /home/claude/rel1534/site1534 /home/claude/night/daily/p02_login.js 9271
const M = require('/home/claude/test/hunt6/confined/mock5.js'); const { check } = M; const L = require('/home/claude/test/lib.js');
const SH = '/home/claude/night/daily/shots/';
(async () => {
  const browser = await M.chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await ctx.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await ctx.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
    await ctx.addInitScript(M.mockInit);
    const page = await M.open(ctx);
    await page.evaluate(() => pbGoto('login', false, true)); await page.waitForTimeout(600);
    await page.screenshot({ path: SH + 'p02_login.png' });
    const attrs = await page.evaluate(() => ['loginEmail', 'loginPassword', 'forgotEmail'].map(id => { const e = document.getElementById(id); return { id, type: e.type, im: e.getAttribute('inputmode'), ac: e.getAttribute('autocomplete'), cap: e.getAttribute('autocapitalize'), cor: e.getAttribute('autocorrect'), ek: e.getAttribute('enterkeyhint') }; }));
    console.log('fields: ' + JSON.stringify(attrs));
    check('D6 the login password field is autocomplete="current-password"', attrs[1].ac === 'current-password', attrs[1].ac);
    const geo = await page.evaluate(() => { const W = window.innerWidth, out = { hscroll: document.documentElement.scrollWidth > W + 1, small: [] };
      document.querySelectorAll('#screen-login button, #screen-login input').forEach(el => { const r = el.getBoundingClientRect(); if (r.height > 0 && (r.height < 44 || r.width < 44)) out.small.push((el.id || el.textContent.trim()) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }); return out; });
    check('login: no horizontal scroll', !geo.hscroll);
    console.log('login small targets: ' + JSON.stringify(geo.small));
    console.log('tap targets under 44 px on the login screen: ' + JSON.stringify(geo.small));
    // Enter on the password field: does it submit?
    await page.fill('#loginEmail', 'a@x.com'); await page.fill('#loginPassword', 'pw'); await page.press('#loginPassword', 'Enter'); await page.waitForTimeout(1200);
    const loggedByEnter = await page.evaluate(() => !!localStorage.getItem('__mockSess'));
    const stillLogin = await page.evaluate(() => document.querySelector('.pb-screen.active').id);
    console.log('after Enter on the password: screen=' + stillLogin + ' loggedIn=' + loggedByEnter);
    check('D6 Enter on the password field logs in', loggedByEnter || stillLogin !== 'screen-login', stillLogin);
    await page.evaluate(() => { localStorage.removeItem('__mockSess'); }); await page.reload(); await page.waitForTimeout(1500); await M.dismiss(page);
    await page.evaluate(() => pbGoto('login', false, true)); await page.waitForTimeout(600);
    // empty fields
    await page.fill('#loginEmail', ''); await page.fill('#loginPassword', ''); await page.click('#loginSubmitBtn'); await page.waitForTimeout(400);
    const e1 = await page.evaluate(() => document.getElementById('loginError').textContent); console.log('empty: ' + e1);
    check('empty: both asked for', /both/.test(e1), e1);
    // wrong password
    await page.fill('#loginEmail', 'nobody@x.com'); await page.fill('#loginPassword', 'pw'); await page.click('#loginSubmitBtn'); await page.waitForTimeout(800);
    const e2 = await page.evaluate(() => document.getElementById('loginError').textContent); console.log('wrong: ' + e2);
    check('other server errors still show "Login failed: <message>"', /^Login failed: bad$/.test(e2), e2);
    // D8: the service's "Invalid login credentials" reads plainly
    await page.evaluate(() => localStorage.setItem('__loginErr', 'Invalid login credentials'));
    await page.fill('#loginEmail', 'nobody@x.com'); await page.fill('#loginPassword', 'pw'); await page.click('#loginSubmitBtn'); await page.waitForTimeout(800);
    const e3 = await page.evaluate(() => document.getElementById('loginError').textContent); console.log('invalid creds: ' + e3);
    check('D8 wrong email/password reads plainly', /^Wrong email or password\. Check both, or use Forgot password\.$/.test(e3), e3);
    await page.evaluate(() => localStorage.removeItem('__loginErr'));
    // forgot password: panel, empty, offline
    await page.click('#forgotPwLink'); await page.waitForTimeout(300);
    const fe = await page.$eval('#forgotEmail', e => e.value); console.log('forgot prefilled: ' + fe);
    await page.fill('#forgotEmail', ''); await page.click('#forgotPwBtn'); await page.waitForTimeout(300);
    const f1 = await page.evaluate(() => document.getElementById('forgotPwMsg').textContent); console.log('forgot empty: ' + f1);
    await ctx.setOffline(true);
    await page.fill('#forgotEmail', 'a@x.com'); await page.click('#forgotPwBtn'); await page.waitForTimeout(500);
    const f2 = await page.evaluate(() => document.getElementById('forgotPwMsg').textContent); console.log('forgot offline: ' + f2);
    check('forgot offline: says no signal', /No signal/.test(f2), f2);
    await page.screenshot({ path: SH + 'p02_forgot_offline.png', fullPage: true });
    // Enter on the email field (enterkeyhint=next): does focus move to the password?
    await page.focus('#loginEmail'); await page.press('#loginEmail', 'Enter'); await page.waitForTimeout(200);
    const act = await page.evaluate(() => document.activeElement && document.activeElement.id); console.log('after Enter on email, focus on: ' + act);
    check('Enter on the email field moves to the password', act === 'loginPassword', act);
    await ctx.setOffline(false);
    // the keyboard: is the Log In button reachable with the keyboard up? (viewport 390x390 ~ keyboard open)
    await page.setViewportSize({ width: 390, height: 400 });
    await page.focus('#loginPassword'); await page.waitForTimeout(300);
    const vis = await page.evaluate(() => { const b = document.getElementById('loginSubmitBtn').getBoundingClientRect(), p = document.getElementById('loginPassword').getBoundingClientRect(); return { btnTop: Math.round(b.top), btnBottom: Math.round(b.bottom), pwBottom: Math.round(p.bottom), H: window.innerHeight }; });
    console.log('keyboard-up geometry: ' + JSON.stringify(vis));
    check('no page errors', !page._errors.length, page._errors.join(' | '));
  } catch (e) { check('probe ran to the end', false, e && e.stack); }
  await browser.close();
})();
