// security_nov22: the app with the server's new two-step gate (sql/01_mfa_gate.sql), on the fake rig.
// The rig answers EVERY RPC the way the new gate does while the session is password-only (aal1) and two-step login is
// on: { code: 'PT401', message: 'pb:signed_out', details: 'code_needed' } (HTTP 401). Checks the person is not locked out:
// the code sheet shows, the app does not sign out or show a lock / "Signed Out" message, nothing about the device lock
// changes; after the code (aal2) RPCs go through again and the check-in (pb_device_seen) works.
// PB_URL=http://127.0.0.1:10756/cur.html node t_mfa_gate.js   (serve a copy of the page as cur.html; the rig's own folder is tests/rig)
const path = require('path'); const R = path.join(__dirname, '../../../rig');
const boot = require(R + '/boot'); const co = require(R + '/co') + require(R + '/mgr');
const gate = `(() => {
  window.__gate = { on: true, refused: [], passed: [], signOuts: 0 };
  let sb;
  Object.defineProperty(window, 'supabase', { configurable: true, get() { return sb; }, set(v) {
    const mk = v.createClient.bind(v);
    v.createClient = function () { const c = mk.apply(null, arguments);
      const rpc = c.rpc.bind(c);
      c.rpc = (n, a) => { const aal = window.__mfa && window.__mfa.aal && window.__mfa.aal.currentLevel;
        if (window.__gate.on && aal !== 'aal2') { window.__gate.refused.push(n); return Promise.resolve({ data: null, error: { code: 'PT401', message: 'pb:signed_out', details: 'code_needed', hint: null }, status: 401 }); }
        window.__gate.passed.push(n); return rpc(n, a); };
      const so = c.auth.signOut; c.auth.signOut = function () { window.__gate.signOuts++; return so.apply(this, arguments); };
      return c; };
    sb = v; } });
  // two-step login is on for this login and this session has only the password
  window.__mfa = { factors: [{ id: 'f1', status: 'verified' }], aal: { currentLevel: 'aal1', nextLevel: 'aal2' } };
  window.__mfaApi = {
    listFactors: async () => ({ data: { totp: window.__mfa.factors } }),
    getAuthenticatorAssuranceLevel: async () => ({ data: window.__mfa.aal }),
    challengeAndVerify: async ({ code }) => { if (code !== '123456') return { error: { message: 'Invalid TOTP code entered' } }; window.__mfa.aal = { currentLevel: 'aal2', nextLevel: 'aal2' }; return { data: {} }; },
  };
})();`;
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m, x === undefined ? '' : JSON.stringify(x)); } };
(async () => {
  const { b, p } = await boot(process.env.PB_URL || 'http://127.0.0.1:10756/cur.html', { init: gate + '\n' + co, wait: 3000 });
  const vis = (sel) => p.evaluate((s) => { const d = document.querySelector(s); if (!d) return false; const r = d.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(d).display !== 'none'; }, sel);
  const modalText = () => p.evaluate(() => { const d = [...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].filter(x => x.id !== 'pbMfaSheet').find(x => x.offsetParent && x.innerText.trim()); return d ? d.innerText.replace(/\s+/g, ' ').slice(0, 160) : ''; });
  await p.evaluate(() => { try { pbGoto('home'); } catch (e) {} }); await p.waitForTimeout(2500);
  await p.evaluate(() => { try { window.pb1dSeen && window.pb1dSeen(true); } catch (e) {} }); await p.waitForTimeout(2500);
  const g1 = await p.evaluate(() => JSON.parse(JSON.stringify(window.__gate)));
  ok(g1.refused.length > 0, 'the app\'s RPCs before the code are refused by the gate (as the server will)', g1.refused.slice(0, 8));
  ok(g1.refused.includes('pb_device_seen'), 'the device check-in was among them', g1.refused);
  ok(await vis('#pbMfaSheet'), 'the code sheet is up ("Enter Your Code")', await p.evaluate(() => (document.getElementById('pbMfaSheet') || {}).innerText));
  ok(g1.signOuts === 0, 'the app did not sign out', g1.signOuts);
  ok(await p.evaluate(() => { try { return !!sbUser; } catch (e) { return 'n/a'; } }) !== false, 'still signed in (sbUser kept)');
  const m1 = await modalText();
  ok(!/Signed Out|Account In Use|Signed In on Two Devices|In use on your other device/i.test(m1), 'no "Signed Out" / lock / two-devices message', m1);
  ok(await p.evaluate(() => !(window.__pb1d && window.__pb1d.lock)), 'no device lock screen state', await p.evaluate(() => window.__pb1d && window.__pb1d.lock));
  // the code
  await p.fill('#pbMfaIn', '123456'); await p.click('#pbMfaGo'); await p.waitForTimeout(1200);
  ok(!(await vis('#pbMfaSheet')), 'after the right code the sheet closes');
  await p.evaluate(() => { window.__gate.passed = []; try { window.pb1dSeen && window.pb1dSeen(true); } catch (e) {} try { pbGoto('settings'); } catch (e) {} }); await p.waitForTimeout(2500);
  const g2 = await p.evaluate(() => JSON.parse(JSON.stringify(window.__gate)));
  ok(g2.passed.includes('pb_device_seen'), 'after the code: the check-in goes through', g2.passed.slice(0, 8));
  ok(g2.signOuts === 0, 'never signed out through the whole flow', g2.signOuts);
  const m2 = await modalText();
  ok(!/Signed Out|Account In Use/i.test(m2), 'still no sign-out message', m2);
  ok(p.errs.length === 0, 'no page errors', p.errs.slice(0, 3));
  console.log(fail ? 'MFA GATE: ' + pass + ' pass, ' + fail + ' FAIL' : 'MFA GATE: all ' + pass + ' pass');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('FAIL crashed', e.message); process.exit(1); });
