// BEFORE/AFTER screenshots at 360x740 (DSF 2): node shots.js <page url> <prefix: before|after> [outdir]
// -> <prefix>_<screen>.png (what shows on the phone screen) and <prefix>_<screen>_full.png (the whole page, max 2400 px).
// Foreman with a company (rig co_fm), light. Screens: Home, Run Setup, Run Results (run going, 3 rows laid), Active Permit
// (one entrant, good air reading), Calculators.
const R = __dirname + '/../../../rig/';
const { chromium } = require('playwright'); const fs = require('fs');
const co = require(R + 'co_fm'), F = require(R + 'flow'), mk = require(R + 'mkrun');
const URL0 = process.argv[2], PFX = process.argv[3] || 'B', OUT = (process.argv[4] || __dirname + '/../work') + '/';
const W = 360, Hh = 740;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: Hh }, deviceScaleFactor: 2, colorScheme: 'light', serviceWorkers: 'block' });
  await ctx.route(/supabase-js/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(R + 'fakesb.js', 'utf8') }));
  await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await require(R + 'env').applyClock(ctx);
  await ctx.addInitScript(co);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL0, { waitUntil: 'load' }); await p.waitForTimeout(3500); const H = F(p);
  const shot = async (name) => {
    await p.waitForTimeout(500);
    const L = await p.evaluate(() => {
      const Y = (c) => { const m = String(c).match(/[\d.]+/g); if (!m) return false; const [r, g, b, a] = m.map(Number); if (m.length === 4 && a < 0.5) return false; return r > 200 && g > 150 && g < 220 && b < 100; };
      const out = []; const scr = document.querySelector('.pb-screen.active');
      const all = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return e.offsetParent !== null && r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < 3000; });
      for (const e of all) { const c = getComputedStyle(e); const solid = Y(c.backgroundColor), line = ['Top', 'Right', 'Bottom', 'Left'].some(k => parseFloat(c['border' + k + 'Width']) >= 1 && Y(c['border' + k + 'Color'])) || (c.boxShadow && c.boxShadow !== 'none' && Y(c.boxShadow)) || (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 1 && Y(c.outlineColor));
        if (!solid && !line) continue; if (e.parentElement && out.some(o => o.el === e.parentElement && o.solid === solid)) continue;
        out.push({ el: e, solid, tag: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''), txt: (e.innerText || e.getAttribute('aria-label') || e.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 60), inScreen: !!(scr && scr.contains(e)) }); }
      return out.map(o => (o.solid ? 'SOLID  ' : 'OUTLINE') + ' ' + o.tag + ' | ' + o.txt + (o.inScreen ? '' : ' [outside screen]'));
    });
    console.log('== ' + name); L.forEach(x => console.log('  ' + x));
  };
  const modals = async (pick) => { for (let i = 0; i < 6; i++) { if (!(await H.modal())) break; const bt = await H.modalBtns(); await H.modalClick(pick(bt)); await p.waitForTimeout(900); } };
  await shot('home');
  // Run Setup, just opened with the job number typed
  await p.getByText('New Run', { exact: true }).click(); await p.waitForTimeout(1200);
  await H.f('saJobNumber', '24-017').catch(() => {});
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot('runsetup');
  // Run Results: a locked run going, 3 rows laid
  await p.evaluate(() => pbGoto('home', true, true)); await p.waitForTimeout(400);
  await mk(p, 100);
  await H.click('Lock This Run'); await p.waitForTimeout(800);
  await modals(bt => bt.includes('Lock Without It') ? 'Lock Without It' : bt[bt.length - 1]);
  await p.waitForTimeout(800);
  await p.evaluate(() => { const e = [...document.querySelectorAll('#screen-results [aria-label]')].find(e => /^Distance 20(\.0)? /.test(e.getAttribute('aria-label'))); if (e) e.click(); }); await p.waitForTimeout(700);
  if (await H.modal()) { await H.modalClick('Mark laid to here (and the rows before)').catch(() => {}); await p.waitForTimeout(7500); } // the Undo toast goes after 6 s
  await p.evaluate(() => { if (window.pbRsOpenAtNext) window.pbRsOpenAtNext(); window.scrollTo(0, 0); });
  await shot('results');
  // Calculators tab
  await p.evaluate(() => pbGoto('home', true, true)); await p.waitForTimeout(300);
  await p.evaluate(() => pbGotoTab('calculators')); await p.waitForTimeout(1000);
  await shot('calculators');
  // Active Permit: filled, locked, one entrant, a good reading
  await p.evaluate(() => pbGoto('home', true, true)); await p.waitForTimeout(300);
  await p.evaluate(() => pbGoto('confinedPermit')); await p.waitForTimeout(800);
  await modals(bt => bt[bt.length - 1]);
  const date = await p.evaluate(() => { const d = new Date(), z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); });
  const vals = { cpJobsite: 'Wildomar Sewer', cpJobNumber: '24-017', cpAddress: '1 Main St, Fresno, CA', cpSpace: 'MH-4', cpPurpose: 'Tie-in', cpDate: date, cpStart: '00:01', cpEnd: '23:59', cpHazards: 'H2S', cpControls: 'Blower', cpVentFail: 'Exit', cpRescue: '911', cpComms: 'Voice', cpSupervisor: 'Sam Sup', cpSupervisorInitials: 'SS', cpAttendant: 'Al Att' };
  await p.evaluate(v => { for (const k in v) { const el = document.getElementById(k); if (!el) continue; el.value = v[k]; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } }, vals);
  await p.evaluate(() => window.pbLockConfinedPermit()); await p.waitForTimeout(800);
  await modals(bt => bt.find(x => /I Understand|Lock|Yes|Continue|OK/i.test(x)) || bt[0]);
  await p.evaluate(() => { pbOpenRosterAddForm(); document.getElementById('cpRosterName').value = 'Eddie Ent'; }); await p.waitForTimeout(200);
  await p.evaluate(() => { const b = [...document.querySelectorAll('#cpRosterAddForm button')].find(x => /^Add/.test(x.textContent.trim())); b && b.click(); }); await p.waitForTimeout(1200);
  await p.evaluate(() => { pbQuickAddAtmoTest(); const s = (id, x) => { const e = document.getElementById(id); if (e) e.value = x; }; s('cpAtmoO2', '20.9'); s('cpAtmoLEL', '0'); s('cpAtmoH2S', '0'); s('cpAtmoCO', '0'); s('cpAtmoTester', 'Tess'); });
  await p.evaluate(() => window.pbSaveAtmoReading()); await p.waitForTimeout(1500);
  await modals(bt => bt[bt.length - 1]);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(800);
  console.log('screen', await p.evaluate(() => (document.querySelector('.pb-screen.active') || {}).id));
  await shot('permit_active');
  console.log('errs', JSON.stringify(p.errs.slice(0, 3))); await b.close();
})().catch(e => { console.log('crashed', e && e.stack); process.exit(1); });
