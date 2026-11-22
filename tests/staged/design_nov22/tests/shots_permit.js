// BEFORE/AFTER of the Active Permit with an out-of-range reading: node shots_permit.js <url> <prefix>
const R = __dirname + '/../../../rig/';
const { chromium } = require('playwright'); const fs = require('fs'); const co = require(R + 'co'), F = require(R + 'flow');
const [URL0, PFX] = [process.argv[2], process.argv[3] || 'before']; const OUT = __dirname + '/../shots/';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light', serviceWorkers: 'block' });
  await ctx.route(/supabase-js/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(R + 'fakesb.js', 'utf8') }));
  await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort()); await ctx.addInitScript(co);
  const p = await ctx.newPage(); await p.goto(URL0, { waitUntil: 'load' }); await p.waitForTimeout(3000); const H = F(p);
  await p.evaluate(() => pbGoto('confinedPermit')); await p.waitForTimeout(800);
  const date = await p.evaluate(() => { const d = new Date(), z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); });
  const vals = { cpJobsite: 'Wildomar Sewer', cpAddress: '1 Main St, Fresno, CA', cpSpace: 'MH-4', cpPurpose: 'Tie-in', cpDate: date, cpStart: '00:01', cpEnd: '23:59', cpHazards: 'H2S', cpControls: 'Blower', cpVentFail: 'Exit', cpRescue: '911', cpComms: 'Voice', cpSupervisor: 'Sam Sup', cpSupervisorInitials: 'SS', cpAttendant: 'Al Att' };
  await p.evaluate(v => { for (const k in v) { const el = document.getElementById(k); el.value = v[k]; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } }, vals);
  await p.evaluate(() => window.pbLockConfinedPermit()); await p.waitForTimeout(600);
  for (let i = 0; i < 6; i++) { if (!(await H.modal())) break; const bt = await H.modalBtns(); await H.modalClick(bt.find(x => /I Understand|Lock|Yes|Continue|OK/i.test(x)) || bt[0]); await p.waitForTimeout(600); }
  await p.evaluate(() => { pbOpenRosterAddForm(); document.getElementById('cpRosterName').value = 'Eddie Ent'; }); await p.waitForTimeout(200);
  await p.evaluate(() => { const b = [...document.querySelectorAll('#cpRosterAddForm button')].find(x => /^Add/.test(x.textContent.trim())); b && b.click(); }); await p.waitForTimeout(1200);
  await p.evaluate(() => { const s = (id, x) => { document.getElementById(id).value = x; }; s('cpAtmoO2', '18.9'); s('cpAtmoLEL', '0'); s('cpAtmoH2S', '0'); s('cpAtmoCO', '0'); s('cpAtmoTester', 'Tess'); });
  await p.evaluate(() => window.pbSaveAtmoReading()); await p.waitForTimeout(1500);
  for (let i = 0; i < 2; i++) { const m = await H.modal(); if (!m) break; const bt = await H.modalBtns(); await H.modalClick(bt[bt.length - 1]); }
  await p.waitForTimeout(1500); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  await p.screenshot({ path: OUT + PFX + '_permit_active.png', fullPage: true, clip: { x: 0, y: 0, width: 390, height: Math.min(h, 2600) } });
  await p.evaluate(() => window.scrollTo(0, 1400)); await p.waitForTimeout(600);
  await p.screenshot({ path: OUT + PFX + '_permit_active_scrolled.png' });
  console.log('shot permit_active', h); await b.close();
})();
