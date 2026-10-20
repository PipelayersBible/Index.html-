/* The Pipelayer's Bible: push-only service worker (batch 13, P).
 *
 * It ONLY shows push notifications and opens the app when one is tapped.
 * It has NO fetch handler and keeps NO cache: the page and everything else load exactly as without it,
 * so crews can never be served a stale build by this file. (Offline use already works: the app is one file.)
 *
 * The app writes the account that turned notifications on for this phone into IndexedDB ('pb-push' / 'kv' /
 * 'owner'). A message for any other account is never shown with its own words.
 * Confined-space emergencies do not use push; they keep their alarm and email path.
 */
'use strict';

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

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
      const forSomeoneElse = owner !== undefined && typeof d.a === 'string' && d.a !== owner;
      if (forSomeoneElse) {
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
