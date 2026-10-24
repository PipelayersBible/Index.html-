// Batch 18 M2 (03, after review start): bedding (under the pipe) vs shading (the sides of the pipe + a thickness over it),
// and the job's trench settings (width, bedding / shading thickness, pipe ID + wall -> OD, or an OD). Fails on base.
// Hand check (owner): 8 in PVC OD 8.625 in, 24 in trench, 12 in shading: 2 × (0.71875 + 1) − π × 0.71875² / 4 = 3.0318 ft³/ft.
const T = require('./mat_lib.js'); const { M, check } = T;
(async () => {
  const browser = await M.chromium.launch();
  const seed = T.seedMats(); seed.mats = seed.mats.filter(m => m.id === 'mp1'); // pipe only: 360 LF counted on 24-101
  const { ctx, page } = await T.setup(browser, { manager: true, extra: { __psrv: T.seedServer(), __msrv: seed } });
  try {
    await T.openJob(page, '24-101');
    let t = await T.matText(page);
    check('job page: "Trench settings for this job", nothing set yet', /Trench settings for this job Trench width not set · bedding not set under the pipe · shading not set over the pipe · pipe OD not set/.test(t), t.slice(t.indexOf('Trench settings'), t.indexOf('Trench settings') + 200));
    await page.click('#pjSetEdit'); await page.waitForTimeout(200);
    await page.fill('#pmf_trench_width_ft', '2'); await page.fill('#pmf_bed_thick_ft', '0.5'); await page.fill('#pmf_shade_thick_ft', '1');
    await page.fill('#pmf_pipe_id_in', '8'); await page.fill('#pmf_pipe_wall_in', '0.3125'); await page.waitForTimeout(150);
    check('settings form: OD worked out as ID + 2 × wall = 8.625 in, as you type', /Pipe OD = 8 \+ 2 × 0\.3125 = 8\.625 in/.test(await page.evaluate(() => pmfOd.textContent)));
    check('settings form: bedding is under the pipe; shading is the sides plus the thickness over the top', await page.evaluate(() => /bottom of the pipe down to subgrade/.test(pmfForm.textContent) && /sides of the pipe plus this thickness over its top/.test(pmfForm.textContent)));
    await page.fill('#pmf_pipe_wall_in', 'x'); await page.click('#pmfSave'); await page.waitForTimeout(200);
    check('a bad number: says which, nothing sent', /Wall thickness: enter a number/.test(await page.evaluate(() => pmfErr.textContent)) && (await T.matLog(page, 'pb_mat_job_settings_set')).length === 0);
    await page.fill('#pmf_pipe_wall_in', '0.3125'); await page.click('#pmfSave'); await page.waitForTimeout(900);
    const ss = (await T.matLog(page, 'pb_mat_job_settings_set')).pop();
    check('saved: width 2, bedding 0.5, shading 1, ID 8, wall 0.3125, version 0 the first time', ss && ss.args.p_settings.trench_width_ft === '2' && ss.args.p_settings.shade_thick_ft === '1' && ss.args.p_settings.pipe_id_in === '8' && ss.args.p_settings.pipe_wall_in === '0.3125' && ss.args.p_expect_version === 0, ss && ss.args);
    t = await T.matText(page);
    check('settings shown: "pipe OD 8.625 in (ID 8 + 2 × wall 0.3125)"', /Trench width 2 ft · bedding 0\.5 ft under the pipe · shading 1 ft over the pipe · pipe OD 8\.625 in \(ID 8 \+ 2 × wall 0\.3125\)/.test(t));
    await page.click('#pjSetHist'); await page.waitForTimeout(500);
    const hist = await page.evaluate(() => (document.getElementById('pjSetHistList') || {}).innerText || '');
    check('Settings History (review S9): version 1 with server time, who, phone time and the values', /Version 1 · .*\(server time\) · owner-a\.test/.test(hist) && /Phone time/.test(hist) && /Width 2 ft · bedding 0\.5 ft · shading 1 ft · ID 8 in · wall 0\.3125 in · OD —/.test(hist.replace(/\s+/g, ' ')), hist);
    await page.click('#pjSetHist'); await page.waitForTimeout(200);
        // a shading material with no values of its own (job settings), allowance 0 for the hand check
    await page.click('#pjMatAdd'); await page.waitForTimeout(150);
    await page.evaluate(() => [...document.querySelectorAll('.pbm-presets button')].find(b => /Coarse sand/.test(b.textContent)).click()); await page.waitForTimeout(150);
    await page.check('input[name="pmfUse"][value="shading"]'); await page.waitForTimeout(150);
    const f = await page.evaluate(() => ({ sh: !!document.getElementById('pmf_shade_thick_ft'), bt: !!document.getElementById('pmf_bed_thick_ft'), est: pmfEst.textContent }));
    check('shading form: a "Shading over the pipe" box instead of bedding thickness, and the shading estimate note', f.sh && !f.bt && /^Estimate from footage × \(trench width × \(pipe OD \+ shading thickness\) − the pipe’s own area\)\. Actual use varies with field conditions/.test(f.est), f);
    await page.fill('#pmf_extra_pct', '0'); await page.click('#pmfSave'); await page.waitForTimeout(900);
    const sv = (await T.matLog(page, 'pb_mat_save')).pop();
    check('saved as shading, blank width / thickness (the job’s), allowance 0', sv.args.p_material.use_as === 'shading' && sv.args.p_material.shade_thick_ft === '' && sv.args.p_material.trench_width_ft === '' && sv.args.p_material.extra_pct === '0', sv.args.p_material);
    const id = await page.evaluate(() => (window.__debugMat().jobs['24-101'].data.materials.find(m => m.use_as === 'shading') || {}).id);
    const row = await page.evaluate((i) => document.getElementById('pjMat_' + i).innerText.replace(/\s+/g, ' '), id);
    // 360 ft × 3.03176 / 27 = 40.42 yd³
    check('HAND CHECK on screen: 360 ft × 3.0318 ft³/ft ÷ 27 ≈ 40.4 yd³, an Estimate, labelled shading', /Estimate ≈ 40\.4 \/ — \/ — yd³/.test(row) && /Shading: the sides of the pipe plus the shading thickness over its top/.test(row), row);
    await page.evaluate((i) => [...document.querySelectorAll('#pjMat_' + i + ' button')].find(b => b.textContent === 'Details').click(), id); await page.waitForTimeout(200);
    const d = await page.evaluate((i) => document.getElementById('pjMatD_' + i).innerText.replace(/\s+/g, ' '), id);
    check('details: 2 ft wide × (0.7188 ft OD [8.625 in, ID + 2 × wall] + 1 ft over the pipe) − 0.4057 ft² of pipe = 3.0318 ft³ ÷ 27 = 0.1123 yd³ (job settings)',
      /Per foot of pipe: 2 ft wide × \(0\.7188 ft OD \[8\.625 in, ID \+ 2 × wall\] \+ 1 ft over the pipe\) − 0\.4057 ft² of pipe = 3\.0318 ft³ ÷ 27 = 0\.1123 yd³ in place \(job settings\)/.test(d), d);
    // no OD: "Needs pipe OD"
    await page.click('#pjSetEdit'); await page.waitForTimeout(150);
    await page.fill('#pmf_pipe_id_in', ''); await page.click('#pmfSave'); await page.waitForTimeout(900);
    t = await page.evaluate((i) => document.getElementById('pjMat_' + i).innerText.replace(/\s+/g, ' '), id);
    check('ID cleared and no OD given: "Needs pipe OD", no number (never a guess)', /Needs pipe OD/.test(t) && /— \/ — \/ — yd³/.test(t), t);
    await page.click('#pjSetEdit'); await page.waitForTimeout(150);
    await page.fill('#pmf_pipe_od_in', '8.625'); await page.click('#pmfSave'); await page.waitForTimeout(900);
    const sv2 = (await T.matLog(page, 'pb_mat_job_settings_set')).pop();
    t = await page.evaluate((i) => document.getElementById('pjMat_' + i).innerText.replace(/\s+/g, ' '), id);
    check('the PM’s OD (8.625) as the fallback: back to ≈ 40.4 yd³; version sent = the one loaded', /≈ 40\.4 \/ — \/ — yd³/.test(t) && sv2.args.p_expect_version === 2, t);
    // bedding still under the pipe: 2 × 0.5 ÷ 27 per ft, nothing taken off
    await page.click('#pjMatAdd'); await page.waitForTimeout(150);
    await page.evaluate(() => [...document.querySelectorAll('.pbm-presets button')].find(b => /3\/4/.test(b.textContent)).click()); await page.waitForTimeout(150);
    await page.fill('#pmf_extra_pct', '0'); await page.click('#pmfSave'); await page.waitForTimeout(900);
    const bid = await page.evaluate(() => (window.__debugMat().jobs['24-101'].data.materials.find(m => m.use_as === 'bedding') || {}).id);
    t = await page.evaluate((i) => document.getElementById('pjMat_' + i).innerText.replace(/\s+/g, ' '), bid);
    check('bedding from the job settings: 360 × 2 × 0.5 ÷ 27 ≈ 13.3 yd³, labelled under the pipe', /≈ 13\.3 \/ — \/ — yd³/.test(t) && /Bedding: under the pipe/.test(t), t);
    check('no JS errors', page._errors.length === 0, page._errors);
  } finally { await ctx.close(); }
  // server without 03: no settings block, everything else as before
  { const { ctx, page } = await T.setup(browser, { manager: true, extra: { __psrv: T.seedServer(), __msrv: T.seedMats(), __noSettings: '1' } });
    try {
      await T.openJob(page, '24-101');
      const t = await T.matText(page);
      check('server without 03: no trench settings block; the list as before', !/Trench settings for this job/.test(t) && /8in PVC SDR 35/.test(t));
      check('no JS errors (no 03)', page._errors.length === 0, page._errors);
    } finally { await ctx.close(); }
  }
  await browser.close();
  console.log('JS errors: none');
})().catch(e => { console.log('SCRIPT ERROR', e); process.exit(1); });
