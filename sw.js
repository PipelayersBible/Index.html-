/* The Pipelayer's Bible: service worker (batch 13, P; r15.56 feat_safety56: the app page for a reload with no signal).
 *
 * 1. Push notifications: it shows them and opens the app when one is tapped (unchanged since batch 13).
 * 2. r15.56: a reload with no signal (or a signal that hangs) used to show a blank page, so an open permit, its timers,
 *    the roster and the EMERGENCY button were out of reach. Now, for the app page and the pinned supabase-js file only:
 *    the network first, exactly as before; the last good copy this phone got is shown when the network fails, answers
 *    404 / 5xx, or hasn't answered in 4 s (the network answer still refreshes the copy when it comes). Every good load
 *    replaces the copy, so with signal the phone gets the newest app. Nothing else is ever touched (other scripts,
 *    images, the server, the responder page).
 *    The copies live in one cache named after the build (filled in by mksw.py); a new build's worker carries the page
 *    forward and only then throws the older caches away.
 *
 * 3. speed2 #51 (r17.05): the app page opens from the kept copy at once; the newest page is downloaded behind it and,
 *    when it is a new build, stored for the next open, and the open app is told ("New version ready - Reload"). With no
 *    kept copy (or "?pbfresh=1", the recovery button) it is the network-first path of item 2. "?pbprev=1" goes back to
 *    the previous copy and that broken page is never stored again. Lazily loaded parts (pbx/*) are kept for offline use.
 *
 * The app writes the account that turned notifications on for this phone into IndexedDB ('pb-push' / 'kv' /
 * 'owner'). A message for any other account is never shown with its own words.
 * Confined-space emergencies do not use push; they keep their alarm and email path.
 */
'use strict';

const PB_SW_BUILD = 'r17.10 · 2026-11-19';
const PB_SB_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'; // the page's supabase-js <script src> (crossorigin), read from the page by mksw.py
const PB_SHELL_PREFIX = 'pb-shell-';
const PB_SHELL = PB_SHELL_PREFIX + PB_SW_BUILD.replace(/[^A-Za-z0-9.]+/g, '-');
const PB_NET_WAIT_MS = 4000;
const PB_LAZY = 'pb-lazy-v1'; // speed2 #53: lazily loaded parts, one cache for every build (names carry a fingerprint); the page reads it too
const PB_META = 'pb-meta-v1'; // speed2 #51: fingerprints of pages that would not start (never stored again)
const PB_REVAL_GAP_MS = 30000;
const pbPrevKey = () => new URL('pb-prev-page', self.registration.scope).href;
const pbBadKey = () => new URL('pb-bad-pages', self.registration.scope).href;
let pbSlowUntil = 0; // after the page itself came from the copy (no or hung signal): supabase-js too, at once

// The cache key: no query, no #, and ".../index.html" is the same page as ".../".
function pbShellKey(url) {
  const u = new URL(url, self.registration.scope);
  u.search = ''; u.hash = '';
  if (/\/index\.html$/i.test(u.pathname)) u.pathname = u.pathname.replace(/index\.html$/i, '');
  return u.href;
}
// Only a whole, real copy is kept: a page from this site, or the supabase-js file (a CORS answer).
function pbPageOk(res) {
  return !!res && res.status === 200 && res.type === 'basic' && !res.redirected && /text\/html/i.test(res.headers.get('content-type') || '');
}
function pbLibOk(res) {
  return !!res && res.status === 200 && (res.type === 'cors' || res.type === 'basic') && !res.redirected;
}
async function pbShellPut(url, res) {
  try { const c = await caches.open(PB_SHELL); await c.put(pbShellKey(url), res); } catch (e) {}
}
// The kept copy for this address; for the app's own address (the scope, or a page under it) the app page.
async function pbShellFind(url, page) {
  try {
    const c = await caches.open(PB_SHELL);
    const hit = await c.match(pbShellKey(url));
    if (hit || !page) return hit || null;
    const scope = self.registration.scope, u = new URL(url);
    if (u.href.indexOf(scope) === 0 && /(\/|\.html)$/i.test(u.pathname)) return (await c.match(pbShellKey(scope))) || null;
  } catch (e) {}
  return null;
}
const pbIsLib = (url) => PB_SB_URL.indexOf('https://') === 0 && url === PB_SB_URL;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  // The app page and supabase-js are kept at once (fresh from the server). Never blocks the worker for long: after
  // 20 s it goes on without them (the next load fills them in).
  event.waitUntil(Promise.race([
    Promise.all([
      (async () => { try { const res = await fetch(self.registration.scope, { cache: 'no-cache', credentials: 'same-origin' }); if (pbPageOk(res)) { const buf = await res.arrayBuffer(), sha = await pbSha(buf); if ((await pbBadList()).indexOf(sha) >= 0) return; await pbLazyFetchFor(pbText(buf)); await pbShellPut(self.registration.scope, pbPageResp(res, buf, sha)); } } catch (e) {} })(),
      (async () => { try { if (!pbIsLib(PB_SB_URL)) return; const res = await fetch(PB_SB_URL, { mode: 'cors', credentials: 'omit', cache: 'no-cache' }); if (pbLibOk(res)) await pbShellPut(PB_SB_URL, res); } catch (e) {} })(),
    ]),
    new Promise((r) => setTimeout(r, 20000)),
  ]));
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const names = (await caches.keys()).filter((n) => n.indexOf(PB_SHELL_PREFIX) === 0 && n !== PB_SHELL);
      const c = await caches.open(PB_SHELL), keys = [pbShellKey(self.registration.scope)].concat(pbIsLib(PB_SB_URL) ? [pbShellKey(PB_SB_URL)] : []);
      // a copy the new cache doesn't have yet comes forward from the newest older cache that has it
      for (const k of keys) {
        if (await c.match(k)) continue;
        for (const n of names.slice().reverse()) { const r = await (await caches.open(n)).match(k); if (r) { await c.put(k, r); break; } }
      }
      // speed2 #51: the page the older worker kept becomes the previous copy when this worker stored a different one
      try {
        const cur = await c.match(keys[0]);
        if (cur && !(await c.match(pbPrevKey()))) {
          for (const n of names.slice().reverse()) {
            const o = await caches.open(n), old = await o.match(keys[0]), oldPrev = await o.match(pbPrevKey());
            const curSha = await pbRespSha(cur);
            if (old && (await pbRespSha(old)) !== curSha) { await c.put(pbPrevKey(), old); break; }
            if (oldPrev) { await c.put(pbPrevKey(), oldPrev); break; }
          }
        }
      } catch (e) {}
      // the older caches go only once this one holds the app page
      if (await c.match(keys[0])) await Promise.all(names.map((n) => caches.delete(n)));
      pbLazyTidy();
    } catch (e) {}
    await self.clients.claim();
  })());
});

// Network first; the kept copy on a failure, a 404 / 5xx (supabase-js: any answer that isn't good), or no answer in
// 4 s (at once for 60 s after the page itself had to come from the copy).
function pbNetFirst(event, req, page) { event.respondWith(pbNetFirstResp(event, req, page)); }
function pbNetFirstResp(event, req, page) {
  const ok = page ? pbPageOk : pbLibOk;
  const net = fetch(req);
  // perf audit 02: the app page counts as answered only once ALL of it is here (a good one is read whole, then shown).
  const whole = net.then(async (res) => {
    if (!(page && pbPageOk(res))) { if (ok(res)) await pbShellPut(req.url, res.clone()); return res; }
    const copy = res.clone(), read = res.clone(); // res itself stays unread: with nothing kept it is what is shown, streamed
    const body = await read.blob();
    // the copy for the next open is replaced even when this answer comes too late (speed2: never a page marked broken;
    // the lazily loaded parts it names first, so it works offline)
    event.waitUntil((async () => { try { const buf = await copy.clone().arrayBuffer(), sha = await pbSha(buf); if ((await pbBadList()).indexOf(sha) >= 0) return; await pbLazyFetchFor(pbText(buf)); await pbShellPut(req.url, pbPageResp(copy, buf, sha)); pbLazyTidy(); } catch (e) {} })());
    return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
  });
  event.waitUntil(whole.catch(() => {}));
  return (async () => {
    const wait = Date.now() < pbSlowUntil ? 0 : PB_NET_WAIT_MS;
    let timer = null;
    const first = await Promise.race([
      whole.then((res) => ({ res }), (err) => ({ err })),
      new Promise((r) => { timer = setTimeout(() => r({ late: true }), wait); }),
    ]);
    if (timer) clearTimeout(timer);
    // the page: a 404 / 5xx gets the copy; supabase-js: any answer that isn't a good one (403, 429, opaque ...)
    if (first.res && !(page ? (first.res.status === 404 || first.res.status >= 500) : !ok(first.res))) return first.res;
    const kept = await pbShellFind(req.url, page);
    // the 60 s window starts only when the wait really ran out or the network really failed (never renewed by itself)
    if (kept) { if (page && !first.res && (wait > 0 || first.err)) pbSlowUntil = Date.now() + 60000; return kept; }
    if (first.res) return first.res;
    if (first.err) throw first.err;
    return net; // nothing kept yet: the network's own answer, streamed as without a worker (perf audit 02: not the read-whole copy)
  })();
}

// ---- speed2 #51: the kept copy at once, the newest page behind it ----
function pbText(buf) { try { return new TextDecoder('utf-8').decode(buf); } catch (e) { return ''; } }
async function pbSha(buf) {
  try { const h = await crypto.subtle.digest('SHA-256', buf); return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join(''); }
  catch (e) { return 'len' + buf.byteLength; }
}
async function pbRespSha(res) { const h = res.headers.get('x-pb-sha256'); return h || pbSha(await res.clone().arrayBuffer()); }
function pbBuildOf(text) { const m = /PB_APP_BUILD\s*=\s*['"]([^'"]{1,60})['"]/.exec(text || ''); return m ? m[1] : null; }
// a stored page: the whole body, with its fingerprint and build in headers (read without parsing the page again)
function pbPageResp(res, buf, sha) {
  const h = new Headers(res.headers); h.set('x-pb-sha256', sha); const b = pbBuildOf(pbText(buf)); if (b) h.set('x-pb-build', encodeURIComponent(b));
  h.delete('content-length'); h.delete('content-encoding');
  return new Response(buf, { status: 200, statusText: res.statusText || 'OK', headers: h });
}
async function pbRespBuild(res) {
  if (!res) return null;
  const h = res.headers.get('x-pb-build'); if (h) { try { return decodeURIComponent(h); } catch (e) {} }
  try { return pbBuildOf(await res.clone().text()); } catch (e) { return null; }
}
async function pbBadList() {
  try { if (!(await caches.has(PB_META))) return []; const c = await caches.open(PB_META), r = await c.match(pbBadKey()); const a = r ? await r.json() : []; return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
async function pbBadAdd(sha) {
  try { const a = (await pbBadList()).filter((x) => x !== sha).concat([sha]).slice(-10); const c = await caches.open(PB_META); await c.put(pbBadKey(), new Response(JSON.stringify(a), { headers: { 'content-type': 'application/json' } })); } catch (e) {}
}
// the lazily loaded parts a page names (data-pb-src="pbx/<name>"), as addresses under the scope
function pbLazyNames(text) {
  const out = [], re = /data-pb-src="(pbx\/[A-Za-z0-9._-]{1,120})"/g; let m;
  while ((m = re.exec(text || ''))) { const u = new URL(m[1], self.registration.scope).href; if (out.indexOf(u) < 0) out.push(u); }
  return out;
}
async function pbLazyFetchFor(text) {
  const names = pbLazyNames(text); if (!names.length) return true;
  let all = true;
  try {
    const c = await caches.open(PB_LAZY);
    for (const u of names) {
      if (await c.match(u)) continue;
      try { const r = await fetch(u, { cache: 'no-cache', credentials: 'same-origin' }); if (r && r.status === 200 && !r.redirected) await c.put(u, r); else all = false; } catch (e) { all = false; }
    }
  } catch (e) { all = false; }
  return all;
}
// only the parts the kept page or the previous copy names stay
async function pbLazyTidy() {
  try {
    const c = await caches.open(PB_SHELL), keep = new Set();
    for (const k of [pbShellKey(self.registration.scope), pbPrevKey()]) { const r = await c.match(k); if (r) pbLazyNames(await r.text()).forEach((u) => keep.add(u)); }
    if (!(await c.match(pbShellKey(self.registration.scope)))) return; // nothing kept: nothing to judge by
    if (!(await caches.has(PB_LAZY))) return; // never made one (a page without parts): none is made just to look
    const l = await caches.open(PB_LAZY);
    for (const req of await l.keys()) if (!keep.has(req.url)) await l.delete(req);
  } catch (e) {}
}
async function pbTell(msg) {
  try { (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).forEach((c) => { try { c.postMessage(msg); } catch (e) {} }); } catch (e) {}
}
// The newest page, downloaded whole behind the kept copy. A different build is stored for the next open (its lazy parts
// first), the copy it replaces becomes the previous copy, and every open app is told. One at a time, at most every 30 s
// unless forced. A check that got no answer in 15 s (lie-fi) or isn't done in 3 min is dropped and a new one may start,
// so a check stuck on a dead connection never blocks the next ones.
const PB_REVAL_HDR_MS = 15000, PB_REVAL_MAX_MS = 180000;
let pbReval = null, pbRevalAt = 0;
function pbRevalidate(force) {
  const now = Date.now(), R = pbReval;
  if (R) {
    if ((R.hdr || now - R.at <= PB_REVAL_HDR_MS) && now - R.at <= PB_REVAL_MAX_MS) return R.p;
    try { if (R.ac) R.ac.abort(); } catch (e) {}
    pbReval = null;
  } else if (!force && now - pbRevalAt < PB_REVAL_GAP_MS) return Promise.resolve();
  pbRevalAt = now;
  const me = { at: now, hdr: false, ac: typeof AbortController === 'function' ? new AbortController() : null };
  const timer = me.ac ? setTimeout(() => { try { me.ac.abort(); } catch (e) {} }, PB_REVAL_MAX_MS) : null;
  me.p = (async () => {
    try {
      const scope = self.registration.scope;
      const res = await fetch(scope, me.ac ? { cache: 'no-cache', credentials: 'same-origin', signal: me.ac.signal } : { cache: 'no-cache', credentials: 'same-origin' });
      me.hdr = true;
      if (!pbPageOk(res)) return;
      const buf = await res.arrayBuffer(), sha = await pbSha(buf);
      if (pbReval !== me) return; // dropped meanwhile
      const c = await caches.open(PB_SHELL), key = pbShellKey(scope), kept = await c.match(key);
      if (kept && (await pbRespSha(kept)) === sha) return; // the same page: nothing to do
      if ((await pbBadList()).indexOf(sha) >= 0) return; // the page that would not start on this phone
      const text = pbText(buf);
      await pbLazyFetchFor(text);
      if (kept) await c.put(pbPrevKey(), kept);
      await c.put(key, pbPageResp(res, buf, sha));
      pbLazyTidy();
      pbTell({ pb: 'pb-update', build: pbBuildOf(text) });
    } catch (e) {} finally { if (timer) clearTimeout(timer); if (pbReval === me) pbReval = null; }
  })();
  pbReval = me;
  return me.p;
}
// "?pbprev=1": the previous copy is the kept copy again and the page it replaces is never stored again
async function pbUsePrev() {
  try {
    const c = await caches.open(PB_SHELL), key = pbShellKey(self.registration.scope), prev = await c.match(pbPrevKey());
    if (!prev) return null;
    const cur = await c.match(key);
    if (cur) await pbBadAdd(await pbRespSha(cur));
    await c.put(key, prev.clone());
    await c.delete(pbPrevKey());
    return prev;
  } catch (e) { return null; }
}
function pbCacheFirst(event, req) {
  let mode = '';
  try { const q = new URL(req.url).searchParams; mode = q.has('pbfresh') ? 'fresh' : q.has('pbprev') ? 'prev' : ''; } catch (e) {}
  // only the app page itself (the scope or index.html, any query): other pages (terms, privacy, ...) as before
  let app = false; try { app = pbShellKey(req.url) === pbShellKey(self.registration.scope); } catch (e) {}
  if (!app || mode === 'fresh') { pbNetFirst(event, req, true); return; } // the recovery path: the r17.01 network-first, 4 s budget
  event.respondWith((async () => {
    if (mode === 'prev') { const p = await pbUsePrev(); if (p) return p; }
    const kept = await pbShellFind(req.url, true);
    if (kept) {
      if (mode !== 'prev') event.waitUntil(pbRevalidate(false));
      return kept;
    }
    return pbNetFirstResp(event, req, true); // nothing kept yet: as before
  })());
}
// supabase-js: the copy at once, refreshed behind it
function pbLibSwr(event, req) {
  event.respondWith((async () => {
    const kept = await pbShellFind(req.url, false);
    if (!kept) return pbNetFirstResp(event, req, false);
    event.waitUntil((async () => { try { const r = await fetch(req); if (pbLibOk(r)) await pbShellPut(req.url, r); } catch (e) {} })());
    return kept;
  })());
}
// pbx/*: cache-first; a part that isn't kept yet is fetched and kept
async function pbLazyResp(req) {
  const u = new URL(req.url); u.search = ''; u.hash = '';
  try { const c = await caches.open(PB_LAZY), hit = await c.match(u.href); if (hit) return hit; } catch (e) {}
  const res = await fetch(req);
  if (res && res.status === 200 && res.type === 'basic' && !res.redirected) { try { const c = await caches.open(PB_LAZY); await c.put(u.href, res.clone()); } catch (e) {} }
  return res;
}
self.addEventListener('message', (event) => {
  const d = event.data;
  if (!d || typeof d !== 'object' || (d.pb !== 'shell-status' && d.pb !== 'shell-check')) return;
  event.waitUntil((async () => {
    let build = null;
    try { const c = await caches.open(PB_SHELL); build = await pbRespBuild(await c.match(pbShellKey(self.registration.scope))); } catch (e) {}
    try { if (event.source) event.source.postMessage({ pb: 'shell-status', build, sw: PB_SW_BUILD }); } catch (e) {}
    if (d.pb === 'shell-check') await pbRevalidate(false);
  })());
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    let same = false; try { same = new URL(req.url).origin === self.location.origin; } catch (e) {}
    if (same) pbCacheFirst(event, req); // speed2 #51: the kept copy at once (none yet: network first, as before)
    return;
  }
  try { const u = new URL(req.url); if (u.origin === self.location.origin && /\/pbx\/[A-Za-z0-9._-]{1,120}$/.test(u.pathname) && u.href.indexOf(self.registration.scope) === 0) { event.respondWith(pbLazyResp(req)); return; } } catch (e) {}
  if (pbIsLib(req.url)) pbLibSwr(event, req);
  // everything else: left to the browser, exactly as with no service worker
});

const SAFE_URL = /^#\/[a-z0-9/_-]{1,60}$/;
const APP_NAME = 'The Pipelayer’s Bible';

// The account signed up for push on this phone: a string, null (nobody), or undefined (couldn't be read).
function readOwner() {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    setTimeout(() => finish(undefined), 1500);
    try {
      const req = indexedDB.open('pb-push', 1);
      req.onupgradeneeded = () => { try { req.result.createObjectStore('kv'); } catch (e) {} };
      req.onerror = () => finish(undefined);
      req.onsuccess = () => {
        try {
          const db = req.result;
          const get = db.transaction('kv', 'readonly').objectStore('kv').get('owner');
          get.onsuccess = () => { const v = get.result; finish(v && typeof v.uid === 'string' && v.uid ? v.uid : null); db.close(); };
          get.onerror = () => { finish(undefined); db.close(); };
        } catch (e) { finish(undefined); }
      };
    } catch (e) { finish(undefined); }
  });
}

function clip(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n); }

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let d = null;
    try { d = event.data ? event.data.json() : null; } catch (e) { d = null; }
    const owner = await readOwner();
    let title = APP_NAME, body = 'Open the app to see what’s new.', url = '#/home', tag = 'pb-general';
    if (d && typeof d === 'object') {
      // Bughunt Oct 19 (6a): an owner that couldn't be read (undefined) is no proof the message is this phone's, so a
      // message addressed to an account then gets the neutral text too (and the subscription is kept).
      const addressed = typeof d.a === 'string';
      const forSomeoneElse = addressed && owner !== undefined && d.a !== owner;
      if (addressed && owner === undefined) {
        // the neutral defaults above: title, "Open the app to see what's new.", #/home
      } else if (forSomeoneElse) {
        // Never shown with its own words. Browsers require a notification for every push, so a neutral one is shown.
        body = owner ? 'A notification for another account wasn’t shown on this phone.' : 'Notifications are off on this phone.';
        tag = 'pb-other';
        if (!owner) { // nobody has notifications on here: stop this phone's subscription (the server then marks it dead)
          try { const s = await self.registration.pushManager.getSubscription(); if (s) await s.unsubscribe(); } catch (e) {}
        }
      } else {
        title = clip(d.t, 80) || APP_NAME;
        body = clip(d.b, 180);
        url = SAFE_URL.test(String(d.u || '')) ? d.u : '#/home';
        tag = 'pb-' + clip(String(d.g || 'general').replace(/[^a-z_]/g, ''), 20);
      }
    }
    await self.registration.showNotification(title, {
      body, tag, data: { u: url }, icon: 'icon-192.png', badge: 'icon-192.png', lang: 'en', renotify: false,
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const url = SAFE_URL.test(String(d.u || '')) ? d.u : '#/home';
  const scope = self.registration.scope; // e.g. https://pipelayersbible.github.io/Index.html-/
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const app = wins.find((c) => typeof c.url === 'string' && c.url.indexOf(scope) === 0);
    if (app) {
      // The open app moves to the screen itself (it checks unsaved work, safety screens and the plan first).
      try { app.postMessage({ pb: 'push-open', url }); } catch (e) {}
      try { await app.focus(); } catch (e) {}
      return;
    }
    try { await self.clients.openWindow(scope + url); } catch (e) {}
  })());
});

// The push service replaced this phone's subscription: try to renew it with the same key. The app sends the
// new one to the server the next time it opens with signal (it compares it with the one it saved).
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const old = event.oldSubscription;
      if (old && old.options && old.options.applicationServerKey) {
        await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: old.options.applicationServerKey });
      }
    } catch (e) {}
    try { (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).forEach((c) => c.postMessage({ pb: 'push-resync' })); } catch (e) {}
  })());
});
