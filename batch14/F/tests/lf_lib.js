// Batch 14 F: helpers for the laid-marks and live-crew tests (on top of pd_lib.js, the production rpc mock).
const T = require('./pd_lib.js'); const { M } = T;
const SHOTS = '/home/claude/batch14/F/shots/';
// Like pd_lib setup, but the context has a touch screen (real touch gestures through CDP) and the account can be chosen.
async function setupTouch(browser, { width = 390, height = 860, xl = false, uid = 'acctA', role = 'foreman', manager = false, extra = null, touch = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch });
  await ctx.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await ctx.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await ctx.addInitScript(M.mockInit);
  await ctx.addInitScript(T.RPC);
  await ctx.addInitScript(([u, rl, mg, ex]) => {
    if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('__mockSess', JSON.stringify({ id: u, email: u + '@x.com' }));
    localStorage.setItem('lastKnownUserId', u); localStorage.setItem('legacyDataMigrated', 'true');
    localStorage.setItem(u + ':cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active' }));
    localStorage.setItem('__role', rl);
    if (mg) localStorage.setItem('__manager', '1');
    localStorage.setItem('__foremen', JSON.stringify([{ id: 'acctF', name: 'Frank Ortiz' }, { id: 'acctF2', name: 'Fiona Foreman' }]));
    localStorage.setItem('__pipelayers', JSON.stringify([{ id: 'acctP', name: 'Wes Hall' }, { id: 'acctP2', name: 'Walt Ruiz' }]));
    if (ex) for (const k in ex) localStorage.setItem(k, typeof ex[k] === 'string' ? ex[k] : JSON.stringify(ex[k]));
  }, [uid, role, manager, extra]);
  const page = await M.open(ctx); await M.dismiss(page);
  await page.waitForTimeout(1200);
  if (xl) { await page.evaluate(() => window.pbSetTextSize(140)); await page.waitForTimeout(300); }
  page._cdp = touch ? await ctx.newCDPSession(page) : null;
  return { ctx, page };
}
// A real touch gesture: start at (x, y), move by (dx, dy) in n steps, lift.
async function touchDrag(page, x, y, dx, dy, { steps = 10, hold = 0 } = {}) {
  const c = page._cdp;
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  if (hold) await page.waitForTimeout(hold);
  for (let i = 1; i <= steps; i++) {
    await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / steps, y: y + dy * i / steps, id: 1 }] });
    await page.waitForTimeout(16);
  }
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(250);
}
// The middle of a grade row (the main line), in viewport px; scrolls it into view first.
async function rowPoint(page, idx, { xFrac = 0.35 } = {}) {
  return page.evaluate(([i, f]) => {
    const tr = document.querySelector('#resultsBody tr[data-laid-idx="' + i + '"]:not([data-laid-strip])');
    if (!tr) return null;
    const wrap = tr.closest('.pb-table-wrap'); const r0 = tr.getBoundingClientRect(), w = wrap.getBoundingClientRect();
    if (r0.top < w.top + 40 || r0.bottom > w.bottom - 10) { wrap.scrollTop += r0.top - w.top - 60; }
    if (w.top < 0 || w.bottom > window.innerHeight) window.scrollBy(0, w.top - 80);
    const r = tr.getBoundingClientRect(), ww = wrap.getBoundingClientRect();
    const left = Math.max(r.left, ww.left), right = Math.min(r.right, ww.right);
    return { x: Math.round(left + (right - left) * f), y: Math.round(r.top + r.height / 2) };
  }, [idx, xFrac]);
}
const laidState = (page) => page.evaluate(() => { const e = window.__debugGetCurrentArchiveEntry(); const S = window.pbLaidSummaryOf(e.id);
  return { laid: S.laid, n: S.n, next: S.next, laidFt: S.laidFt, total: S.total, log: (e.laid && e.laid.log) || [], rowsJson: JSON.stringify(e.intervalRows), report: e.reportText, sent: e.sent,
    nextRow: (() => { const tr = document.querySelector('#resultsBody tr.pb-laid-next:not([data-laid-strip])'); return tr ? Number(tr.dataset.laidIdx) : null; })(),
    laidRows: [...document.querySelectorAll('#resultsBody tr.pb-laid:not([data-laid-strip])')].map(t => Number(t.dataset.laidIdx)) }; });
const stored = (page, uid) => page.evaluate((u) => { const a = JSON.parse(localStorage.getItem(u + ':runArchive') || '[]'); const e = a.find(x => x && x.kind === 'run'); return e ? (e.laid || null) : null; }, uid);
const srvGet = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('__psrv') || '{"entries":{},"plans":{}}'));
const srvPut = (p, v) => p.evaluate((x) => localStorage.setItem('__psrv', JSON.stringify(x)), v);
const waitFor = async (page, fn, ms = 15000, arg) => { for (let t = 0; t < ms; t += 250) { if (await page.evaluate(fn, arg)) return true; await page.waitForTimeout(250); } return false; };
module.exports = Object.assign({}, T, { SHOTS, setupTouch, touchDrag, rowPoint, laidState, stored, srvGet, srvPut, waitFor });
