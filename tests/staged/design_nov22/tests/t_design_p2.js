// design_nov22 PHASE 2 (look) checks, computed styles. PASS/FAIL; exit 1 on any FAIL.
const R = __dirname + '/../../../rig/';
const boot = require(R + 'boot'), co = require(R + 'co_fm'), F = require(R + 'flow');
const URL0 = process.env.PB_URL || 'http://127.0.0.1:10700/cur.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const yellow = (c) => { const m = String(c).match(/\d+(\.\d+)?/g); if (!m) return false; const [r, g, b, a] = m.map(Number); if (m.length === 4 && a < 0.5) return false; return r > 220 && g > 160 && g < 215 && b < 90; };
(async () => {
  const { b, p } = await boot(URL0, { init: co }); const H = F(p);
  const st = (sel, prop, pseudo) => p.evaluate(([s, pr, ps]) => { const e = document.querySelector(s); if (!e || !e.offsetParent) return null; return getComputedStyle(e, ps || null)[pr]; }, [sel, prop, pseudo]);
  // Feedback: one size, not yellow, on several screens
  const sizes = [];
  for (const s of ['home', 'trenchCalc', 'formulasHub', 'input', 'confinedPermit', 'results', 'settings']) {
    await p.evaluate(s => pbGoto(s), s); await p.waitForTimeout(900);
    const f = await p.evaluate(() => { const e = document.querySelector('.pb-screen.active .pb-fb-pill') || document.getElementById('pbFbPill'); if (!e || !e.offsetParent) return null; const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return { h: Math.round(r.height), fs: c.fontSize, bg: c.backgroundColor, txt: e.innerText.trim() }; });
    if (f) sizes.push(s + ':' + f.h + '/' + f.fs + '/' + f.txt);
    if (f) ok(!yellow(f.bg), 'A-1 Feedback on ' + s + ' is not solid yellow (' + f.bg + ')');
    const t = await p.evaluate(() => { const h = document.querySelector('.pb-screen.active > .pb-header > .pb-title'); return h ? getComputedStyle(h).hyphens : null; });
    if (t) ok(t === 'none', 'A-2 ' + s + ' title is never hyphenated');
  }
  ok(new Set(sizes.map(x => x.split(':')[1])).size === 1, 'A-2 Feedback is the same size and word everywhere (' + sizes.join(' ') + ')');
  // calculator: star chip under the title, title one size
  await p.evaluate(() => pbGoto('trenchCalc')); await p.waitForTimeout(700);
  const g = await p.evaluate(() => { const t = document.querySelector('#screen-trenchCalc .pb-title').getBoundingClientRect(), a = document.querySelector('#screen-trenchCalc .pb-addhome').getBoundingClientRect(); return { below: a.top >= t.bottom - 2, ah: Math.round(a.height), fs: getComputedStyle(document.querySelector('#screen-trenchCalc .pb-title')).fontSize }; });
  ok(g.below && g.ah <= 34, 'A-2 calculator Add to Home is a small chip under the title (' + JSON.stringify(g) + ')');
  ok(g.fs === '24px', 'A-2 calculator title 24px, not shrunk (' + g.fs + ')');
  const warnBg = await st('#screen-trenchCalc > .pb-warn', 'borderLeftColor');
  const infoBg = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--pb-info') || getComputedStyle(document.getElementById('pbApp')).getPropertyValue('--pb-info'));
  ok(!!warnBg && !/^rgb\(2[0-9][0-9], [0-9]{1,2}, [0-9]{1,2}\)$/.test(warnBg), 'A-10 trench OSHA-table note is not red (' + warnBg + ')');
  // Run Setup: step numbers neutral, needs-a-pick on Pipe size, selected toggle calm
  await p.evaluate(() => pbGoto('home', true, true)); await p.getByText('New Run', { exact: true }).click(); await p.waitForTimeout(1200);
  ok(!yellow(await st('#screen-input .pb-runsec-num', 'backgroundColor')), 'A-1 Run Setup step numbers are not yellow');
  const sel = await p.evaluate(() => { const b = document.querySelector('#screen-input .pb-toggle > button.active'); return b ? getComputedStyle(b).backgroundColor : null; });
  ok(sel && !yellow(sel), 'A-1 a made choice (selected toggle) is calm, not yellow (' + sel + ')');
  const pick0 = await st('#runIdSel', 'borderTopColor');
  ok(yellow(pick0) || /rgb\(217, 163, 0\)/.test(pick0), 'A-1 Pipe size still to pick shows a yellow outline (' + pick0 + ')');
  await H.sel('runIdSel', '8"');
  const pick1 = await st('#runIdSel', 'borderTopColor');
  ok(!(yellow(pick1) || /rgb\(217, 163, 0\)/.test(pick1)), 'A-1 once picked the outline goes calm (' + pick1 + ')');
  const ai = await st('#pbBatchBtn', 'backgroundColor');
  ok(ai !== null && !yellow(ai), 'A-1 Read All Stake Photos is not solid yellow (' + ai + ')');
  const rv = await p.evaluate(() => { const x = [...document.querySelectorAll('#screen-input .pb-btn')].find(b => b.offsetParent && b.textContent.trim() === 'Review & Calculate'); return x ? getComputedStyle(x).backgroundColor : null; });
  ok(rv && yellow(rv), 'A-1 the next step (Review & Calculate) stays yellow (' + rv + ')');
  const fm = await p.evaluate(() => { const r = document.querySelector('#screen-input .pb-whorow'); return r ? getComputedStyle(r).gridTemplateColumns.split(' ').length : null; });
  ok(fm === 1 || fm === null, 'A-11 Foreman and Pipelayer each get a full row (' + fm + ' column)');
  // Permit: required empty boxes outlined, explanation behind (i)
  await p.evaluate(() => pbGoto('home', true, true)); await p.waitForTimeout(300);
  await p.evaluate(() => pbOpenConfinedPermitForm()); await p.waitForTimeout(1200);
  for (let i = 0; i < 2; i++) { const m = await H.modal(); if (!m) break; const bt = await H.modalBtns(); await H.modalClick(bt[bt.length - 1]).catch(() => {}); }
  const need = await p.evaluate(() => [...document.querySelectorAll('#screen-confinedPermit .pb-need-pick')].map(e => e.id));
  ok(need.includes('cpSpace') && !need.includes('cpDate'), 'A-1 permit: empty required boxes marked, filled ones not (' + need.join(',') + ')');
  await H.f('cpSpace', 'MH 4'); await p.waitForTimeout(400);
  ok(!(await p.evaluate(() => document.getElementById('cpSpace').classList.contains('pb-need-pick'))), 'A-1 permit: a box loses the mark once filled');
  const band = await p.evaluate(() => document.getElementById('cpDraftBand').innerText.replace(/\s+/g, ' '));
  ok(/What a draft does/.test(band) && !/Nothing here allows entry/.test(band), 'A-9 permit top: badge + (i), the explanation folded (' + band.slice(0, 80) + ')');
  ok(await p.evaluate(() => /Nothing here allows entry/.test(document.getElementById('cpDraftBand').textContent)), 'A-9 the same words are still there behind (i)');
  ok(!yellow(await st('#screen-confinedPermit .cp-group-num', 'backgroundColor')), 'A-1 permit group numbers are not yellow');
  const lockBtn = await p.evaluate(() => { const x = [...document.querySelectorAll('#screen-confinedPermit .pb-btn')].find(b => b.offsetParent && /Lock & Activate/.test(b.textContent)); return x ? getComputedStyle(x).backgroundColor : null; });
  ok(lockBtn && yellow(lockBtn), 'A-1 Lock & Activate Permit stays yellow (' + lockBtn + ')');
  ok(p.errs.length === 0, 'no page errors (' + p.errs.slice(0, 2).join(' | ') + ')');
  await b.close(); console.log(fails ? 'DONE with ' + fails + ' FAIL' : 'DONE all pass'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL crashed: ' + e.message); process.exit(1); });
