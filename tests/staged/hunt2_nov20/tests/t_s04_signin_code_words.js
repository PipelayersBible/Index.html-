// hunt2 04 + item 5 checks: the r17.10 sign-in code, used twice / too old / replaced by a newer one.
// Each must be refused, and the words must be about a sign-in code (not "Links last 24 hours. Ask whoever sent it").
// Run: PB_URL=http://127.0.0.1:<port>/<page> node t_s04_signin_code_words.js
const { chromium } = require('playwright'); const path = require('path');
const T = path.resolve(__dirname, '../../..'); const boot = require(T + '/boot_ob'), mkSrv = require(T + '/obsrv');
const BASE = process.env.PB_URL; let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const CONTRACTOR = `window.__tableOne={subscriptions:{tier:'contractor',status:'active'}};`;
const U = { id: '00000000-0000-4000-8000-000000000001', email: 'tester@example.com', user_metadata: { full_name: 'Test Office' }, app_metadata: {} };
const SEEN = `try{localStorage.setItem('pbTermsOk:${U.id}','1.0|1.0');}catch(e){}`;
const sheet = (p) => p.evaluate(() => { const d = document.getElementById('pbObSheet'); return d ? d.innerText.replace(/\s+/g, ' ') : ''; });
(async () => {
  const b = await chromium.launch(); const srv = mkSrv({ paid: 5 }); srv.st.users.set(U.id, U);
  const getCode = async () => { const { p } = await boot(b, BASE, srv, { ua: IOS, user: U, init: CONTRACTOR + SEEN, wait: 3500 }); await p.evaluate(() => pbObHandoff()); await p.waitForTimeout(1000); await p.click('#pbObHandoffCopy'); await p.waitForTimeout(300); const c = await p.evaluate(() => window.__pbObCopied || ''); await p.context().close(); return c; };
  const paste = async (clip) => { const { p } = await boot(b, BASE, srv, { ua: IOS, signedOut: true, standalone: true, clip, init: CONTRACTOR, wait: 3500 }); await p.click('#loginPasteBtn'); await p.waitForTimeout(3000); const r = { me: await p.evaluate(() => (window.__pbObMe() || {}).id || null), text: await sheet(p), errs: p.errs.slice() }; await p.context().close(); return r; };
  const JOINWORDS = /Links last 24 hours|whoever sent it|someone else did/;
  // 1. works once
  const c1 = await getCode(); let r = await paste(c1);
  ok(r.me === U.id, 'a fresh code signs in');
  r = await paste(c1);
  ok(r.me === null, 'the same code a second time: refused (not signed in)');
  ok(/already used/i.test(r.text) && /works once/i.test(r.text) && !JOINWORDS.test(r.text), 'used code: says a sign-in code works once and how to get a new one — "' + r.text.slice(0, 200) + '"');
  // 2. too old (16 minutes)
  const c2 = await getCode(); srv.st.links.filter(l => l.kind === 'handoff' && !l.used_at).forEach(l => { l.expires_at = Date.now() - 60000; });
  r = await paste(c2);
  ok(r.me === null, 'a code past its 15 minutes: refused');
  ok(/15 minutes/.test(r.text) && !JOINWORDS.test(r.text), 'old code: says a sign-in code lasts 15 minutes — "' + r.text.slice(0, 200) + '"');
  // 3. replaced: the server cancels the older code when a newer one is made (live: pb_onboard_handoff_make). The rig's
  //    stand-in does not, so the older one is marked cancelled here the way the live function does.
  const c3 = await getCode(); srv.st.links.filter(l => l.kind === 'handoff' && !l.used_at && l.expires_at > Date.now()).forEach(l => { l.revoked_at = Date.now(); });
  r = await paste(c3);
  ok(r.me === null && /newer code/i.test(r.text) && !JOINWORDS.test(r.text), 'a code replaced by a newer one: refused, and says so — "' + r.text.slice(0, 160) + '"');
  ok(!r.errs.length, 'no page errors');
  await b.close(); console.log(fails ? 'RESULT: ' + fails + ' failed' : 'RESULT: all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
