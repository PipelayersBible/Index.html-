import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
rep('<p class="pb-help" id="settingsLegal" style="margin:0 0 8px;">',
    '<div id="settingsMfa" style="margin:0 0 12px;"></div><p class="pb-help" id="settingsLegal" style="margin:0 0 8px;">')
JS = r'''
  // r16.81 (legal review): two-step login (an authenticator app code). Turned on in Settings; once on, the app asks for
  // the code after each login before the account is used, and admin pages need it (server: pb_support.admin_ok).
  const pbMfa = { busy: false, asked: null };
  async function pbMfaFactor() { try { const r = await sbClient.auth.mfa.listFactors(); const t = r && r.data && Array.isArray(r.data.totp) ? r.data.totp : []; return t.find(f => f.status === 'verified') || null; } catch (e) { return null; } }
  function pbMfaSheet(html) {
    const old = document.getElementById('pbMfaSheet'); if (old) old.remove();
    const d = document.createElement('div'); d.id = 'pbMfaSheet'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:16px;';
    d.innerHTML = '<div style="background:var(--pb-surface,#fff);color:var(--pb-text,#15181d);max-width:520px;width:100%;border-radius:16px;padding:20px 18px;box-shadow:0 10px 40px rgba(0,0,0,.3);">' + html + '</div>';
    (document.getElementById('pbApp') || document.body).appendChild(d); return d;
  }
  const pbMfaCodeHtml = (id) => '<input id="' + id + '" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit code" style="width:100%;font-size:1.4rem;letter-spacing:.3em;text-align:center;padding:10px;border-radius:10px;border:1px solid var(--pb-border,#ccc);margin:0 0 8px;"><p id="' + id + 'Err" role="alert" style="color:var(--rod-red,#c00);min-height:1.2em;margin:0 0 8px;"></p>';
  // after login: an account with two-step login on enters its code before it is used
  window.pbMfaCheck = async function() {
    if (!sbClient || !sbUser || !sbClient.auth || !sbClient.auth.mfa || pbMfa.busy || navigator.onLine === false) return;
    if (document.getElementById('pbMfaSheet')) return;
    pbMfa.busy = true;
    try {
      const a = await sbClient.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!a || a.error || !a.data || a.data.nextLevel !== 'aal2' || a.data.currentLevel === 'aal2') return;
      const f = await pbMfaFactor(); if (!f) return;
      const uid = sbUser.id;
      const d = pbMfaSheet('<h2 style="margin:0 0 8px;font-size:1.2rem;">Enter Your Code</h2><p style="margin:0 0 12px;">Two-step login is on for this account. Open your authenticator app and type the 6-digit code for The Pipelayer’s Bible.</p>' + pbMfaCodeHtml('pbMfaIn')
        + '<div style="display:flex;gap:10px;"><button type="button" class="pb-btn ghost" id="pbMfaOut" style="flex:1;">Log Out</button><button type="button" class="pb-btn" id="pbMfaGo" style="flex:1;">Continue</button></div>');
      const inp = d.querySelector('#pbMfaIn'), err = d.querySelector('#pbMfaInErr'), go = d.querySelector('#pbMfaGo');
      const send = async () => {
        const code = inp.value.replace(/\D/g, ''); if (code.length !== 6) { err.textContent = 'Type the 6 digits from your app.'; return; }
        go.disabled = true; err.textContent = '';
        try { const r = await sbClient.auth.mfa.challengeAndVerify({ factorId: f.id, code }); if (r && r.error) { err.textContent = /invalid|expired/i.test(String(r.error.message)) ? 'That code didn’t work. Codes change every 30 seconds; try the current one.' : 'Couldn’t check the code. Try again.'; go.disabled = false; return; } }
        catch (e) { err.textContent = 'Couldn’t check the code. Try again with signal.'; go.disabled = false; return; }
        d.remove(); try { if (typeof window.pbSupCheckAdmin === 'function') window.pbSupCheckAdmin(); } catch (e) {}
      };
      go.addEventListener('click', send); inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') send(); });
      d.querySelector('#pbMfaOut').addEventListener('click', () => { d.remove(); if (sbUser && sbUser.id === uid && typeof window.pbLogout === 'function') window.pbLogout(); });
      setTimeout(() => { try { inp.focus(); } catch (e) {} }, 100);
    } catch (e) {} finally { pbMfa.busy = false; }
  };
  // Settings: turn it on (scan the QR code, type a code) or off
  window.pbMfaRender = async function() {
    const box = document.getElementById('settingsMfa'); if (!box) return;
    if (!sbClient || !sbUser || !sbClient.auth || !sbClient.auth.mfa) { box.innerHTML = ''; return; }
    const f = await pbMfaFactor();
    box.innerHTML = '<div class="pb-help" style="margin:0 0 6px;"><strong>Two-step login</strong>: ' + (f ? 'On. You enter a code from your authenticator app after each login.' : 'Off. Turn it on so a stolen password alone can’t get into this account.') + '</div>'
      + (f ? '<button type="button" class="pb-btn ghost small" id="pbMfaOff">Turn Off</button>' : '<button type="button" class="pb-btn small" id="pbMfaOn">Turn On Two-Step Login</button>');
    const on = box.querySelector('#pbMfaOn'), off = box.querySelector('#pbMfaOff');
    if (on) on.addEventListener('click', () => window.pbMfaEnroll());
    if (off) off.addEventListener('click', () => pbConfirm('Turn off two-step login? After this, your password alone gets into this account.', async () => {
      try { const a = await sbClient.auth.mfa.getAuthenticatorAssuranceLevel(); if (!a.data || a.data.currentLevel !== 'aal2') { pbAlert('Log out and back in with your code first, then turn it off.', 'Code Needed'); return; }
        const r = await sbClient.auth.mfa.unenroll({ factorId: f.id }); if (r && r.error) { pbAlert('Couldn’t turn it off. Try again.', 'Not Changed'); return; } } catch (e) { pbAlert('Couldn’t turn it off. Try again with signal.', 'Not Changed'); return; }
      window.pbMfaRender();
    }, 'Turn Off Two-Step Login'));
  };
  window.pbMfaEnroll = async function() {
    if (!sbClient || !sbUser || navigator.onLine === false) { pbAlert('Turning on two-step login needs signal.', 'No Signal'); return; }
    let e = null;
    try {
      const old = await sbClient.auth.mfa.listFactors(); ((old && old.data && old.data.totp) || []).filter(x => x.status !== 'verified').forEach(x => { try { sbClient.auth.mfa.unenroll({ factorId: x.id }); } catch (y) {} });
      const r = await sbClient.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Pipelayers Bible ' + Date.now().toString(36) }); if (r.error) throw r.error; e = r.data;
    } catch (x) { pbAlert('Two-step login couldn’t be started. Try again later.', 'Not Turned On'); return; }
    const qr = e && e.totp && e.totp.qr_code ? String(e.totp.qr_code) : '', secret = e && e.totp && e.totp.secret ? String(e.totp.secret) : '';
    const d = pbMfaSheet('<h2 style="margin:0 0 8px;font-size:1.2rem;">Turn On Two-Step Login</h2><p style="margin:0 0 8px;">1. Open an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…) and scan this code, or type the key.</p>'
      + (/^data:image\/svg\+xml/.test(qr) ? '<img src="' + escapeHtml(qr) + '" alt="QR code for your authenticator app" style="display:block;width:180px;height:180px;margin:0 auto 8px;background:#fff;padding:6px;border-radius:8px;">' : '')
      + '<p style="margin:0 0 10px;font-size:.85rem;word-break:break-all;text-align:center;">Key: <code>' + escapeHtml(secret) + '</code></p><p style="margin:0 0 8px;">2. Type the 6-digit code it shows.</p>' + pbMfaCodeHtml('pbMfaNew')
      + '<div style="display:flex;gap:10px;"><button type="button" class="pb-btn ghost" id="pbMfaCancel" style="flex:1;">Cancel</button><button type="button" class="pb-btn" id="pbMfaSave" style="flex:1;">Turn On</button></div>');
    const inp = d.querySelector('#pbMfaNew'), err = d.querySelector('#pbMfaNewErr'), save = d.querySelector('#pbMfaSave');
    d.querySelector('#pbMfaCancel').addEventListener('click', () => { d.remove(); try { sbClient.auth.mfa.unenroll({ factorId: e.id }); } catch (x) {} });
    const go = async () => {
      const code = inp.value.replace(/\D/g, ''); if (code.length !== 6) { err.textContent = 'Type the 6 digits from your app.'; return; }
      save.disabled = true; err.textContent = '';
      try { const r = await sbClient.auth.mfa.challengeAndVerify({ factorId: e.id, code }); if (r && r.error) { err.textContent = 'That code didn’t work. Try the current one.'; save.disabled = false; return; } }
      catch (x) { err.textContent = 'Couldn’t check the code. Try again.'; save.disabled = false; return; }
      d.remove(); pbAlert('Two-step login is on. After each login, the app asks for a code from your authenticator app.', 'Turned On'); window.pbMfaRender();
    };
    save.addEventListener('click', go); inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') go(); });
  };
  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function (name) { setTimeout(() => { window.pbMfaCheck(); if (name === 'settings') window.pbMfaRender(); }, 500); });
'''
rep("  window.pbRrSealPass = pbRrSealPass;\n", "  window.pbRrSealPass = pbRrSealPass;\n" + JS)
open(out, 'w', encoding='utf-8').write(s); print('ok')
