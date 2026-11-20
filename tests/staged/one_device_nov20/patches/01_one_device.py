#!/usr/bin/env python3
# One device per login, the app's part (staged Nov 20 2026, on r17.11): python3 01_one_device.py in.html out.html
#  - check-in (pb_device_seen): device id, kind, the photo stamp's last GPS fix if there is one
#  - this phone's session was ended by another device: sign out here and say it once (records and unsent work stay)
#  - this sign-in was refused because the login is in use on another device: say so, sign out here
#  - Get a Code (Home Screen app): says this page is signed out by it; names unsent work first
#  - quiet "used on two phones" notes: Crew members (company account) and Beta Accounts (app owner)
# Everything is silent when the server part isn't installed (a missing function is "no answer").
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:90])
    s = s.replace(a, b)

# ---- 1. the module (same script as the sign-in code; before the Home Screen code section) ----
MODULE = r"""  // ---- one device per login (Nov 20) ----
  // The server ends a login's other sessions when it signs in somewhere new (and refuses their requests at once).
  // Here: (1) the check-in, (2) when this phone's session was ended by another device, sign out here and say so once.
  // Records and unsent work stay on the phone under their account, as after any sign-out, and send after the next sign-in.
  const PB_1D = { busy: false, at: 0, t: null, asking: false, dev: null };
  const PB_1D_MSG = {
    other_device: 'Your account was signed in on another phone, so this phone was signed out. Your saved work is kept and will send when you sign in again.',
    moved: 'Your account is now signed in in the Home Screen app, so this page was signed out. Open the app from its icon. Your saved work is kept.',
    in_use: 'This account is in use on another phone right now. Sign out there first, or try again in 15 minutes.' // this sign-in was refused; the other phone is untouched
  };
  function pb1dDevice() {
    let d = PB_1D.dev || pbObLs.get('pbDeviceId');
    if (!d || !/^[A-Za-z0-9_-]{8,64}$/.test(d)) {
      try { const a = new Uint8Array(12); crypto.getRandomValues(a); d = 'd' + Array.from(a, (x) => ('0' + x.toString(16)).slice(-2)).join(''); } catch (e) { d = 'd' + Date.now().toString(16) + Math.random().toString(16).slice(2, 12); }
      pbObLs.set('pbDeviceId', d);
    }
    PB_1D.dev = d; return d;
  }
  function pb1dKind() {
    const ua = navigator.userAgent || '';
    if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'tablet';
    return /iPhone|iPod|Android|Mobile/i.test(ua) ? 'phone' : 'computer';
  }
  function pb1dSid(session) {
    try { const p = JSON.parse(atob(String(session.access_token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return /^[0-9a-f-]{36}$/.test(p.session_id || '') ? p.session_id : null; } catch (e) { return null; }
  }
  function pb1dNote(session) { try { const sid = pb1dSid(session); if (sid && session.user) pbObLs.set('pb1dLast', JSON.stringify({ sid, uid: session.user.id })); } catch (e) {} }
  const pb1dRace = (p, ms) => Promise.race([Promise.resolve(p).catch((e) => ({ data: null, error: { message: String((e && e.message) || e) } })), new Promise((res) => setTimeout(() => res({ data: null, error: { message: 'timeout' } }), ms))]);
  const pb1dQuiet = () => { try { return typeof pbAuthBackgroundOk === 'function' && !pbAuthBackgroundOk(); } catch (e) { return false; } }; // the anonymous-report quiet rule
  function pb1dSoon(ms, force) { clearTimeout(PB_1D.t); PB_1D.t = setTimeout(() => { if (sbUser) pb1dSeen(force); else pb1dWhy(); }, ms); }
  function pb1dTell(reason, sid, uid) { // once per ended session
    if (!PB_1D_MSG[reason]) return;
    const key = sid || ('u:' + uid); if (pbObLs.get('pb1dTold') === key) return; pbObLs.set('pb1dTold', key);
    let msg = PB_1D_MSG[reason];
    try { if (reason === 'other_device' && uid && typeof pbOpenPermitOf === 'function' && pbOpenPermitOf(uid)) msg += ' A confined space permit is open on this phone. Sign in again now so it keeps backing up and your company keeps seeing it.'; } catch (e) {}
    pbAlert(msg, reason === 'in_use' ? 'Account In Use' : 'Signed Out');
  }
  async function pb1dEnded(reason, sid, uid) { // the server says this session is over
    if (reason !== 'other_device' && reason !== 'moved' && reason !== 'ended' && reason !== 'in_use') return;
    pb1dTell(reason, sid, uid);
    pbObLs.set('pb1dLast', '');
    try { if (sbUser && sbUser.id === uid) await sbClient.auth.signOut({ scope: 'local' }); } catch (e) {} // this phone only; the app's own SIGNED_OUT handling follows
    if (reason === 'in_use' && sid) { try { await pb1dRace(sbClient.rpc('pb_session_why', { p_session: sid }), 15000); } catch (e) {} } // the refused sign-in is removed on the server
  }
  async function pb1dSeen(force) {
    if (!sbClient || typeof sbClient.rpc !== 'function' || !sbUser || navigator.onLine === false || PB_1D.busy) return;
    if (!force && Date.now() - PB_1D.at < 5 * 60000) return;
    if (pb1dQuiet()) { pb1dSoon(60000, force); return; }
    PB_1D.busy = true; const uid = sbUser.id;
    try {
      let ss = null; try { const g = await sbClient.auth.getSession(); ss = g && g.data && g.data.session; } catch (e) {}
      if (!ss || !ss.user || ss.user.id !== uid) return;
      const sid = pb1dSid(ss); pb1dNote(ss);
      let fix = null; try { const f = window.pbCam && window.pbCam._g && window.pbCam._g.fix; if (f && isFinite(f.lat) && isFinite(f.lng) && Date.now() - f.at < 3600000) fix = f; } catch (e) {} // only a fix the photo stamp already has; never asked for here
      const r = await pb1dRace(sbClient.rpc('pb_device_seen', { p_device: pb1dDevice(), p_kind: pb1dKind(), p_lat: fix ? fix.lat : null, p_lng: fix ? fix.lng : null, p_fix_at: fix ? new Date(fix.at).toISOString() : null, p_build: String(window.PB_APP_BUILD || '').slice(0, 60) }), 15000);
      PB_1D.at = Date.now();
      const e = r && r.error;
      if (e && /pb:signed_out/.test(String(e.message || '')) && e.details && sbUser && sbUser.id === uid) await pb1dEnded(String(e.details), sid, uid);
    } finally { PB_1D.busy = false; }
  }
  async function pb1dWhy() { // signed out here without a tap (a refresh was refused): ask why, once
    if (!sbClient || typeof sbClient.rpc !== 'function' || sbUser || navigator.onLine === false || PB_1D.asking) return;
    let last = null; try { last = JSON.parse(pbObLs.get('pb1dLast') || 'null'); } catch (e) {}
    if (!last || !last.sid) return;
    if (pb1dQuiet()) { pb1dSoon(60000); return; }
    PB_1D.asking = true;
    try {
      const r = await pb1dRace(sbClient.rpc('pb_session_why', { p_session: last.sid }), 15000), e = r && r.error;
      if (e && /pb:signed_out/.test(String(e.message || '')) && e.details) { pb1dTell(String(e.details), last.sid, last.uid); pbObLs.set('pb1dLast', ''); try { await sbClient.auth.signOut({ scope: 'local' }); } catch (x) {} }
      else if (r && !e && r.data && r.data.ok) { pbObLs.set('pb1dLast', ''); if (r.data.reason) pb1dTell(String(r.data.reason), last.sid, last.uid); }
      else if (r && !e) pbObLs.set('pb1dLast', ''); // the server has no such function (not installed): nothing to ask
      else if (e && /PGRST202|could not find the function/i.test(String(e.code || '') + ' ' + String(e.message || ''))) pbObLs.set('pb1dLast', '');
    } finally { PB_1D.asking = false; }
  }
  window.pb1dSeen = pb1dSeen; window.pb1dWhy = pb1dWhy;
  if (sbClient) {
    try { sbClient.auth.onAuthStateChange((event, session) => { // (nothing is awaited inside the callback)
      if (session && session.user) { pb1dNote(session); if (event === 'SIGNED_IN') pb1dSoon(300, true); } // at once: a sign-in refused because the login is in use is said right away
      else if (event === 'SIGNED_OUT') pb1dSoon(1500);
    }); } catch (e) {}
    setTimeout(() => { if (sbUser) pb1dSeen(false); else pb1dWhy(); }, 6000);
    window.addEventListener('online', () => pb1dSoon(2500, true));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pb1dSoon(1500, false); });
    setInterval(() => { if (document.visibilityState === 'visible' && sbUser) pb1dSeen(false); }, 5 * 60000);
    window.pbScreenHooks.push((name) => { if (name === 'home' && sbUser) pb1dSeen(false); else if (name === 'login' && !sbUser) pb1dWhy(); });
  }
  // Get a Code: signing in with it in the Home Screen app signs this page out, so unsent work is named first.
  window.pb1dMoveWarn = async function (id) {
    try { const uid = sbUser && sbUser.id; if (!uid || typeof pbUnsentSentence !== 'function') return; const t = await (window.__pb1dUnsent || pbUnsentSentence)(uid); /* (the rig can stand in for the sentence) */ const e = document.getElementById(id); if (t && e) { e.textContent = 'Let this send before you switch. ' + t; e.hidden = false; } } catch (e) {}
  };
  // The quiet notes: one login used in two places. Words are made here so the time is the reader's own.
  function pb1dNoteText(n) {
    const who = String(n.who || 'A login'), co = /^The company account$/i.test(who), name = co ? 'The company login' : escapeHtml(who) + '’s login';
    const k = [n.a, n.b].map((x) => (x === 'computer' || x === 'tablet') ? x : 'phone');
    const devs = k[0] === k[1] ? 'two ' + k[0] + 's' : 'a ' + k[0] + ' and a ' + k[1];
    const d = new Date(n.at), ok = isFinite(d.getTime());
    let day = '', time = ''; try { day = ok ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''; time = ok ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''; } catch (e) {}
    const at = time ? ' at ' + time + (day ? ' on ' + day : '') : '';
    if (n.kind === 'far_apart') return name + ' was used on ' + devs + ' ' + (Number(n.miles) || 0) + ' miles apart' + at + '.';
    if (n.kind === 'back_and_forth') return name + ' went back and forth between ' + devs + ' ' + (Number(n.n) || 2) + ' times' + (day ? ' on ' + day : '') + '.';
    const m = Number(n.minutes) || 0;
    return name + ' was used on ' + devs + ' ' + (m <= 1 ? 'a minute' : m + ' minutes') + ' apart' + at + '.';
  }
  window.pb1dNoteText = pb1dNoteText;
  window.pb1dOwnerHtml = function (r) { // Beta Accounts
    const L = r && !r.error && r.data && r.data.ok && Array.isArray(r.data.notes) ? r.data.notes : [];
    return L.length ? '<div class="pb-own-co" id="pbOwnShare"><div class="nm">Logins used in two places</div>' + L.slice(0, 20).map((n) => '<div class="ln">' + pb1dNoteText(n) + (n.company ? ' (' + escapeHtml(n.company) + ')' : '') + '</div>').join('') + '</div>' : '';
  };
  async function pb1dCrewNotes() { // Crew members (company account)
    const box = document.getElementById('crShare'); if (!box) return;
    if (!sbClient || !sbUser || navigator.onLine === false) return;
    const uid = sbUser.id, r = await pb1dRace(sbClient.rpc('pb_share_notes'), 20000);
    if (!sbUser || sbUser.id !== uid || pbCurrentScreen !== 'crewMembers') return;
    const L = r && !r.error && r.data && r.data.ok && Array.isArray(r.data.notes) ? r.data.notes : [];
    if (!L.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.innerHTML = L.slice(0, 5).map((n) => '<p style="margin:0 0 4px;">' + pb1dNoteText(n) + '</p>').join('') + '<p style="margin:0;">Each person needs their own login.</p>';
    box.hidden = false;
  }
  window.pbScreenHooks.push((name) => { const box = document.getElementById('crShare'); if (name === 'crewMembers') pb1dCrewNotes(); else if (box && !box.hidden && name !== 'crewMembers') { box.hidden = true; box.innerHTML = ''; } });

"""
A = "  // ---- 3. a code for this account's other screen (the iPhone Home Screen app): made by the person, 15 minutes ----\n"
rep(A, MODULE + A)

# ---- 2. Get a Code: the page is signed out by it ----
rep("It works once, for 15 minutes. Don’t send it to anyone: it signs in to your account.</p>'\n      + '<div class=\"pbob-code\" id=\"pbObHandoffCode\">' + escapeHtml(pbObCodeShown(r.code)) + '</div>'",
    "It works once, for 15 minutes. Don’t send it to anyone: it signs in to your account. This page is signed out when you sign in there.</p><p class=\"pbob-err\" id=\"pb1dUnsentA\" role=\"status\" hidden></p>'\n      + '<div class=\"pbob-code\" id=\"pbObHandoffCode\">' + escapeHtml(pbObCodeShown(r.code)) + '</div>'")
rep("<button type=\"button\" class=\"pb-btn ghost\" onclick=\"pbObClose()\">Done</button></div>', 'Code for the Home Screen app');\n",
    "<button type=\"button\" class=\"pb-btn ghost\" onclick=\"pbObClose()\">Done</button></div>', 'Code for the Home Screen app');\n    window.pb1dMoveWarn('pb1dUnsentA');\n")
rep("Works once, for 15 minutes. Don’t send it to anyone: it signs in to your account.</p>';\n",
    "Works once, for 15 minutes. Don’t send it to anyone: it signs in to your account. This Safari page is signed out when you sign in there.</p><p class=\"pbob-err\" id=\"pb1dUnsentB\" role=\"status\" hidden></p>';\n    window.pb1dMoveWarn('pb1dUnsentB');\n")

# ---- 3. Crew members: the quiet note ----
rep('      <p id="crStatus" class="pbc-status" role="status" aria-live="polite"></p>\n',
    '      <p id="crStatus" class="pbc-status" role="status" aria-live="polite"></p>\n      <div id="crShare" class="pbc-dim" role="note" hidden style="margin:0 0 12px;padding:10px 12px;border:1px solid var(--pb-divider,#bbb);border-radius:10px;overflow-wrap:anywhere;"></div><!-- one device: a login used in two places -->\n')

# ---- 4. Beta Accounts (app owner): the same notes for every company ----
rep("        let bl = null; try { bl = await sbClient.rpc('pb_owner_billing'); } catch (e) {} /* billing Phase 0 */\n",
    "        let bl = null; try { bl = await sbClient.rpc('pb_owner_billing'); } catch (e) {} /* billing Phase 0 */\n        let sh = null; try { sh = await sbClient.rpc('pb_owner_share_notes'); } catch (e) {} /* one device: logins used in two places */\n")
rep("        list.innerHTML = reqHtml + pbBillDue(B) + tot + (cos.length ? cos.map((c) => {",
    "        list.innerHTML = (typeof window.pb1dOwnerHtml === 'function' ? window.pb1dOwnerHtml(sh) : '') + reqHtml + pbBillDue(B) + tot + (cos.length ? cos.map((c) => {")
open(dst, 'w', encoding='utf-8').write(s)
print('ok', len(s))
