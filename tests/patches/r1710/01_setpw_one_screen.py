# 01 Set Password is one screen: the Terms tick (and, for a crew member, "What your company sees") sit on the
# password screen itself instead of a sheet over it; Save Password records them. After Save: a short note, no OK tap.
# Invite links say "Choose Your Password". Usage: python3 01_setpw_one_screen.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
# --- the screen: title id, the notice and the tick under the two fields, button words
p.rep('<h1 class="pb-title">Set New Password</h1>', '<h1 class="pb-title" id="setPwTitle">Set New Password</h1>')
p.rep('''<input type="password" enterkeyhint="done" id="setPwConfirm" autocomplete="new-password"></div>
      </div>''', '''<input type="password" enterkeyhint="done" id="setPwConfirm" autocomplete="new-password"></div>
        <div id="setPwNoticeWrap" hidden><p class="pb-help" style="margin:12px 0 4px;font-weight:700;">What your company sees</p><div id="setPwNotice" style="font-size:.9rem;line-height:1.4;white-space:pre-line;border-radius:12px;padding:10px 12px;background:var(--pb-raised,#f1f2f4);"></div></div>
        <label id="setPwTermsWrap" hidden style="display:flex;gap:10px;align-items:flex-start;margin:14px 0 2px;"><input type="checkbox" id="setPwTerms" style="width:24px;height:24px;flex:none;margin-top:1px;"><span>I have read and agree to the <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a> and <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</span></label><!-- streamline 01 -->
      </div>''')
p.rep('id="setPwBtn" onclick="pbSetNewPassword()">Save New Password</button>', 'id="setPwBtn" onclick="pbSetNewPassword()">Save Password</button>')
p.rep("btn.textContent = 'Save New Password'", "btn.textContent = 'Save Password'")
# --- the words above the fields
p.rep("document.getElementById('setPwFor').textContent = 'For ' + (sbUser.email || 'your account') + '. Choose a new password to finish.';",
      "document.getElementById('setPwFor').textContent = 'For ' + (sbUser.email || 'your account') + '.';\n"
      "    { const t = document.getElementById('setPwTitle'); if (t) t.textContent = pbUrlAuth.type === 'invite' ? 'Choose Your Password' : 'Set New Password'; }\n"
      "    try { window.pbSetPwExtras && window.pbSetPwExtras(); } catch (e) {}")
# --- Save: the tick must be ticked when it shows; what it agreed to is recorded only once the password is saved
p.rep('''    const btn = document.getElementById('setPwBtn');
    if (btn.disabled || pbSetPwSaving) return;''', '''    const btn = document.getElementById('setPwBtn');
    if (btn.disabled || pbSetPwSaving) return;
    const agreed = window.pbSetPwAgreeState ? window.pbSetPwAgreeState() : null; // streamline 01: the tick on this screen
    if (agreed && agreed.need && !agreed.ok) { fail('Tick the box to agree to the Terms first.'); return; }''')
p.rep('''    pbClearSetPasswordForm();
    pbRecoveryUserId = null;
    pbLinkPasswordSet = true;''', '''    pbClearSetPasswordForm();
    pbRecoveryUserId = null;
    pbLinkPasswordSet = true;
    try { if (agreed && window.pbSetPwAgreed) window.pbSetPwAgreed(agreed); } catch (e) {} // streamline 01''')
# --- after Save: a short note instead of an OK box
p.rep("""    pbAlertAfterOpen((invite ? 'Password set. You\\u2019re signed in' : 'Password changed. You\\u2019re signed in') + (email ? ' as ' + email : '') + ' \\u2014 use this password next time you log in.', 'Password Set');""",
      """    try { window.pbSetPwExtrasHide && window.pbSetPwExtrasHide(); } catch (e) {}
    { const say = (invite ? 'Password set. You\\u2019re signed in' : 'Password changed. You\\u2019re signed in') + (email ? ' as ' + email : '') + '.';
      if (typeof window.pbSayDone === 'function') window.pbSayDone(say); else pbAlertAfterOpen(say, 'Password Set'); } // streamline 01: no OK tap
    try { window.pbObA2hsStepSoon && window.pbObA2hsStepSoon('setpw'); } catch (e) {} // streamline 08""")
# --- the Terms sheet never opens over Set Password: the tick on the screen takes its place
p.rep('''  function pbTermsShow(uid) {
    if (document.getElementById('pbTermsSheet')) return;''', '''  function pbTermsShow(uid) {
    if (document.getElementById('pbTermsSheet')) return;
    if (pbCurrentScreen === 'setPassword' && typeof window.pbSetPwTermsHere === 'function' && window.pbSetPwTermsHere(uid)) return; // streamline 01''')
# --- helpers (in the onboard2 block, beside the crew notice words)
p.rep('''  function pbObErrSheet(code, title) {''', '''  // ---- streamline 01: one-screen Set Password, and a short "done" note that needs no tap ----
  window.pbSayDone = function (text) {
    try {
      let n = document.getElementById('pbSayDone');
      if (!n) { n = document.createElement('div'); n.id = 'pbSayDone'; n.setAttribute('role', 'status'); n.setAttribute('aria-live', 'polite');
        n.style.cssText = 'position:fixed;left:16px;right:16px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:60;margin:0 auto;max-width:520px;box-sizing:border-box;padding:12px 14px;border-radius:12px;background:var(--pb-text,#15181d);color:var(--pb-surface,#fff);font-weight:600;font-size:15px;line-height:1.4;box-shadow:0 6px 24px rgba(0,0,0,.3);overflow-wrap:anywhere;';
        n.addEventListener('click', () => { n.hidden = true; });
        (document.getElementById('pbApp') || document.body).appendChild(n); }
      n.textContent = String(text || ''); n.hidden = false;
      clearTimeout(window.__pbSayDoneT); window.__pbSayDoneT = setTimeout(() => { n.hidden = true; }, 7000);
    } catch (e) {}
  };
  const pbSetPwEl = (id) => document.getElementById(id);
  window.pbSetPwTermsHere = function (uid) { // the Terms tick on Set Password (instead of the sheet)
    const w = pbSetPwEl('setPwTermsWrap'); if (!w || !uid || !sbUser || sbUser.id !== uid) return false;
    if (w.hidden) { w.hidden = false; const b = pbSetPwEl('setPwTerms'); if (b) b.checked = false; }
    w.dataset.uid = uid; return true;
  };
  window.pbSetPwExtras = function () { // the crew notice, for a crew member who hasn't seen it (it shows after the Terms otherwise)
    try {
      const uid = sbUser && sbUser.id, w = pbSetPwEl('setPwNoticeWrap'); if (!w || !uid) return;
      const acc = pbProdAccMem.get(uid), seen = pbObLs.get('pbCrewNotice:' + uid) === PB_OB_NOTICE_VER;
      const want = pbCurrentScreen === 'setPassword' && !!(acc && acc.member && acc.companyId && !acc.manager) && !seen;
      if (want && w.hidden) { pbSetPwEl('setPwNotice').textContent = PB_OB_NOTICE; w.dataset.uid = uid; w.hidden = false; }
      const d = document.getElementById('pbTermsSheet'); // a sheet that went up before this screen opened
      if (pbCurrentScreen === 'setPassword' && d && window.pbSetPwTermsHere(uid)) d.remove();
    } catch (e) {}
  };
  window.pbSetPwExtrasHide = function () { ['setPwTermsWrap', 'setPwNoticeWrap'].forEach(id => { const e = pbSetPwEl(id); if (e) { e.hidden = true; delete e.dataset.uid; } }); const b = pbSetPwEl('setPwTerms'); if (b) b.checked = false; };
  window.pbSetPwAgreeState = function () {
    const uid = sbUser && sbUser.id, w = pbSetPwEl('setPwTermsWrap'), n = pbSetPwEl('setPwNoticeWrap'), b = pbSetPwEl('setPwTerms');
    const need = !!(w && !w.hidden && w.dataset.uid === uid);
    return { uid, need, ok: need && !!(b && b.checked), notice: !!(n && !n.hidden && n.dataset.uid === uid) };
  };
  window.pbSetPwAgreed = function (a) { // recorded as the sheet's I Agree and the notice's Got It would be
    const uid = a && a.uid; if (!uid) return;
    if (a.need && a.ok) { pbTermsLs.set('pbTermsPend:' + uid, JSON.stringify({ t: PB_TERMS_VER, p: PB_PRIV_VER, at: Date.now() })); pbTermsSendPending(uid).catch(() => {}); }
    if (a.notice) { pbObLs.set('pbCrewNotice:' + uid, PB_OB_NOTICE_VER); pbObLs.set('pbCrewNoticeAck:' + uid, JSON.stringify({ v: PB_OB_NOTICE_VER, at: new Date().toISOString() })); try { pbCrewNoticeAckSend(uid); } catch (e) {} }
  };
  window.pbScreenHooks.push((name) => { if (name === 'setPassword') { window.pbSetPwExtras(); setTimeout(window.pbSetPwExtras, 1500); setTimeout(window.pbSetPwExtras, 4000); } });
  window.pbAccountLoadHooks.push(() => { setTimeout(() => { if (pbCurrentScreen === 'setPassword') window.pbSetPwExtras(); }, 0); });
  function pbObErrSheet(code, title) {''')
p.save()
