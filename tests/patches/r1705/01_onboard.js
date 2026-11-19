  // ================= onboard2 (Nov 19, on r17.04): crew join links, lost phone, getting started, Home Screen card =================
  // Tommy's Nov 18 answers: #9 join by text link (email optional for foremen and pipelayers), #11 lost phone = the office
  // removes the old account and sends a new link, #12 links last 24 hours, #13 foremen add pipelayers by link with an
  // office on/off switch, #15 a foreman's pipelayer goes on his crew automatically, #17 ticking the Terms on the join
  // screen counts as accepting, #2 getting-started card on a new company's Home, #3 one-time iPhone Home Screen card.
  // A link opens the app at #join=<token>. Opening it redeems nothing (pb_onboard_peek only reads), so a mail scanner, a
  // link preview or a text-message preview can't use it up: only the Join Crew tap does (crew-join, or pb_onboard_join
  // for a phone already signed in). Server: sql/01_onboard.sql (pb_onboard_*), functions/crew-join. Needs signal for
  // every step; nothing is queued.
  const PB_OB_ROLES = { foreman: 'Foreman', pipelayer: 'Pipelayer' };
  const PB_OB_APP = 'https://app.pipelayersbible.com/';
  const PB_OB_NOTICE_VER = '3'; // the crew notice version this build asks for (pbCrewNoticeCheck)
  const PB_OB_MSG = {
    'pb:link_used': 'This link was already used. Ask whoever sent it for a new one. If you didn’t use it, tell them: someone else did.',
    'pb:link_expired': 'This link has expired. Links last 24 hours. Ask whoever sent it for a new one.',
    'pb:link_revoked': 'This link was cancelled. Ask whoever sent it for a new one.',
    'pb:link_not_found': 'That link or code isn’t right. Check it, or ask for a new link.',
    'pb:link_busy': 'Someone is joining with this link right now. If that isn’t you, tell whoever sent it. Otherwise try again in 2 minutes.',
    'pb:busy': 'Too many wrong codes were tried in the last few minutes. Wait 10 minutes, or tap the link in the text instead.',
    'pb:company_inactive': 'That company isn’t active right now, so you can’t join it.',
    'pb:company_closed': 'That company’s account is closed for now, so nobody can join it. Ask the office.',
    'pb:beta_ended': 'Your company’s beta has ended, so no one new can join. The company account can see the plan choices in Settings.',
    'pb:read_only': 'Your company’s account is read-only right now, so no one new can join. The company account can see why in Settings.',
    'pb:other_company': 'The account on this phone is already in another company. Log out first to join with a new account.',
    'pb:already_member': 'You’re already in this company.',
    'pb:is_owner': 'That’s your own company: you own it.',
    'pb:trial_seats': 'The company’s beta is full: the company account plus 6 people. Remove someone or cancel a waiting link first.',
    'pb:too_many_links': 'Your company has 10 links waiting. Cancel one you don’t need, or wait for them to be used.',
    'pb:link_limit': 'Your company made 30 links in the last 24 hours, the most allowed. Try again tomorrow.',
    'pb:foreman_links_off': 'Your company has turned off join links from foremen. Ask the office to add people.',
    'pb:foreman_pipelayer_only': 'A foreman can make Pipelayer links only.',
    'pb:not_company_account': 'Only the company account or a foreman of the company can do that.',
    'pb:not_a_foreman': 'That person isn’t a foreman in the company any more. Pick another foreman, or none.',
    'pb:bad_role': 'Pick Pipelayer or Foreman.',
    'pb:has_email': 'This person signs in with an email. On a new phone they log in with their email and password, or tap “Forgot password?”.',
    'pb:not_crew': 'Only a foreman or pipelayer who joined by link can get a new-phone link.',
    'pb:not_member': 'They’re not in your company any more. Refresh Crew members.',
    'pb:owner_only': 'Only the company owner can do that.',
    'pb:self': 'You can’t do that to your own account.',
    'pb:terms_needed': 'Tick the box to agree to the Terms first.',
    'pb:handoff_limit': 'You made 5 codes in the last hour. Wait a bit and try again.',
    'pb:use_join': 'That’s a join code. Use it on the join screen.',
    'pb:joined_no_signin': 'You joined the company, but this phone couldn’t sign in. Ask whoever sent the link for a new one.',
    'pb:no_signal': 'No signal. Nothing was changed. Try again when you have signal.',
    'pb:server': 'Something went wrong. Nothing was changed. Try again.'
  };
  const pbObText = (c) => PB_OB_MSG[c] || PB_OB_MSG['pb:server'];
  function pbObIsLink(u) { return !!(u && u.app_metadata && u.app_metadata.pb_link === true); }
  function pbObDisplay(u) { const n = u && u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name); return n ? String(n) : 'your crew account'; }
  window.pbObIsLink = pbObIsLink;
  function pbObIosVer() { try { const m = /(?:iPhone|iPad|iPod).*? OS (\d+)_(\d+)/.exec(navigator.userAgent || ''); return m ? +m[1] + (+m[2]) / 100 : 0; } catch (e) { return 0; } }
  function pbObStandalone() { try { return navigator.standalone === true || matchMedia('(display-mode: standalone)').matches; } catch (e) { return false; } }
  const pbObCodeShown = (c) => String(c || '').replace(/^(...)(...)$/, '$1 $2');
  function pbObWhen(s) { const d = new Date(s); if (!isFinite(d.getTime())) return ''; try { return d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }); } catch (e) { return d.toString(); } }
  const pbObLs = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  async function pbObRpc(name, args) {
    if (!sbClient || typeof sbClient.rpc !== 'function' || navigator.onLine === false) return { ok: false, code: 'pb:no_signal' };
    const r = await pbPermitRpc(name, args || {}, 20000);
    if (r.error) { const m = String(r.error.message || ''); return { ok: false, code: (/pb:[a-z_]+/.exec(m) || [])[0] || (/fetch|network|timeout|no client/i.test(m) ? 'pb:no_signal' : 'pb:server') }; }
    return r.data && typeof r.data === 'object' ? r.data : { ok: false, code: 'pb:server' };
  }
  async function pbObInvoke(body) {
    if (!sbClient || !sbClient.functions || typeof sbClient.functions.invoke !== 'function' || navigator.onLine === false) return { ok: false, code: 'pb:no_signal' };
    let r; try { r = await Promise.race([sbClient.functions.invoke('crew-join', { body }), new Promise(res => setTimeout(() => res({ timeout: true }), 30000))]); } catch (e) { return { ok: false, code: 'pb:no_signal' }; }
    if (!r || r.timeout || r.error) return { ok: false, code: navigator.onLine === false ? 'pb:no_signal' : 'pb:server' };
    return r.data && typeof r.data === 'object' && typeof r.data.ok === 'boolean' ? r.data : { ok: false, code: 'pb:server' };
  }
  // ---- the sheets (one at a time, above every screen) ----
  (function () { try { const st = document.createElement('style'); st.id = 'pbObCss'; st.textContent = [
    '.pbob-ov{position:fixed;inset:0;z-index:49;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:16px;overflow:auto;box-sizing:border-box;}',
    '.pbob-card{background:var(--pb-surface,#fff);color:var(--pb-text,#15181d);max-width:520px;width:100%;border-radius:16px;padding:20px 18px;box-shadow:0 10px 40px rgba(0,0,0,.3);max-height:calc(100vh - 32px);overflow:auto;box-sizing:border-box;}',
    '.pbob-card h2{margin:0 0 8px;font-size:1.25rem;line-height:1.25;overflow-wrap:anywhere;}',
    '.pbob-card h3{margin:16px 0 6px;font-size:1rem;}',
    '.pbob-card p{margin:0 0 10px;line-height:1.4;overflow-wrap:anywhere;}',
    '.pbob-step{font-size:.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pb-text-2,#555);margin:0 0 4px;}',
    '.pbob-dim{font-size:.92rem;color:var(--pb-text-2,#555);}',
    '.pbob-card label.pbob-f{display:block;font-weight:600;margin:10px 0 4px;}',
    '.pbob-card input[type=text],.pbob-card select{width:100%;box-sizing:border-box;min-height:48px;font-size:18px;padding:8px 12px;border-radius:10px;border:1px solid var(--pb-divider,#bbb);background:var(--pb-raised,#fff);color:inherit;}',
    '.pbob-check{display:flex;gap:10px;align-items:flex-start;margin:14px 0;}',
    '.pbob-check input{width:24px;height:24px;flex:none;margin-top:1px;}',
    '.pbob-btns{display:flex;flex-direction:column;gap:10px;margin-top:14px;}',
    '.pbob-btns .pb-btn,.pbob-btns a.pb-btn{width:100%;margin:0;min-height:52px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-decoration:none;}',
    '.pbob-row2{display:flex;gap:10px;flex-wrap:wrap;}.pbob-row2>*{flex:1 1 130px;}',
    '.pbob-code{font:700 30px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-align:center;padding:10px;border-radius:12px;background:var(--pb-raised,#f1f2f4);margin:6px 0 10px;}',
    '.pbob-notice{font-size:.9rem;background:var(--pb-raised,#f1f2f4);border-radius:12px;padding:10px 12px;margin:10px 0;white-space:pre-line;}',
    '.pbob-err{color:var(--pb-danger-text,#b00020);font-weight:600;}',
    '.pbob-list{display:flex;flex-direction:column;gap:8px;}',
    '.pbob-item{border:1px solid var(--pb-divider,#ddd);border-radius:12px;padding:10px 12px;}',
    '.pbob-item .t{font-weight:650;overflow-wrap:anywhere;}.pbob-item .s{font-size:.9rem;color:var(--pb-text-2,#555);margin-top:2px;overflow-wrap:anywhere;}',
    '.pbob-item.joined{border-left:4px solid var(--pb-ok,#1f8a4c);}.pbob-item .pb-btn{margin-top:8px;}',
    '.pbob-ol{margin:0 0 10px;padding-left:22px;line-height:1.45;}.pbob-ol li{margin:4px 0;}',
    '.pbob-toggle{display:flex;gap:8px;margin:4px 0 6px;}.pbob-toggle button{flex:1;min-height:48px;border-radius:10px;border:2px solid var(--pb-divider,#bbb);background:transparent;color:inherit;font-size:16px;font-weight:650;}',
    '.pbob-toggle button[aria-pressed=true]{border-color:var(--pb-brand,#0a66c2);background:var(--pb-brand-soft,rgba(10,102,194,.12));}',
    '.pbob-switch{display:flex;gap:12px;align-items:flex-start;border:1px solid var(--pb-divider,#ddd);border-radius:12px;padding:12px;margin:12px 0 4px;}',
    '.pbob-switch input{width:24px;height:24px;flex:none;margin-top:1px;}',
    '.pbob-seats{font-size:.92rem;border-radius:10px;padding:8px 10px;background:var(--pb-raised,#f1f2f4);margin:8px 0;}',
    // #2 the getting-started card on the company's Home
    '#homeObStart{margin:0 0 14px;}',
    '.pbob-start{border:1px solid var(--pb-brand-line,#9cc0ea);background:var(--pb-brand-soft,rgba(10,102,194,.08));border-radius:14px;padding:14px 14px 10px;color:var(--pb-text,#15181d);}',
    '.pbob-start h2{margin:0 0 2px;font-size:1.08rem;}',
    '.pbob-start ol{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:10px;}',
    '.pbob-start li{display:flex;gap:10px;align-items:flex-start;}',
    '.pbob-start .ck{flex:none;width:26px;height:26px;border-radius:50%;border:2px solid var(--pb-text-2,#666);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;box-sizing:border-box;margin-top:1px;}',
    '.pbob-start li.done .ck{background:var(--pb-ok,#1f8a4c);border-color:var(--pb-ok,#1f8a4c);color:#fff;}',
    '.pbob-start .tx{flex:1;min-width:0;}.pbob-start .tx b{display:block;font-size:1rem;}.pbob-start li.done .tx b{text-decoration:line-through;opacity:.75;}',
    '.pbob-start .tx span{display:block;font-size:.9rem;color:var(--pb-text-2,#555);line-height:1.35;overflow-wrap:anywhere;}',
    '.pbob-start .tx .pb-btn{margin-top:6px;}',
    '.pbob-start .ft{display:flex;justify-content:flex-end;margin-top:6px;}',
    // #3 the Home Screen steps on the iPhone card
    '#homeAttention_a2hs ol{margin:6px 0 0;padding-left:20px;line-height:1.45;}#homeAttention_a2hs li{margin:2px 0;}'
  ].join('\n'); document.head.appendChild(st); } catch (e) {} })();
  function pbObSheet(html, label) {
    let d = document.getElementById('pbObSheet');
    if (!d) { d = document.createElement('div'); d.id = 'pbObSheet'; d.className = 'pbob-ov'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); (document.getElementById('pbApp') || document.body).appendChild(d); }
    d.setAttribute('aria-label', label || 'Join a crew');
    d.innerHTML = '<div class="pbob-card">' + html + '</div>';
    const f = d.querySelector('[data-pbob-focus]') || d.querySelector('h2'); if (f) { if (!f.hasAttribute('tabindex') && f.tagName === 'H2') f.setAttribute('tabindex', '-1'); try { f.focus({ preventScroll: true }); } catch (e) {} }
    return d;
  }
  window.pbObClose = function () { const d = document.getElementById('pbObSheet'); if (d) d.remove(); PB_OB.busy = false; };
  const PB_OB = { busy: false, src: null, peek: null, inv: null };

  // ---- 1. the person who got the link ----
  // What the company sees: the crew notice's own words (r16.83, version 3), shown before he joins.
  const PB_OB_NOTICE = 'Your company can see the work you record in this app: your runs and their reports, photos (with the time, place and direction stamped on them), run notes, delays, breaks taken with the Break button, how long pipes took, check shots, production and footage, permits and daily reports, and when each was made or changed. Crew members linked to the same foreman can see a read-only copy of the crew’s runs (the grade numbers and when rows were marked laid).\n\nYour location is used only while Run Setup or Run Results is open, to stamp photos. The app doesn’t track where you go.\n\nYour company decides how it uses these records.';
  function pbObErrSheet(code, title) {
    pbObSheet('<h2>' + escapeHtml(title || 'Can’t Join') + '</h2><p id="pbObErrText">' + escapeHtml(pbObText(code)) + '</p><div class="pbob-btns"><button type="button" class="pb-btn" onclick="pbObClose()">OK</button></div>', title || 'Can’t join');
  }
  // Opening the link: only reads what the link is (pb_onboard_peek). Nothing is used up until Join Crew is tapped.
  window.pbObStartJoin = async function (src) {
    if (!src || (!src.token && !src.code)) return;
    PB_OB.src = src; PB_OB.peek = null;
    pbObSheet('<h2>Join a Crew</h2><p class="pbob-dim" role="status">Checking the link…</p>', 'Join a crew');
    const d = await pbObRpc('pb_onboard_peek', src.token ? { p_token: src.token } : { p_code: src.code });
    if (PB_OB.src !== src) return;
    if (!d || !d.ok) {
      if (d && d.code === 'pb:no_signal') { pbObNoSignal(); return; }
      pbObErrSheet(d && d.code, 'Can’t Join'); return;
    }
    PB_OB.peek = d;
    // iPhone in Safari: Home Screen first, so he joins inside the Home Screen app (its own storage and login)
    if (!src.here && !sbUser && pbObIosVer() >= 16.4 && !pbObStandalone()) { pbObHomeStep(); return; }
    pbObJoinForm();
  };
  function pbObNoSignal() { // the link is kept: Try Again reads it again; nothing was used
    pbObSheet('<h2>No Signal</h2><p id="pbObErrText">The join link needs signal. Nothing was used up: the link still works. Try again once you have signal.</p><div class="pbob-btns"><button type="button" class="pb-btn" id="pbObRetry" onclick="pbObRetry()">Try Again</button><button type="button" class="pb-btn ghost" onclick="pbObClose()">Not Now</button></div>', 'No signal');
  }
  window.pbObRetry = function () { const s = PB_OB.src; if (s) window.pbObStartJoin(s); };
  function pbObHomeStep() {
    const d = PB_OB.peek, src = PB_OB.src, code = d.code || src.code || '';
    pbObSheet('<p class="pbob-step">Step 1 of 2</p><h2>Put the App on Your Home Screen</h2>'
      + '<p>' + escapeHtml(d.invited_by || 'Your company') + ' invited you to join <strong>' + escapeHtml(d.company_name || 'the company') + '</strong> as ' + escapeHtml(PB_OB_ROLES[d.role] || 'crew') + '. Join from the Home Screen app. That’s where notifications work, and you only sign in once.</p>'
      + '<ol class="pbob-ol"><li>Tap <strong>Copy Join Code</strong> below.</li><li>Tap <strong>Share</strong> (the square with the arrow, at the bottom of Safari), then <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li><li>Open the new <strong>Pipelayer’s Bible</strong> icon and tap <strong>Paste Join Code</strong>.</li></ol>'
      + (code ? '<p class="pbob-dim">Or type this code there:</p><div class="pbob-code" id="pbObHomeCode" aria-label="Join code">' + escapeHtml(pbObCodeShown(code)) + '</div>' : '')
      + '<p class="pbob-dim">The link works once, until ' + escapeHtml(pbObWhen(d.expires_at)) + '.</p>'
      + '<div class="pbob-btns"><button type="button" class="pb-btn" id="pbObCopyBtn" data-pbob-focus onclick="pbObCopyJoin()">Copy Join Code</button>'
      + '<button type="button" class="pb-btn ghost" id="pbObHereBtn" onclick="pbObJoinHere()">Skip: Join Here in Safari</button></div>', 'Add to Home Screen');
  }
  window.pbObCopyJoin = async function () {
    const src = PB_OB.src, d = PB_OB.peek || {}, txt = src && src.token ? 'PBJOIN:' + src.token : String(d.code || (src && src.code) || '');
    let ok = false; try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) { ok = false; }
    window.__pbObCopied = txt; // what was offered to the clipboard (read by the rig)
    const b = document.getElementById('pbObCopyBtn'); if (b) b.textContent = ok ? 'Copied. Now Share › Add to Home Screen' : 'Couldn’t copy. Type the code instead';
  };
  window.pbObJoinHere = function () { if (PB_OB.src) { PB_OB.src.here = true; pbObJoinForm(); } };
  function pbObJoinForm() {
    const d = PB_OB.peek; if (!d) return;
    const role = PB_OB_ROLES[d.role] || 'crew', me = sbUser ? (pbObIsLink(sbUser) ? pbObDisplay(sbUser) : (sbUser.email || 'this account')) : '';
    pbObSheet('<h2 data-pbob-focus tabindex="-1">Join ' + escapeHtml(d.company_name || 'the Company') + '</h2>'
      + '<p>' + escapeHtml(d.invited_by || 'Your company') + ' invited you to join as <strong>' + escapeHtml(role) + '</strong>.' + (d.pair_name ? ' You’ll be on ' + escapeHtml(d.pair_name) + '’s crew.' : '') + '</p>'
      + (sbUser ? '<p class="pbob-dim" id="pbObAsMe">You’ll join with the account signed in on this phone (' + escapeHtml(me) + '). To join with a new account instead, log out first.</p>'
                : '<p class="pbob-dim">No email or password needed.</p>')
      + '<label class="pbob-f" for="pbObName">Your name</label><input type="text" id="pbObName" maxlength="80" autocomplete="name" enterkeyhint="done" value="' + escapeHtml(d.label || '') + '">'
      + '<p class="pbob-step" style="margin-top:14px;">What your company sees</p><div class="pbob-notice" id="pbObNotice">' + escapeHtml(PB_OB_NOTICE) + '</div>'
      + '<label class="pbob-check"><input type="checkbox" id="pbObTerms"><span>I have read and agree to the <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a> and <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>'
      + '<p class="pbob-err" id="pbObErr" role="alert" hidden></p>'
      + '<div class="pbob-btns"><button type="button" class="pb-btn" id="pbObJoinBtn" onclick="pbObJoinGo()" disabled>Join Crew</button><button type="button" class="pb-btn ghost" onclick="pbObClose()">Not Now</button></div>', 'Join ' + (d.company_name || 'the company'));
    const box = document.getElementById('pbObTerms'), btn = document.getElementById('pbObJoinBtn'), nm = document.getElementById('pbObName');
    const upd = () => { btn.disabled = !box.checked || !String(nm.value || '').trim(); };
    box.addEventListener('change', upd); nm.addEventListener('input', upd); upd();
  }
  // #17: the server recorded the Terms (and the crew notice) with the join, in pb_legal; the phone only remembers it so
  // neither sheet pops up. If the server couldn't record one, the app's normal pending path sends it.
  function pbObMarkAgreed(uid, legal) {
    if (legal && legal.terms === true) pbTermsLs.set('pbTermsOk:' + uid, PB_TERMS_KEY);
    else pbTermsLs.set('pbTermsPend:' + uid, JSON.stringify({ t: PB_TERMS_VER, p: PB_PRIV_VER, at: Date.now() }));
    pbObLs.set('pbCrewNotice:' + uid, PB_OB_NOTICE_VER);
    if (!(legal && legal.notice === true)) pbObLs.set('pbCrewNoticeAck:' + uid, JSON.stringify({ v: PB_OB_NOTICE_VER, at: new Date().toISOString() }));
  }
  async function pbObAfterJoin(uid) {
    try { await pbTermsSendPending(uid); } catch (e) {}
    try { if (typeof window.pbCrewNoticeAckSend === 'function') window.pbCrewNoticeAckSend(uid); } catch (e) {}
    try { await pbRefreshSubscriptionCache(); updateLoginStatusDisplay(); } catch (e) {}
    try { pbProdAccessRefresh(uid); pbReportRefreshAccess(uid); } catch (e) {}
  }
  function pbObDone(d) {
    pbObSheet('<h2 data-pbob-focus tabindex="-1">You’re In</h2><p id="pbObDoneText">You joined <strong>' + escapeHtml(d.company_name || 'the company') + '</strong> as ' + escapeHtml(PB_OB_ROLES[d.role] || 'crew') + '.' + (d.paired_with ? ' You’re on ' + escapeHtml(d.paired_with) + '’s crew.' : '') + ' Your work goes to them from now on.</p>'
      + (pbObIosVer() >= 16.4 && pbObStandalone() ? '<p class="pbob-dim">Turn on notifications in Settings › Notifications when you’re ready.</p>' : '')
      + '<div class="pbob-btns"><button type="button" class="pb-btn" id="pbObStartBtn" onclick="pbObClose(); pbGotoTab(\'home\')">Start</button></div>', 'Joined');
  }
  const pbObLegal = () => ({ terms: PB_TERMS_VER, privacy: PB_PRIV_VER, notice: PB_OB_NOTICE_VER, phone_at: new Date().toISOString(), build: String(window.PB_APP_BUILD || '').slice(0, 40), ua: String(navigator.userAgent || '').slice(0, 300) });
  window.pbObJoinGo = async function () { // the tap that uses the link
    const src = PB_OB.src, d = PB_OB.peek; if (!src || !d || PB_OB.busy) return;
    const err = document.getElementById('pbObErr'), btn = document.getElementById('pbObJoinBtn'), box = document.getElementById('pbObTerms');
    const name = pbNameClean(document.getElementById('pbObName').value);
    const bad = (code) => { PB_OB.busy = false; if (btn) { btn.disabled = false; btn.textContent = 'Join Crew'; } if (err) { err.textContent = code === 'pb:no_signal' ? 'No signal. Nothing was used up: the link still works. Tap Join Crew again once you have signal.' : pbObText(code); err.hidden = false; } };
    if (!box || !box.checked) return bad('pb:terms_needed');
    if (navigator.onLine === false) return bad('pb:no_signal');
    PB_OB.busy = true; btn.disabled = true; btn.textContent = 'Joining…'; err.hidden = true;
    const key = src.token ? { token: src.token } : { code: src.code };
    const legal = pbObLegal();
    if (sbUser) { // the account already signed in on this phone
      const uid = sbUser.id;
      const r = await pbObRpc('pb_onboard_join', { p_token: key.token || null, p_code: key.code || null, p_name: name, p_legal: legal });
      if (!r.ok) return bad(r.code);
      if (!sbUser || sbUser.id !== uid) return bad('pb:server');
      pbObMarkAgreed(uid, r.legal); PB_OB.busy = false; pbObDone(r); await pbObAfterJoin(uid); return;
    }
    const r = await pbObInvoke(Object.assign({ action: 'join', name, terms: { t: PB_TERMS_VER, p: PB_PRIV_VER }, notice: PB_OB_NOTICE_VER, phone_at: legal.phone_at, build: legal.build }, key));
    if (!r.ok) return bad(r.code);
    const user = await pbObSignInHash(r);
    if (!user) return bad('pb:joined_no_signin');
    pbObMarkAgreed(user.id, r.legal);
    const switched = await pbSwitchToSignedInUser(user);
    PB_OB.busy = false;
    if (switched) { pbGoto('home', true); pbObDone(r); await pbObAfterJoin(user.id); }
  };
  // the edge function's one-time hash -> a session on this phone (like a login: its own auth event is this switch's)
  async function pbObSignInHash(r) {
    if (!r || !r.token_hash || !sbClient || !sbClient.auth || typeof sbClient.auth.verifyOtp !== 'function') return null;
    let v; pbPasswordSigningIn = true;
    try { v = await sbClient.auth.verifyOtp({ token_hash: r.token_hash, type: r.type || 'magiclink' }); } catch (e) { v = null; } finally { pbPasswordSigningIn = false; }
    const u = v && !v.error && v.data && (v.data.user || (v.data.session && v.data.session.user));
    if (u) { try { pbForgetLinkSignIn(); } catch (e) {} }
    return u || null;
  }

  // ---- 2. "Join a Crew or Use a Code" (Log In screen; the Home Screen app's way in) ----
  window.pbObOpenCode = function () {
    pbObSheet('<h2 data-pbob-focus tabindex="-1">Join a Crew or Use a Code</h2>'
      + '<p>Got a text with a join link? Just tap the link. Copied a join code in Safari, or got a code from your foreman or from your other screen? Use it here.</p>'
      + '<div class="pbob-btns"><button type="button" class="pb-btn" id="pbObPasteBtn" onclick="pbObPaste()">Paste Join Code</button></div>'
      + '<label class="pbob-f" for="pbObCodeIn">Or type the 6-letter code</label><input type="text" id="pbObCodeIn" maxlength="9" autocapitalize="characters" autocomplete="one-time-code" spellcheck="false" enterkeyhint="go">'
      + '<p class="pbob-err" id="pbObErr" role="alert" hidden></p>'
      + '<div class="pbob-btns"><button type="button" class="pb-btn secondary" id="pbObCodeGo" onclick="pbObCodeGo()">Continue</button><button type="button" class="pb-btn ghost" onclick="pbObClose()">Cancel</button></div>', 'Join a crew or use a code');
  };
  function pbObParse(txt) {
    const s = String(txt || '').trim();
    let m = /PBJOIN:([A-Za-z0-9_-]{20,100})/.exec(s) || /[#&]join=([A-Za-z0-9_-]{20,100})/.exec(s); if (m) return { token: m[1] };
    m = /PBCODE:([A-Za-z0-9_-]{20,100})/.exec(s); if (m) return { signinToken: m[1] };
    const c = s.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (/^[ACDEFHJKMNPRTUVWXY34679]{6}$/.test(c)) return { code: c };
    return null;
  }
  window.pbObParse = pbObParse;
  window.pbObPaste = async function () {
    let t = ''; try { t = await navigator.clipboard.readText(); } catch (e) { t = ''; }
    const p = pbObParse(t), err = document.getElementById('pbObErr');
    if (!p) { if (err) { err.textContent = t ? 'What you copied isn’t a join code. Type the 6-letter code instead.' : 'Nothing to paste. Type the 6-letter code instead.'; err.hidden = false; } return; }
    pbObUse(p);
  };
  window.pbObCodeGo = function () {
    const v = (document.getElementById('pbObCodeIn') || {}).value, p = pbObParse(v), err = document.getElementById('pbObErr');
    if (!p) { if (err) { err.textContent = 'A code is 6 letters and numbers, like K7M 4QP.'; err.hidden = false; } return; }
    pbObUse(p);
  };
  async function pbObUse(p) {
    if (p.token) return window.pbObStartJoin({ token: p.token, here: true });
    if (p.signinToken) return pbObSignin({ token: p.signinToken });
    // a typed code: a join code, else a sign-in (handoff) code
    const d = await pbObRpc('pb_onboard_peek', { p_code: p.code });
    if (d && d.ok) { PB_OB.src = { code: p.code, here: true }; PB_OB.peek = d; pbObJoinForm(); return; }
    if (d && d.code === 'pb:no_signal') { const err = document.getElementById('pbObErr'); if (err) { err.textContent = pbObText('pb:no_signal'); err.hidden = false; } return; }
    if (d && d.code && d.code !== 'pb:link_not_found') { pbObErrSheet(d.code); return; }
    return pbObSignin({ code: p.code });
  }
  async function pbObSignin(key) {
    if (sbUser) { pbObErrSheet('pb:server', 'Already Signed In'); const t = document.getElementById('pbObErrText'); if (t) t.textContent = 'This phone is already signed in. Log out first to sign in with a code.'; return; }
    pbObSheet('<h2>Signing In</h2><p class="pbob-dim" role="status">One moment…</p>', 'Signing in');
    const r = await pbObInvoke(Object.assign({ action: 'signin' }, key));
    if (!r.ok) { pbObErrSheet(r.code, 'Can’t Sign In'); return; }
    const user = await pbObSignInHash(r);
    if (!user) { pbObErrSheet('pb:server', 'Can’t Sign In'); return; }
    const switched = await pbSwitchToSignedInUser(user);
    if (switched) { pbGoto('home', true); pbObSheet('<h2 data-pbob-focus tabindex="-1">Signed In</h2><p>You’re signed in as ' + escapeHtml(pbObIsLink(user) ? pbObDisplay(user) : (user.email || 'your account')) + '.</p><div class="pbob-btns"><button type="button" class="pb-btn" onclick="pbObClose()">OK</button></div>', 'Signed in'); }
  }

  // ---- 3. a code for this account's other screen (the iPhone Home Screen app): made by the person, 15 minutes ----
  window.pbObHandoff = async function () {
    if (!sbUser) return;
    const r = await pbObRpc('pb_onboard_handoff_make', {});
    if (!r.ok) { pbAlert(pbObText(r.code), 'No Code'); return; }
    PB_OB.handoff = r;
    pbObSheet('<h2 data-pbob-focus tabindex="-1">Code for the Home Screen App</h2>'
      + '<p>In the Home Screen app, tap <strong>Log In</strong>, then <strong>Join a Crew or Use a Code</strong>, then <strong>Paste Join Code</strong> (or type the code). It works once, for 15 minutes. Don’t send it to anyone: it signs in to your account.</p>'
      + '<div class="pbob-code" id="pbObHandoffCode">' + escapeHtml(pbObCodeShown(r.code)) + '</div>'
      + '<div class="pbob-btns"><button type="button" class="pb-btn" id="pbObHandoffCopy" onclick="pbObHandoffCopy()">Copy Code</button><button type="button" class="pb-btn ghost" onclick="pbObClose()">Done</button></div>', 'Code for the Home Screen app');
  };
  window.pbObHandoffCopy = async function () {
    const r = PB_OB.handoff; if (!r) return; const txt = 'PBCODE:' + r.token; let ok = false;
    try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) {}
    window.__pbObCopied = txt; const b = document.getElementById('pbObHandoffCopy'); if (b) b.textContent = ok ? 'Copied' : 'Couldn’t copy. Type the code';
  };

  // ---- 4. the foreman / office: make a link, text it, see who joined ----
  function pbObForemen() { // the company's foremen, from Crew members (the office only; loaded when that screen was opened)
    try { const D = pbCmSt && pbCmSt.data; return D && Array.isArray(D.members) ? D.members.filter(m => m && m.member !== false && m.role === 'foreman' && m.user_id && !m.manager).map(m => ({ id: String(m.user_id), name: pbCmName(m) })) : []; } catch (e) { return []; }
  }
  window.pbObOpenInvite = async function () {
    const uid = sbUser && sbUser.id; if (!uid) { pbOpenLogin(); return; }
    const acc = pbProdAccMem.get(uid) || {};
    const isMgr = !!acc.manager, fmOnly = !isMgr;
    PB_OB.inv = { uid, fmOnly, role: 'pipelayer', pair: '', made: null, list: null, info: null, co: (pbCmSt && pbCmSt.data && pbCmSt.data.company_name) || (sbCachedSubscription && sbCachedSubscription.companyName) || '' };
    pbObInvRender();
    pbObInvLoad();
  };
  function pbObSeatLine(I) {
    const S = I.info && I.info.seats; if (!S || I.fmOnly) return '';
    const n = (+S.people || 0) + (+S.waiting || 0);
    if (S.plan === 'trial') return '<p class="pbob-seats" id="pbObSeats">Beta: ' + escapeHtml(String(S.people)) + ' of ' + escapeHtml(String(S.limit)) + ' people' + (S.waiting ? ', plus ' + escapeHtml(String(S.waiting)) + ' link' + (S.waiting === 1 ? '' : 's') + ' waiting' : '') + '. Each link holds a spot until it’s used, cancelled or expires.</p>';
    if (S.paid == null) return '';
    const over = n >= +S.paid;
    return '<p class="pbob-seats" id="pbObSeats">Paid seats: ' + escapeHtml(String(S.paid)) + ' · people now: ' + escapeHtml(String(S.people)) + (S.waiting ? ' · links waiting: ' + escapeHtml(String(S.waiting)) : '') + '.'
      + (over ? ' The next person who joins goes above your paid seats. ' + (S.interval === 'year' ? 'That adds a catch-up charge for the rest of the year.' : 'That person is on your next invoice.') : '') + '</p>';
  }
  function pbObInvRender(msg) {
    const I = PB_OB.inv; if (!I) return;
    const tog = (r) => '<button type="button" data-role="' + r + '" aria-pressed="' + (I.role === r) + '" onclick="pbObInvRole(\'' + r + '\')">' + PB_OB_ROLES[r] + '</button>';
    const off = I.fmOnly && I.info && I.info.foreman_links === false;
    let out = '';
    if (I.made) {
      const m = I.made, url = PB_OB_APP + '#join=' + m.token;
      const body = 'Join ' + (m.company_name || 'our crew') + ' on The Pipelayer’s Bible as ' + (PB_OB_ROLES[m.role] || 'crew') + ': ' + url + ' (works once, for 24 hours)';
      I.sms = 'sms:?&body=' + encodeURIComponent(body); I.url = url; I.body = body;
      out = '<div class="pbob-item" id="pbObMade"><div class="t">' + (m.removed ? 'New-phone link for ' : 'Link for ') + escapeHtml(m.label || 'one person') + ' · ' + escapeHtml(PB_OB_ROLES[m.role]) + '</div>'
        + (m.removed ? '<div class="s">' + escapeHtml(m.removed_name || 'The old account') + '’s old account was taken out of the company and signed out. This link makes a new one.</div>' : '')
        + (m.pair_name ? '<div class="s">Goes on ' + escapeHtml(m.pair_name) + '’s crew when they join.</div>' : '')
        + '<div class="s">Works once, until ' + escapeHtml(pbObWhen(m.expires_at)) + '. Code to read out: <strong>' + escapeHtml(pbObCodeShown(m.code)) + '</strong></div>'
        + '<div class="pbob-btns"><a class="pb-btn" id="pbObTextIt" href="' + escapeHtml(I.sms) + '">Text It</a>'
        + '<div class="pbob-row2">' + (navigator.share ? '<button type="button" class="pb-btn secondary" id="pbObShare" onclick="pbObInvShare()">Share…</button>' : '') + '<button type="button" class="pb-btn secondary" id="pbObCopyLink" onclick="pbObInvCopy()">Copy Link</button></div></div>'
        + '<p class="pbob-dim" style="margin:8px 0 0;">Send it only to the person it’s for. Whoever opens it first and taps Join Crew joins.</p></div>';
    }
    const L = I.list;
    const row = (x) => {
      const nm = x.status === 'joined' ? (x.joined_name || 'Someone') : (x.label || 'No name given');
      const st = x.status === 'joined' ? 'Joined ' + pbObWhen(x.used_at) + (x.still_member === false ? ' · since removed' : '') + (x.label && x.joined_name && x.label !== x.joined_name ? ' · link was for ' + x.label : '')
        : x.status === 'waiting' ? 'Not used yet · until ' + pbObWhen(x.expires_at)
        : x.status === 'revoked' ? 'Cancelled' : 'Expired';
      const live = x.status === 'waiting';
      const extra = [x.pair_name ? 'for ' + x.pair_name + '’s crew' : (x.paired_self && !I.fmOnly ? 'for your crew' : ''), x.replaces_name ? 'new phone for ' + x.replaces_name : '', !x.mine && x.made_by ? 'by ' + x.made_by : ''].filter(Boolean).join(' · ');
      return '<div class="pbob-item ' + escapeHtml(x.status) + '" data-link="' + escapeHtml(x.id) + '"><div class="t">' + escapeHtml(nm) + ' · ' + escapeHtml(PB_OB_ROLES[x.role] || '') + '</div>'
        + '<div class="s">' + escapeHtml(st) + (live && x.code ? ' · code ' + escapeHtml(pbObCodeShown(x.code)) : '') + '</div>'
        + (extra ? '<div class="s">' + escapeHtml(extra) + '</div>' : '')
        + (x.status === 'joined' && x.still_member !== false ? '<div class="s">Not who you sent it to? ' + (I.fmOnly ? 'Tell the office to remove them.' : 'Remove them in Crew members.') + '</div>' : '')
        + (live ? '<button type="button" class="pb-btn ghost small" data-act="revoke" onclick="pbObInvRevoke(\'' + escapeHtml(x.id) + '\')">Cancel Link</button>' : '') + '</div>';
    };
    const fms = I.fmOnly ? [] : pbObForemen();
    const pairSel = !I.fmOnly && I.role === 'pipelayer' && fms.length ? '<label class="pbob-f" for="pbObPair">Put them on a foreman’s crew <span class="pbob-dim">(optional)</span></label><select id="pbObPair" onchange="pbObInvPair(this.value)"><option value="">No foreman yet</option>'
      + fms.map(f => '<option value="' + escapeHtml(f.id) + '"' + (I.pair === f.id ? ' selected' : '') + '>' + escapeHtml(f.name) + '</option>').join('') + '</select>' : '';
    const sw = !I.fmOnly && I.info ? '<label class="pbob-switch" id="pbObFmSwitch"><input type="checkbox" id="pbObFmLinks"' + (I.info.foreman_links !== false ? ' checked' : '') + ' onchange="pbObInvSetting(this.checked)"><span><strong>Foremen can add pipelayers by link</strong><br><span class="pbob-dim">Each person who joins takes a seat. Turning this off also cancels links foremen made that aren’t used yet.</span></span></label>' : '';
    pbObSheet('<h2 data-pbob-focus tabindex="-1">' + (I.fmOnly ? 'Add a Pipelayer by Text' : 'Text a Join Link') + '</h2>'
      + (off ? '<p id="pbObOff">' + escapeHtml(pbObText('pb:foreman_links_off')) + '</p>'
        : '<p class="pbob-dim">For one person. They tap it and they’re in ' + escapeHtml(I.co || 'the company') + ' with the role you pick. No email, no password. Works once, for 24 hours.' + (I.fmOnly ? ' They go on your crew.' : '') + '</p>'
        + pbObSeatLine(I)
        + '<label class="pbob-f" for="pbObInvName">Their name <span class="pbob-dim">(optional)</span></label><input type="text" id="pbObInvName" maxlength="80" autocomplete="off" enterkeyhint="done">'
        + '<p class="pbob-step" style="margin-top:12px;">Role</p><div class="pbob-toggle" role="group" aria-label="Role">' + tog('pipelayer') + (I.fmOnly ? '' : tog('foreman')) + '</div>'
        + (I.fmOnly ? '<p class="pbob-dim">Foremen add pipelayers. The office adds foremen.</p>' : '')
        + pairSel
        + '<p class="pbob-err" id="pbObErr" role="alert"' + (msg ? '' : ' hidden') + '>' + escapeHtml(msg || '') + '</p>'
        + '<div class="pbob-btns"><button type="button" class="pb-btn" id="pbObMakeBtn" onclick="pbObInvMake()">Make Join Link</button></div>')
      + out
      + sw
      + '<h3>Links from the last 7 days</h3><div class="pbob-list" id="pbObInvList">' + (L == null ? '<p class="pbob-dim">Loading…</p>' : L.length ? L.map(row).join('') : '<p class="pbob-dim">None yet.</p>') + '</div>'
      + '<div class="pbob-btns"><button type="button" class="pb-btn secondary" onclick="pbObInvLoad()">Refresh</button><button type="button" class="pb-btn ghost" id="pbObInvClose" onclick="pbObClose(); PB_OB_INV_CLOSE()">Close</button></div>', I.fmOnly ? 'Add a pipelayer by text' : 'Text a join link');
    if (I.nameDraft) { const n = document.getElementById('pbObInvName'); if (n) n.value = I.nameDraft; }
  }
  const pbObKeepName = (I) => { const n = document.getElementById('pbObInvName'); if (n) I.nameDraft = n.value; };
  window.PB_OB_INV_CLOSE = function () { PB_OB.inv = null; try { if (pbCurrentScreen === 'crewMembers' && typeof window.pbCmLoad === 'function') window.pbCmLoad(); } catch (e) {} };
  window.pbObInvRole = function (r) { const I = PB_OB.inv; if (!I || !PB_OB_ROLES[r] || (I.fmOnly && r !== 'pipelayer')) return; pbObKeepName(I); I.role = r; if (r !== 'pipelayer') I.pair = ''; pbObInvRender(); };
  window.pbObInvPair = function (v) { const I = PB_OB.inv; if (!I) return; I.pair = /^[0-9a-f-]{36}$/i.test(String(v || '')) ? String(v) : ''; };
  window.pbObInvLoad = async function () {
    const I = PB_OB.inv; if (!I) return;
    const r = await pbObRpc('pb_onboard_links', {});
    if (PB_OB.inv !== I) return;
    pbObKeepName(I);
    if (r.ok && Array.isArray(r.links)) { I.list = r.links.filter(x => x && typeof x.id === 'string'); I.info = { foreman_links: r.foreman_links !== false, seats: r.seats || null, room: r.room || null }; pbObInvRender(); }
    else { I.list = I.list || []; pbObInvRender(pbObText(r.code)); }
  };
  window.pbObInvMake = async function () {
    const I = PB_OB.inv; if (!I || PB_OB.busy) return;
    const n = document.getElementById('pbObInvName'), name = n ? pbNameClean(n.value) : '';
    PB_OB.busy = true; const b = document.getElementById('pbObMakeBtn'); if (b) { b.disabled = true; b.textContent = 'Making…'; }
    const r = await pbObRpc('pb_onboard_link_make', { p_role: I.role, p_name: name || null, p_pair_foreman: (!I.fmOnly && I.role === 'pipelayer' && I.pair) || null });
    PB_OB.busy = false; if (PB_OB.inv !== I) return;
    if (!r.ok || !r.token) { I.nameDraft = name; pbObInvRender(pbObText(r.code)); return; }
    I.made = r; I.nameDraft = ''; pbObInvRender(); pbObInvLoad();
  };
  window.pbObInvSetting = async function (on) {
    const I = PB_OB.inv; if (!I || I.fmOnly) return;
    pbObKeepName(I);
    const r = await pbObRpc('pb_onboard_settings_set', { p_foreman_links: !!on });
    if (PB_OB.inv !== I) return;
    if (!r.ok) { if (I.info) I.info.foreman_links = !on; pbObInvRender(pbObText(r.code)); return; }
    if (I.info) I.info.foreman_links = !!on; pbObInvLoad();
  };
  window.pbObInvShare = async function () { const I = PB_OB.inv; if (!I || !I.url) return; try { await navigator.share({ title: 'Join our crew', text: I.body }); } catch (e) {} };
  window.pbObInvCopy = async function () { const I = PB_OB.inv; if (!I || !I.url) return; let ok = false; try { await navigator.clipboard.writeText(I.body); ok = true; } catch (e) {} window.__pbObCopied = I.body; const b = document.getElementById('pbObCopyLink'); if (b) b.textContent = ok ? 'Copied' : 'Couldn’t copy'; };
  window.pbObInvRevoke = function (id) {
    pbConfirm('Cancel this link? Nobody can join with it after this.', async () => {
      const r = await pbObRpc('pb_onboard_link_revoke', { p_id: id });
      if (!r.ok) pbAlert(pbObText(r.code), 'Not Cancelled');
      if (PB_OB.inv && PB_OB.inv.made && r.ok && PB_OB.inv.made.id === id) PB_OB.inv.made = null;
      if (!document.getElementById('pbObSheet')) pbObInvRender();
      pbObInvLoad();
    }, 'Cancel Link', { no: 'Keep It', yes: 'Cancel Link' });
  };
  // #11 Lost phone (Crew members, a person who joined by link): take the old account out and make a new link at once
  window.pbObLostPhone = function (i) {
    const m = pbCmSt && Array.isArray(pbCmSt.rows) ? pbCmSt.rows[i] : null; if (!m || !m.user_id) return;
    const nm = pbCmName(m);
    pbConfirm(nm + ' joined by link, with no email or password. For a lost or new phone: their old account is taken out of the company and signed out, and you get a new link to text them. It sets them up again with the same role' + (m.role === 'pipelayer' ? ' and foreman' : '') + '. Work their old phone already sent stays with the company.', async () => {
      const uid = sbUser && sbUser.id; if (!uid) return;
      const r = await pbObRpc('pb_onboard_lost_phone', { p_user: m.user_id });
      if (!r.ok || !r.token) { pbAlert(pbObText(r.code), 'Nothing Changed'); return; }
      const acc = pbProdAccMem.get(uid) || {};
      PB_OB.inv = { uid, fmOnly: !acc.manager, role: r.role || 'pipelayer', pair: '', made: r, list: null, info: null, co: (pbCmSt && pbCmSt.data && pbCmSt.data.company_name) || '' };
      pbObInvRender(); pbObInvLoad();
      try { if (typeof window.pbCmLoad === 'function') window.pbCmLoad(); } catch (e) {}
    }, 'Lost Phone', { no: 'Cancel', yes: 'Remove and Make Link' });
  };

  // ---- 5. #2 Getting started, on a new company's Home (the company account) ----
  // Three steps, each checked off from real data: crew added (the server), a job added (the company's job list on this
  // phone), the crew has the app (someone on the crew has signed in on a phone). Hide This hides it for good on this
  // phone; it also goes away by itself once all three are done.
  const PB_OB_START_MS = 60000;
  const pbObStartMem = { at: 0, busy: false };
  function pbObStartData(uid) { try { const x = JSON.parse(pbObLs.get('pbObStart:' + uid) || 'null'); return x && x.d ? x : null; } catch (e) { return null; } }
  function pbObJobsCount(uid) {
    try { const D = pbCxDash(uid); if (D && D.data && Array.isArray(D.data.jobs)) return D.data.jobs.length; } catch (e) {}
    if (document.getElementById('homeCxNoJobs')) return 0;
    return null; // not known yet (no copy of the job list on this phone)
  }
  async function pbObStartFetch(uid) {
    if (pbObStartMem.busy || Date.now() - pbObStartMem.at < PB_OB_START_MS || navigator.onLine === false) return;
    pbObStartMem.busy = true; pbObStartMem.at = Date.now();
    try {
      const r = await pbObRpc('pb_onboard_start', {});
      if (r && r.ok && sbUser && sbUser.id === uid) { pbObLs.set('pbObStart:' + uid, JSON.stringify({ at: Date.now(), d: r })); pbObStartRender(); }
    } finally { pbObStartMem.busy = false; }
  }
  function pbObStartRender() {
    const el = document.getElementById('homeObStart'); if (!el) return;
    const uid = sbUser && sbUser.id, acc = uid ? pbProdAccMem.get(uid) : null;
    let on = false; try { on = !!(uid && acc && acc.manager && typeof window.pbIsCompanyHome === 'function' && window.pbIsCompanyHome(uid)); } catch (e) { on = false; }
    if (!on || pbObLs.get('pbObStartHide:' + uid)) { if (!el.hidden) { el.hidden = true; el.innerHTML = ''; } return; }
    pbObStartFetch(uid);
    const S = pbObStartData(uid), d = S && S.d, jobs = pbObJobsCount(uid);
    if (!d) { if (!el.hidden) { el.hidden = true; el.innerHTML = ''; } return; } // shown only from the server's numbers (a copy is kept for offline)
    const crew = d ? (+d.crew || 0) : null, waiting = d ? (+d.links_waiting || 0) + (+d.invites_waiting || 0) : 0, signed = d ? (+d.crew_signed_in || 0) : null;
    const done1 = crew > 0, done2 = jobs > 0, done3 = signed > 0;
    if (d && done1 && done2 && done3) { pbObLs.set('pbObStartHide:' + uid, 'done'); el.hidden = true; el.innerHTML = ''; return; }
    const li = (id, ok, title, sub, btn) => '<li class="' + (ok ? 'done' : '') + '" id="' + id + '" data-done="' + (ok ? '1' : '0') + '"><span class="ck" aria-hidden="true">' + (ok ? '✓' : '') + '</span><span class="tx"><b>' + escapeHtml(title) + '<span class="pb-sr">' + (ok ? ' (done)' : ' (to do)') + '</span></b><span>' + escapeHtml(sub) + '</span>' + (ok ? '' : btn) + '</span></li>';
    const h = '<div class="pbob-start" role="region" aria-labelledby="homeObStartH"><h2 id="homeObStartH">Getting Started</h2>'
      + '<p class="pbob-dim" style="margin:0;">Three steps to get your crew working in the app.</p><ol>'
      + li('homeObStep1', done1, 'Add your crew', done1 ? (crew + (crew === 1 ? ' person' : ' people') + ' in the company.') : waiting ? waiting + ' waiting to join. Text a join link or add by email.' : 'Text each foreman and pipelayer a join link, or add them by email.', '<button type="button" class="pb-btn small" id="homeObCrewBtn" onclick="pbOpenCrewMembers()">Add Crew</button>')
      + li('homeObStep2', done2, 'Add a job', done2 ? 'Your crews can pick it on their runs.' : 'Job number, name and what’s planned. Crews pick it on their runs.', '<button type="button" class="pb-btn small" id="homeObJobBtn" onclick="pbCxNewOpen()">New Job</button>')
      + li('homeObStep3', done3, 'Tell the crew to install the app', done3 ? 'Someone on your crew has signed in.' : 'They tap the link you text them. On iPhone, Safari’s Share button, then Add to Home Screen, keeps it one tap away. Checks off when someone on the crew signs in.', '')
      + '</ol><div class="ft"><button type="button" class="pb-btn tertiary small" id="homeObHide" onclick="pbObStartHide()">Hide This</button></div></div>';
    if (el.innerHTML !== h) el.innerHTML = h;
    el.hidden = false;
  }
  window.pbObStartRender = pbObStartRender;
  window.pbObStartHide = function () { const uid = sbUser && sbUser.id; if (!uid) return; pbObLs.set('pbObStartHide:' + uid, 'hidden'); pbObStartRender(); };
  { const o = window.pbCxRender; if (typeof o === 'function') window.pbCxRender = function () { const r = o.apply(this, arguments); try { pbObStartRender(); } catch (e) {} return r; }; }

  // ---- 6. #3 iPhone: a one-time "Put the App on Your Home Screen" card on Home ----
  // Shown in Safari on an iPhone (not the Home Screen app), signed in, until Got It. While it shows, it stands in for
  // the notifications card's iPhone line (same place, same look); Got It also rests that line for its usual 30 days.
  function pbObA2hsWant() {
    const uid = sbUser && sbUser.id;
    return !!(uid && pbObIosVer() > 0 && !pbObStandalone() && !pbObLs.get('pbObA2hs:' + uid));
  }
  function pbObA2hsHtml() {
    if (!pbObA2hsWant()) return '';
    const link = pbObIsLink(sbUser);
    return '<div class="pb-home-att info push" id="homeAttention_a2hs"><span class="t">Put the App on Your Home Screen</span>'
      + 'It opens in one tap, works without signal, and on iPhone notifications only work from there.'
      + '<ol><li>Tap <strong>Share</strong> (the square with the arrow, at the bottom of Safari).</li><li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li><li>Open the new icon. ' + (link ? 'Sign in there with a code: tap <strong>Get a Code</strong> below, then in the new app Log In › Join a Crew or Use a Code › Paste Join Code.' : 'Log in there with your email and password.') + '</li></ol>'
      + '<div class="pb-pc-act">' + (link ? '<button type="button" class="pb-btn small" id="homeA2hsCode" onclick="pbObHandoff()">Get a Code</button>' : '') + '<button type="button" class="pb-btn tertiary small" id="homeA2hsOk" onclick="pbObA2hsOk()">Got It</button></div></div>';
  }
  window.pbObA2hsOk = function () {
    const uid = sbUser && sbUser.id; if (!uid) return;
    pbObLs.set('pbObA2hs:' + uid, new Date().toISOString());
    pbObLs.set(uid + ':pushCardSnooze', new Date().toISOString()); // the notifications card's iPhone line rests 30 days too
    try { if (pbCurrentScreen === 'home' && typeof window.pbRenderHome === 'function') window.pbRenderHome(); } catch (e) {}
  };
  { const o = window.pbPushCardHtml; window.pbPushCardHtml = function () { try { const h = pbObA2hsHtml(); if (h) return h; } catch (e) {} return typeof o === 'function' ? o.apply(this, arguments) : ''; }; }

  // ---- 7. where these show ----
  // a link that opened the app: once start-up has settled (signed in or not). Only the peek runs; nothing is used.
  if (pbJoinFromUrl) {
    let tries = 0; const t = setInterval(() => {
      tries++;
      const cover = document.getElementById('pbBootCover'), settled = !pbLoginInProgress && (!cover || cover.style.display === 'none' || getComputedStyle(cover).display === 'none');
      if ((settled && pbCurrentScreen) || tries > 60) { clearInterval(t); window.pbObStartJoin({ token: pbJoinFromUrl }); }
    }, 300);
  }
  // a foreman's way in (the office has it on Crew members): Settings, under the account
  function pbObFmRow() {
    try {
      let w = document.getElementById('settingsJoinLinkWrap');
      const anchor = document.getElementById('settingsCrewInvite'); if (!anchor) return;
      if (!w) { w = document.createElement('div'); w.id = 'settingsJoinLinkWrap'; w.className = 'pb-section'; w.hidden = true;
        w.innerHTML = '<div class="pb-tag">Your crew</div><div class="pb-tools-group"><button type="button" class="pb-edu-row pb-tool-row" id="settingsJoinLinkBtn" data-ic="people" onclick="pbObOpenInvite()"><span class="pb-tool-ic" aria-hidden="true"></span><span class="tx"><span class="name">Add a Pipelayer by Text</span><span class="sub">Text a join link. They tap it, they’re in, on your crew.</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button></div>';
        anchor.insertAdjacentElement('afterend', w); }
      const uid = sbUser && sbUser.id, acc = uid ? pbProdAccMem.get(uid) : null;
      w.hidden = !(acc && acc.member && acc.role === 'foreman' && !acc.manager);
    } catch (e) {}
  }
  // a no-email account: a code for the Home Screen app (Notifications, where the iPhone steps are) and in Settings
  function pbObHandoffRow() {
    try {
      const show = !!(sbUser && pbObIsLink(sbUser));
      [['notifIosSteps', 'notifHandoffBtn', 'beforebegin'], ['settingsLoginHelp', 'settingsHandoffBtn', 'afterend']].forEach(([a, id, where]) => {
        const anchor = document.getElementById(a); if (!anchor) return;
        let b = document.getElementById(id);
        if (!b) { b = document.createElement('button'); b.type = 'button'; b.id = id; b.className = 'pb-btn secondary'; b.textContent = 'Get a Code for the Home Screen App'; b.onclick = () => window.pbObHandoff(); b.style.margin = '8px 0'; anchor.insertAdjacentElement(where, b); }
        b.hidden = !show;
      });
    } catch (e) {}
  }
  window.pbScreenHooks.push((name) => { if (name === 'settings') { pbObFmRow(); pbObHandoffRow(); } if (name === 'notifications') pbObHandoffRow(); if (name === 'home') setTimeout(() => { try { pbObStartRender(); } catch (e) {} }, 0); });
  window.pbAccountLoadHooks.push(() => { setTimeout(() => { pbObFmRow(); pbObHandoffRow(); pbObStartRender(); }, 0); if (PB_OB.inv && (!sbUser || PB_OB.inv.uid !== sbUser.id)) window.pbObClose(); });
  // Log Out on a no-email account: say first what it means
  { const o = window.pbLogout; let ok = false;
    if (typeof o === 'function') window.pbLogout = function () {
      if (ok || !sbUser || !pbObIsLink(sbUser)) return o.apply(this, arguments);
      const a = arguments, self = this;
      pbShowModal('This account has no email or password. After logging out, the only ways back in are a code made on another screen where you’re still signed in (Settings › Get a Code), or a new link from the office.', [{ label: 'Stay Logged In', primary: true }, { label: 'Log Out', onClick: () => { ok = true; try { o.apply(self, a); } finally { setTimeout(() => { ok = false; }, 0); } } }], 'No Email or Password');
    }; }
  window.__debugOb = () => PB_OB;
  window.__pbObStartAgain = () => { pbObStartMem.at = 0; }; /* for the rig: skip the 60 s wait between getting-started reads */
  window.__pbObMe = () => sbUser ? { id: sbUser.id, email: sbUser.email || '', link: pbObIsLink(sbUser), acc: pbProdAccMem.get(sbUser.id) || null } : null; /* for the rig */
  // ================= end onboard2 =================
