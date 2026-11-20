#!/usr/bin/env python3
# One device IN USE per login, two signed in (version 3, staged Nov 20 2026, on r17.11): python3 01_one_device.py in.html out.html
# Matches sql/01_one_device.sql (Tommy's final rule):
#  - check-in (pb_device_seen) every ~90 s while the app is on screen, on opening, on resume and when signal comes back
#  - "In use on your other device" lock screen with a live countdown; unlocks by itself (no sign-in); queued work is kept
#    (the gate answers pb:signed_out, which every queue already treats as "nothing filed, try later") and is sent the
#    moment this device becomes the one in use (the queues are woken)
#  - not shown with no signal (keep working on the phone) and never over a confined space permit open on this device
#    (a slim note instead)
#  - a new sign-in refused while the login is in use: "Try again in 5 minutes"
#  - "already signed in on two devices": sign one of them out and take its place (pb_session_take_slot), or Cancel
#  - signed out by another device / by the Home Screen app: said once; records and unsent work stay
#  - Get a Code (Home Screen app): says the page is signed out by it; names unsent work first
#  - Log Out signs out THIS device only (the other signed-in device stays signed in and is free to use at once)
# Nothing about sharing is shown to users or company accounts. Silent when the server part isn't installed.
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:90])
    s = s.replace(a, b)

MODULE = r"""  // ---- one device in use per login (Nov 20, v3; server: sql/01_one_device.sql) ----
  // A login stays signed in on up to 2 devices; one of them is in use at a time (checked in within 5 minutes, or holding
  // an open confined space permit). The other shows a lock screen and unlocks by itself once that one has been idle.
  const PB_1D = { busy: false, at: 0, t: null, asking: false, dev: null, lock: null, tick: null, waking: false, full: null, relock: null };
  const PB_1D_EVERY = 90000; // the check-in while on screen (the server counts a device idle after 5 minutes)
  const PB_1D_MSG = {
    other_device: 'Your account was signed in on another device, so this one was signed out. Your saved work is kept and will send when you sign in again.',
    moved: 'Your account is now signed in in the Home Screen app, so this page was signed out. Open the app from its icon. Your saved work is kept.',
    in_use: 'This account is in use on another device right now. Try again in 5 minutes.', // a new sign-in refused; the other device is untouched
    full: 'This account is already signed in on two devices. Log out on one of them, then sign in here.'
  };
  const pb1dK = (k) => (k === 'tablet' || k === 'computer') ? k : 'phone';
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
  const pb1dMissing = (e) => !!e && /PGRST202|could not find the function/i.test(String(e.code || '') + ' ' + String(e.message || ''));
  function pb1dSoon(ms, force) { clearTimeout(PB_1D.t); PB_1D.t = setTimeout(() => { if (sbUser) pb1dSeen(force); else pb1dWhy(); }, ms); }
  function pb1dTell(reason, sid, uid) { // once per ended session
    if (!PB_1D_MSG[reason]) return;
    const key = sid || ('u:' + uid); if (pbObLs.get('pb1dTold') === key) return; pbObLs.set('pb1dTold', key);
    let msg = PB_1D_MSG[reason];
    try { if (reason === 'other_device' && uid && typeof pbOpenPermitOf === 'function' && pbOpenPermitOf(uid)) msg += ' A confined space permit is open on this device. Sign in again now so it keeps backing up and your company keeps seeing it.'; } catch (e) {}
    pbAlert(msg, reason === 'in_use' ? 'Account In Use' : reason === 'full' ? 'Signed In on Two Devices' : 'Signed Out');
  }
  async function pb1dEnded(reason, sid, uid) { // the server says this session is over
    if (reason !== 'other_device' && reason !== 'moved' && reason !== 'ended' && reason !== 'in_use' && reason !== 'full') return;
    pb1dUnlock(false); pb1dTell(reason, sid, uid);
    pbObLs.set('pb1dLast', '');
    try { if (sbUser && sbUser.id === uid) await sbClient.auth.signOut({ scope: 'local' }); } catch (e) {} // this device only; the app's own SIGNED_OUT handling follows
    if ((reason === 'in_use' || reason === 'full') && sid) { try { await pb1dRace(sbClient.rpc('pb_session_why', { p_session: sid }), 15000); } catch (e) {} } // the refused sign-in is removed on the server
  }
  async function pb1dRefused(sid, uid) { // a refused sign-in while the server's gate is not on yet (no reason given): ask why
    let reason = null;
    try { const r = await pb1dRace(sbClient.rpc('pb_session_why', { p_session: sid }), 15000); reason = r && !r.error && r.data && r.data.reason; } catch (e) {}
    await pb1dEnded(reason === 'full' ? 'full' : 'in_use', null, uid);
  }

  // -- the lock screen (this device is signed in; the other one is in use) --
  function pb1dLock(other, waitS, permit) {
    const w = Math.max(0, Math.min(600, Math.round(Number(waitS) || 0)));
    PB_1D.lock = { other: pb1dK(other), until: Date.now() + w * 1000, permit: !!permit, uid: sbUser && sbUser.id };
    pb1dShow();
  }
  function pb1dUnlock(wake) {
    const was = !!PB_1D.lock; PB_1D.lock = null; pb1dShow();
    if (was && wake) { // this device is the one in use now: wake every queue at once (they all listen for 'online')
      PB_1D.waking = true; try { window.dispatchEvent(new Event('online')); } catch (e) {} PB_1D.waking = false;
    }
  }
  const pb1dClock = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); };
  function pb1dLockText(L) {
    return L.permit ? 'In use on your other device (' + L.other + '): a confined space permit is open there. You can use this one when that permit is closed.'
      : 'In use on your other device (' + L.other + '). You can use this one when that one has been idle for 5 minutes.';
  }
  function pb1dShow() {
    const L = PB_1D.lock;
    let cover = document.getElementById('pb1dLock'), bar = document.getElementById('pb1dBar');
    let localPermit = false; try { localPermit = !!(L && typeof pbOpenPermitOf === 'function' && pbOpenPermitOf(L.uid)); } catch (e) {}
    const showCover = !!L && navigator.onLine !== false && !!sbUser && sbUser.id === L.uid && !localPermit; // no signal: keep working on the phone
    const showBar = !!L && navigator.onLine !== false && !!sbUser && sbUser.id === L.uid && localPermit;   // never over a live permit on this device
    if (showCover && !cover) {
      cover = document.createElement('div'); cover.id = 'pb1dLock'; cover.setAttribute('role', 'alertdialog'); cover.setAttribute('aria-modal', 'true'); cover.setAttribute('aria-labelledby', 'pb1dLockH');
      cover.style.cssText = 'position:fixed;inset:0;z-index:49;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:max(16px,env(safe-area-inset-top,0px)) 16px max(16px,env(safe-area-inset-bottom,0px));background:var(--pb-canvas,#F4F5F7);color:var(--pb-text,#14171C);box-sizing:border-box;';
      cover.innerHTML = '<div style="width:100%;max-width:420px;text-align:center;overflow-wrap:anywhere;">'
        + '<h2 id="pb1dLockH" style="margin:0 0 12px;font-size:22px;">In Use on Your Other Device</h2>'
        + '<p id="pb1dLockMsg" style="margin:0 0 12px;font-size:17px;line-height:1.45;"></p>'
        + '<p id="pb1dLockCd" role="timer" aria-live="off" style="margin:0 0 12px;font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;"></p>'
        + '<p style="margin:0 0 18px;font-size:15px;line-height:1.4;opacity:.8;">Your saved work stays on this device and sends once you use it here.</p>'
        + '<button type="button" class="pb-btn" id="pb1dTry" style="width:100%;min-height:52px;margin:0 0 10px;">Try Now</button>'
        + '<button type="button" class="pb-btn ghost" id="pb1dOut" style="width:100%;min-height:48px;margin:0 0 18px;">Log Out</button>'
        + '<a href="tel:911" style="display:inline-block;min-height:44px;line-height:44px;color:#C62828;font-weight:700;text-decoration:none;">Emergency: Call 911</a></div>';
      document.body.appendChild(cover);
      cover.querySelector('#pb1dTry').addEventListener('click', () => { const b = cover.querySelector('#pb1dTry'); b.disabled = true; b.textContent = 'Checking…'; pb1dSeen(true).finally(() => { b.disabled = false; b.textContent = 'Try Now'; }); });
      cover.querySelector('#pb1dOut').addEventListener('click', () => { if (typeof window.pbLogout === 'function') window.pbLogout(); }); // its questions show above this screen
    }
    if (!showCover && cover) cover.remove();
    if (showBar && !bar) {
      bar = document.createElement('div'); bar.id = 'pb1dBar'; bar.setAttribute('role', 'status');
      bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:49;padding:calc(8px + env(safe-area-inset-top,0px)) 16px 8px;background:#5D4037;color:#fff;font:600 14px/1.35 system-ui,-apple-system,sans-serif;text-align:center;overflow-wrap:anywhere;';
      document.body.appendChild(bar);
    }
    if (!showBar && bar) bar.remove();
    clearInterval(PB_1D.tick); PB_1D.tick = null;
    if (!showCover && !showBar) return;
    const paint = () => {
      const M = PB_1D.lock; if (!M) return;
      const left = M.until - Date.now();
      if (showBar) { bar.textContent = pb1dLockText(M) + ' This permit keeps working here; it backs up to your company once this device is the one in use.'; }
      else {
        const msg = document.getElementById('pb1dLockMsg'), cd = document.getElementById('pb1dLockCd');
        if (msg) msg.textContent = pb1dLockText(M);
        if (cd) cd.textContent = M.permit ? '' : left > 0 ? 'Unlocks by itself in ' + pb1dClock(left) : 'Checking…';
      }
      if (!M.permit && left <= 0 && !PB_1D.busy && Date.now() - PB_1D.at > 4000) pb1dSeen(true); // its time is up: check now (it unlocks if the other one stayed idle)
    };
    paint(); PB_1D.tick = setInterval(paint, 1000);
  }

  // -- "already signed in on two devices": sign one out and take its place --
  function pb1dFull(hint, sid, uid) {
    if (PB_1D.full === sid) return; // already asking
    PB_1D.full = sid; pb1dUnlock(false);
    const L = String(hint || '').split(',').map((x) => { const p = x.split('|'); return { kind: pb1dK(p[0]), at: Number(p[1]) * 1000 }; }).filter((x) => isFinite(x.at) && x.at > 0).slice(0, 2);
    const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return !isFinite(m) || m < 0 ? '' : m < 2 ? 'used just now' : m < 120 ? 'used ' + m + ' min ago' : m < 2880 ? 'used ' + Math.round(m / 60) + ' h ago' : 'used ' + Math.round(m / 1440) + ' days ago'; };
    const cap = (k) => k.charAt(0).toUpperCase() + k.slice(1);
    const same = L.length === 2 && L[0].kind === L[1].kind;
    const names = L.length === 2 ? L.map((x, i) => (same ? (i === 0 ? cap(x.kind) + ' Used Last' : 'Other ' + cap(x.kind)) : cap(x.kind)) + (ago(x.at) ? ' (' + ago(x.at) + ')' : ''))
      : ['One Used Last', 'Other One'];
    const btns = names.map((n, i) => ({ label: 'Sign Out the ' + n, primary: i === 0, onClick: () => pb1dTake(sid, uid, i + 1) }));
    btns.push({ label: 'Cancel', onClick: () => { PB_1D.full = null; pb1dEnded('ended', null, uid).then(() => { try { pbRawFetch1d('pb_session_why', { p_session: sid }); } catch (e) {} }); } });
    pbShowModal('This account is already signed in on two devices. To use it here, sign one of them out. Its saved work stays on it and sends when it signs in again.', btns, 'Signed In on Two Devices',
      () => { PB_1D.full = null; pb1dSoon(2000, true); }); // replaced by another message before an answer: asked again
  }
  async function pbRawFetch1d(fn, args) { // with the app's own key only (a refused sign-in's own token is refused by the server)
    const url = (typeof SUPABASE_URL === 'string' ? SUPABASE_URL : sbClient.supabaseUrl), key = (typeof SUPABASE_PUBLISHABLE_KEY === 'string' ? SUPABASE_PUBLISHABLE_KEY : sbClient.supabaseKey);
    const f = (typeof pbRawFetch === 'function' ? pbRawFetch : fetch);
    return pb1dRace(f(url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key }, body: JSON.stringify(args), credentials: 'omit', cache: 'no-store' })
      .then((r) => r.json().catch(() => null).then((d) => r.ok ? { data: d, error: null } : { data: null, error: d || { message: 'HTTP ' + r.status } })), 15000);
  }
  async function pb1dTake(sid, uid, pick) {
    const r = await pbRawFetch1d('pb_session_take_slot', { p_session: sid, p_pick: pick });
    PB_1D.full = null;
    if (!sbUser || sbUser.id !== uid) return;
    const d = r && !r.error ? r.data : null;
    if (d && d.ok) { pbObLs.set('pb1dLast', ''); setTimeout(() => location.reload(), 50); return; } // a normal sign-in now: start clean
    if (d && d.code === 'pb:in_use') { await pb1dEnded('in_use', sid, uid); return; }
    if (d && d.code === 'pb:not_found') { await pb1dEnded('ended', null, uid); pbAlert('That took too long. Sign in again.', 'Sign In Again'); return; }
    pbShowModal('No answer from the server. Check the signal and try again.', [{ label: 'Try Again', primary: true, onClick: () => pb1dTake(sid, uid, pick) }, { label: 'Cancel', onClick: () => pb1dEnded('ended', null, uid) }], 'Not Signed In Yet');
  }

  // -- the check-in --
  async function pb1dSeen(force) {
    if (!sbClient || typeof sbClient.rpc !== 'function' || !sbUser || PB_1D.busy) return;
    if (navigator.onLine === false) { pb1dShow(); return; } // no signal: the lock is not shown; work goes on and waits on the phone
    if (!force && Date.now() - PB_1D.at < PB_1D_EVERY - 10000) return;
    if (pb1dQuiet()) { pb1dSoon(60000, force); return; }
    PB_1D.busy = true; const uid = sbUser.id;
    try {
      let ss = null; try { const g = await sbClient.auth.getSession(); ss = g && g.data && g.data.session; } catch (e) {}
      if (!ss || !ss.user || ss.user.id !== uid) return;
      const sid = pb1dSid(ss); pb1dNote(ss);
      let fix = null; try { const f = window.pbCam && window.pbCam._g && window.pbCam._g.fix; if (f && isFinite(f.lat) && isFinite(f.lng) && Date.now() - f.at < 3600000) fix = f; } catch (e) {} // only a fix the photo stamp already has; never asked for here
      const r = await pb1dRace(sbClient.rpc('pb_device_seen', { p_device: pb1dDevice(), p_kind: pb1dKind(), p_lat: fix ? fix.lat : null, p_lng: fix ? fix.lng : null, p_fix_at: fix ? new Date(fix.at).toISOString() : null, p_build: String(window.PB_APP_BUILD || '').slice(0, 60) }), 15000);
      PB_1D.at = Date.now();
      if (!sbUser || sbUser.id !== uid) return;
      const e = r && r.error, d = r && !e ? r.data : null;
      if (d && d.state === 'locked') pb1dLock(d.other, d.wait_s, d.permit);
      else if (e && /pb:signed_out/.test(String(e.message || ''))) {
        const why = String(e.details || '');
        if (why === 'locked') { const h = String(e.hint || '').split('|'); pb1dLock(h[0], h[1], h[2] === '1'); }
        else if (why === 'full') pb1dFull(e.hint, sid, uid);
        else if (why) await pb1dEnded(why, sid, uid);
        else if (sid) await pb1dRefused(sid, uid);
      }
      else if (!e || pb1dMissing(e)) pb1dUnlock(true); // in use here (or the server part isn't installed: nothing changes)
      // no answer: left as it was; tried again on the next check-in
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
      else if (r && !e && r.data && r.data.ok) { pbObLs.set('pb1dLast', ''); if (r.data.reason === 'other_device' || r.data.reason === 'moved') pb1dTell(String(r.data.reason), last.sid, last.uid); }
      else if (r && !e) pbObLs.set('pb1dLast', ''); // the server has no such function (not installed): nothing to ask
      else if (pb1dMissing(e)) pbObLs.set('pb1dLast', '');
    } finally { PB_1D.asking = false; }
  }
  window.pb1dSeen = pb1dSeen; window.pb1dWhy = pb1dWhy; window.__pb1d = PB_1D; /* (the rig reads the state) */
  if (sbClient) {
    try { sbClient.auth.onAuthStateChange((event, session) => { // (nothing is awaited inside the callback)
      if (session && session.user) { pb1dNote(session); if (event === 'SIGNED_IN') pb1dSoon(300, true); } // at once: a refused sign-in is said right away
      else if (event === 'SIGNED_OUT') { PB_1D.lock = null; PB_1D.full = null; pb1dShow(); pb1dSoon(1500); }
    }); } catch (e) {}
    setTimeout(() => { if (sbUser) pb1dSeen(false); else pb1dWhy(); }, 6000);
    window.addEventListener('online', () => { if (!PB_1D.waking) { pb1dShow(); pb1dSoon(2500, true); } });
    window.addEventListener('offline', () => pb1dShow());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pb1dSoon(1000, true); });
    window.addEventListener('pageshow', (ev) => { if (ev.persisted) pb1dSoon(1000, true); });
    setInterval(() => { if (document.visibilityState === 'visible' && sbUser) pb1dSeen(false); }, 15000); // (each tick checks in at most every ~90 s)
    window.pbScreenHooks.push((name) => { if (sbUser) { pb1dSeen(false); if (PB_1D.lock) pb1dShow(); } else if (name === 'login') pb1dWhy(); });
  }
  // Get a Code: signing in with it in the Home Screen app signs this page out, so unsent work is named first.
  window.pb1dMoveWarn = async function (id) {
    try { const uid = sbUser && sbUser.id; if (!uid || typeof pbUnsentSentence !== 'function') return; const t = await (window.__pb1dUnsent || pbUnsentSentence)(uid); /* (the rig can stand in for the sentence) */ const e = document.getElementById(id); if (t && e) { e.textContent = 'Let this send before you switch. ' + t; e.hidden = false; } } catch (e) {}
  };

"""
A = "  // ---- 3. a code for this account's other screen (the iPhone Home Screen app): made by the person, 15 minutes ----\n"
rep(A, MODULE + A)

# ---- Get a Code: the page is signed out by it ----
rep("It works once, for 15 minutes. Don’t send it to anyone: it signs in to your account.</p>'\n      + '<div class=\"pbob-code\" id=\"pbObHandoffCode\">' + escapeHtml(pbObCodeShown(r.code)) + '</div>'",
    "It works once, for 15 minutes. Don’t send it to anyone: it signs in to your account. This page is signed out when you sign in there.</p><p class=\"pbob-err\" id=\"pb1dUnsentA\" role=\"status\" hidden></p>'\n      + '<div class=\"pbob-code\" id=\"pbObHandoffCode\">' + escapeHtml(pbObCodeShown(r.code)) + '</div>'")
rep("<button type=\"button\" class=\"pb-btn ghost\" onclick=\"pbObClose()\">Done</button></div>', 'Code for the Home Screen app');\n",
    "<button type=\"button\" class=\"pb-btn ghost\" onclick=\"pbObClose()\">Done</button></div>', 'Code for the Home Screen app');\n    window.pb1dMoveWarn('pb1dUnsentA');\n")
rep("Works once, for 15 minutes. Don’t send it to anyone: it signs in to your account.</p>';\n",
    "Works once, for 15 minutes. Don’t send it to anyone: it signs in to your account. This Safari page is signed out when you sign in there.</p><p class=\"pbob-err\" id=\"pb1dUnsentB\" role=\"status\" hidden></p>';\n    window.pb1dMoveWarn('pb1dUnsentB');\n")

# ---- Log Out: this device only. With two devices signed in, logging out on one must not sign the other out
# (from the lock screen that would silently sign out the device in use, maybe in the middle of a permit). ----
rep("        let failure = await trySignOut(liveUid && (!sbUser || liveUid !== sbUser.id) ? { scope: 'local' } : undefined);\n",
    "        let failure = await trySignOut({ scope: 'local' }); // this device only (one device in use, Nov 20): the other signed-in device stays signed in and is free at once\n")
open(dst, 'w', encoding='utf-8').write(s)
print('ok', len(s))
