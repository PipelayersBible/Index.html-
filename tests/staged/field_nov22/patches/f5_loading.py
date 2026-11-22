# F5 first open on weak signal: the account check (sign-in answer, then the plan) can take many seconds; until it answers,
# a phone with no plan kept on it showed every tile locked ("log in first", "Requires subscription") and a tap gave a wrong
# "Subscription Required". Now, only while that first check is really still out (start-up's sign-in answer pending, or the
# plan check running) AND nothing kept on the phone already opens the app: Home says "Loading your account…" (a plain
# line, no progress bar), the tiles don't claim a subscription is needed, and a tap says it is still loading.
# At most 30 s: after that the app shows what it knows (as before). A plan kept on the phone opens at once (unchanged).
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from _rep import P
p = P()
p.rep('''@media (prefers-reduced-motion: reduce) { #pbApp#pbApp .pb-laid-toast.pb-on { animation: pbLaidFade 200ms linear !important; } }
''', '''@media (prefers-reduced-motion: reduce) { #pbApp#pbApp .pb-laid-toast.pb-on { animation: pbLaidFade 200ms linear !important; } }
/* field_nov22 F5: the first account check still out: an honest line, and no "Requires subscription" on the tiles meanwhile */
#pbApp .pb-acct-loadline { display: flex; align-items: center; gap: 10px; margin: 10px var(--pb-gutter, 16px) 0 var(--pb-gutter, 16px); padding: 10px 14px; border-radius: 12px; background: var(--pb-raised, rgba(128,128,128,0.12)); color: var(--pb-text); font-size: 15px; font-weight: 600; line-height: 1.3; }
#pbApp .pb-acct-loadline[hidden] { display: none; }
html.pb-acct-loading #pbApp .pb-home-tile-locked .sub::after { content: none !important; }
''')
# the line under Home's header
p.rep('''  <div class="pb-screen active" id="screen-home">
    <div class="pb-header">
      <h1 class="pb-title"><span class="pb-wm-the">The </span><span class="pb-wm-name">Pipelayer's Bible</span></h1>''',
      '''  <div class="pb-screen active" id="screen-home">
    <p class="pb-acct-loadline" id="pbAcctLoading" role="status" hidden>Loading your account&hellip;</p><!-- field_nov22 F5 (moved under the header at start-up) -->
    <div class="pb-header">
      <h1 class="pb-title"><span class="pb-wm-the">The </span><span class="pb-wm-name">Pipelayer's Bible</span></h1>''')
# state + paint
p.rep('''  function pbRefreshPlanInBackground(gen) {
    pbRefreshSubscriptionCache().then(() => { if (gen === pbAuthGen) updateLoginStatusDisplay(); })
      .catch(e => console.error('Could not refresh subscription status (keeping last known value):', e.message));
  }''', '''  function pbRefreshPlanInBackground(gen) {
    pbPlanChecking++; try { pbAcctLoadingPaint(); } catch (e) {} /* field_nov22 F5 */
    pbRefreshSubscriptionCache().then(() => { if (gen === pbAuthGen) updateLoginStatusDisplay(); })
      .catch(e => console.error('Could not refresh subscription status (keeping last known value):', e.message))
      .finally(() => { pbPlanChecking = Math.max(0, pbPlanChecking - 1); try { pbAcctLoadingPaint(); } catch (e) {} });
  }''')
p.rep('''  function updateLoginStatusDisplay() {
    if (sbUser && sbUser.email) pbAccountEmails[sbUser.id] = String(sbUser.email).toLowerCase();''',
      '''  // ---- field_nov22 F5: "Loading your account…" while the first account check is really still out ----
  var pbPlanChecking = 0, pbAcctLoadOn = false; const PB_ACCT_LOAD_T0 = Date.now(), PB_ACCT_LOAD_MAX_MS = 30000;
  function pbAcctLoading() {
    if (Date.now() - PB_ACCT_LOAD_T0 > PB_ACCT_LOAD_MAX_MS) return false; // after 30 s: what the app knows, as before
    if (typeof sbClient === 'undefined' || !sbClient) return false; // no login service at all (offline start): nothing is on its way
    if (pbTierMeetsRequirement('individual')) return false; // a plan kept on this phone: everything opens already
    return !!(pbLateCheckPending || pbPlanChecking > 0);
  }
  function pbAcctLoadingPaint() {
    const on = pbAcctLoading(), was = pbAcctLoadOn; pbAcctLoadOn = on;
    document.documentElement.classList.toggle('pb-acct-loading', on);
    const el = document.getElementById('pbAcctLoading');
    if (el) {
      const home = document.getElementById('screen-home'), hdr = home && home.querySelector(':scope > .pb-header');
      if (hdr && el.previousElementSibling !== hdr) hdr.insertAdjacentElement('afterend', el);
      if (el.hidden === on) el.hidden = !on;
    }
    if (on) { const a = document.getElementById('loggedInAs'); if (a && !sbUser) a.textContent = 'Loading your account\\u2026'; }
    if (was !== on && was) { try { if (typeof window.pbRenderHome === 'function') window.pbRenderHome(); } catch (e) {} } // the tiles say what they really need now
    return on;
  }
  window.pbAcctLoading = pbAcctLoading;
  { const iv = setInterval(() => { try { pbAcctLoadingPaint(); } catch (e) {} if (Date.now() - PB_ACCT_LOAD_T0 > PB_ACCT_LOAD_MAX_MS + 2000) clearInterval(iv); }, 1000); }
  function updateLoginStatusDisplay() {
    if (sbUser && sbUser.email) pbAccountEmails[sbUser.id] = String(sbUser.email).toLowerCase();''')
p.rep('''    { const ft = document.getElementById('homeAccountFoot'); if (ft) ft.classList.toggle('pb-acct-in', !!sbUser); } // batch 20 HOME: signed in, Log Out is in Account & Settings
    pbUpdateHomeTileLocks();
  }''', '''    { const ft = document.getElementById('homeAccountFoot'); if (ft) ft.classList.toggle('pb-acct-in', !!sbUser); } // batch 20 HOME: signed in, Log Out is in Account & Settings
    try { pbAcctLoadingPaint(); } catch (e) {} /* field_nov22 F5 */
    pbUpdateHomeTileLocks();
  }''')
p.rep('''  function pbShowSubscriptionRequiredMessage(name) {
''', '''  function pbShowSubscriptionRequiredMessage(name) {
    if (pbAcctLoading()) { pbAlert('Still loading your account. The first time it needs signal. Try again in a moment.', 'Loading'); return; } /* field_nov22 F5 */
''')
p.rep('''  function pbDestLockReason(d) {
    if (window.pbCanOpen(d.gate)) return '';
''', '''  function pbDestLockReason(d) {
    if (window.pbCanOpen(d.gate)) return '';
    if (typeof window.pbAcctLoading === 'function' && window.pbAcctLoading()) return 'Loading\\u2026'; /* field_nov22 F5 */
''')
p.save()
