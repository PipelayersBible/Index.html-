// Lock + record round trip: node ref/run_lock.js FROM TO [PAGE] [WORKERS]
// For each scenario: fill, calc (A), Review, Lock (modals answered), then
//  1. the record's rows (piFt, bop/inv/top strings, stations) must equal A's rows,
//  2. the record loaded back into the form (Edit Run Data's loader) must calculate exactly A again.
'use strict';
const fs = require('fs'), path = require('path');
const boot = require(__dirname+'/../../../rig/boot'), co = require(__dirname+'/../../../rig/co');
const { gen } = require('./gen');
const FROM = +(process.argv[2] || 0), TO = +(process.argv[3] || 20), PAGE = process.argv[4] || 'cur.html', W = +(process.argv[5] || 3);
const DRV = fs.readFileSync(path.join(__dirname, 'driver.js'), 'utf8');
const PREF = ['I Checked Them', 'Lock Without It', 'Lock Anyway', 'Lock It Anyway', 'Replace', 'Continue', 'OK', 'Got It', 'Close'];
async function modals(p, log) {
  for (let i = 0; i < 8; i++) {
    const m = await p.evaluate(() => { const d = [...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x => x.offsetParent && x.innerText.trim()); return d ? { t: d.innerText.replace(/\s+/g, ' ').slice(0, 160), b: [...d.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.textContent.trim()) } : null; });
    if (!m) return;
    const pick = PREF.find(x => m.b.includes(x)) || m.b[m.b.length - 1]; log.push('modal: ' + m.t.slice(0, 80) + ' -> ' + pick);
    await p.evaluate(t => { const d = [...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x => x.offsetParent && x.innerText.trim()); const b = [...d.querySelectorAll('button')].find(b => b.offsetParent && b.textContent.trim() === t); b.click(); }, pick);
    await p.waitForTimeout(700);
  }
}
(async () => {
  const seeds = []; for (let s = FROM; s < TO; s++) seeds.push(s);
  let n = 0, rows = 0, bad = 0;
  const worker = async () => {
    let B = null, used = 0;
    const fresh = async () => { if (B) await B.b.close(); B = await boot((process.env.PB_ROOT||'http://127.0.0.1:8843/') + PAGE, { init: co }); await B.p.evaluate(src => window.__ev(src), DRV); used = 0; };
    await fresh();
    while (seeds.length) {
      const s = seeds.shift(); if (used >= 6) await fresh(); used++;
      const p = B.p, sc = gen(s), log = [], out = [];
      try {
        const A = await p.evaluate(sc => { window.__g2fill(sc); return window.__g2calc(); }, sc); if (A.errors) continue;
        await p.evaluate(() => window.__g2review()); await p.waitForTimeout(900); await modals(p, log);
        await p.evaluate(() => window.__g2lock()); await p.waitForTimeout(1500); await modals(p, log); await p.waitForTimeout(1500); await modals(p, log);
        const E = await p.evaluate(() => window.__g2rec());
        if (!E) { out.push('not locked: ' + log.join(' | ')); }
        else {
          n++;
          if (E.rows.length !== A.rows.length) out.push('record rows ' + E.rows.length + ' vs calc ' + A.rows.length);
          E.rows.forEach((r, i) => { rows++; const a = A.rows[i]; if (!a) return; if (Math.abs(r.st - a.st) > 1e-6 || Math.abs(r.pi - a.pi) > 1e-6) out.push('record row ' + i + ' ' + r.st + '/' + r.pi + ' vs ' + a.st + '/' + a.pi); ['bop', 'inv', 'top', 'sg'].forEach(k => { if (r[k] !== a.d[k]) out.push('record ' + k + ' at ' + r.st + ': ' + r[k] + ' vs ' + a.d[k]); }); if ((E.sta[i] || '') !== (a.sta || '')) out.push('record station at ' + r.st + ': ' + E.sta[i] + ' vs ' + a.sta); });
          if ((E.vol === null) !== (A.vol.yd3 === null) || (E.vol !== null && Math.abs(E.vol - A.vol.yd3) > 0.01)) out.push('record volume ' + E.vol + ' vs calc ' + A.vol.yd3);
          // round trip: the record back onto the form
          const C = await p.evaluate(() => window.__g2reload());
          if (C.errors) out.push('reloaded form: ' + C.errors.join(' | '));
          else {
            if (C.rows.length !== A.rows.length) out.push('reloaded rows ' + C.rows.length + ' vs ' + A.rows.length);
            C.rows.forEach((r, i) => { const a = A.rows[i]; if (!a) return; [['pi', 'INV'], ['bp', 'BOP'], ['tp', 'TOP'], ['sg', 'SG'], ['ri', 'rINV'], ['rb', 'rBOP'], ['rt', 'rTOP']].forEach(([k, nm]) => { const x = a[k], y = r[k]; if ((x === null) !== (y === null) || (x !== null && Math.abs(x - y) > 0.0005)) out.push('reloaded ' + nm + ' at ' + r.st + ': ' + y + ' vs ' + x); }); if ((r.sta || '') !== (a.sta || '')) out.push('reloaded station at ' + r.st + ': ' + r.sta + ' vs ' + a.sta); });
            if (Math.abs((C.hi || 0) - (A.hi || 0)) > 0.0005) out.push('reloaded HI ' + C.hi + ' vs ' + A.hi);
          }
        }
      } catch (e) { out.push('driver: ' + String(e.message || e).slice(0, 200)); await fresh(); }
      if (B.p.errs.length) out.push('page errors: ' + B.p.errs.splice(0).slice(0, 2).join(' | '));
      if (out.length) { bad++; console.log('seed', s, sc.rod, sc.runs.length + ' runs', JSON.stringify(out.slice(0, 6))); }
    }
    await B.b.close();
  };
  await Promise.all(Array.from({ length: W }, worker));
  console.log(`lock: runs locked ${n}, record rows ${rows}, runs with a mismatch ${bad}`);
})();
