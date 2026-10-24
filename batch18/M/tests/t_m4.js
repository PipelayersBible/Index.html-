// Batch 18 M3 (PM side) + M4 (r15), company account: the dashboard's spoils line (estimate, loads, note), the job page's
// spoils block (displaced and native-unsuitable forms), the trench settings form's spoils fields (soil presets fill the
// swell, native backfill unsuitable, truck size; bad numbers refused), names typed on runs (match with the suggestion,
// unmatch needs a reason), and a material's "picked on Run Setup / not assigned" line. Fails on r14.
const T = require('./mat_lib.js'); const { M, check } = T;
const W = (p, ms) => p.waitForTimeout(ms);
function seed() {
  const s = T.seedMats();
  s.settings = { '24-101': { trench_width_ft: 2, bed_thick_ft: 0.5, shade_thick_ft: 1, pipe_id_in: 8, pipe_wall_in: 0.3125, version: 1 } };
  s.spoils = { '24-101': { status: 'ok', estimate: true, swell_pct: 25, native_unsuitable: false, truck_yd3: 10, ft: 210, ft_unknown: 0, per_ft_bank: 0.164352, per_ft_loose: 0.20544,
    bank_yd3: 37.639, loose_yd3: 47.049, haul_loose_yd3: 47.049, loads: 5 } };
  s.unlisted = { '24-101': [{ use: 'shading', typed_key: 'sand', name: 'Sand', ft: 100, runs: 1, suggest: { material_id: 'mr1', name: '3/4" crushed rock' } }] };
  s.mats.find(m => m.id === 'mp1')._fig = { assigned_ft: 100, unassigned_ft: 60 };
  return s;
}
(async () => {
  const browser = await M.chromium.launch();
  const { ctx, page } = await T.setup(browser, { manager: true, extra: { __psrv: T.seedServer(), __msrv: seed() } });
  try {
    await page.evaluate(() => { const o = window.__rpc; window.__rpc = async (fn, a) => { const r = await o(fn, a); if (fn === 'pb_mat_job' && r && r.data) { const S = JSON.parse(localStorage.getItem('__msrv')); r.data.materials.forEach(m => { const x = S.mats.find(y => y.id === m.id); if (x && x._fig) Object.assign(m.fig, x._fig); }); } return r; }; });
    await page.evaluate(() => pbOpenProdDashboard()); await W(page, 1300);
    const card = await page.evaluate(() => { const b = [...document.querySelectorAll('#pdJobs .pbp-job')].find(x => /Job 24-101/.test(x.textContent)); return b ? b.innerText.replace(/\s+/g, ' ') : ''; });
    check('dashboard: "Spoils: 47 yd³ loose to haul (estimate) ≈ 5 loads at 10 yd³" with the field-conditions note',
      /Spoils: 47 yd³ loose to haul \(estimate\) ≈ 5 loads at 10 yd³/.test(card) && /Estimate from footage, trench width, pipe OD and bedding \/ shading thickness\. Actual haul varies with field conditions/.test(card), card.slice(-400));
    check('dashboard: a job without spoils numbers gets no spoils line', await page.evaluate(() => { const b = [...document.querySelectorAll('#pdJobs .pbp-job')].find(x => /Job 24-202/.test(x.textContent)); return !!b && !b.querySelector('.pbm4-dash'); }));
    await T.openJob(page, '24-101'); await W(page, 500);
    let sp = await page.evaluate(() => (document.getElementById('pjSpoils') || {}).innerText || '');
    check('job page spoils: "≈ 47 yd³ loose to haul ≈ 5 loads at 10 yd³", displaced 37.6 bank + 25% swell, per foot 0.164 bank (0.205 loose), Estimate note',
      /≈ 47 yd³ loose to haul ≈ 5 loads at 10 yd³/.test(sp) && /Displaced by pipe, bedding and shading: 37\.6 yd³ bank, \+ 25% swell\. On 210 LF counted; 0\.164 yd³ bank \(0\.205 loose\) per foot/.test(sp.replace(/\s+/g, ' ')) && /Actual haul varies with field conditions/.test(sp), sp);
    // material row: picked on Run Setup / not assigned
    const row = await page.evaluate(() => document.getElementById('pjMat_mp1').innerText.replace(/\s+/g, ' '));
    check('a material row says how much was picked for it on Run Setup and how much of the job isn\'t assigned', /100 LF picked for it on Run Setup\. 60 LF of this job isn’t assigned to a pipe material yet/.test(row), row);
    // typed names
    let un = await page.evaluate(() => (document.getElementById('pjUnList') || {}).innerText || '');
    check('typed on runs: "Sand" · Shading, 100 LF on 1 run, with the suggestion preselected', /“Sand” · Shading/.test(un) && /100 LF on 1 run/.test(un) && await page.evaluate(() => pjUnSel0.value === 'mr1' && [...pjUnSel0.options].every(o => o.value === 'mr1')), un);
    await page.evaluate(() => [...document.querySelectorAll('#pjUnList button')].find(b => b.textContent === 'Match').click()); await W(page, 900);
    const ta = (await T.matLog(page, 'pb_mat_typed_assign')).pop();
    check('Match sends job, use, the typed name and the chosen item', ta && ta.args.p_job_number === '24-101' && ta.args.p_use === 'shading' && ta.args.p_typed_name === 'Sand' && ta.args.p_material_id === 'mr1' && ta.args.p_expect_uid === 'acctA', ta && ta.args);
    un = await page.evaluate(() => document.getElementById('pjMatSec').innerText.replace(/\s+/g, ' '));
    check('after matching: nothing unlisted; the match is listed (who, when) with Unmatch', !/not on the list/.test(un) && /Matched names \(1\)/.test(un), un.slice(un.indexOf('Typed on runs'), un.indexOf('Typed on runs') + 200));
    await page.evaluate(() => { document.querySelector('#pjMatSec details.pbm-arch:last-of-type') && (document.querySelector('#pjMapList').closest('details').open = true); [...document.querySelectorAll('#pjMapList button')].find(b => b.textContent === 'Unmatch').click(); }); await W(page, 200);
    await page.click('#pmfSave'); await W(page, 200);
    check('Unmatch needs a reason; nothing sent without one', /Say why it’s being unmatched/.test(await page.evaluate(() => pmfErr.textContent)) && (await T.matLog(page, 'pb_mat_typed_unassign')).length === 0);
    await page.fill('#pmf_reason', 'Wrong material'); await page.click('#pmfSave'); await W(page, 900);
    check('Unmatch sent with its reason', (await T.matLog(page, 'pb_mat_typed_unassign')).pop().args.p_reason === 'Wrong material');
    // settings: spoils fields
    await page.click('#pjSetEdit'); await W(page, 200);
    const f = await page.evaluate(() => ({ presets: [...pmf_swell_preset.options].map(o => o.textContent), help: pmf_swell_pct.parentNode.textContent }));
    check('settings form: soil presets (sand / gravel 12%, common earth 25%, clay 40%, blasted rock 65%) and the swell help', JSON.stringify(f.presets.slice(1)) === JSON.stringify(['Sand / gravel: 12%', 'Common earth / loam: 25%', 'Clay: 40%', 'Rock, blasted: 65%']) && /Blank = 25%/.test(f.help), f);
    await page.selectOption('#pmf_swell_preset', '40'); await W(page, 100);
    check('picking Clay fills the swell with 40 (editable)', await page.evaluate(() => pmf_swell_pct.value === '40'));
    await page.fill('#pmf_truck_yd3', 'big'); await page.click('#pmfSave'); await W(page, 200);
    check('a non-number truck size: refused, says which, nothing sent', /Truck size: enter a number/.test(await page.evaluate(() => pmfErr.textContent)) && (await T.matLog(page, 'pb_mat_job_settings_set')).length === 0);
    await page.fill('#pmf_truck_yd3', '12'); await page.check('#pmf_native_unsuitable'); await page.click('#pmfSave'); await W(page, 900);
    const ss = (await T.matLog(page, 'pb_mat_job_settings_set')).pop();
    check('saved: the six trench values plus swell 40, native backfill unsuitable, truck 12', ss && ss.args.p_settings.swell_pct === '40' && ss.args.p_settings.native_unsuitable === true && ss.args.p_settings.truck_yd3 === '12' && ss.args.p_settings.trench_width_ft === '2' && ss.args.p_expect_version === 1, ss && ss.args);
    // native unsuitable spoils view
    await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('__msrv')); S.spoils['24-101'] = Object.assign(S.spoils['24-101'], { native_unsuitable: true, swell_pct: 40, trench_bank_yd3: 37.5, haul_loose_yd3: 52.5, import_bank_yd3: 9.722, ft_no_depth: 60, loads: 5, truck_yd3: 12 }); localStorage.setItem('__msrv', JSON.stringify(S)); });
    await page.evaluate(() => pbProdJobLoad()); await W(page, 1000);
    sp = await page.evaluate(() => (document.getElementById('pjSpoils') || {}).innerText.replace(/\s+/g, ' '));
    check('native backfill unsuitable: all excavated soil, ground to subgrade (37.5 bank + 40%), ≈ 52.5 loose, imported backfill above the shading ≈ 9.7 yd³, "Partial: 60 LF without depth"',
      /≈ 52\.5 yd³ loose to haul ≈ 5 loads at 12 yd³/.test(sp) && /all excavated soil is hauled, ground to subgrade \(37\.5 yd³ bank, \+ 40% swell\)\. Imported backfill needed above the shading ≈ 9\.7 yd³/.test(sp) && /Partial: 60 LF without depth/.test(sp), sp);
    check('no JS errors', page._errors.length === 0, page._errors);
    await (await page.$('#pjMatSec')).screenshot({ path: '/home/claude/batch18/M/shots/m4_job_390.png' });
  } finally { await ctx.close(); }
  { const s = seed(); s.spoils['24-101'] = { status: 'needs_width', ft: 30, ft_unknown: 30 };
    const { ctx, page } = await T.setup(browser, { manager: true, width: 320, xl: true, extra: { __psrv: T.seedServer(), __msrv: s } });
    try {
      await T.openJob(page, '24-101'); await W(page, 500);
      const sp = await page.evaluate(() => (document.getElementById('pjSpoils') || {}).innerText || '');
      check('spoils with no trench width: says what it needs, no number (never a guess)', /Needs the trench width/.test(sp) && !/\d+ yd³/.test(sp), sp);
      const L = await T.layout(page); check('320 XL: no sideways scroll on the job page', !L.hscroll, L);
      check('no JS errors (320 XL)', page._errors.length === 0, page._errors);
    } finally { await ctx.close(); }
  }
  await browser.close();
  console.log('JS errors: none');
})().catch(e => { console.log('SCRIPT ERROR', e); process.exit(1); });
