// night/permit helper: hunt14 permit_live fixtures at 390 px, with a shots() helper.
const M = require('/home/claude/test/hunt6/confined/mock5.js');
const H14 = require('/home/claude/test/hunt14/permit_live/h.js');
const L = require('/home/claude/test/lib.js');
const SHOTS = '/home/claude/feat_permit32/tests/shots/';
async function setup(browser, { clockAt = null, seedPermit = null, extra = null, width = 390, height = 844 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await ctx.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await ctx.addInitScript(M.mockInit);
  if (clockAt !== null) await ctx.clock.install({ time: clockAt });
  await ctx.addInitScript(([pa, ex]) => {
    if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('__mockSess', JSON.stringify({ id: 'acctA', email: 'a@x.com' }));
    localStorage.setItem('lastKnownUserId', 'acctA'); localStorage.setItem('legacyDataMigrated', 'true');
    if (pa) localStorage.setItem('acctA:activeConfinedSession', pa);
    if (ex) for (const k in ex) localStorage.setItem(k, ex[k]);
  }, [seedPermit, extra]);
  const page = await M.open(ctx); await M.dismiss(page);
  return { ctx, page };
}
async function shot(page, name, full = true) { await page.screenshot({ path: SHOTS + name + '.png', fullPage: full }); }
async function drain(page, label) { const seen = []; for (let i = 0; i < 6; i++) { const m = await H14.modal(page); if (!m) break; seen.push(m.title + ' | ' + m.msg.slice(0, 120).replace(/\n/g, ' ')); await M.dismiss(page); await page.waitForTimeout(150); } if (seen.length && label) console.log('  [' + label + ']', seen.join(' || ')); return seen; }
// geometry of every visible element matching sel: clipped text, tiny targets, off-screen
const geom = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter(e => e.offsetParent !== null).map(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { tag: e.tagName, text: (e.textContent || '').trim().slice(0, 40), x: Math.round(r.left), y: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height), sw: e.scrollWidth, cw: e.clientWidth, overflowX: e.scrollWidth > e.clientWidth + 1, right: Math.round(r.right), fs: cs.fontSize }; }), sel);
module.exports = { ...H14, M, L, setup, shot, drain, geom, SHOTS };
