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
 * The app writes the account that turned notifications on for this phone into IndexedDB ('pb-push' / 'kv' /
 * 'owner'). A message for any other account is never shown with its own words.
 * Confined-space emergencies do not use push; they keep their alarm and email path.
 */
'use strict';

const PB_SW_BUILD = 'r15.67 · 2026-10-30';
const PB_SB_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'; // the page's supabase-js <script src> (crossorigin), read from the page by mksw.py
const PB_SHELL_PREFIX = 'pb-shell-';
const PB_SHELL = PB_SHELL_PREFIX + PB_SW_BUILD.replace(/[^A-Za-z0-9.]+/g, '-');
const PB_NET_WAIT_MS = 4000;
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
      (async () => { try { const res = await fetch(self.registration.scope, { cache: 'no-cache', credentials: 'same-origin' }); if (pbPageOk(res)) await pbShellPut(self.registration.scope, res); } catch (e) {} })(),
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
      // the older caches go only once this one holds the app page
      if (await c.match(keys[0])) await Promise.all(names.map((n) => caches.delete(n)));
    } catch (e) {}
    await self.clients.claim();
  })());
});

// Network first; the kept copy on a failure, a 404 / 5xx (supabase-js: any answer that isn't good), or no answer in
// 4 s (at once for 60 s after the page itself had to come from the copy).
function pbNetFirst(event, req, page) {
  const ok = page ? pbPageOk : pbLibOk;
  const net = fetch(req);
  event.waitUntil(net.then((res) => (ok(res) ? pbShellPut(req.url, res.clone()) : null)).catch(() => {}));
  event.respondWith((async () => {
    const wait = Date.now() < pbSlowUntil ? 0 : PB_NET_WAIT_MS;
    let timer = null;
    const first = await Promise.race([
      net.then((res) => ({ res }), (err) => ({ err })),
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
    return net; // nothing kept yet: wait for the network, as without a worker
  })());
}
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    let same = false; try { same = new URL(req.url).origin === self.location.origin; } catch (e) {}
    if (same) pbNetFirst(event, req, true);
    return;
  }
  if (pbIsLib(req.url)) pbNetFirst(event, req, false);
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
