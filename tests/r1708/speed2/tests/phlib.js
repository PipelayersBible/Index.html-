// speed2 #52 test helpers: a browser like the offline rig's (fake Supabase, signed-in test account), optionally with a
// persistent profile so a test can kill the browser process (SIGKILL) and start it again on the same phone storage.
'use strict';
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const RIG = path.resolve(__dirname, '../../../bughunt_nov17/offline/rig');
const { mkServer } = require(RIG + '/srv');
const co = require(RIG + '/co_ok');
const F = require(RIG + '/flow');
const L = require(RIG + '/lib');
const FAKE = fs.readFileSync(RIG + '/fakesb2.js', 'utf8');
const ROOT = process.env.PB_ROOT || 'http://127.0.0.1:8871/hk/';
const URL_NEW = process.env.PB_URL || ROOT + 'cur.html';
const UID = '00000000-0000-4000-8000-000000000001';
let failed = 0;
const ok = (cond, what, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + what + (extra !== undefined ? ' ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : '')); if (!cond) failed++; };
const done = () => { console.log(failed ? 'RESULT: ' + failed + ' failed' : 'RESULT: all passed'); process.exit(failed ? 1 : 0); };

async function open(opts = {}) {
  let b = null, ctx;
  const vp = { viewport: { width: 400, height: 850 }, serviceWorkers: opts.sw ? 'allow' : 'block' };
  if (opts.dir) ctx = await chromium.launchPersistentContext(opts.dir, Object.assign({ headless: true }, vp));
  else { b = await chromium.launch(); ctx = await b.newContext(vp); }
  await require(RIG + '/../../../rig/env').applyClock(ctx);
  const S = opts.server || mkServer();
  await ctx.exposeBinding('__srvRpc', async (src, n, a, ov) => {
    const c = { n, a, t: Date.now(), done: false }; S.calls.push(c);
    let out; if (S.handlers[n]) { const r = S.handlers[n](a); out = r && r.error ? { data: null, error: { message: r.error } } : { data: r, error: null }; } else out = { data: ov === undefined ? null : ov, error: null };
    c.done = !out.error; return out; });
  await ctx.exposeBinding('__srvUp', async (src, bucket, p, size) => { const k = bucket + '/' + p; if (S.uploads[k]) return { error: 'The resource already exists' }; S.uploads[k] = { size, at: Date.now() }; return { ok: true }; });
  await ctx.route(/supabase-js/, (r) => r.fulfill({ contentType: 'application/javascript', body: FAKE }));
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await ctx.addInitScript(co);
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = async (url, wait) => {
    const p = await ctx.newPage(); p.errs = [];
    p.on('pageerror', (e) => p.errs.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) p.errs.push('console: ' + m.text().slice(0, 200)); });
    await p.goto(url || URL_NEW, { waitUntil: 'load' }); await p.waitForTimeout(wait === undefined ? 3500 : wait); return p;
  };
  // SIGKILL the browser (persistent profile only): whatever IndexedDB had not committed is lost, as on a phone that dies
  const kill = async () => {
    const out = cp.execSync('ps -eo pid,args').toString().split('\n').filter((l) => l.includes('--user-data-dir=' + opts.dir) && !l.includes('ps -eo'));
    out.forEach((l) => { const pid = +l.trim().split(/\s+/)[0]; try { process.kill(pid, 'SIGKILL'); } catch (e) {} });
    await new Promise((r) => setTimeout(r, 1500));
  };
  const close = async () => { try { if (b) await b.close(); else await ctx.close(); } catch (e) {} };
  return { b, ctx, S, page, kill, close };
}

// one run with 8 AI stake photos (2 different images), locked (the offline rig's flow)
async function makeRun(p) {
  const H = F(p); await F.setup(p, H); await H.click('Review & Calculate'); await p.waitForTimeout(1500); await L.lock(p); await p.waitForTimeout(1500);
}

// Records the way r17.04 stored it (photos inside the text): the current records plus nRuns copies of the first run,
// each copy with its own distinct photos (noise JPEGs, ~kb KB each). The photo store is deleted. The app page is closed
// first (so nothing it still had in flight can write over the seed) and the seed is written from a page of the same
// origin that does not run the app. Returns { chars, photos, page } (page: that blank page; the caller closes it).
async function seedOld(p, nRuns, kb, stepMs) {
  const arrText = await p.evaluate(() => JSON.stringify(window.__ra()));
  const ctx = p.context();
  await p.close({ runBeforeUnload: false });
  await new Promise((r) => setTimeout(r, 1500));
  const q = await ctx.newPage();
  await q.goto(ROOT + 'manifest.webmanifest');
  const res = await q.evaluate(async ([arrText, N, KB, UID, STEP]) => {
    const key = UID + ':runArchive';
    const arr = JSON.parse(arrText);
    const run = arr.find((e) => e.kind === 'run');
    const cv = document.createElement('canvas'), side = Math.round(Math.sqrt(KB * 1024 / 1.1));
    cv.width = side; cv.height = side; const g = cv.getContext('2d');
    let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const mk = () => { const im = g.createImageData(side, side); for (let i = 0; i < im.data.length; i += 4) { im.data[i] = rnd() * 255; im.data[i + 1] = rnd() * 255; im.data[i + 2] = rnd() * 255; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); return cv.toDataURL('image/jpeg', 0.5); };
    const isPh = (v) => typeof v === 'string' && v.length > 2000 && /^data:image\//.test(v);
    const swap = (v, m) => { if (isPh(v)) { if (!m.has(v)) m.set(v, mk()); return m.get(v); } if (Array.isArray(v)) return v.map((x) => swap(x, m)); if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = swap(v[k], m); return o; } return v; };
    for (let i = 1; i <= N; i++) { const c = swap(JSON.parse(JSON.stringify(run)), new Map()); c.id = run.id - i * (STEP || 3600000 * 5); c.lockTime = new Date(c.id).toISOString(); c.completed = true; c.runEndTime = c.id + 3600000; arr.push(c); }
    const text = JSON.stringify(arr);
    const db = await new Promise((ok, no) => { const r = indexedDB.open('pb-big', 1); r.onupgradeneeded = () => { try { r.result.createObjectStore('kv'); } catch (e) {} }; r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    await new Promise((ok, no) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(text, key); t.oncomplete = ok; t.onerror = () => no(t.error); }); db.close();
    try { localStorage.setItem(key + '@idb', '1'); localStorage.removeItem(key); } catch (e) {}
    await new Promise((ok) => { const r = indexedDB.deleteDatabase('pb-photos'); r.onsuccess = r.onerror = r.onblocked = () => ok(); });
    let photos = 0; text.replace(/"data:image\/[^"]{2000,}"/g, (m) => { photos++; return m; });
    return { chars: text.length, photos };
  }, [arrText, nRuns, kb || 120, UID, stepMs || 0]);
  await q.close();
  return res;
}

// What Records holds, photo by photo: for each record, every photo's place (JSON path) and the SHA-256 of its text.
// Two snapshots are equal when every photo is in the same place with the same bytes.
async function photoMap(p) {
  return p.evaluate(async () => {
    const out = {};
    const hex = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    const walk = async (v, pth, acc) => {
      if (typeof v === 'string') { if (v.length >= 2000 && /^(data:|[A-Za-z0-9+/]{2000})/.test(v)) acc.push(pth + '=' + await hex(v)); else if (/^pbph:/.test(v)) acc.push(pth + '=REF!'); return; }
      if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) await walk(v[i], pth + '/' + i, acc); return; }
      if (v && typeof v === 'object' && !(v instanceof Date)) for (const k of Object.keys(v)) await walk(v[k], pth + '/' + k, acc);
    };
    for (const e of window.__ra()) { const acc = []; await walk(e, '', acc); out[e.id] = acc.sort(); }
    return out;
  });
}
const sameMap = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const countPhotos = (m) => Object.values(m).reduce((n, a) => n + a.length, 0);

// the stored Records text (raw, as on disk) and what the photo store holds
async function stored(p) {
  return p.evaluate(async (UID) => {
    const db = await new Promise((ok, no) => { const r = indexedDB.open('pb-big', 1); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    const text = await new Promise((ok, no) => { const q = db.transaction('kv', 'readonly').objectStore('kv').get(UID + ':runArchive'); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); }); db.close();
    let inline = 0, refs = 0; String(text || '').replace(/"data:[^"]{2000,}"/g, (m) => { inline++; return m; }).replace(/"pbph:1:[0-9a-f]{64}"/g, (m) => { refs++; return m; });
    const keys = await new Promise((ok) => { try { const r = indexedDB.open('pb-photos', 1); r.onupgradeneeded = () => { try { r.result.createObjectStore('ph'); } catch (e) {} }; r.onsuccess = () => { const d = r.result; try { const q = d.transaction('ph', 'readonly').objectStore('ph').getAllKeys(); q.onsuccess = () => { ok(q.result.length); d.close(); }; q.onerror = () => { ok(-1); d.close(); }; } catch (e) { ok(-1); } }; r.onerror = () => ok(-1); } catch (e) { ok(-1); } });
    return { chars: String(text || '').length, inline, refs, storeKeys: keys };
  }, UID);
}
async function waitSweep(p, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 120000)) {
    const st = await p.evaluate(() => window.__pbPhDebug && window.__pbPhDebug.stat()).catch(() => null);
    if (st && (st.verified || /nothing to store|failed|full|account/.test(st.last))) return st;
    if (st && st.runs === 0 && Date.now() - t0 > 9000) return st; // nothing was left to move: no pass was started
    await p.waitForTimeout(500);
  }
  return p.evaluate(() => window.__pbPhDebug && window.__pbPhDebug.stat()).catch(() => null);
}
// tap a grade-sheet row and lay to it (the button reads "Mark laid to here" for the next row, "... (and the rows before)" further on)
async function lay(p, d) {
  await p.evaluate((d) => { const e = [...document.querySelectorAll('#screen-results [aria-label]')].find((e) => e.getAttribute('aria-label').startsWith('Distance ' + d + ' ')); e.click(); }, d); await p.waitForTimeout(500);
  const bs = await F(p).modalBtns(); const b = bs.find((x) => /^Mark laid to here/.test(x)); if (!b) throw new Error('no lay button: ' + bs.join('|'));
  await F(p).modalClick(b); await p.waitForTimeout(500);
}
module.exports = { lay, open, makeRun, seedOld, photoMap, sameMap, countPhotos, stored, waitSweep, ok, done, F, L, UID, ROOT, URL_NEW };
