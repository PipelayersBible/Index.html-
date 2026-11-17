import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# login screen: the notice under Log In
rep('<div class="pb-btn-wrap"><button class="pb-btn" id="loginSubmitBtn" onclick="pbLogin()">Log In</button></div>',
    '<div class="pb-btn-wrap"><button class="pb-btn" id="loginSubmitBtn" onclick="pbLogin()">Log In</button></div><p class="pb-help" id="loginTermsNote" style="text-align:center;margin:6px 16px 0;">By logging in you agree to the <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a> and <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</p>')
# settings: links next to the app version
rep('<div class="pb-w10-ver"><span class="k" id="settingsAppBuildLabel">App version</span>',
    '<p class="pb-help" id="settingsLegal" style="margin:0 0 8px;"><a href="terms.html" target="_blank" rel="noopener">Terms of Use</a> · <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a></p><div class="pb-w10-ver"><span class="k" id="settingsAppBuildLabel">App version</span>')
JS = r'''
  // r16.78 (legal review): each account agrees to the Terms of Use and Privacy Policy (tick the box, I Agree) once per
  // version. The agreement is recorded on the server (pb_terms_accept: account, versions, server time, phone time, build);
  // without signal it is kept on the phone and sent when there is. Not agreeing leaves the account: Log Out.
  const PB_TERMS_VER = '1.0', PB_PRIV_VER = '1.0', PB_TERMS_KEY = PB_TERMS_VER + '|' + PB_PRIV_VER;
  const pbTermsLs = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: (k) => { try { localStorage.removeItem(k); } catch (e) {} } };
  let pbTermsBusy = false, pbTermsAsked = null;
  async function pbTermsSendPending(uid) {
    const raw = pbTermsLs.get('pbTermsPend:' + uid); if (!raw) return true;
    let p = null; try { p = JSON.parse(raw); } catch (e) { pbTermsLs.del('pbTermsPend:' + uid); return true; }
    if (!sbClient || navigator.onLine === false) return false;
    try {
      const r = await sbClient.rpc('pb_terms_accept', { p_terms: p.t, p_privacy: p.p, p_phone_at: new Date(p.at).toISOString(), p_build: String(window.PB_APP_BUILD || ''), p_ua: String(navigator.userAgent || '').slice(0, 300) });
      if (!r.error && r.data && r.data.ok) { pbTermsLs.del('pbTermsPend:' + uid); pbTermsLs.set('pbTermsOk:' + uid, p.t + '|' + p.p); return true; }
    } catch (e) {}
    return false;
  }
  window.pbTermsCheck = async function() {
    const uid = sbUser && sbUser.id; if (!uid || pbTermsBusy) return;
    if (pbTermsLs.get('pbTermsOk:' + uid) === PB_TERMS_KEY) return;
    pbTermsBusy = true;
    try {
      const pend = pbTermsLs.get('pbTermsPend:' + uid);
      if (pend) { let p = null; try { p = JSON.parse(pend); } catch (e) {} if (p && p.t + '|' + p.p === PB_TERMS_KEY) { await pbTermsSendPending(uid); return; } }
      if (sbClient && navigator.onLine !== false) {
        try { const r = await sbClient.rpc('pb_terms_status', {}); if (!r.error && r.data && r.data.terms + '|' + r.data.privacy === PB_TERMS_KEY) { pbTermsLs.set('pbTermsOk:' + uid, PB_TERMS_KEY); return; } if (r.error) return; /* can't tell: asked next time */ } catch (e) { return; }
      }
      if (!sbUser || sbUser.id !== uid) return;
      pbTermsShow(uid);
    } finally { pbTermsBusy = false; }
  };
  function pbTermsShow(uid) {
    if (document.getElementById('pbTermsSheet')) return;
    const again = !!pbTermsLs.get('pbTermsOk:' + uid);
    const d = document.createElement('div'); d.id = 'pbTermsSheet'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'pbTermsH');
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:16px;';
    d.innerHTML = '<div style="background:var(--pb-surface,#fff);color:var(--pb-text,#15181d);max-width:520px;width:100%;border-radius:16px;padding:20px 18px;box-shadow:0 10px 40px rgba(0,0,0,.3);">'
      + '<h2 id="pbTermsH" style="margin:0 0 8px;font-size:1.2rem;">' + (again ? 'Updated Terms' : 'Terms of Use and Privacy Policy') + '</h2>'
      + '<p style="margin:0 0 10px;">' + (again ? 'The Terms of Use or Privacy Policy changed. ' : '') + 'To use your account, read and agree to the <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a> and <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</p>'
      + '<p style="margin:0 0 12px;font-size:.92rem;opacity:.85;">In short: check every number against the stakes and plans; AI can be wrong; the app never decides if a trench or space is safe; our liability is limited; disputes go to individual arbitration (you can opt out within 30 days).</p>'
      + '<label style="display:flex;gap:10px;align-items:flex-start;margin:0 0 14px;"><input type="checkbox" id="pbTermsBox" style="width:22px;height:22px;flex:none;margin-top:2px;"><span>I have read and agree to the Terms of Use and Privacy Policy.</span></label>'
      + '<div style="display:flex;gap:10px;"><button type="button" class="pb-btn ghost" id="pbTermsOut" style="flex:1;">Log Out</button><button type="button" class="pb-btn" id="pbTermsYes" style="flex:1;" disabled>I Agree</button></div></div>';
    (document.getElementById('pbApp') || document.body).appendChild(d);
    const box = d.querySelector('#pbTermsBox'), yes = d.querySelector('#pbTermsYes');
    box.addEventListener('change', () => { yes.disabled = !box.checked; });
    yes.addEventListener('click', async () => {
      if (!box.checked) return;
      pbTermsLs.set('pbTermsPend:' + uid, JSON.stringify({ t: PB_TERMS_VER, p: PB_PRIV_VER, at: Date.now() }));
      d.remove();
      await pbTermsSendPending(uid);
    });
    d.querySelector('#pbTermsOut').addEventListener('click', () => { d.remove(); pbTermsAsked = uid; if (typeof window.pbLogout === 'function') window.pbLogout(); });
  }
  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function () { setTimeout(() => { window.pbTermsCheck().catch(() => {}); }, 400); });
  setInterval(() => { try { const uid = sbUser && sbUser.id; if (uid && pbTermsLs.get('pbTermsPend:' + uid)) pbTermsSendPending(uid); else window.pbTermsCheck(); } catch (e) {} }, 60000);
  window.addEventListener('online', () => { try { const uid = sbUser && sbUser.id; if (uid) pbTermsSendPending(uid); } catch (e) {} });
'''
rep("  window.pbRrSealPass = pbRrSealPass;\n", "  window.pbRrSealPass = pbRrSealPass;\n" + JS)
open(out, 'w', encoding='utf-8').write(s); print('ok')
