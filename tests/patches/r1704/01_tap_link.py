#!/usr/bin/env python3
# r17.04: email links that a mail scanner can't use up.
# Microsoft 365 (Safe Links) and other mail gateways open every link in an email seconds after it arrives. Supabase's
# invite and reset links work once, so the scanner used them up and the person got "link expired" (Scorpion Backhoe,
# Nov 18: opened 17 s after sending from a Microsoft address, stopped at Set Password).
# New email templates link to the app as ?token_hash=...&type=invite|recovery. Opening that link changes nothing: the
# app shows "Set Up Your Account" / "Reset Your Password" with one button, and only the tap redeems the link
# (auth.verifyOtp). The session it returns is handed to the existing, tested link path (#access_token=...&type=...,
# location.replace so no history entry; the start-up code reads and clears it at once). Old links (hash tokens)
# keep working.
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

# 1) Read token_hash/type from the query before the URL is cleaned.
rep("""      return { tokens: at && rt ? { access_token: at, refresh_token: rt } : null, type: h.get('type'), failed };
    } catch (e) { return { tokens: null, type: null, failed: false }; }
  })();""",
"""      // r17.04: a scanner-proof link (?token_hash=...&type=invite|recovery) is kept for the Continue tap; opening it redeems nothing
      const th = q.get('token_hash'), tt = q.get('type');
      const tap = (th && /^[A-Za-z0-9_-]{10,200}$/.test(th) && (tt === 'invite' || tt === 'recovery')) ? { token_hash: th, type: tt } : null;
      return { tokens: at && rt ? { access_token: at, refresh_token: rt } : null, type: h.get('type'), failed, tap };
    } catch (e) { return { tokens: null, type: null, failed: false, tap: null }; }
  })();""")

# 2) The tap screen, shown at once (before the rest of start-up) when such a link opened the app.
rep("""  let pbUrlSessionFailed = null; // 'expired' | 'network': the link's session could not be stored""",
"""  let pbUrlSessionFailed = null; // 'expired' | 'network': the link's session could not be stored
  // r17.04: the tap screen for a scanner-proof email link. Nothing is used up until Continue is tapped.
  function pbShowTapLink(tap) {
    try {
      const inv = tap.type === 'invite';
      const wrap = document.createElement('div');
      wrap.id = 'pbTapLink';
      wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', 'pbTapLinkTitle');
      wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) max(16px,env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));background:var(--pb-canvas,#F4F5F7);color:var(--pb-text,#14171C);font-family:Inter,system-ui,sans-serif;box-sizing:border-box;';
      wrap.innerHTML = '<div style="width:100%;max-width:420px;background:var(--pb-raised,#fff);border:1px solid var(--pb-divider,#d6d9de);border-radius:16px;padding:22px 18px;box-sizing:border-box;display:flex;flex-direction:column;gap:12px;">'
        + '<div style="font-weight:700;font-size:1.25rem;" id="pbTapLinkTitle"></div>'
        + '<div style="font-size:.95rem;line-height:1.45;" id="pbTapLinkText"></div>'
        + '<button type="button" class="pb-btn" id="pbTapLinkGo" style="min-height:48px;"></button>'
        + '<div style="font-size:.9rem;line-height:1.4;display:none;" id="pbTapLinkMsg" role="alert"></div>'
        + '<button type="button" class="pb-btn ghost small" id="pbTapLinkLogin" style="display:none;">Go to Log In</button></div>';
      document.body.appendChild(wrap);
      document.getElementById('pbTapLinkTitle').textContent = inv ? 'Set Up Your Account' : 'Reset Your Password';
      document.getElementById('pbTapLinkText').textContent = inv
        ? 'You were invited to The Pipelayer\\u2019s Bible. Tap Continue to choose your password.'
        : 'Tap Continue to choose a new password.';
      const go = document.getElementById('pbTapLinkGo'), msg = document.getElementById('pbTapLinkMsg'), login = document.getElementById('pbTapLinkLogin');
      go.textContent = 'Continue';
      login.onclick = () => { try { wrap.remove(); } catch (e) {} };
      let busy = false;
      go.onclick = async () => {
        if (busy) return; busy = true; go.disabled = true; go.textContent = 'Opening\\u2026'; msg.style.display = 'none';
        let res = null, err = null;
        try {
          if (!sbClient || !sbClient.auth || typeof sbClient.auth.verifyOtp !== 'function') throw new Error('offline');
          res = await sbClient.auth.verifyOtp({ token_hash: tap.token_hash, type: tap.type });
          if (res && res.error) err = res.error;
        } catch (e) { err = e; }
        const ss = res && res.data && res.data.session;
        if (!err && ss && ss.access_token && ss.refresh_token) {
          // the existing link path takes it from here (it reads and clears the hash at start-up)
          location.replace(location.pathname + '#access_token=' + encodeURIComponent(ss.access_token) + '&refresh_token=' + encodeURIComponent(ss.refresh_token) + '&type=' + tap.type);
          setTimeout(() => { try { location.reload(); } catch (e) {} }, 50);
          return;
        }
        const net = !err || !err.status || /fetch|network|offline/i.test((err && err.message) || '');
        busy = false; go.disabled = false; go.textContent = 'Continue';
        msg.style.display = '';
        if (net) msg.textContent = 'No signal. Try Continue again once you have signal. The link still works.';
        else {
          msg.textContent = inv
            ? 'This invite link has expired or was already used. Ask whoever invited you to send a new one, or tap Go to Log In, then \\u201cForgot password?\\u201d with the email the invite went to.'
            : 'This reset link has expired or was already used. Tap Go to Log In, then \\u201cForgot password?\\u201d to get a new one.';
          go.style.display = 'none'; login.style.display = '';
        }
      };
      try { go.focus(); } catch (e) {}
    } catch (e) { console.error('tap link screen', e); }
  }
  if (pbUrlAuth.tap && !pbUrlAuth.tokens) {
    if (document.body) pbShowTapLink(pbUrlAuth.tap); else document.addEventListener('DOMContentLoaded', () => pbShowTapLink(pbUrlAuth.tap));
  }""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
