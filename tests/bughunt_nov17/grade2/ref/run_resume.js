// End short + Resume with a NEW HI: node ref/run_resume.js FROM TO [PAGE] [WORKERS]
// Lock, mark laid to an interval row, end the run there, Resume, shoot the "Left off" point from a new setup
// (HI' = HI + delta). Every row of the resumed sheet must keep the grade (invert) it had, and every rod reading must be
// HI' - invert (the old shots belong to the old setup).
'use strict';
const fs = require('fs'), path = require('path');
const boot = require('/home/claude/rig/boot'), co = require('/home/claude/rig/co');
const { gen, rng } = require('./gen');
const FROM = +(process.argv[2] || 0), TO = +(process.argv[3] || 20), PAGE = process.argv[4] || 'cur.html', W = +(process.argv[5] || 3);
const DRV = fs.readFileSync(path.join(__dirname, 'driver.js'), 'utf8');
const PREF = ['I Checked Them', 'Lock Without It', 'Lock Anyway', 'Lock It Anyway', 'End Here', 'End Run Here', 'Resume', 'Continue', 'Yes', 'OK', 'Got It', 'Close'];
async function modals(p, log) { for (let i = 0; i < 8; i++) { const m = await p.evaluate(() => { const d = [...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x => x.offsetParent && x.innerText.trim()); return d ? { t: d.innerText.replace(/\s+/g, ' ').slice(0, 160), b: [...d.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.textContent.trim()) } : null; }); if (!m) return; const pick = PREF.find(x => m.b.includes(x)) || m.b[m.b.length - 1]; log.push(m.t.slice(0, 60) + ' -> ' + pick); await p.evaluate(t => { const d = [...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x => x.offsetParent && x.innerText.trim()); [...d.querySelectorAll('button')].find(b => b.offsetParent && b.textContent.trim() === t).click(); }, pick); await p.waitForTimeout(800); } }
(async () => {
  const seeds = []; for (let s = FROM; s < TO; s++) seeds.push(s);
  let n = 0, rows = 0, bad = 0;
  const worker = async () => {
    let B = null, used = 0;
    const fresh = async () => { if (B) await B.b.close(); B = await boot('http://127.0.0.1:8843/' + PAGE, { init: co }); await B.p.evaluate(src => window.__ev(src), DRV); used = 0; };
    await fresh();
    while (seeds.length) {
      const s = seeds.shift(); if (used >= 4) await fresh(); used++;
      const p = B.p, sc = gen(s), log = [], out = [], R = rng(s * 7 + 3);
      sc.runs.forEach(r => { r.lay = null; });
      try {
        const A = await p.evaluate(sc => { window.__g2fill(sc); return window.__g2calc(); }, sc); if (A.errors) continue;
        await p.evaluate(() => window.__g2review()); await p.waitForTimeout(900); await modals(p, log);
        await p.evaluate(() => window.__g2lock()); await p.waitForTimeout(1500); await modals(p, log); await p.waitForTimeout(1200); await modals(p, log);
        const E = await p.evaluate(() => window.__g2rec()); if (!E) { out.push('not locked ' + log.join(' | ')); throw 0; }
        const cand = E.rows.map((r, i) => ({ r, i })).filter(x => !x.r.hub && x.r.st > 0.5 && x.r.st < sc.runs[0].dist - 0.5); // the Left off point is Run 1 only (feat_stophub)
        if (!cand.length) continue;
        const k = cand[Math.floor(R() * cand.length)]; const stopFt = k.r.st;
        await p.evaluate(i => window.__g2laid(i), k.i); await p.waitForTimeout(1200); await modals(p, log);
        const ok = await p.evaluate(ft => window.__g2endShortOpen(ft), stopFt); await p.waitForTimeout(1500); await modals(p, log); await p.waitForTimeout(800); await modals(p, log);
        if (!ok) { out.push('no end option at ' + stopFt); throw 0; }
        await p.evaluate(() => window.__g2resume()); await p.waitForTimeout(2500); await modals(p, log); await p.waitForTimeout(1200); await modals(p, log);
        const lo = await p.evaluate(() => window.__g2leftOff()); if (process.env.DBG) console.log('stop', stopFt, JSON.stringify(lo), await p.evaluate(() => window.__ev("[1,2,3,4,5].map(n => n + ':' + (n===1||segIsActive(n)) + ':' + numVal(distanceFieldIdForRun(n)) + ':' + pbStHubs(n).map(h => getPointLabel(h, '?') + '@' + numVal(h + 'Station')).join('|')).join(' ; ')")));
        let C;
        const invAt = x => { const P = A.points; for (let i = 0; i < P.length - 1; i++) { const u = P[i], v = P[i + 1]; if (x >= u.st - 1e-9 && x <= v.st + 1e-9 && v.st > u.st) return u.pi + (v.pi - u.pi) * (x - u.st) / (v.st - u.st); } return null; };
        const stopInv = invAt(stopFt);
        let newHi = null;
        if (sc.rod !== 'lenker') {
          if (!lo.id) { out.push('no Left off point after resume: ' + JSON.stringify(lo).slice(0, 200) + ' ' + log.join(' | ')); throw 0; }
          const delta = Math.round((R() * 4 - 2) * 100) / 100, q = x => sc.rod === 'architect' ? Math.round(x * 192) / 192 : Math.round(x * 100) / 100;
          const shot = q(A.hi + delta - stopInv); newHi = stopInv + shot;
          C = await p.evaluate(([id, v]) => window.__g2shot(id, v), [lo.id, shot]);
        } else C = await p.evaluate(() => { window.__g2settle(); return window.__g2calc(); });
        if (C.errors) { out.push('resumed form: ' + C.errors.join(' | ')); throw 0; }
        n++;
        C.rows.forEach(r => { rows++;
          const dupe = A.points.filter(q => Math.abs(q.st - r.st) < 1e-6).length > 1; if (dupe) return;
          const inv = invAt(r.st); if (inv === null) return;
          if (Math.abs(r.pi - inv) > 0.005) out.push('INV at ' + r.st + ': ' + r.pi.toFixed(4) + ' was ' + inv.toFixed(4));
          if (newHi !== null && r.ri !== null && Math.abs(r.ri - (Math.max(C.hi, C.hiLay || -1e9) - r.pi)) > 0.005 && Math.abs(r.ri - (newHi - r.pi)) > 0.005) out.push('rINV at ' + r.st + ': ' + r.ri.toFixed(4) + ' want HI\' ' + newHi.toFixed(3) + ' - INV = ' + (newHi - r.pi).toFixed(4));
        });
        if (newHi !== null && Math.abs(C.hi - newHi) > 0.005) out.push('resumed HI ' + C.hi + ' want ' + newHi.toFixed(4));
        const rowSet = C.rows.map(r => r.st); A.rows.forEach(r => { if (!rowSet.some(x => Math.abs(x - r.st) < 0.0006)) out.push('row ' + r.st + ' gone after resume'); });
      } catch (e) { if (e !== 0) { out.push('driver: ' + String(e && e.message || e).slice(0, 200)); } await fresh(); }
      if (B.p.errs.length) out.push('page errors: ' + B.p.errs.splice(0).slice(0, 2).join(' | '));
      if (out.length) { bad++; console.log('seed', s, sc.rod, sc.runs.length + ' runs', JSON.stringify(out.slice(0, 5))); }
    }
    await B.b.close();
  };
  await Promise.all(Array.from({ length: W }, worker));
  console.log(`resume: runs resumed ${n}, rows ${rows}, runs with a mismatch ${bad}`);
})();
