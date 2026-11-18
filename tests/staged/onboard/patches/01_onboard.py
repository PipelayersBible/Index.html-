import sys, os
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# feat onboard (critique, Nov 17): "text him a link, he taps it, he's in", role preset by whoever invited him, Add to Home
# Screen asked in the same flow. The module (crew join links, the join sheet, Join a Crew or Use a Code, the handoff code
# for the Home Screen app, the foreman's and the office's link screen) is in 01_onboard.js beside this file.
# Server: sql/01_onboard.sql + functions/crew-join (staged, not applied / deployed).
MOD = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '01_onboard.js'), encoding='utf-8').read()

# (1) a join link opens the app as #join=<token>: read it before anything else and take it out of the address bar and
# history at once (the # part never reaches the web server; this keeps it out of screenshots and Back too)
rep("""  pbCleanAuthUrl();
  let pbUrlSessionFailed = null;""", """  const pbJoinFromUrl = (() => { /* feat onboard */
    try {
      const h = new URLSearchParams((window.location.hash || '').replace(/^#/, '')), t = h.get('join');
      if (h.has('join')) history.replaceState(history.state, '', window.location.pathname + window.location.search);
      return t && /^[A-Za-z0-9_-]{20,100}$/.test(t) ? t : null;
    } catch (e) { return null; }
  })();
  pbCleanAuthUrl();
  let pbUrlSessionFailed = null;""")

# (2) the module, after the Terms code (it uses PB_TERMS_VER, pbTermsLs, pbTermsSendPending)
rep("""  window.addEventListener('online', () => { try { const uid = sbUser && sbUser.id; if (uid) pbTermsSendPending(uid); } catch (e) {} });""",
    """  window.addEventListener('online', () => { try { const uid = sbUser && sbUser.id; if (uid) pbTermsSendPending(uid); } catch (e) {} });
""" + MOD.rstrip('\n'))

# (3) Crew members (the office): Text a Join Link, above Add by email
rep("""      <section class="pbc-add" id="crAdd" aria-labelledby="crAddHead">""",
    """      <div class="pb-btn-wrap pbc-joinlink" id="crJoinLinkWrap"><button type="button" class="pb-btn" id="crJoinLinkBtn" onclick="pbObOpenInvite()"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-plus"/></svg>Text a Join Link</button><p class="pbc-dim" style="margin:6px 0 0;">No email needed: they tap the link and they&rsquo;re in, with the role you pick. Or add by email below.</p></div><!-- feat onboard -->
      <section class="pbc-add" id="crAdd" aria-labelledby="crAddHead">""")

# (4) Log In: the way in for a join code (the iPhone Home Screen app) or a code from another screen
rep("""By logging in you agree to the <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a> and <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</p>""",
    """By logging in you agree to the <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a> and <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</p>
    <div class="pb-btn-wrap" id="loginJoinWrap"><button type="button" class="pb-btn secondary" id="loginJoinBtn" onclick="pbObOpenCode()">Join a Crew or Use a Code</button></div><!-- feat onboard -->""")

# (5) a no-email account is shown by its name, never by its hidden address
rep("""    const linkEl = document.getElementById('loginToggleLink');
    if (linkEl) linkEl.textContent = sbUser || pbSwitchWaitEnd ? 'Log Out' : pbCachedAccountUnverified() ? 'Log Out / Lock This Phone' : 'Log In';""",
    """    if (el && sbUser && pbObIsLink(sbUser) && sbUser.email) el.textContent = el.textContent.split(String(sbUser.email)).join(pbObDisplay(sbUser)); /* feat onboard */
    const linkEl = document.getElementById('loginToggleLink');
    if (linkEl) linkEl.textContent = sbUser || pbSwitchWaitEnd ? 'Log Out' : pbCachedAccountUnverified() ? 'Log Out / Lock This Phone' : 'Log In';""")
rep("""  const pbCmName = (m) => (m && (m.name || m.email)) || 'Unnamed account';""",
    """  function pbObHiddenEmail(e) { return /@crew\\.pipelayersbible\\.com$/i.test(String(e || '')); } /* feat onboard: a join-link account's placeholder address */
  const pbCmName = (m) => (m && (m.name || (pbObHiddenEmail(m.email) ? 'Joined by link (no name yet)' : m.email))) || 'Unnamed account';""")
rep("""        + (m.name && m.email ? '<div class="pbc-email">' + escapeHtml(m.email) + '</div>' : '')""",
    """        + (m.name && m.email && !pbObHiddenEmail(m.email) ? '<div class="pbc-email">' + escapeHtml(m.email) + '</div>' : '')
        + (pbObHiddenEmail(m.email) ? '<div class="pbc-email">Joined by text link (no email)</div>' : '') /* feat onboard */""")

open(out, 'w', encoding='utf-8').write(s); print('ok')
