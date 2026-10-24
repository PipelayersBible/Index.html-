// feat_weight: tons next to calculator volumes. Run with /home/claude/test/run.sh and PB_TEST_DIR=<site>.
// Checks every preset, the supplier table (two-step), custom density in t/yd3 and lb/ft3, the owner's supplier-app
// acceptance checks (510 x 2 ft: 0.5 in @130 = 2.8 t, 6 in @130 = 33.2 t, 6 in @110 = 28.0 t), the separate 15% line,
// remembering the choice per calculator, Structure Bedding volume, the ft = in echo and the PM form's preset numbers.
const L = require('/home/claude/test/lib.js');
const shot = process.env.PB_SHOT_DIR;
(async () => {
  const browser = await L.chromium.launch();
  const page = await L.newPage(browser, 'uWeight1');
  const ev = (f, a) => page.evaluate(f, a);
  const out = () => ev(() => { const r = document.querySelector('#pbWtOut-volume .pb-wt-raw .pb-answer-val'), c = document.querySelector('#pbWtOut-volume .pb-wt-comp .pb-answer-val'), m = document.querySelector('#pbWtOut-volume .pb-wt-msg');
    return { raw: r ? Number(r.dataset.tons) : null, rawTxt: r ? r.textContent : null, comp: c ? Number(c.dataset.tons) : null, compTxt: c ? c.textContent : null, msg: m ? m.textContent : null, all: (document.getElementById('volumeResult') || {}).textContent }; });
  const tap = async (sel) => { await ev((q) => document.querySelector(q).scrollIntoView({ block: 'center' }), sel); await page.click(sel); await page.waitForTimeout(80); }; // centred: the fixed tab bar covers the bottom edge
  const rect = async (l, w, d) => { await page.fill('#volRectL', String(l)); await page.fill('#volRectW', String(w)); await page.fill('#volRectD', String(d)); await tap('#screen-volumeCalc button[onclick="pbCalcVolume()"]'); await page.waitForTimeout(150); };
    await ev(() => pbOpenVolumeCalc()); await page.waitForTimeout(300);

  // 18.9 yd3 (510.3 ft3) for every bedding preset
  await rect(510.3, 1, 1);
  let o = await out();
  L.check('no material picked yet: the panel asks for one', /Pick a material/.test(o.msg || ''), o.msg);
  const want = { rock34: [1.35, '25.5'], pea: [1.40, '26.5'], csand: [1.485, '28.1'], fsand: [1.431, '27.0'] };
  const report = [];
  for (const k of Object.keys(want)) {
    await tap('#pbWt-volume button[data-wt="k:' + k + '"]');
    o = await out();
    const raw = 18.9 * want[k][0], comp = 18.9 * 1.15 * want[k][0];
    report.push(k + ' ' + o.rawTxt + ' / ' + o.compTxt);
    L.check(`18.9 yd³ of ${k} (${want[k][0]} t/yd³) = ${raw.toFixed(3)} t raw, shown "${want[k][1]} tons"`, Math.abs(o.raw - raw) < 1e-9 && o.rawTxt === '≈ ' + want[k][1] + ' tons', o);
    L.check(`  ... and +15% compaction is a separate line: ${comp.toFixed(3)} t (yd³ × 1.15 × density)`, Math.abs(o.comp - comp) < 1e-9 && o.all.indexOf('Added to the yd³ before converting: 18.90 + 15% = ' + (18.9 * 1.15).toFixed(2) + ' yd³') >= 0, o);
  }
  console.log('INFO 18.9 yd³: ' + report.join(' | '));
  const chips = await ev(() => [...document.querySelectorAll('#pbWt-volume .pb-wt-pick button')].map(b => b.textContent));
  L.check('preset chips show t/yd³ and lb/ft³ (sand raised: 1.49 / 110, 1.43 / 106)', /1\.35 t\/yd³ · 100 lb\/ft³/.test(chips[0]) && /1\.40 t\/yd³ · 104 lb\/ft³/.test(chips[1]) && /1\.49 t\/yd³ · 110 lb\/ft³/.test(chips[2]) && /1\.43 t\/yd³ · 106 lb\/ft³/.test(chips[3]), chips);
  L.check('labelled as estimates', /no allowance \(estimate\)/.test(o.all) && /compaction allowance \(estimate\)/.test(o.all) && /Estimate\. Verify the density/.test(o.all));

  // supplier table: two steps, every cell
  await tap('#pbWt-volume button[data-wt="k:sup"]');
  o = await out();
  L.check('supplier values: asks for the type first, no rock-source row yet', /Pick the type/.test(o.msg || '') && !(await ev(() => !!document.querySelector('#pbWt-volume .pb-wt-src'))));
  const LB = { base: [160, 138, 145, 130, 138], screen: [124, 113, 113, 112, 110], clean: [102, 96, 96, 98, 90], sand: [110, 106, 106, 110, 100] };
  const SRC = ['trap', 'lime', 'gran', 'sg', 'ss'];
  let cells = 0, bad = [];
  for (const t of Object.keys(LB)) {
    await tap('#pbWt-volume button[data-wt="st:' + t + '"]');
    o = await out(); if (!/Pick the rock source/.test(o.msg || '')) bad.push(t + ': no rock prompt');
    for (let i = 0; i < 5; i++) {
      await tap('#pbWt-volume button[data-wt="ss:' + SRC[i] + '"]');
      o = await out();
      const exp = 510.3 * LB[t][i] / 2000; cells++;
      const lbl = await ev((s) => document.querySelector('#pbWt-volume button[data-wt="ss:' + s + '"]').textContent, SRC[i]);
      if (!(Math.abs(o.raw - exp) < 1e-9)) bad.push(t + '/' + SRC[i] + ' ' + o.raw + ' vs ' + exp);
      if (lbl.indexOf(LB[t][i] + ' lb/ft³ · ' + (Math.round(LB[t][i] * 27 / 20 + 1e-7) / 100).toFixed(2) + ' t/yd³') < 0) bad.push('label ' + lbl);
    }
  }
  L.check(`supplier table: all ${cells} cells give ft³ × lb/ft³ ÷ 2000, labels lb/ft³ · t/yd³`, cells === 20 && bad.length === 0, bad);
  L.check('supplier panel is titled "Typical supplier values" with no brand name', await ev(() => { const t = document.getElementById('pbWt-volume').textContent; return /Typical supplier values/.test(t) && !/vulcan/i.test(document.documentElement.innerHTML); }));

  // owner's acceptance checks, 510 ft x 2 ft
  await tap('#pbWt-volume button[data-wt="st:base"]'); await tap('#pbWt-volume button[data-wt="ss:sg"]'); // 130
  await rect(510, 2, 0.5 / 12);
  o = await out();
  L.check('510 × 2 × 0.5 in @130 lb/ft³ = 2.76 t, shown 2.8', o.raw.toFixed(2) === '2.76' && o.rawTxt === '≈ 2.8 tons', o);
  if (shot) await page.screenshot({ path: shot + '/vol_base130.png', fullPage: true });
  await rect(510, 2, 0.5);
  o = await out();
  L.check('510 × 2 × 6 in @130 = 33.15 t, shown 33.2 (supplier app)', o.raw.toFixed(2) === '33.15' && o.rawTxt === '≈ 33.2 tons', o);
  L.check('  ... the 15% allowance is its own line (38.1 t), raw stays 33.2', o.compTxt === '≈ 38.1 tons');
  await tap('#pbWt-volume button[data-wt="st:sand"]'); await tap('#pbWt-volume button[data-wt="ss:trap"]'); // 110
  o = await out();
  L.check('510 × 2 × 6 in @110 = 28.05 t, shown 28.0 (supplier app)', o.raw.toFixed(2) === '28.05' && o.rawTxt === '≈ 28.0 tons', o);
  L.check('changing the type clears the old rock source', await ev(() => { pbWtSet('volume', 'st', 'clean'); return document.querySelectorAll('#pbWt-volume .pb-wt-src button[aria-pressed="true"]').length === 0; }));

  // custom density, both units
  await tap('#pbWt-volume button[data-wt="k:custom"]');
  o = await out(); L.check('custom: asks for the density', /Type the density/.test(o.msg || ''));
  await page.fill('#pbWtCv-volume', '1.755'); await page.waitForTimeout(80);
  o = await out(); L.check('custom 1.755 t/yd³ on 18.89 yd³ = 33.15 t (33.2)', o.raw.toFixed(2) === '33.15' && o.rawTxt === '≈ 33.2 tons', o);
  await page.fill('#pbWtCv-volume', '130'); await page.waitForTimeout(80);
  o = await out(); L.check('custom 130 typed as t/yd³: flagged as lb/ft³, no tons', /looks like lb\/ft³/.test(o.msg || '') && o.raw === null);
  await tap('#pbWt-volume button[data-wt="cu:lb"]');
  o = await out(); L.check('custom 130 lb/ft³ = 33.15 t (33.2)', o.raw.toFixed(2) === '33.15' && o.rawTxt === '≈ 33.2 tons' && /1\.755 t\/yd³ \(130 lb\/ft³\)/.test(o.all), o);
  await page.fill('#pbWtCv-volume', '1.4'); await page.waitForTimeout(80);
  o = await out(); L.check('custom 1.4 typed as lb/ft³: flagged as t/yd³', /looks like t\/yd³/.test(o.msg || ''));
  await page.fill('#pbWtCv-volume', '110'); await page.waitForTimeout(80);
  o = await out(); L.check('custom 110 lb/ft³ = 28.05 t (28.0)', o.rawTxt === '≈ 28.0 tons');
  L.check('after chip taps and typing a custom density the answer is not crossed out (not stale)', !(await ev(() => pbCalcIsStale('volumeCalc'))) && !(await ev(() => document.getElementById('volumeResult').classList.contains('pb-result-stale'))));
  await page.fill('#pbWtCv-volume', '-3'); await page.waitForTimeout(80);
  o = await out(); L.check('custom -3: rejected', /greater than zero/.test(o.msg || ''));
  await page.fill('#pbWtCv-volume', '110'); await page.waitForTimeout(80);
  if (shot) await page.screenshot({ path: shot + '/vol_custom.png', fullPage: true });

  // ft = in echo
  await page.fill('#volRectD', '0.5'); await page.waitForTimeout(60);
  L.check('depth echo: "0.5 ft = 6 in"', (await ev(() => document.getElementById('volRectDFtIn').textContent)) === '0.5 ft = 6 in');

  // a failed calculation leaves no stale tons; unit toggle keeps them
  await page.fill('#volRectD', ''); await ev(() => pbCalcVolume());
  L.check('invalid input: no weight panel left over', !(await ev(() => document.getElementById('pbWt-volume'))));
  await rect(510, 2, 0.5);
  await tap('#volUnitToggle button[data-val="gal"]');
  o = await out(); L.check('switching yd³ / ft³ / gal keeps the same tons', o.rawTxt === '≈ 28.0 tons');

  // remembered per calculator: reload, recalc
  await page.reload(); await page.waitForTimeout(700);
  await ev(() => pbOpenVolumeCalc()); await page.waitForTimeout(200);
  await rect(510, 2, 0.5); await page.waitForTimeout(300);
  o = await out();
  L.check('after a reload Material Volume remembers Custom 110 lb/ft³', o.rawTxt === '≈ 28.0 tons' && (await ev(() => document.getElementById('pbWtCv-volume').value)) === '110', o);

  // Structure Bedding: its own remembered choice
  await ev(() => pbOpenBeddingCalc(null)); await page.waitForTimeout(250);
  await page.fill('#beddingInv', '100'); await page.fill('#beddingDist', '0.5'); await page.fill('#beddingThk', '0.5');
  await tap('#screen-beddingCalc button[onclick="pbCalcBedding()"]'); await page.waitForTimeout(100);
  L.check('bedding without a pad size: elevations only, no volume', !(await ev(() => document.getElementById('beddingVolBox'))) && /99\.500 ft/.test(await ev(() => document.getElementById('beddingResult').textContent)));
  await page.fill('#beddingPadL', '6'); await tap('#screen-beddingCalc button[onclick="pbCalcBedding()"]'); await page.waitForTimeout(100);
  L.check('bedding with only the pad length: asks for both', !!(await ev(() => document.getElementById('beddingPadMsg'))));
  await page.fill('#beddingPadW', '6'); await tap('#screen-beddingCalc button[onclick="pbCalcBedding()"]'); await page.waitForTimeout(300);
  const bt = await ev(() => document.getElementById('beddingResult').textContent);
  L.check('bedding 6 × 6 × 0.5 ft = 0.67 yd³ (estimate), with its own picker (nothing picked)', /Bedding Volume \(estimate\)0\.67 yd³/.test(bt) && /Pick a material/.test(bt), bt.slice(0, 300));
  await tap('#pbWt-bedding button[data-wt="k:pea"]');
  const bv = await ev(() => Number(document.querySelector('#pbWtOut-bedding .pb-wt-raw .pb-answer-val').dataset.tons));
  L.check('bedding: pea gravel 36 × 0.5 / 27 × 1.40 = 0.933 t', Math.abs(bv - 36 * 0.5 / 27 * 1.4) < 1e-9);
  L.check('bedding thickness echo: "0.5 ft = 6 in"', (await ev(() => document.getElementById('beddingThkFtIn').textContent)) === '0.5 ft = 6 in');
  if (shot) await page.screenshot({ path: shot + '/bedding.png', fullPage: true });
  await ev(() => pbOpenVolumeCalc()); await rect(510, 2, 0.5);
  o = await out(); L.check('Material Volume still on Custom 110 (choices are per calculator)', o.rawTxt === '≈ 28.0 tons');

  L.check('typing a custom density / tapping chips never crosses out the answer (not stale)', !(await ev(() => pbCalcIsStale('volumeCalc'))) && !(await ev(() => document.getElementById('volumeResult').classList.contains('pb-result-stale'))));
  // tap targets
  const small = await ev(() => [...document.querySelectorAll('#pbWt-volume button')].filter(b => b.getBoundingClientRect().height < 48 || b.getBoundingClientRect().width < 44).length);
  L.check('every weight button is at least 48 px tall', small === 0, small);
  L.check('no sideways scroll at 400 px', await ev(() => document.documentElement.scrollWidth <= window.innerWidth));

  // shared constant: the PM form help text reads it
  // shared constant (non-browser): evaluate the built PB_MAT_PRESETS + its text helper
  const src = require('fs').readFileSync(process.env.PB_TEST_DIR + '/app.html', 'utf8');
  const blk = src.slice(src.indexOf('const PB_MAT_PRESETS = ['), src.indexOf('const pbMatPresetText'));
  const txt = new Function(blk + 'return PB_MAT_PRESETS.map(p => p.short + " " + pbMatDens2(p.density)).join(", ");')();
  L.check('one shared preset constant, PM help text "3/4" crushed rock 1.35, pea gravel 1.40, coarse sand 1.49, fine sand 1.43"', txt === '3/4" crushed rock 1.35, pea gravel 1.40, coarse sand 1.49, fine sand 1.43' && (src.match(/density: 1\.485/g) || []).length === 1, txt);
  L.check('no JS errors', page._errors.length === 0, page._errors);
  await browser.close();
})();
