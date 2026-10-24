// UX-01: a Calculate-button calculator's answer must not look current after its
// inputs change. Changing any input, selector, shape, fitting or material marks
// the old answer "Inputs changed — recalculate" until Calculate runs again.
// Controls: the numbers themselves are unchanged, Calculate clears the mark, the
// Material Volume unit toggle (display only) does not mark it, and an untouched
// answer is never marked.
const L = require('/home/claude/test/lib.js');
(async () => {
  const browser = await L.chromium.launch();
  const page = await L.newPage(browser, 'uUX01');
  await L.dismiss(page);
  const st = (screen) => page.evaluate((s) => {
    const n = document.getElementById(s + 'StaleNote');
    const cfgRes = { bendCalc: ['bendResult'], beddingCalc: ['beddingResult'], volumeCalc: ['volumeResult'], trenchCalc: ['trenchResult', 'trenchDiagram'], flowCalc: ['flowResult'], ventCalc: ['ventResult'], pipeWeightCalc: ['pipeWeightResult'], liftCalc: ['liftResult'], slopeConvCalc: ['slopeConvResult'], manningCalc: ['manningResult'], manholeDepthCalc: ['manholeDepthResult'] }[s];
    const res = cfgRes.map(id => document.getElementById(id));
    return { banner: !!n && !n.hidden && n.offsetParent !== null && /Inputs changed — recalculate/.test(n.textContent), dim: res.every(r => r.classList.contains('pb-result-stale')), text: res[0].innerText.replace(/\s+/g, ' ') };
  }, screen);
  const stale = (x) => x.banner && x.dim;
  const fresh = (x) => !x.banner && !x.dim;

  // Bend Offset (the handoff's acceptance case): 1 ft at 45 degrees, then 2 ft without Calculate.
  await page.evaluate(() => pbOpenBendCalc(null)); await page.waitForTimeout(200);
  await page.fill('#bendOffset', '1'); await page.selectOption('#bendAngle', '45'); await page.fill('#bendFit1', ''); await page.fill('#bendFit2', '');
  await page.click('#screen-bendCalc button:has-text("Calculate")');
  let b = await st('bendCalc');
  L.check('control: 1 ft offset, 45° -> 1.414 ft, shown as current', /1\.414 ft/.test(b.text) && fresh(b));
  await page.fill('#bendOffset', '2');
  b = await st('bendCalc');
  console.log('after editing the offset:', JSON.stringify(b));
  L.check('editing the offset to 2 ft without Calculate marks the 1.414 ft answer "Inputs changed — recalculate"', stale(b));
  L.check('control: the old answer itself is not silently changed (still 1.414, nothing recalculated behind the person\'s back)', /1\.414 ft/.test(b.text));
  await page.click('#screen-bendCalc button:has-text("Calculate")');
  b = await st('bendCalc');
  L.check('control: Calculate gives 2.828 ft and clears the mark', /2\.828 ft/.test(b.text) && fresh(b));
  await page.selectOption('#bendAngle', '22.5');
  L.check('changing the bend angle selector marks the answer out of date', stale(await st('bendCalc')));
  await page.click('#screen-bendCalc button:has-text("Calculate")');
  await page.fill('#bendFit1', '0.25');
  L.check('typing an optional fitting take-up marks the answer out of date', stale(await st('bendCalc')));
  await page.click('#screen-bendCalc button:has-text("Calculate")');
  L.check('control: recalculated with fittings it is current again', fresh(await st('bendCalc')));

  // Bedding: the Invert/BOP reference toggle.
  await page.evaluate(() => pbOpenBeddingCalc(null)); await page.waitForTimeout(200);
  await page.fill('#beddingInv', '100'); await page.fill('#beddingWT', '0.1'); await page.fill('#beddingDist', '2'); await page.fill('#beddingThk', '0.5');
  await page.click('#screen-beddingCalc button:has-text("Calculate")');
  L.check('control: bedding answer 98.000 shown as current', /98\.000 ft/.test((await st('beddingCalc')).text) && fresh(await st('beddingCalc')));
  await page.click('#beddingRefToggle button[data-val="bop"]');
  L.check('switching Invert -> BOP marks the bedding answer out of date', stale(await st('beddingCalc')));
  await page.click('#beddingRefToggle button[data-val="bop"]'); // the already-selected one again
  await page.evaluate(() => pbOpenBeddingCalc(null)); await page.waitForTimeout(200);
  L.check('control: reopening clears the answer, and with it the mark', fresh(await st('beddingCalc')) && (await st('beddingCalc')).text === '');

  // Material Volume: shape toggle marks it; the unit toggle (same answer, other units) does not.
  await page.evaluate(() => pbOpenVolumeCalc()); await page.waitForTimeout(200);
  await page.fill('#volRectL', '27'); await page.fill('#volRectW', '1'); await page.fill('#volRectD', '1');
  await page.click('#screen-volumeCalc button:has-text("Calculate")');
  await page.click('#volUnitToggle button[data-val="ft3"]');
  let v = await st('volumeCalc');
  L.check('control: the cubic-feet unit toggle only re-displays the same answer (27.00 ft³) and does not mark it', /27\.00 ft³/.test(v.text) && fresh(v));
  await page.click('#volShapeToggle button[data-val="cyl"]');
  L.check('switching the shape (Rectangular -> Cylindrical) marks the volume out of date', stale(await st('volumeCalc')));
  await page.click('#volUnitToggle button[data-val="yd3"]');
  L.check('control: and a unit toggle afterwards keeps it marked', stale(await st('volumeCalc')));
  await page.click('#volShapeToggle button[data-val="encase"]');
  await page.fill('#volEncL', '10'); await page.fill('#volEncW', '3'); await page.fill('#volEncD', '3'); await page.fill('#volEncOD', '12'); await page.fill('#volEncPipeL', '10');
  await page.click('#screen-volumeCalc button:has-text("Calculate")');
  L.check('control: encasement 3.04 yd³ current', /3\.04 yd³/.test((await st('volumeCalc')).text) && fresh(await st('volumeCalc')));
  await page.click('#screen-volumeCalc button:has-text("Add Another Pipe Size")');
  L.check('adding another pipe size to the encasement marks the volume out of date', stale(await st('volumeCalc')));
  await page.click('#screen-volumeCalc button:has-text("Calculate")');
  await page.click('#volEncExtraContainer .pb-remove');
  L.check('removing that pipe size marks it out of date again', stale(await st('volumeCalc')));

  // Trench: soil selector and the optional checkbox; both the answer and its diagram are marked.
  await page.evaluate(() => pbOpenTrenchCalc()); await page.waitForTimeout(400);
  await page.selectOption('#trenchSoil', 'A'); await page.fill('#trenchDepth', '10'); await page.fill('#trenchBottomW', '2');
  await page.click('#screen-trenchCalc button:has-text("Calculate")');
  L.check('control: Type A trench answer current', /17\.00 ft/.test((await st('trenchCalc')).text) && fresh(await st('trenchCalc')));
  await page.selectOption('#trenchSoil', 'C');
  L.check('changing the soil type marks the trench answer AND its diagram out of date', stale(await st('trenchCalc')));
  await page.selectOption('#trenchSoil', 'A'); await page.click('#screen-trenchCalc button:has-text("Calculate")');
  await page.check('#trenchVertOpt');
  L.check('ticking the vertical-lower-portion option marks it out of date', stale(await st('trenchCalc')));

  // Every other Calculate-button calculator: one input change each.
  const others = [
    ['flowCalc', () => pbOpenFlowCalc(), [['#flowPsi', '50'], ['#flowDia', '2.5']], ['select', '#flowCSel', '0.8']],
    ['ventCalc', () => pbOpenVentCalc(), [['#ventRectL', '10'], ['#ventRectW', '4'], ['#ventRectD', '6'], ['#ventACH', '20']], ['fill', '#ventRectD', '8']],
    ['pipeWeightCalc', () => pbGoto('pipeWeightCalc'), [['#pwOD', '12'], ['#pwWall', '0.5'], ['#pwLength', '20']], ['select', '#pwMaterialSel', '59']],
    ['liftCalc', () => pbGoto('liftCalc'), [['#liftDepth', '4'], ['#liftThickness', '8']], ['select', '#liftSoilSel', '0.35']],
    ['slopeConvCalc', () => pbGoto('slopeConvCalc'), [['#slopeConvVal', '2']], ['toggle', '#slopeConvToggle button[data-val="deg"]']],
    ['manningCalc', () => pbGoto('manningCalc'), [['#manDia', '8'], ['#manSlope', '0.4']], ['select', '#manNSel', '0.010']],
    ['manholeDepthCalc', () => pbGoto('manholeDepthCalc'), [['#mhRim', '105.25'], ['#mhInv', '96.75'], ['#mhCone', '4'], ['#mhBarrel', '4']], ['fill', '#mhInv', '97']]
  ];
  for (const [screen, open, fills, change] of others) {
    await page.evaluate(open); await page.waitForTimeout(200);
    for (const [sel, val] of fills) await page.fill(sel, val);
    await page.click('#screen-' + screen + ' button:has-text("Calculate")');
    const before = await st(screen);
    if (change[0] === 'select') await page.selectOption(change[1], change[2]);
    else if (change[0] === 'fill') await page.fill(change[1], change[2]);
    else await page.click(change[1]);
    const after = await st(screen);
    L.check(screen + ': control answer current after Calculate (' + before.text.slice(0, 40) + ')', before.text !== '' && fresh(before));
    L.check(screen + ': changing ' + change[1] + ' marks the answer out of date', stale(after));
  }
  if (page._errors.length) console.log('page errors:', page._errors);
  L.check('no page errors', page._errors.length === 0);
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 2; });
