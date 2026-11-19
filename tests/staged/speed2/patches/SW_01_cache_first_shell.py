#!/usr/bin/env python3
# speed2 #51 (Tommy, Nov 18: yes) on sw.js r17.04: open from the phone's own copy every time.
#
# Before: every open asked the network first (the r17.01 4 s budget for the WHOLE page, then the kept copy). An
# unchanged app still cost one round trip (a 304), lie-fi cost the full 4 s, and a release on one bar cost the 4 s.
# Now (stale-while-revalidate):
#  - the app page is answered from the kept copy at once when there is one; behind it the worker downloads the page
#    (whole, never a partial one), and when it is a different build it is stored for the next open and every open app
#    gets {pb:'pb-update', build} ("New version ready - Reload" line in the page). The previous copy is kept as
#    "pb-prev-page" for recovery.
#  - no kept copy yet (first install, a cleared cache): exactly the r17.01 path (network, 4 s budget, kept copy) - and
#    the page "?pbfresh=1" (the recovery button) always takes that path, so a phone can always ask for the newest app.
#  - "?pbprev=1" (the boot watchdog's "Open the previous version"): the previous copy becomes the kept copy again, the
#    broken build's fingerprint is remembered and that exact page is never stored again (a new release is).
#  - supabase-js: from the copy at once too, refreshed behind it (no copy yet: the r17.01 path).
#  - lazily loaded parts (pbx/*: pdf.js, jsPDF since speed2 #53): cache-first in 'pb-lazy-v1', fetched when a page that
#    names them (data-pb-src="pbx/...") is stored, so they work offline after the first load. Their names carry a
#    content fingerprint, so a file never changes under a name; files no kept page names are removed.
#  - a page asks {pb:'shell-status'} (start-up, back to the foreground, a new worker) and gets the kept build back;
#    {pb:'shell-check'} also starts a background check (at most every 30 s).
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

rep(""" * The app writes the account that turned notifications on for this phone into IndexedDB ('pb-push' / 'kv' /""",
""" * 3. speed2 #51 (r17.05): the app page opens from the kept copy at once; the newest page is downloaded behind it and,
 *    when it is a new build, stored for the next open, and the open app is told ("New version ready - Reload"). With no
 *    kept copy (or "?pbfresh=1", the recovery button) it is the network-first path of item 2. "?pbprev=1" goes back to
 *    the previous copy and that broken page is never stored again. Lazily loaded parts (pbx/*) are kept for offline use.
 *
 * The app writes the account that turned notifications on for this phone into IndexedDB ('pb-push' / 'kv' /""")

rep("""const PB_NET_WAIT_MS = 4000;""",
"""const PB_NET_WAIT_MS = 4000;
const PB_LAZY = 'pb-lazy-v1'; // speed2 #53: lazily loaded parts, one cache for every build (names carry a fingerprint); the page reads it too
const PB_META = 'pb-meta-v1'; // speed2 #51: fingerprints of pages that would not start (never stored again)
const PB_REVAL_GAP_MS = 30000;
const pbPrevKey = () => new URL('pb-prev-page', self.registration.scope).href;
const pbBadKey = () => new URL('pb-bad-pages', self.registration.scope).href;""")

# install: never store a page that was marked broken; the lazily loaded parts the new page names come with it
rep("""      (async () => { try { const res = await fetch(self.registration.scope, { cache: 'no-cache', credentials: 'same-origin' }); if (pbPageOk(res)) await pbShellPut(self.registration.scope, res); } catch (e) {} })(),""",
"""      (async () => { try { const res = await fetch(self.registration.scope, { cache: 'no-cache', credentials: 'same-origin' }); if (pbPageOk(res)) { const buf = await res.arrayBuffer(), sha = await pbSha(buf); if ((await pbBadList()).indexOf(sha) >= 0) return; await pbLazyFetchFor(pbText(buf)); await pbShellPut(self.registration.scope, pbPageResp(res, buf, sha)); } } catch (e) {} })(),""")

# activate: the previous page comes forward too; the page the old worker kept becomes "previous" when the new one differs
rep("""      // the older caches go only once this one holds the app page
      if (await c.match(keys[0])) await Promise.all(names.map((n) => caches.delete(n)));""",
"""      // speed2 #51: the page the older worker kept becomes the previous copy when this worker stored a different one
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
      pbLazyTidy();""")

# network-first: returns the answer (the caller decides between it and the kept copy); the page copy brings its lazy parts
rep("""function pbNetFirst(event, req, page) {
  const ok = page ? pbPageOk : pbLibOk;""",
"""function pbNetFirst(event, req, page) { event.respondWith(pbNetFirstResp(event, req, page)); }
function pbNetFirstResp(event, req, page) {
  const ok = page ? pbPageOk : pbLibOk;""")
rep("""    const body = await read.blob();
    event.waitUntil(pbShellPut(req.url, copy)); // the copy for the next open is replaced even when this answer comes too late""",
"""    const body = await read.blob();
    // the copy for the next open is replaced even when this answer comes too late (speed2: never a page marked broken;
    // the lazily loaded parts it names first, so it works offline)
    event.waitUntil((async () => { try { const buf = await copy.clone().arrayBuffer(), sha = await pbSha(buf); if ((await pbBadList()).indexOf(sha) >= 0) return; await pbLazyFetchFor(pbText(buf)); await pbShellPut(req.url, pbPageResp(copy, buf, sha)); pbLazyTidy(); } catch (e) {} })());""")
rep("""  event.waitUntil(whole.catch(() => {}));
  event.respondWith((async () => {
    const wait = Date.now() < pbSlowUntil ? 0 : PB_NET_WAIT_MS;""",
"""  event.waitUntil(whole.catch(() => {}));
  return (async () => {
    const wait = Date.now() < pbSlowUntil ? 0 : PB_NET_WAIT_MS;""")
rep("""    return net; // nothing kept yet: the network's own answer, streamed as without a worker (perf audit 02: not the read-whole copy)
  })());
}""",
"""    return net; // nothing kept yet: the network's own answer, streamed as without a worker (perf audit 02: not the read-whole copy)
  })();
}

// ---- speed2 #51: the kept copy at once, the newest page behind it ----
function pbText(buf) { try { return new TextDecoder('utf-8').decode(buf); } catch (e) { return ''; } }
async function pbSha(buf) {
  try { const h = await crypto.subtle.digest('SHA-256', buf); return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join(''); }
  catch (e) { return 'len' + buf.byteLength; }
}
async function pbRespSha(res) { const h = res.headers.get('x-pb-sha256'); return h || pbSha(await res.clone().arrayBuffer()); }
function pbBuildOf(text) { const m = /PB_APP_BUILD\\s*=\\s*['"]([^'"]{1,60})['"]/.exec(text || ''); return m ? m[1] : null; }
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
  try { const c = await caches.open(PB_META), r = await c.match(pbBadKey()); const a = r ? await r.json() : []; return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
async function pbBadAdd(sha) {
  try { const a = (await pbBadList()).filter((x) => x !== sha).concat([sha]).slice(-10); const c = await caches.open(PB_META); await c.put(pbBadKey(), new Response(JSON.stringify(a), { headers: { 'content-type': 'application/json' } })); } catch (e) {}
}
// the lazily loaded parts a page names (data-pb-src="pbx/<name>"), as addresses under the scope
function pbLazyNames(text) {
  const out = [], re = /data-pb-src="(pbx\\/[A-Za-z0-9._-]{1,120})"/g; let m;
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
    const l = await caches.open(PB_LAZY);
    for (const req of await l.keys()) if (!keep.has(req.url)) await l.delete(req);
  } catch (e) {}
}
async function pbTell(msg) {
  try { (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).forEach((c) => { try { c.postMessage(msg); } catch (e) {} }); } catch (e) {}
}
// The newest page, downloaded whole behind the kept copy. A different build is stored for the next open (its lazy parts
// first), the copy it replaces becomes the previous copy, and every open app is told. Never more than one at a time,
// and at most every 30 s unless forced.
let pbRevalP = null, pbRevalAt = 0;
function pbRevalidate(force) {
  if (pbRevalP) return pbRevalP;
  if (!force && Date.now() - pbRevalAt < PB_REVAL_GAP_MS) return Promise.resolve();
  pbRevalAt = Date.now();
  pbRevalP = (async () => {
    try {
      const scope = self.registration.scope;
      const res = await fetch(scope, { cache: 'no-cache', credentials: 'same-origin' });
      if (!pbPageOk(res)) return;
      const buf = await res.arrayBuffer(), sha = await pbSha(buf);
      const c = await caches.open(PB_SHELL), key = pbShellKey(scope), kept = await c.match(key);
      if (kept && (await pbRespSha(kept)) === sha) return; // the same page: nothing to do
      if ((await pbBadList()).indexOf(sha) >= 0) return; // the page that would not start on this phone
      const text = pbText(buf);
      await pbLazyFetchFor(text);
      if (kept) await c.put(pbPrevKey(), kept);
      await c.put(key, pbPageResp(res, buf, sha));
      pbLazyTidy();
      pbTell({ pb: 'pb-update', build: pbBuildOf(text) });
    } catch (e) {} finally { pbRevalP = null; }
  })();
  return pbRevalP;
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
});""")

rep("""    if (same) pbNetFirst(event, req, true);
    return;
  }
  if (pbIsLib(req.url)) pbNetFirst(event, req, false);""",
"""    if (same) pbCacheFirst(event, req); // speed2 #51: the kept copy at once (none yet: network first, as before)
    return;
  }
  try { const u = new URL(req.url); if (u.origin === self.location.origin && /\\/pbx\\/[A-Za-z0-9._-]{1,120}$/.test(u.pathname) && u.href.indexOf(self.registration.scope) === 0) { event.respondWith(pbLazyResp(req)); return; } } catch (e) {}
  if (pbIsLib(req.url)) pbLibSwr(event, req);""")

open(out, 'w', encoding='utf-8').write(s)
print('ok', out)
