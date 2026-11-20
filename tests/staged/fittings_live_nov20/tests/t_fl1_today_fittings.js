// fittings_live 01: the OFFICE. The Today table's Fittings column fills during the day from what the crews' phones send,
// the signed daily's number takes over once it is signed, a foreman with nothing sent gets one quiet grey line, and the
// side menu runs the full height of the window. Company account on a computer (1440 and 1280), light and dark.
// The fake day is officeview's (its lib.js) plus fittings on the runs:
//   Ray's crew (daily NOT signed): Luis' run in progress 2 of 4 laid (1 tee/wye, 1 bend), his ended run 1 of 1 (a manhole),
//     Marco's run has no fittings -> 3 so far, of 5: 1 tee/wye, 1 bend, 1 manhole/structure.
//   Dana's crew (daily SIGNED, 3 fittings counted on it): Sam's ended run says 5 of 5 -> the table shows the signed 3.
const path = require('path');
if (!process.env.PB_OUT) process.env.PB_OUT = path.resolve(__dirname, '../shots');
const L = require(path.resolve(__dirname, '../../officeview_nov20/tests/lib.js'));
const BASE = process.env.PB_BASE_PAGE || L.URL.replace(/cur\.html.*$/, 'base.html');
const FIT = `;(function(){ window.__flFit={ r1:{n:2,of:4,tw:1,b:1,s:0,o:0}, r2:{n:1,of:1,tw:0,b:0,s:1,o:0}, r4:{n:5,of:5,tw:3,b:2,s:0,o:0} };
  const f=window.__rpcOverride.pb_prod_company_live; window.__rpcOverride.pb_prod_company_live=()=>{ const r=f(); if(r&&window.__flFit) r.people.forEach(p=>p.runs.forEach(x=>{ const v=window.__flFit[x.session_ref]; if(v!==undefined) x.status.fit=v; })); if(r&&window.__flExtraRun) r.people[1].runs.push(window.__flExtraRun(r)); return r; };
  const g=window.__rpcOverride.pb_reports_feed; window.__rpcOverride.pb_reports_feed=(a)=>{ const r=g(a); if(r&&window.__flNoDaily) r.items=r.items.filter(x=>!(x.type==='daily'&&x.job_number==='26043')&&x.type!=='event'); return r; };
  const d=window.__rpcOverride.pb_daily_get; window.__rpcOverride.pb_daily_get=(a)=>{ const r=d(a); if(r&&window.__flDailyNone) r.snapshot.materials.used=r.snapshot.materials.used.filter(x=>x.kind!=='counted'); return r; };
})();`;
const cells = (p) => p.evaluate(() => [...document.querySelectorAll('#ovTable tbody tr.ov-row')].map(tr => [...tr.children].map(td => td.innerText.replace(/\s+/g, ' ').trim())));
const rowOf = (rows, name) => rows.find(r => r[0].startsWith(name)) || [];
const fitCell = (p, name) => p.evaluate((name) => { const tr = [...document.querySelectorAll('#ovTable tbody tr.ov-row')].find(t => t.children[0].innerText.trim().startsWith(name)), e = tr && tr.querySelector('td.ov-c-fittings .ov-fit'); return e ? { n: e.textContent, src: e.dataset.src, tip: e.getAttribute('title'), sub: (tr.querySelector('td.ov-c-fittings .ov-sub') || { textContent: '' }).textContent } : null; }, name);
const refresh = async (p) => { await p.evaluate(() => window.pbOvRefresh()); await p.waitForTimeout(2500); };
// a tall window instead of a "full page" picture: a full-page picture stretches the page but not a fixed side menu
const shot = async (p, name, w) => { const hgt = await p.evaluate(() => Math.max(900, document.documentElement.scrollHeight)); await p.setViewportSize({ width: w, height: Math.min(hgt, 2400) }); await p.waitForTimeout(500); await p.screenshot({ path: L.OUT + '/' + name }); await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300); };
// a computed colour, 'rgb(…)' or 'color(srgb …)' (what color-mix gives), laid over a background when it is see-through
const lum = (c, over) => { const k = /^color\(srgb/.test(String(c)) ? 255 : 1, m = String(c).match(/[\d.]+/g).map(Number), a = m.length > 3 ? m[3] : 1, o = over || { r: 0, g: 0, b: 0 }; const r = m[0] * k * a + o.r * (1 - a), g = m[1] * k * a + o.g * (1 - a), b = m[2] * k * a + o.b * (1 - a); return { r, g, b, y: 0.2126 * r + 0.7152 * g + 0.0722 * b }; };
const idleLook = (p) => p.evaluate(() => { const tr = document.querySelector('#ovTable tr.ov-idle'), other = document.querySelector('#ovTable tr.ov-row:not(.ov-idle)'); if (!tr) return null; const cs = (e) => getComputedStyle(e);
  const over = (fg, bg) => { const a = fg.match(/[\d.]+/g).map(Number), b = bg.match(/[\d.]+/g).map(Number), al = a.length > 3 ? a[3] : 1; return 'rgb(' + [0, 1, 2].map(i => Math.round(a[i] * al + b[i] * (1 - al))).join(', ') + ')'; };
  const surf = cs(document.querySelector('.ov-scroll')).backgroundColor, td = tr.children[1];
  return { n: tr.children.length, span: td.colSpan, text: td.innerText.trim(), all: tr.innerText.replace(/\s+/g, ' ').trim(), bg: over(cs(td).backgroundColor, surf), bg0: over(cs(tr.children[0]).backgroundColor, surf), rowBg: over(cs(other.children[1]).backgroundColor, surf), surf,
    color: cs(td).color, nameColor: cs(tr.querySelector('.ov-open')).color, strong: cs(other.querySelector('.ov-open')).color, h: Math.round(tr.getBoundingClientRect().height), hOther: Math.round(other.getBoundingClientRect().height), right: Math.round(td.getBoundingClientRect().right), tblRight: Math.round(document.getElementById('ovTable').getBoundingClientRect().right) }; });
const side = (p) => p.evaluate(async () => { const n = document.getElementById('pbTabBar'); window.scrollTo(0, document.documentElement.scrollHeight); await new Promise(r => setTimeout(r, 300)); const r = n.getBoundingClientRect(), cs = getComputedStyle(n);
  const o = { pos: cs.position, top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight, scrolled: Math.round(window.scrollY), pageH: document.documentElement.scrollHeight, bg: cs.backgroundColor, atBottomLeft: (document.elementFromPoint(20, window.innerHeight - 3) || {}).id || ((document.elementFromPoint(20, window.innerHeight - 3) || {}).closest ? ((document.elementFromPoint(20, window.innerHeight - 3).closest('#pbTabBar') || {}).id || '') : '') }; window.scrollTo(0, 0); return o; });
(async () => {
  const dark = !!process.env.DARK, tag = dark ? 'dark' : 'light';
  // ---- before: the page as it was (when base.html is served beside cur.html), for the pictures only ----
  let hasBase = true; try { const r = await fetch(BASE, { method: 'HEAD' }); hasBase = r.ok; } catch (e) { hasBase = false; }
  if (hasBase) { const { b, p } = await L.boot(BASE, { init: L.co + L.mgr + L.DAY + FIT, wait: 3500 }); await L.waitFn(p, 'pbGoto');
    for (const w of [1440, 1280]) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(w === 1440 ? 5000 : 2500); await shot(p, 'fl_before_' + w + '_' + tag + '.png', w); }
    const o = await cells(p); console.log('  before:', JSON.stringify(o.map(r => [r[0], r[4], r.length])));
    L.ok(rowOf(o, 'Ray Alvarez')[4] === '–' && rowOf(o, 'Pat Ochoa').length === 10, 'before the patch (same server data): Ray’s fittings are blank until the daily, and the idle row is ten cells of dashes');
    await b.close(); } else console.log('  (no base.html beside the page: no "before" pictures)');
  const { b, p } = await L.boot(L.URL, { init: L.co + L.mgr + L.DAY + FIT, wait: 3500 });
  await L.waitFn(p, 'pbGoto');
  for (const w of [1440, 1280]) {
    await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(w === 1440 ? 5000 : 2500);
    const g = await p.evaluate(() => { const s = document.querySelector('.ov-scroll'), t = document.getElementById('ovTable'); return { box: s ? s.clientWidth : 0, sw: s ? s.scrollWidth : -1, heads: [...document.querySelectorAll('#ovTable thead th')].length }; });
    L.ok(g.heads === 10 && g.sw <= g.box + 1, w + ' ' + tag + ': still ten columns and the table fits its box (' + g.sw + ' <= ' + g.box + ')');
    const o = await L.overflow(p); L.ok(o.length === 0, w + ' ' + tag + ': nothing off the side of the page ' + JSON.stringify(o));
    // ---- the idle row: one quiet grey line ----
    const I = await idleLook(p); console.log('  idle row:', JSON.stringify(I));
    L.ok(I && I.n === 2 && I.span === 9 && I.text === 'Nothing sent today' && I.all === 'Pat Ochoa Nothing sent today' && !/–/.test(I.all), w + ' ' + tag + ': the idle foreman is a name and ONE line across the nine empty columns, no dashes');
    const bg = lum(I.bg), row = lum(I.rowBg), fg = lum(I.color, bg), nm = lum(I.nameColor, bg), st = lum(I.strong);
    L.ok(Math.abs(bg.y - row.y) >= 6 && Math.abs(bg.y - row.y) <= 40 && Math.max(bg.r, bg.g, bg.b) - Math.min(bg.r, bg.g, bg.b) <= 14 && I.bg === I.bg0, w + ' ' + tag + ': the whole row has a soft grey background, clearly not a working row’s (' + I.bg + ' vs ' + I.rowBg + ')');
    const contrast = (a, c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; const y = (x) => 0.2126 * f(x.r) + 0.7152 * f(x.g) + 0.0722 * f(x.b); const A = y(a), C = y(c); return (Math.max(A, C) + 0.05) / (Math.min(A, C) + 0.05); };
    L.ok(contrast(fg, bg) >= 4.5 && contrast(nm, bg) >= 4.5 && Math.abs(nm.y - st.y) > 20, w + ' ' + tag + ': muted text that still reads (contrast ' + contrast(fg, bg).toFixed(1) + ' and ' + contrast(nm, bg).toFixed(1) + ' to 1), quieter than a working crew’s name');
    L.ok(I.h <= I.hOther && I.right >= I.tblRight - 2, w + ' ' + tag + ': the row is no taller than a working row and its line reaches the table’s right edge (' + I.h + ' vs ' + I.hOther + ' px)');
    // ---- the side menu: full height, also at the bottom of a long page ----
    const S = await side(p); console.log('  side menu:', JSON.stringify(S));
    L.ok(S.pos === 'fixed' && S.top === 0 && S.bottom === S.vh && S.pageH > S.vh && S.scrolled > 0 && S.atBottomLeft === 'pbTabBar', w + ' ' + tag + ': the side menu covers the window top to bottom, scrolled to the end of a ' + S.pageH + ' px page');
    await shot(p, 'fl_after_' + w + '_' + tag + '.png', w);
    const P = require('fs').readFileSync(L.OUT + '/fl_after_' + w + '_' + tag + '.png'); L.ok(P.length > 20000, w + ' ' + tag + ': picture saved (' + Math.round(P.length / 1024) + ' KB)');
  }
  // ---- live fittings: the numbers ----
  let R = await cells(p); console.log('  rows:', JSON.stringify(R));
  let ray = await fitCell(p, 'Ray Alvarez'), dana = await fitCell(p, 'Dana Whitley');
  L.ok(ray && ray.n === '3' && ray.src === 'live' && ray.sub === 'so far' && rowOf(R, 'Ray Alvarez')[6] === 'Not yet', 'Ray’s crew, daily not signed: Fittings shows 3 so far (2 + 1 from Luis’ two runs; Marco’s run has none): ' + JSON.stringify(ray));
  L.ok(ray && /^3 of 5 fittings on today’s runs marked laid/.test(ray.tip) && /1 tee\/wye, 1 bend, 1 manhole\/structure\./.test(ray.tip), 'the tooltip says how many of how many, and by type: ' + (ray && ray.tip));
  L.ok(dana && dana.n === '3' && dana.src === 'signed' && dana.sub === '' && /signed daily report/.test(dana.tip) && /^Signed/.test(rowOf(R, 'Dana Whitley')[6]), 'Dana’s crew, daily signed: the signed 3, not the phones’ 5: ' + JSON.stringify(dana));
  L.ok(rowOf(R, 'Ray Alvarez')[3] === '260 ft' && rowOf(R, 'Ray Alvarez')[2] === '2 active · 1 ended' && rowOf(R, 'Ray Alvarez')[5] === '1 open 2 inside' && rowOf(R, 'Dana Whitley')[3] === '210 ft', 'the other columns are what they were');
  // sort by fittings
  await p.click('#ovSort_fittings'); await p.waitForTimeout(300); R = await cells(p);
  L.ok(R.length === 3 && R[2][0].startsWith('Pat'), 'sorting by Fittings works on the shown number; the idle foreman stays last');
  await p.click('#ovSort_crew'); await p.waitForTimeout(300);
  // the opened row
  await p.click('#ovTable tr.ov-row >> text=Ray Alvarez'); await p.waitForTimeout(400);
  const d = await p.evaluate(() => (document.querySelector('#ovTable tr.ov-detail') || { innerText: '' }).innerText.replace(/\s+/g, ' '));
  L.ok(/MH 4 → MH 5 In progress · laid 120 of 400 ft · today 120 ft · fittings 2 of 4 laid/.test(d) && /Fittings laid today: 3 of 5 \(1 tee\/wye, 1 bend, 1 manhole\/structure\)/.test(d) && !/Lateral 12[^M]*fittings/.test(d.split('Permits open')[0].split('Lateral 12')[1] || ''), 'the opened row lists each run’s fittings and the day’s by type');
  await shot(p, 'fl_open_1280_' + tag + '.png', 1280);
  await p.click('#ovTable tr.ov-row >> text=Ray Alvarez'); await p.waitForTimeout(300);
  // ---- the daily not signed yet for Dana: the phones' 5 show; then signed: 3 ----
  await p.evaluate(() => { window.__flNoDaily = true; }); await refresh(p);
  dana = await fitCell(p, 'Dana Whitley'); R = await cells(p);
  L.ok(dana && dana.n === '5' && dana.src === 'live' && dana.sub === 'so far' && /3 tees\/wyes, 2 bends/.test(dana.tip) && rowOf(R, 'Dana Whitley')[6] === 'Not yet', 'before Dana signs: 5 so far from Sam’s phone: ' + JSON.stringify(dana));
  await p.evaluate(() => { window.__flNoDaily = false; }); await refresh(p);
  dana = await fitCell(p, 'Dana Whitley');
  L.ok(dana && dana.n === '3' && dana.src === 'signed', 'after she signs: the signed 3 takes over');
  // ---- a signed daily that counted none (the foreman signed, the pipelayers ran the runs): the phones' count stays ----
  await p.evaluate(() => { window.__flDailyNone = true; const O = window.__pbOvDebug(); }); 
  const pure = await p.evaluate(() => { const F = window.__pbOvFit; const base = { daily: { id: 'x' }, fitOf: 5, fitBy: { tw: 3, b: 2, s: 0, o: 0 }, fitTyped: true };
    return { none: F(Object.assign({}, base, { fittings: 0, fitLive: 5 })), zeroBoth: F(Object.assign({}, base, { fittings: 0, fitLive: 0 })), signedOnly: F(Object.assign({}, base, { fittings: 4, fitLive: null })), notLoaded: F(Object.assign({}, base, { fittings: null, fitLive: 2 })), nothing: F({ daily: null, fittings: null, fitLive: null, fitOf: 0, fitBy: {}, fitTyped: true }), liveZero: F({ daily: null, fittings: null, fitLive: 0, fitOf: 3, fitBy: { tw: 0, b: 0, s: 0, o: 0 }, fitTyped: true }) }; });
  L.ok(pure.none.n === 5 && pure.none.src === 'live' && pure.none.sub === 'on runs' && /signed daily report counted none/.test(pure.none.tip), 'a signed daily that counted none while the phones report 5: the 5 stays, marked "on runs"');
  L.ok(pure.zeroBoth.n === 0 && pure.zeroBoth.src === 'signed' && pure.signedOnly.n === 4 && pure.signedOnly.src === 'signed' && pure.notLoaded.n === 2 && pure.notLoaded.src === 'live', 'signed 0 and phones 0: 0; signed only: signed; signed but its count not loaded yet: the phones’ count meanwhile');
  L.ok(pure.nothing === null && pure.liveZero.n === 0 && pure.liveZero.src === 'live' && /^0 of 3 fittings/.test(pure.liveZero.tip), 'no phone reports fittings and no daily: blank; fittings on the run but none laid yet: 0 so far');
  // ---- only today's runs count; odd values from a phone are not shown ----
  await p.evaluate(() => { window.__flDailyNone = false; window.__flExtraRun = (r) => { const x = JSON.parse(JSON.stringify(r.people[1].runs[0])); x.session_ref = 'r9'; x.run_ref = 'r9'; x.work_date = window.__ovDay.yday; x.ended = false; x.status.sessionRef = 'r9'; x.status.fit = { n: 40, of: 40, tw: 40, b: 0, s: 0, o: 0 }; return x; }; }); await refresh(p);
  ray = await fitCell(p, 'Ray Alvarez'); R = await cells(p);
  L.ok(ray && ray.n === '3' && rowOf(R, 'Ray Alvarez')[2] === '3 active · 1 ended', 'a run open since yesterday is listed but its fittings (40) are not today’s: still 3');
  const odd = await p.evaluate(() => { const B = (fit) => { const day = window.__ovDay.day; const rows = window.__pbOvBuild({ at: Date.now(), runs: { today: day, server_at: new Date().toISOString(), people: [{ id: 'p', name: 'Luis', role: 'pipelayer', foreman: 'Ray', runs: [{ session_ref: 'a', job_number: '1', work_date: day, ended: false, updated_at: new Date().toISOString(), status: { laidFt: 10, fit } }] }] }, permits: null }, [], [], [], {}, day); const r = rows[0]; return [r.fitLive, r.fitTyped, r.fitOf]; };
    return { text: B({ n: '7' }), dec: B({ n: 2.5 }), neg: B({ n: -1 }), big: B({ n: 9999 }), arr: B([3]), str: B('<img src=x onerror=alert(1)>'), nul: B(null), badTypes: B({ n: 3, of: 5, tw: 9, b: 1 }), noTypes: B({ n: 3, of: 5 }), badOf: B({ n: 3, of: 1, tw: 3, b: 0, s: 0, o: 0 }), good: B({ n: 3, of: 5, tw: 2, b: 1, s: 0, o: 0 }) }; });
  console.log('  odd values:', JSON.stringify(odd));
  L.ok(['text', 'dec', 'neg', 'big', 'arr', 'str', 'nul'].every(k => odd[k][0] === null), 'text, decimals, negatives, huge numbers, arrays and markup in "fit" are not counted at all');
  L.ok(odd.badTypes[0] === 3 && odd.badTypes[1] === false && odd.noTypes[0] === 3 && odd.noTypes[1] === false && odd.badOf[2] === 3 && JSON.stringify(odd.good) === '[3,true,5]', 'types that do not add up: the count shows without types; an "of" below the count is not believed');
  // ---- a server from before the update (no "fit" anywhere): as it was ----
  await p.evaluate(() => { window.__flFit = null; window.__flExtraRun = null; }); await refresh(p);
  R = await cells(p);
  L.ok(rowOf(R, 'Ray Alvarez')[4] === '–' && rowOf(R, 'Dana Whitley')[4] === '3', 'a server (or phones) from before this update: Fittings is blank until the daily, then the signed 3, as before');
  L.ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await L.done(b);
})().catch(e => { console.log('FAIL crashed', e && e.stack); process.exit(1); });
