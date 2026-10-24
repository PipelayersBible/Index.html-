// Batch 29 ROLES: test setup on batch 20 HOME's production mock (pd_lib: hunt6 mock5 Supabase + window.__rpc, a fake of
// the pb_prod_* functions, state in localStorage '__psrv'). Same as batch 14 F's lf_lib.setupTouch, without touch, plus:
//   o.offline: every rpc fails as offline from the very first start ('__rpcMode' offline), and the plan check fails too
//   o.sub: this account's cached plan (default contractor, active)
//   o.member0: not in a company ('__member' '0')
const T = require('/home/claude/batch20/HOME/tests/pd_lib.js');
const { M } = T;
const iso = (ms) => new Date(ms).toISOString();
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const FOREMEN = [{ id: 'acctF', name: 'Frank Ortiz' }, { id: 'acctF2', name: 'Fiona Foreman' }];
const PIPELAYERS = [{ id: 'acctP', name: 'Wes Hall' }, { id: 'acctP2', name: 'Walt Ruiz' }];
async function setup(browser, o) {
  o = o || {};
  const ctx = await browser.newContext({ viewport: { width: o.width || 390, height: o.height || 860 } });
  await ctx.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await ctx.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await ctx.addInitScript(M.mockInit);
  await ctx.addInitScript(T.RPC);
  await ctx.addInitScript(([u, rl, ex, off, sub, m0]) => {
    if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('__mockSess', JSON.stringify({ id: u, email: u + '@x.com' }));
    localStorage.setItem('lastKnownUserId', u); localStorage.setItem('legacyDataMigrated', 'true');
    localStorage.setItem(u + ':cachedSubscription', JSON.stringify(sub || { tier: 'contractor', status: 'active' }));
    localStorage.setItem('__role', rl);
    if (off) { localStorage.setItem('__rpcMode', 'offline'); localStorage.setItem('__failSub', '1'); }
    if (m0) localStorage.setItem('__member', '0');
    localStorage.setItem('__foremen', JSON.stringify([{ id: 'acctF', name: 'Frank Ortiz' }, { id: 'acctF2', name: 'Fiona Foreman' }]));
    localStorage.setItem('__pipelayers', JSON.stringify([{ id: 'acctP', name: 'Wes Hall' }, { id: 'acctP2', name: 'Walt Ruiz' }]));
    localStorage.setItem('__names', JSON.stringify({ acctF: 'Frank Ortiz', acctF2: 'Fiona Foreman', acctP: 'Wes Hall', acctP2: 'Walt Ruiz' }));
    if (ex) for (const k in ex) localStorage.setItem(k, typeof ex[k] === 'string' ? ex[k] : JSON.stringify(ex[k]));
  }, [o.uid || 'acctP', o.role || 'pipelayer', o.extra || null, !!o.offline, o.sub || null, !!o.member0]);
  const page = await M.open(ctx); await M.dismiss(page);
  await page.waitForTimeout(1500);
  return { ctx, page };
}
const shown = (p, id) => p.evaluate((i) => { const el = document.getElementById(i); if (!el) return false; let x = el; while (x) { if (x.hidden || getComputedStyle(x).display === 'none') return false; x = x.parentElement; } return el.getBoundingClientRect().height > 0; }, id);
const text = (p, id) => p.evaluate((i) => { const el = document.getElementById(i); return el ? el.textContent : null; }, id);
const waitFor = async (page, fn, ms = 15000, arg) => { for (let t = 0; t < ms; t += 250) { if (await page.evaluate(fn, arg)) return true; await page.waitForTimeout(250); } return false; };
const rpcs = (p, name) => p.evaluate((n) => window.__rpcLog.filter(x => x.fn === n), name);
module.exports = { M, T, check: M.check, setup, shown, text, waitFor, rpcs, modal: T.modal, click: T.click, iso, today, FOREMEN, PIPELAYERS };
