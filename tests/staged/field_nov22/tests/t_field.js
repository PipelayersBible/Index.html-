// field_nov22: Field Conditions review checks (F1, F4-F10). PASS/FAIL per item; exit 1 on any FAIL.
// Run: PB_URL=http://127.0.0.1:PORT/cur.html node t_field.js   (page served with sw.js, data/ and pbx/ next to it)
// Fails on the r17.15 candidate, passes on the field_nov22 build.
const R = __dirname + '/../../../rig/';
const { chromium } = require('playwright'); const fs = require('fs');
const co = require(R + 'co_fm'), F = require(R + 'flow'), mk = require(R + 'mkrun');
const URL0 = process.env.PB_URL || 'http://127.0.0.1:10911/cur.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// a fake screen wake lock that records what the app asks for
const WAKE = `(function(){window.__wl={req:0,rel:0,cur:null};const stub={request:async()=>{window.__wl.req++;const cb=[];const l={released:false,type:'screen',addEventListener:(t,f)=>cb.push(f),release:async()=>{if(l.released)return;l.released=true;window.__wl.rel++;cb.forEach(f=>{try{f()}catch(e){}})}};window.__wl.cur=l;return l;}};try{Object.defineProperty(Navigator.prototype,'wakeLock',{configurable:true,get(){return stub;}});}catch(e){}})();`;
const wakeHeld = (p) => p.evaluate(() => !!(window.__wl.cur && !window.__wl.cur.released));

async function boot(o = {}) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: o.w || 360, height: o.h || 740 }, serviceWorkers: 'block', hasTouch: !!o.touch });
  let fsb = fs.readFileSync(R + 'fakesb.js', 'utf8');
  if (o.slow) fsb = fsb.replace('const res=(data)=>Promise.resolve({data,error:null});', 'const __slow=(()=>{try{return localStorage.getItem("pbSlowAuth")!=="0";}catch(e){return true;}})();const res=(data)=>__slow?new Promise(r=>setTimeout(()=>r({data,error:null}),' + o.slow + ')):Promise.resolve({data,error:null});');
  await ctx.route(/supabase-js/, r => r.fulfill({ contentType: 'application/javascript', body: fsb }));
  await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await require(R + 'env').applyClock(ctx);
  await ctx.addInitScript(co); await ctx.addInitScript(WAKE);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  if (o.noGoto) return { b, ctx, p, H: F(p) };
  await p.goto(URL0, { waitUntil: 'load' }); await p.waitForTimeout(o.wait || 3000);
  return { b, ctx, p, H: F(p) };
}
async function lockRun(p, H, dist) {
  await p.getByText('New Run', { exact: true }).click(); await p.waitForTimeout(1000); await H.f('saJobNumber', '24-017');
  await p.evaluate(() => pbGoto('home', true, true)); await p.waitForTimeout(300);
  await mk(p, dist || 100);
  await H.click('Lock This Run'); await p.waitForTimeout(800);
  for (let i = 0; i < 4; i++) { const m = await H.modal(); if (!m) break; const bt = await H.modalBtns(); await H.modalClick(bt.includes('Lock Without It') ? 'Lock Without It' : bt[bt.length - 1]); await p.waitForTimeout(1000); }
  await p.waitForTimeout(800);
}
// grade rows fully on screen: under the header, above the tab bar, inside the grade sheet box
const rowsOnScreen = (p) => p.evaluate(() => {
  const hdr = document.querySelector('#screen-results > .pb-header').getBoundingClientRect();
  const shell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pb-shell-h')) || 0;
  const w = document.querySelector('#screen-results .pb-table-wrap').getBoundingClientRect(), th = document.querySelector('#resultsTable thead').getBoundingClientRect();
  const top = Math.max(hdr.bottom, w.top + th.height), bot = Math.min(innerHeight - shell, w.bottom);
  return [...document.querySelectorAll('#resultsBody tr[data-laid-idx]:not([data-laid-strip])')].filter(tr => { const r = tr.getBoundingClientRect(); return tr.offsetParent && r.height > 0 && r.top >= top - 1 && r.bottom <= bot + 1; }).length;
});
const nextOnScreen = (p) => p.evaluate(() => {
  const nx = document.querySelector('#resultsBody tr.pb-laid-next:not([data-laid-strip])'); if (!nx) return 'none';
  const hdr = document.querySelector('#screen-results > .pb-header').getBoundingClientRect();
  const shell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pb-shell-h')) || 0;
  const w = document.querySelector('#screen-results .pb-table-wrap').getBoundingClientRect(), r = nx.getBoundingClientRect();
  return r.top >= Math.max(hdr.bottom, w.top) - 1 && r.bottom <= Math.min(innerHeight - shell, w.bottom) + 1;
});
const vis = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); return !!e && !!e.offsetParent && e.getClientRects().length > 0; }, sel);

(async () => {
  // ================= F1 / F4 / F7 / F9-mouse / F10 / grade values: one run at 360 x 740 =================
  { const { b, p, H } = await boot({ w: 360, h: 740 });
    // F10: Home, nothing going: no wake lock
    await p.waitForTimeout(800);
    ok(!(await wakeHeld(p)), 'F10 Home with nothing going: the screen is not kept awake (requests so far ' + (await p.evaluate(() => window.__wl.req)) + ')');
    await lockRun(p, H, 200);
    const n740 = await rowsOnScreen(p);
    ok(n740 >= 4, 'F1 360x740 a run going: grade rows on screen when Results opens >= 4 (' + n740 + ')');
    const top = await p.evaluate(() => { const t = document.getElementById('pbRsTop'); return t && t.offsetParent ? t.innerText.replace(/\s+/g, ' ') : ''; });
    ok(/Trench 4 ft or Deeper/.test(top) && /Flagged at Lock \(1\)/.test(top), 'F1 the one line still says the trench warning and the lock flag in words ("' + top + '")');
    ok(!(await vis(p, '#screen-results button[onclick^="pbEditRunData"]')) && !(await vis(p, '#runDetails')) && !(await vis(p, '#zoomToggleBtn')), 'F1 Edit Run Data, Run details and Columns/Zoom are folded into that line');
    ok(await vis(p, '#laidProgress #pbBrkBtn'), 'F1 Break stays on screen');
    await p.evaluate(() => { const x = document.getElementById('pbRsTopBtn'); if (x) x.click(); }); await p.waitForTimeout(400);
    const opened = await p.evaluate(() => { const b = document.querySelector('#lockFlagsWrap .pb-wc[data-wc="depth"] .pb-wc-body'); return { body: !!b && !b.hidden && b.offsetParent ? b.innerText.slice(0, 60) : '', edit: !!(document.querySelector('#resEditWrap button, #screen-results button[onclick^="pbEditRunData"]') || {}).offsetParent, zoom: !!document.getElementById('zoomToggleBtn').offsetParent }; });
    ok(!!opened.body && opened.edit && opened.zoom, 'F1 a tap opens everything, the trench text open ("' + opened.body + '")');
    // F10: Results on a run going: kept awake
    await p.waitForTimeout(300);
    ok(await wakeHeld(p), 'F10 Run Results on a run going: the screen is kept awake');
    // F7: Zoom on 360 keeps INV on screen
    const z = await p.evaluate(async () => { const t = document.getElementById('resultsTable'), w = t.parentElement, n = +t.dataset.rsFs; pbToggleZoom(); await new Promise(r => setTimeout(r, 500));
      const inv = [...t.querySelectorAll('thead th')].find(th => th.textContent.trim() === 'INV'), wr = w.getBoundingClientRect(), r = inv.getBoundingClientRect();
      const o = { n, z: +t.dataset.rsFs, right: Math.round(r.right), box: Math.round(wr.right), scroll: w.scrollWidth - w.clientWidth }; pbToggleZoom(); await new Promise(r => setTimeout(r, 400)); return o; });
    ok(z.right <= z.box + 1 && z.scroll <= 1 && z.z > z.n, 'F7 Zoom at 360: INV stays on screen and the numbers get bigger (' + JSON.stringify(z) + ')');
    // grade math unchanged: every row of the 200 ft run, BOP = INV + 0.08, INV = 9.80 + 1% of the distance
    const rows = await p.evaluate(() => { const e = window.__pbCsEntry(); return e.intervalRows.map(r => [r.stationFt, r.bop, r.inv]); });
    ok(rows.length > 5 && rows.every(([ft, bop, inv]) => Math.abs(Number(bop) - Number(inv) - 0.08) < 0.0051), 'grade values: BOP = INV + 0.08 on all ' + rows.length + ' rows (' + JSON.stringify(rows.slice(0, 3)) + ')');
    console.log('INFO grade rows ' + JSON.stringify(rows));
    // F9 (mouse): a mouse click still opens the Copy sheet
    await p.evaluate(() => { const r = document.getElementById('pbRsTopBtn'); if (r && r.getAttribute('aria-expanded') === 'true') r.click(); }); await p.waitForTimeout(300);
    const cell = await p.evaluate(() => { const td = document.querySelector('#resultsBody tr[data-laid-idx]:not([data-laid-strip]) td.pb-tap-copy[data-field="inv"]'); td.scrollIntoView({ block: 'center' }); const r = td.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.click(cell.x, cell.y); await p.waitForTimeout(500);
    const m1 = await H.modal(); ok(/Copy Number/.test(m1 || ''), 'F9 a mouse click on INV still opens Copy');
    if (m1) await H.modalClick('Cancel').catch(() => {});
    // F1: rows laid, then Home and back: Results opens with the Next row in view
    await p.evaluate(() => pbLaidMark(9)); await p.waitForTimeout(1500);
    await p.evaluate(() => { window.scrollTo(0, 0); const w = document.querySelector('#screen-results .pb-table-wrap'); w.scrollTop = 0; });
    await p.evaluate(() => pbGotoTab('home')); await p.waitForTimeout(800);
    ok(!(await wakeHeld(p)), 'F10 back on Home: the wake lock is let go');
    await p.evaluate(() => { try { pbResumeLastRunResults(); } catch (e) { pbGoto('results'); } }); await p.waitForTimeout(1200);
    ok((await nextOnScreen(p)) === true, 'F1 a run 10 rows in: Results opens with the Next row on screen');
    // F1: an ended run keeps every block (Edit Run Data shows)
    const lbl = await p.evaluate(() => window.pbRfEndLabel ? window.pbRfEndLabel() : 'End Run');
    await p.evaluate(() => { const r = document.getElementById('pbRsTopBtn'); if (r) r.click(); }); await p.waitForTimeout(300);
    await H.click(lbl).catch(() => {}); await p.waitForTimeout(500);
    for (let i = 0; i < 4; i++) { const m = await H.modal(); if (!m) break; const bt = await H.modalBtns(); await H.modalClick(bt[0] === 'Go Back' ? 'End Run' : bt[bt.length - 1]); await p.waitForTimeout(800); }
    await p.waitForTimeout(1500);
    await p.evaluate(() => { const e = window.__ra().filter(x => x.kind === 'run').slice(-1)[0]; window.__cur(e.id); pbGoto('results'); }).catch(() => {});
    await p.waitForTimeout(1200);
    const ended = await p.evaluate(() => { const e = window.__pbCsEntry(); return { ended: !!(e && (e.completed || e.incomplete)), edit: !!document.querySelector('#resEditWrap button, #screen-results button[onclick^="pbEditRunData"]').offsetParent, top: !!(document.getElementById('pbRsTop') || {}).offsetParent }; });
    ok(ended.ended && ended.edit && !ended.top, 'F1 an ended run: unchanged, every block shows (' + JSON.stringify(ended) + ')');
    await p.waitForTimeout(5500);
    ok(!(await wakeHeld(p)), 'F10 an ended run on Results: not kept awake');
    ok(p.errs.length === 0, 'no page errors (' + p.errs.slice(0, 2).join(' | ') + ')');
    await b.close(); }

  // ================= F1 at 360 x 640, F4 the laid toast =================
  { const { b, p, H } = await boot({ w: 360, h: 640 });
    await lockRun(p, H, 200);
    const n640 = await rowsOnScreen(p);
    ok(n640 >= 2, 'F1 360x640 a run going: grade rows on screen when Results opens >= 2 (' + n640 + ')');
    // mark the Next row laid (its row sheet, as a crew does)
    for (const idx of [0, 1, 2]) {
      await p.evaluate(i => pbLaidMark(i), idx); await p.waitForTimeout(idx === 2 ? 900 : 1400);
      const r = await p.evaluate(() => { const t = document.getElementById('pbLaidToast'), nx = document.querySelector('#resultsBody tr.pb-laid-next:not([data-laid-strip])'); if (!t || t.hidden) return { toast: false };
        const a = t.getBoundingClientRect(), n = nx.getBoundingClientRect(), u = t.querySelector('button').getBoundingClientRect();
        return { toast: true, over: a.bottom > n.top && a.top < n.bottom, undoOverNext: u.bottom > n.top && u.top < n.bottom, t: [Math.round(a.top), Math.round(a.bottom)], next: [Math.round(n.top), Math.round(n.bottom)], txt: t.innerText.replace(/\s+/g, ' '), bg: getComputedStyle(t.querySelector('button')).backgroundColor }; });
      ok(r.toast && !r.over, 'F4 mark ' + idx + ': the "Laid to" toast does not cover the Next row (' + JSON.stringify(r) + ')');
      if (idx === 2) ok(r.toast && !/(242|245|247), (19\d|20\d|21\d), /.test(r.bg), 'F4 Undo is not a yellow button (' + r.bg + ')');
    }
    // a tap meant for the next thing, landing on Undo right after the mark, does not undo it
    await p.evaluate(() => pbLaidMark(4)); await p.waitForTimeout(150);
    const n0 = await p.evaluate(() => pbLaidSummaryOf(window.__cur()).n);
    await p.evaluate(() => { const u = document.querySelector('#pbLaidToast button'); if (u) u.click(); }); await p.waitForTimeout(900);
    const n1 = await p.evaluate(() => pbLaidSummaryOf(window.__cur()).n), still = await p.evaluate(() => { const t = document.getElementById('pbLaidToast'); return !!t && !t.hidden; });
    ok(n1 === n0 && n0 >= 5 && still, 'F4 a tap on Undo within 0.6 s of the mark is ignored, Undo still there (' + n0 + ' -> ' + n1 + ')');
    await p.evaluate(() => { const u = document.querySelector('#pbLaidToast button'); if (u) u.click(); }); await p.waitForTimeout(1200);
    const n2 = await p.evaluate(() => pbLaidSummaryOf(window.__cur()).n);
    ok(n2 < n1, 'F4 Undo after that still undoes the mark (' + n1 + ' -> ' + n2 + ')');
    ok(p.errs.length === 0, 'no page errors (' + p.errs.slice(0, 2).join(' | ') + ')');
    await b.close(); }

  // ================= F9 touch: tap vs press and hold =================
  { const { b, ctx, p, H } = await boot({ w: 360, h: 740, touch: true });
    await lockRun(p, H, 100);
    const c = await p.evaluate(() => { const td = document.querySelector('#resultsBody tr[data-laid-idx]:not([data-laid-strip]) td.pb-tap-copy[data-field="bop"]'); const r = td.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
    await p.touchscreen.tap(c.x, c.y); await p.waitForTimeout(700);
    const mt = await H.modal(); ok(!/Copy Number/.test(mt || ''), 'F9 a finger tap on BOP does not open Copy (' + (mt || 'nothing').slice(0, 40) + ')');
    if (mt) { const bt = await H.modalBtns(); await H.modalClick(bt.includes('Cancel') ? 'Cancel' : bt[bt.length - 1]).catch(() => {}); await p.waitForTimeout(300); }
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] }); await sleep(700);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(600);
    const ml = await H.modal(); ok(/Copy Number/.test(ml || ''), 'F9 press and hold on BOP opens Copy (' + (ml || 'nothing').slice(0, 40) + ')');
    await b.close(); }

  // ================= F6 / F8 measurements =================
  { const { b, p, H } = await boot({ w: 360, h: 740 });
    await lockRun(p, H, 100);
    await p.evaluate(() => pbSetTextSize(140)); await p.waitForTimeout(700);
    await p.evaluate(() => { const b = document.getElementById('pbRsTopBtn'); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); }); await p.waitForTimeout(400);
    const sum = await p.evaluate(() => { const e = document.getElementById('runDetailsSum'); return { sw: e.scrollWidth, cw: e.clientWidth, txt: e.textContent }; });
    ok(sum.sw <= sum.cw + 1 && /8"/.test(sum.txt), 'F6 Extra Large: Run details shows distance, slope and pipe size whole (' + JSON.stringify(sum) + ')');
    const st = await p.evaluate(() => { const d = [...document.querySelectorAll('#laidProgress dt')].map(x => { const r = x.getBoundingClientRect(); return { t: x.textContent, l: r.left, r: r.right, sw: x.scrollWidth, cw: x.clientWidth }; }); let gap = 99; for (let i = 1; i < d.length; i++) gap = Math.min(gap, d[i].l - d[i - 1].r); return { gap: Math.round(gap), cut: d.some(x => x.sw > x.cw + 1), d: d.map(x => x.t) }; });
    ok(st.gap >= 4 && !st.cut, 'F6 Extra Large: Pipe laid / Avg. time / Current time labels have room (' + JSON.stringify(st) + ')');
    await p.evaluate(() => pbGoto('inspCheck')); await p.waitForTimeout(700);
    const pa = await p.evaluate(() => [...document.querySelectorAll('#icResult > button')].map(x => ({ t: x.textContent, sw: x.scrollWidth, cw: x.clientWidth })));
    ok(pa.length === 3 && pa.every(x => x.sw <= x.cw + 1), 'F6 Extra Large: Pass / Fail / Partial words fit their buttons (' + JSON.stringify(pa) + ')');
    await p.evaluate(() => pbSetTextSize(100)); await p.waitForTimeout(400);
    await p.evaluate(() => pbGoto('input')); await p.waitForTimeout(900);
    const ax = await p.evaluate(() => [...document.querySelectorAll('.pb-add-xing-section, .pb-add-hub-section')].filter(x => x.offsetParent).map(x => ({ t: x.innerText.trim(), sw: x.scrollWidth, cw: x.clientWidth })));
    ok(ax.length >= 2 && ax.every(x => x.sw <= x.cw + 1), 'F6 Normal text at 360: "+ Add Crossing" / "+ Add Hub" fit their boxes (' + JSON.stringify(ax) + ')');
    // F8: Run Setup Clear
    const cl = await p.evaluate(() => { const x = document.querySelector('#screen-input .pb-job-reset'); if (!x || !x.offsetParent) return null; const r = x.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    ok(!!cl && cl[0] >= 44 && cl[1] >= 44, 'F8 Run Setup Clear is at least 44 x 44 (' + JSON.stringify(cl) + ')');
    // F8: links hit 18 px above and below their text
    const hit = (sel) => p.evaluate(sel => { const out = []; document.querySelectorAll(sel).forEach(a => { if (!a.offsetParent || a.getClientRects().length !== 1) return; a.scrollIntoView({ block: 'center' }); const r = a.getBoundingClientRect(); if (r.height > 30) return; const x = r.left + r.width / 2, cy = r.top + r.height / 2; const h = (y) => { const e = document.elementFromPoint(x, y); if (!e) return false; if (e === a || a.contains(e)) return true; const o = e.closest && e.closest('a'); if (!o || o === a) return false; const orr = o.getBoundingClientRect(); return y >= orr.top - 12 && y <= orr.bottom + 12; /* a tap nearer another link's own words goes to that link */ }; out.push({ t: a.textContent.trim().slice(0, 24), up: h(cy - 18), down: h(cy + 18) }); }); return out; }, sel);
    await p.evaluate(() => pbOpenSettings()); await p.waitForTimeout(700);
    const tl = await hit('#settingsLegal a');
    ok(tl.length >= 2 && tl.every(x => x.up && x.down), 'F8 Settings: Terms / Privacy links take a tap 18 px above or below the words (' + JSON.stringify(tl) + ')');
    await p.evaluate(() => pbGoto('refTrench')); await p.waitForTimeout(700);
    const ol = await hit('#screen-refTrench a.pb-extlink');
    await p.evaluate(() => pbGoto('refSafety')); await p.waitForTimeout(700);
    const ol2 = await hit('#screen-refSafety a.pb-extlink');
    const all = ol.concat(ol2);
    ok(all.length >= 3 && all.every(x => x.up && x.down), 'F8 Education: OSHA links take a tap 18 px above or below (' + all.length + ' links; misses: ' + JSON.stringify(all.filter(x => !(x.up && x.down)).slice(0, 3)) + ')');
    await p.evaluate(() => pbGotoTab('home')); await p.waitForTimeout(800);
    const dots = await p.evaluate(() => [...document.querySelectorAll('#screen-home .pb-ng-dots')].filter(x => x.offsetParent).map(x => { const r = x.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    console.log('INFO Home notice dots on screen: ' + JSON.stringify(dots) + ' (CSS gives 44 x 44)');
    await b.close(); }
  { const { b, p } = await boot({ w: 320, h: 640 });
    await p.evaluate(() => pbSetTextSize(140)); await p.waitForTimeout(700);
    const tb = await p.evaluate(() => [...document.querySelectorAll('#pbTabBar .pb-tab .lb')].map(l => { const rg = document.createRange(); rg.selectNodeContents(l); return { t: l.textContent.trim(), text: +rg.getBoundingClientRect().width.toFixed(1), box: +l.getBoundingClientRect().width.toFixed(1), fs: getComputedStyle(l).fontSize, z: getComputedStyle(document.getElementById('pbTabBar')).zoom }; }));
    const rec = tb.find(x => x.t === 'Records');
    ok(!!rec && rec.text <= rec.box + 0.5, 'F6 320 px Extra Large: the Records tab label is whole, not "Recor…" (' + JSON.stringify(rec) + '; drawn at font-size x zoom)');
    await b.close(); }

  // ================= F5 first open, weak signal: every server answer takes 3 s, no plan kept on the phone =================
  { const { b, p } = await boot({ w: 360, h: 740, slow: 3000, noGoto: true });
    const t0 = Date.now(); p.goto(URL0, { waitUntil: 'commit' }).catch(() => {});
    let seen = null, alertTxt = '';
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      const s = await p.evaluate(() => { const c = document.getElementById('pbBootCover'); const l = document.getElementById('pbAcctLoading'); const t = document.getElementById('homeTileNewRun');
        return { cover: !!c && getComputedStyle(c).display !== 'none', load: !!l && !l.hidden && !!l.offsetParent ? l.innerText.trim() : '', locked: !!t && t.classList.contains('pb-home-tile-locked'), after: t ? getComputedStyle(t.querySelector('.sub') || t, '::after').content : '' }; }).catch(() => null);
      if (s && !s.cover && s.locked) { seen = s; break; }
    }
    ok(!!seen && /^Loading your account/.test(seen.load), 'F5 tiles not usable yet: Home says "Loading your account…" (' + JSON.stringify(seen) + ')');
    ok(!!seen && !/Requires subscription/.test(seen.after), 'F5 meanwhile the tiles do not claim a subscription is needed (' + (seen && seen.after) + ')');
    await p.evaluate(() => { const t = document.getElementById('homeTileNewRun'); t && t.click(); }); await p.waitForTimeout(400);
    alertTxt = await p.evaluate(() => { const d = [...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x => x.offsetParent && x.innerText.trim()); return d ? d.innerText.replace(/\s+/g, ' ').slice(0, 120) : ''; });
    ok(/Still loading your account/.test(alertTxt) && !/Subscription Required/.test(alertTxt), 'F5 a tap then says it is still loading, not "Subscription Required" ("' + alertTxt + '")');
    await p.evaluate(() => { try { pbHideModal(); } catch (e) {} });
    let done = null;
    for (let i = 0; i < 60; i++) { await sleep(500); const s = await p.evaluate(() => { const l = document.getElementById('pbAcctLoading'), t = document.getElementById('homeTileNewRun'); return { load: !!l && !l.hidden, locked: !!t && t.classList.contains('pb-home-tile-locked') }; }); if (!s.locked) { done = s; break; } }
    ok(!!done && !done.load, 'F5 once the plan answers the line goes and New Run opens (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s, ' + JSON.stringify(done) + ')');
    // a returning phone (plan kept): no Loading line even on weak signal
    await p.reload({ waitUntil: 'commit' }); let r2 = null;
    for (let i = 0; i < 20; i++) { await sleep(500); r2 = await p.evaluate(() => { const c = document.getElementById('pbBootCover'), l = document.getElementById('pbAcctLoading'), t = document.getElementById('homeTileNewRun'); return { cover: !!c && getComputedStyle(c).display !== 'none', load: !!l && !l.hidden, locked: !!t && t.classList.contains('pb-home-tile-locked') }; }).catch(() => null); if (r2 && !r2.cover) break; }
    ok(!!r2 && !r2.cover && !r2.load && !r2.locked, 'F5 a phone with its plan kept: opens at once, no Loading line (' + JSON.stringify(r2) + ')');
    ok(p.errs.length === 0, 'no page errors (' + p.errs.slice(0, 2).join(' | ') + ')');
    await b.close(); }

  console.log(fails ? 'DONE with ' + fails + ' FAIL' : 'DONE all pass'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL crashed: ' + e.stack); process.exit(1); });
