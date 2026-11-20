# 08 Adding the app to the Home Screen is a step at the end of set-up (Tommy, Nov 19: "I don't think it has a prompt
# to add the app to their Home Screen when they do their set up"). On iPhone Safari and Android Chrome (never in the
# Home Screen app, never on a computer), once, right after:
#   - Save Password from an invite or reset link (patch 01 calls pbObA2hsStepSoon('setpw')),
#   - Join Crew from a text link (patch 02 calls pbObA2hsStepSoon('join')),
#   - a Log In (an owner's first sign-in on a phone, or anyone's on a new phone).
# It waits its turn: after the Terms, the crew notice, two-step login and any other question, before notifications
# (those are only a Home card). One "Done" ends it for good: the same pbObA2hs:<uid> key as the Home card, so neither
# shows again. iPhone: the 3 Share steps with a picture of the Share button; a no-email account gets its code right
# there (the Home Screen app starts signed out). Android: "Install App" (beforeinstallprompt) when Chrome offers it,
# else the menu steps. Usage: python3 08_a2hs_step.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("  { const o = window.pbPushCardHtml; window.pbPushCardHtml = function () {", r"""  // ---- streamline 08: the Home Screen step at the end of set-up ----
  let pbObBip = null, pbObA2hsT = null; // Android Chrome's install offer, kept for the Install App tap
  window.addEventListener('beforeinstallprompt', (e) => { try { const uid = sbUser && sbUser.id; if (!uid || !pbObLs.get('pbObA2hs:' + uid)) e.preventDefault(); } catch (x) {} pbObBip = e; });
  window.addEventListener('appinstalled', () => { pbObBip = null; try { const uid = sbUser && sbUser.id; if (uid) pbObLs.set('pbObA2hs:' + uid, new Date().toISOString()); } catch (e) {} });
  function pbObA2hsKind() { // 'ios' | 'android' | null (the Home Screen app itself, a computer)
    if (pbObStandalone()) return null;
    if (pbObIosVer() > 0) return 'ios';
    try { if (/Android/i.test(navigator.userAgent || '')) return 'android'; } catch (e) {}
    return null;
  }
  const pbObA2hsStepWant = (uid) => !!(uid && pbObA2hsKind() && !pbObLs.get('pbObA2hs:' + uid));
  function pbObA2hsBusy(uid, n) { // something else comes first
    if (pbCurrentScreen !== 'home') return true;
    if (['pbTermsSheet', 'pbMfaSheet', 'pbObSheet', 'pbTapLink', 'pbCrewNotice'].some(id => document.getElementById(id))) return true;
    const ov = document.getElementById('pbModalOverlay'); if (ov && getComputedStyle(ov).display !== 'none') return true;
    try { if (pbTermsPermitLive()) return true; } catch (e) {}
    if (pbTermsLs.get('pbTermsOk:' + uid) !== PB_TERMS_KEY && !pbTermsLs.get('pbTermsPend:' + uid)) return true; // the Terms first
    const acc = pbProdAccMem.get(uid);
    if (!acc && n < 20) return true; // who this is isn't known yet (the crew notice may be due): up to 10 s
    if (acc && acc.member && acc.companyId && !acc.manager && pbObLs.get('pbCrewNotice:' + uid) !== PB_OB_NOTICE_VER) return true; // the crew notice first
    return false;
  }
  window.pbObA2hsStepSoon = function (why) {
    const uid = sbUser && sbUser.id; if (!pbObA2hsStepWant(uid)) return;
    if (PB_OB.skippedHome && pbObA2hsKind() === 'ios') return; // he tapped "Join Here in Safari" a moment ago; the Home card stays
    clearInterval(pbObA2hsT); let n = 0;
    pbObA2hsT = setInterval(() => {
      n++;
      if (!sbUser || sbUser.id !== uid || !pbObA2hsStepWant(uid) || n > 240) { clearInterval(pbObA2hsT); return; } // 2 minutes, then the Home card is the reminder
      if (pbObA2hsBusy(uid, n)) return;
      clearInterval(pbObA2hsT); pbObA2hsStep();
    }, 500);
  };
  const PB_OB_SHARE_SVG = '<svg viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="the Share button" style="vertical-align:-6px;margin:0 2px;color:var(--pb-brand-text,#0a66c2);" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"/></svg>';
  function pbObA2hsStep() {
    const uid = sbUser && sbUser.id, kind = pbObA2hsKind(); if (!uid || !kind) return;
    let h = '<h2 data-pbob-focus tabindex="-1">Add the App to Your Home Screen</h2><p>One tap to open, and it works with no signal' + (kind === 'ios' ? '. Notifications work only from there.' : '.') + '</p>';
    if (kind === 'ios') {
      const link = pbObIsLink(sbUser);
      h += '<ol class="pbob-ol" id="pbObA2hsSteps">' + (link ? '<li>Tap <strong>Get a Code</strong> below, then <strong>Copy Code</strong>.</li>' : '')
        + '<li>Tap <strong>Share</strong> ' + PB_OB_SHARE_SVG + ' at the bottom of Safari.</li><li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>'
        + '<li>Open the new icon' + (link ? ' and tap <strong>Paste Join Code</strong>.' : ' and log in.') + '</li></ol>'
        + (link ? '<div id="pbObA2hsCode"><button type="button" class="pb-btn secondary" id="pbObA2hsCodeBtn" onclick="pbObA2hsCode()" style="width:100%;min-height:52px;">Get a Code</button><p class="pbob-dim" style="margin:6px 0 0;">Your account has no email or password, so the new app signs in with this code.</p></div>' : '');
    } else if (pbObBip) {
      h += '<div class="pbob-btns"><button type="button" class="pb-btn" id="pbObInstallBtn" onclick="pbObInstall()">Install App</button></div>';
    } else {
      h += '<ol class="pbob-ol" id="pbObA2hsSteps"><li>Tap the menu <strong>&#8942;</strong> at the top right of Chrome.</li><li>Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>), then <strong>Install</strong>.</li></ol>';
    }
    h += '<div class="pbob-btns"><button type="button" class="pb-btn' + (kind === 'android' && pbObBip ? ' ghost' : '') + '" id="pbObA2hsDone" onclick="pbObA2hsDone()">Done</button></div>';
    pbObSheet(h, 'Add the app to your Home Screen');
    const d = document.getElementById('pbObSheet'); if (d) d.dataset.step = 'a2hs';
  }
  window.pbObA2hsStep = pbObA2hsStep;
  window.pbObA2hsDone = function () { window.pbObClose(); window.pbObA2hsOk(); };
  window.pbObA2hsCode = async function () {
    const box = document.getElementById('pbObA2hsCode'), b = document.getElementById('pbObA2hsCodeBtn'); if (!box) return;
    if (b) { b.disabled = true; b.textContent = 'Getting a code…'; }
    const r = await pbObRpc('pb_onboard_handoff_make', {});
    if (!document.getElementById('pbObA2hsCode')) return;
    if (!r.ok) { if (b) { b.disabled = false; b.textContent = 'Get a Code'; } let e = document.getElementById('pbObA2hsErr'); if (!e) { e = document.createElement('p'); e.id = 'pbObA2hsErr'; e.className = 'pbob-err'; e.setAttribute('role', 'alert'); box.appendChild(e); } e.textContent = pbObText(r.code); return; }
    PB_OB.handoff = r;
    box.innerHTML = '<div class="pbob-code" id="pbObHandoffCode">' + escapeHtml(pbObCodeShown(r.code)) + '</div><button type="button" class="pb-btn secondary" id="pbObHandoffCopy" onclick="pbObHandoffCopy()" style="width:100%;min-height:52px;">Copy Code</button><p class="pbob-dim" style="margin:6px 0 0;">Works once, for 15 minutes. Don’t send it to anyone: it signs in to your account.</p>';
  };
  window.pbObInstall = async function () {
    const e = pbObBip; pbObBip = null;
    if (!e || typeof e.prompt !== 'function') { pbObA2hsStep(); return; }
    let ok = false; try { e.prompt(); const c = await e.userChoice; ok = !!(c && c.outcome === 'accepted'); } catch (x) {}
    window.__pbObInstallAsked = ok ? 'accepted' : 'dismissed'; // for the rig
    if (ok) { window.pbObA2hsDone(); window.pbSayDone('Installed. Open it from your Home Screen.'); } else pbObA2hsStep(); // not now: the menu steps and Done
  };
  window.pbAccountLoadHooks.push((uid, info) => { if (info && info.login) setTimeout(() => window.pbObA2hsStepSoon('login'), 0); });
  { const o = window.pbPushCardHtml; window.pbPushCardHtml = function () {""")
p.save()
