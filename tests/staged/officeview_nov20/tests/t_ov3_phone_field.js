// officeview 03: nothing changes on a phone, and nothing changes for foremen and pipelayers at any width.
//   - company account at 390: no Today table, Records is the list it was (same rows as the page before the patches).
//   - foreman and pipelayer at 390 and at 1440: no table, no find box, not the wide page; Home and Records read the same
//     as before the patches (compared with base.html, the r17.11 candidate, when it is served next to cur.html).
const L = require('./lib');
const BASE = process.env.PB_BASE || L.URL.replace(/cur\.html.*$/, 'base.html');
const look = (p) => p.evaluate(() => { const vis = (id) => { const e = document.getElementById(id); return !!e && e.offsetParent !== null; }; const h = document.documentElement;
  return { cx: h.classList.contains('pb-cx'), wide: h.classList.contains('pbx-wide'), today: vis('homeCxToday'), table: !!document.getElementById('ovTable') || !!document.getElementById('ovRecTable'), bar: vis('ovRecBar'), appW: Math.round(document.getElementById('pbApp').getBoundingClientRect().width) }; });
const text = (p) => p.evaluate(() => { const s = document.querySelector('.pb-screen.active'); return s ? s.innerText.replace(/\b\d{1,2}:\d\d(:\d\d)?\s?[AP]M\b/g, 'T').replace(/\s+/g, ' ').trim() : ''; });
const listHtml = (p) => p.evaluate(() => (document.getElementById('rpfList') || { innerHTML: '' }).innerHTML.replace(/\b\d{1,2}:\d\d\s?[AP]M\b/g, 'T'));
async function visit(url, init, w, fn) { const { b, p } = await L.boot(url, { init, wait: 3500 }); await L.waitFn(p, 'pbGoto'); await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(3500); try { return await fn(p); } finally { await b.close(); } }
(async () => {
  let hasBase = true; try { const r = await fetch(BASE, { method: 'HEAD' }); hasBase = r.ok; } catch (e) { hasBase = false; }
  if (!hasBase) console.log('  (no base.html next to the page: the before/after comparisons are skipped)');
  const snap = async (p) => { const home = { look: await look(p), text: await text(p), over: await L.overflow(p) }; await p.evaluate(() => pbGoto('archive')); await p.waitForTimeout(3000); return { home, rec: { look: await look(p), text: await text(p), list: await listHtml(p), over: await L.overflow(p), rows: await p.evaluate(() => document.querySelectorAll('#rpfList .rpf-row').length) }, errs: p.errs.slice() }; };
  // ---- the company account on a phone ----
  const co390 = await visit(L.URL, L.co + L.mgr + L.DAY, 390, async (p) => { const s = await snap(p); await p.screenshot({ path: L.OUT + '/ov3_company_records_390.png' }); await p.evaluate(() => pbGoto('home')); await p.waitForTimeout(1200); await p.screenshot({ path: L.OUT + '/ov3_company_home_390.png' }); s.asks = await p.evaluate(() => (window.__ovFeedAsks || []).filter(a => a.p_filters && Array.isArray(a.p_filters.types) && a.p_filters.types.join() === 'daily,ticket,event').length); return s; });
  L.ok(co390.home.look.cx && !co390.home.look.today && !co390.home.look.table, 'company account, 390: no Today table on Home');
  L.ok(co390.asks === 0, 'company account, 390: the table’s ask of the feed is not made on a phone');
  L.ok(!co390.rec.look.table && !co390.rec.look.bar && co390.rec.rows === 8 && /rpf-rows/.test(co390.rec.list), 'company account, 390: Records is the list (8 rows), no table, no find box');
  L.ok(co390.home.over.length === 0 && co390.rec.over.length === 0, 'company account, 390: nothing off the side ' + JSON.stringify(co390.home.over.concat(co390.rec.over)));
  if (hasBase) {
    const b390 = await visit(BASE, L.co + L.mgr + L.DAY, 390, snap);
    L.ok(b390.home.text === co390.home.text, 'company account, 390: Home reads the same as before the patches');
    L.ok(b390.rec.list === co390.rec.list && b390.rec.text === co390.rec.text, 'company account, 390: Records is the same list, row for row, as before the patches');
  }
  // ---- foreman and pipelayer, phone and computer ----
  for (const [who, init] of [['foreman', L.co + L.DAY], ['pipelayer', L.co + L.co_pl + L.DAY]]) for (const w of [390, 1440]) {
    const a = await visit(L.URL, init, w, snap);
    L.ok(!a.home.look.cx && !a.home.look.wide && !a.home.look.today && !a.home.look.table && !a.rec.look.table && !a.rec.look.bar && !a.rec.look.wide, who + ', ' + w + ': no office tables, no find box, not the wide page');
    L.ok(a.home.look.appW <= 600 && a.rec.look.appW <= 600, who + ', ' + w + ': the phone column as before (' + a.rec.look.appW + ' px)');
    L.ok(a.errs.length === 0 && a.home.over.length === 0 && a.rec.over.length === 0, who + ', ' + w + ': no page errors, nothing off the side ' + JSON.stringify(a.errs.slice(0, 2).concat(a.home.over, a.rec.over)));
    if (hasBase) { const o = await visit(BASE, init, w, snap); L.ok(o.home.text === a.home.text && o.rec.text === a.rec.text && o.rec.list === a.rec.list, who + ', ' + w + ': Home and Records read the same as before the patches'); }
  }
  L.ok(co390.errs.length === 0, 'no page errors ' + JSON.stringify(co390.errs.slice(0, 3)));
  await L.done({ close: async () => {} });
})().catch(e => { console.log('FAIL crashed', e && e.stack); process.exit(1); });
