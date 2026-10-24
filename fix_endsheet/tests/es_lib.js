// END-sheet / pipelayer-report tests: batch 29 ROLES' setup (pd_lib production mock on hunt6 mock5) with the
// company membership answered the way the live server answers it (real_member.js), a phone clock, and END's helpers.
const R = require('/home/claude/batch29/ROLES/tests/roles_lib.js'); const { M, T } = R;
const E = require('/home/claude/batch17/END/tests/ea_lib.js');
const REAL = require('./real_member.js');
async function setup(browser, o) {
  o = o || {};
  const ctx = await browser.newContext({ viewport: { width: o.width || 390, height: o.height || 860 }, deviceScaleFactor: o.dpr || 1 });
  await ctx.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await ctx.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await ctx.addInitScript(M.mockInit);
  await ctx.addInitScript(T.RPC);
  if (o.real !== false) await ctx.addInitScript(REAL);
  if (o.init) await ctx.addInitScript(o.init);
  await ctx.addInitScript(([u, rl, ex, sub]) => {
    if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('__mockSess', JSON.stringify({ id: u, email: u + '@x.com' }));
    localStorage.setItem('lastKnownUserId', u); localStorage.setItem('legacyDataMigrated', 'true');
    if (sub) localStorage.setItem(u + ':cachedSubscription', JSON.stringify(sub));
    localStorage.setItem('__role', rl);
    localStorage.setItem('__foremen', JSON.stringify([{ id: 'acctF', name: 'Frank Ortiz' }]));
    localStorage.setItem('__pipelayers', JSON.stringify([{ id: 'acctP', name: 'Wes Hall' }]));
    localStorage.setItem('__names', JSON.stringify({ acctF: 'Frank Ortiz', acctP: 'Wes Hall' }));
    if (ex) for (const k in ex) localStorage.setItem(k, typeof ex[k] === 'string' ? ex[k] : JSON.stringify(ex[k]));
  }, [o.uid || 'acctP', o.role || 'pipelayer', o.extra || null, o.sub || null]);
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  page._errors = []; page.on('pageerror', e => page._errors.push(e.message));
  if (o.clock) await page.clock.install({ time: new Date(o.clock) });
  await page.goto(M.ORIGIN);
  await page.waitForFunction(() => getComputedStyle(document.getElementById('pbBootCover')).display === 'none', null, { timeout: 20000 });
  await page.waitForTimeout(2500); await M.dismiss(page);
  return { ctx, page };
}
const LINKS = { __psrv: { entries: {}, plans: {}, links: [{ foreman: 'acctF', pipelayer: 'acctP', by: 'acctP', started: '2026-10-01T00:00:00Z' }] } };
const plan = (p) => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('acctP:cachedSubscription')); } catch (e) { return null; } });
module.exports = { R, M, E, setup, LINKS, plan };
