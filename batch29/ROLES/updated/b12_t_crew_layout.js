// Batch 29 ROLES updated copy of /home/claude/batch12/D2/tests/t_crew_layout.js: the pipelayer's held run is made from production saved
// before the change (as b12_t_crew.js's legacyRun). The layout checks are the original's.
// Batch 12 D2: the crew sections fit a phone (390 px) and a desktop (1280 px): no sideways scroll, no clipped or
// too-small buttons; screenshots in D2/shots/ for a look.
const T = require('/home/claude/batch12/D2/tests/pd_lib.js'); const { M, check } = T;
const OUT = '/home/claude/batch29/ROLES/logs/shots/'; // batch 29 ROLES copy: its own folder require('fs').mkdirSync(OUT, { recursive: true });
const waitFor = async (page, fn, ms = 15000) => { for (let t = 0; t < ms; t += 250) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(250); } return false; };
const held = (id, name, job, items, extra) => ['acctP|run:' + id, Object.assign({ id, user: 'acctP', email: 'p@crew.test', company: 'c1', versions: [1], updated_at: new Date().toISOString(), record: { jobNumber: job, workDate: new Date().toISOString().slice(0, 10), enteredBy: name }, items, crew: { state: 'pending', created: Date.now() } }, extra || {})];
const errs = [];
(async () => {
  const browser = await M.chromium.launch();
  for (const [w, h] of [[390, 900], [1280, 900]]) {
    // pipelayer
    { const { ctx, page } = await T.setup(browser, { width: w, height: h, extra: { __role: 'pipelayer' } });
      try {
        // batch 29 ROLES: a pipelayer's held run can only come from production saved before the change (the phone a foreman's then)
        await page.evaluate(() => { localStorage.__role = 'foreman'; }); await page.reload(); await page.waitForTimeout(2500); await T.M.dismiss(page);
        await T.runWithProduction(page, { job: '24-101 Elm Street water main replacement phase 2', exc: '100', pipe: '80', by: 'Wes Hall' });
        await page.evaluate(() => { localStorage.__role = 'pipelayer'; });
        for (let t = 0; t < 60 && !(await page.evaluate(() => window.__rpcLog.some(x => x.fn === 'pb_prod_save'))); t++) await page.waitForTimeout(250);
        await page.reload(); await page.waitForTimeout(2500); await T.M.dismiss(page);
        await waitFor(page, () => window.__debugProd().sessions.some(s => /Waiting for a foreman/.test(s.label)));
        await page.evaluate(() => pbOpenProdMine()); await waitFor(page, () => !!document.getElementById('pmHeld'));
        await page.click('#pmAssign0'); await waitFor(page, () => !!document.getElementById('pmPick0'));
        const L = await T.layout(page);
        check(w + 'px pipelayer: no sideways scroll, no clipped buttons, buttons at least 44 px', !L.hscroll && !L.clipped.length && !L.small.filter(x => /pm|pbp/.test(x)).length);
        if (L.small.length || L.clipped.length) console.log(JSON.stringify(L));
        await page.screenshot({ path: OUT + 'crew_pipelayer_' + w + '.png', fullPage: true });
        await page.evaluate(() => pbGoto('home')); await page.waitForTimeout(400);
        await page.screenshot({ path: OUT + 'crew_home_' + w + '.png' });
        errs.push(...page._errors);
      } finally { await ctx.close(); }
    }
    // foreman
    { const { ctx, page } = await T.setup(browser, { width: w, height: h });
      try {
        await page.evaluate((rows) => { const s = JSON.parse(localStorage.getItem('__psrv') || '{"entries":{},"plans":{}}'); rows.forEach(([k, v]) => { s.entries[k] = v; }); localStorage.setItem('__psrv', JSON.stringify(s)); },
          [held('p1', 'Wes Hall', '24-101', [{ key: 'excavation', qty: 100, unit: 'LF' }, { key: 'pipe', qty: 80, unit: 'LF' }], { crew: { state: 'pending', created: Date.now(), assigned: 'acctA' } }), held('p2', 'Walt Ruiz', '24-102', [{ key: 'demo', qty: 35, unit: 'LF' }])]);
        await page.evaluate(() => pbOpenProdMine()); await waitFor(page, () => !!document.getElementById('pmWait1'));
        await page.click('#pmClaim0'); await waitFor(page, () => !!document.getElementById('pmClaimed0'), 15000);
        await page.click('#pmEdit0'); await page.waitForTimeout(300);
        const L = await T.layout(page);
        check(w + 'px foreman: no sideways scroll, no clipped buttons, buttons at least 44 px', !L.hscroll && !L.clipped.length && !L.small.filter(x => /pm|pbp/.test(x)).length);
        if (L.small.length || L.clipped.length) console.log(JSON.stringify(L));
        await page.screenshot({ path: OUT + 'crew_foreman_' + w + '.png', fullPage: true });
        errs.push(...page._errors);
      } finally { await ctx.close(); }
    }
  }
  check('no JS errors', errs.length === 0); if (errs.length) console.log(errs);
  await browser.close();
  console.log('JS errors: none');
})().catch(e => { console.log('SCRIPT ERROR', e); process.exit(1); });
