// UX-01: a calculator's answer must never look current after its inputs change.
// r15.95 (calclive, owner Nov 3): the Calculate buttons are gone and every calculator answers as you type, so the way
// this holds now is that any change — a number, a selector, a shape or reference toggle, a fitting, a soil type, a
// checkbox, an extra encasement pipe — replaces the answer at once with the answer for the new entries, and the
// out-of-date mark ("Inputs changed — recalculate") is never left on screen. Controls: the Material Volume unit toggle
// (display only) re-displays the same answer; entries are kept and the answer shows again on return (F32).
const L = require('/home/claude/test/lib.js');
(async () => {
  const browser = await L.chromium.launch();
  const page = await L.newPage(browser, 'uUX01');
  await L.dismiss(page);
  const st = (screen) => page.evaluate((s) => {
    const n = document.getElementById(s + 'StaleNote');
    const cfgRes = { bendCalc: ['bendResult'], beddingCalc: ['beddingResult'], volumeCalc: ['volumeResult'], trenchCalc: ['trenchResult', 'trenchDiagram'], flowCalc: ['flowResult'], ventCalc: ['ventResult'], pipeWeightCalc: ['pipeWeightResult'], liftCalc: ['liftResult'], slopeConvCalc: ['slopeConvResult'], manningCalc: ['manningResult'], manholeDepthCalc: ['manholeDepthResult'] }[s];
    const res = cfgRes.map(id => document.getElementById(id));
    const scr = document.getElementById('screen-' + s);
    return { banner: !!n && !n.hidden && n.offsetParent !== null && /Inputs changed — recalculate/.test(n.textContent), dim: res.every(r => r.classList.contains('pb-result-stale')),
      text: res[0].innerText.replace(/\s+/g, ' ').trim(), calcBtn: !![...scr.querySelectorAll('button')].find(b => b.textContent.trim() === 'Calculate' && b.offsetParent !== null) };
  }, screen);
  const settle = () => page.waitForTimeout(350);
  const fresh = (x) => !x.banner && !x.dim && x.text !== '';
  const check = L.check;

  // Bend Offset (the handoff's acceptance case): 1 ft at 45 degrees, then 2 ft — the answer follows at once.
  await page.evaluate(() => pbOpenBendCalc(null)); await page.waitForTimeout(200);
  await page.fill('#bendOffset', '1'); await page.selectOption('#bendAngle', '45'); await page.fill('#bendFit1', ''); await page.fill('#bendFit2', ''); await settle();
  let b = await st('bendCalc');
  check('r15.95: no Calculate button on Bend Offset; 1 ft offset, 45° answers 1.414 ft as typed, shown as current', !b.calcBtn && /1\.414 ft/.test(b.text) && fresh(b), b);
  await page.fill('#bendOffset', '2'); await settle(); b = await st('bendCalc');
  console.log('after editing the offset:', JSON.stringify(b));
  check('editing the offset to 2 ft replaces the answer at once (2.828 ft), nothing left looking out of date', /2\.828 ft/.test(b.text) && !/1\.414 ft/.test(b.text) && fresh(b), b);
  const before = b.text;
  await page.selectOption('#bendAngle', '22.5'); await settle(); b = await st('bendCalc');
  check('changing the bend angle selector re-answers at once (not 2.828 any more) and stays current', b.text !== before && !/2\.828 ft/.test(b.text) && fresh(b), b);
  await page.fill('#bendFit1', '0.25'); await settle(); const withFit = await st('bendCalc');
  check('typing an optional fitting take-up re-answers at once and stays current', withFit.text !== b.text && fresh(withFit), withFit);

  // Structure Bedding: the Invert/BOP reference toggle.
  await page.evaluate(() => pbOpenBeddingCalc(null)); await page.waitForTimeout(200);
  await page.fill('#beddingInv', '100'); await page.fill('#beddingWT', '0.1'); await page.fill('#beddingDist', '2'); await page.fill('#beddingThk', '0.5'); await settle();
  let bd = await st('beddingCalc');
  check('control: bedding answer 98.000 shown as current, no Calculate button', !bd.calcBtn && /98\.000 ft/.test(bd.text) && fresh(bd), bd);
  await page.click('#beddingRefToggle button[data-val="bop"]'); await settle(); bd = await st('beddingCalc');
  check('switching Invert -> BOP drops the invert answer (98.000) at once — the BOP elevation is not entered yet, so no answer and nothing stale', !/98\.000 ft/.test(bd.text) && !bd.banner && !bd.dim, bd);
  await page.fill('#beddingBop', '99.9'); await settle(); bd = await st('beddingCalc');
  check('typing the BOP elevation answers at once for the BOP reference (top of bedding 97.900 ft), current', /97\.900 ft/.test(bd.text) && fresh(bd), bd);
  await page.click('#beddingRefToggle button[data-val="inv"]'); await settle();
  await page.evaluate(() => pbGoto('calcHub')); await page.waitForTimeout(200);
  await page.evaluate(() => pbOpenBeddingCalc(null)); await page.waitForTimeout(300); bd = await st('beddingCalc');
  const kept = await page.evaluate(() => [document.getElementById('beddingInv').value, document.getElementById('beddingDist').value]);
  check('r15.95 (F32): entries are kept on return and the answer for them shows again, current', kept[0] === '100' && kept[1] === '2' && /98\.000 ft/.test(bd.text) && fresh(bd), { kept, bd });

  // Material Volume: shape toggle re-answers; the unit toggle (same answer, other units) only re-displays.
  await page.evaluate(() => pbOpenVolumeCalc()); await page.waitForTimeout(200);
  await page.fill('#volRectL', '27'); await page.fill('#volRectW', '1'); await page.fill('#volRectD', '1'); await settle();
  let v = await st('volumeCalc');
  check('control: 27 x 1 x 1 answers 1.00 yd³ as typed', /1\.00 yd³/.test(v.text) && fresh(v), v);
  await page.click('#volUnitToggle button[data-val="ft3"]'); await settle(); v = await st('volumeCalc');
  check('control: the cubic-feet unit toggle only re-displays the same answer (27.00 ft³), current', /27\.00 ft³/.test(v.text) && fresh(v), v);
  await page.click('#volShapeToggle button[data-val="cyl"]'); await settle(); v = await st('volumeCalc');
  check('switching the shape (Rectangular -> Cylindrical) drops the rectangle\'s 27.00 ft³ at once (nothing stale shown)', !/27\.00 ft³/.test(v.text) && !v.banner && !v.dim, v);
  check('control: with no answer the unit toggle is put away (nothing to re-display)', await page.evaluate(() => document.getElementById('volUnitToggle').offsetParent === null));
  await page.click('#volShapeToggle button[data-val="encase"]');
  await page.fill('#volEncL', '10'); await page.fill('#volEncW', '3'); await page.fill('#volEncD', '3'); await page.fill('#volEncOD', '12'); await page.fill('#volEncPipeL', '10'); await settle();
  v = await st('volumeCalc');
  check('control: encasement 3.04 yd³ current', /3\.04 yd³/.test(v.text) && fresh(v), v);
  await page.click('#screen-volumeCalc button:has-text("Add Another Pipe Size")'); await settle();
  const extraIds = await page.evaluate(() => [...document.querySelectorAll('#volEncExtraContainer [data-enc-extra] input')].map(i => i.id || i.placeholder));
  await page.evaluate(() => { const ins = [...document.querySelectorAll('#volEncExtraContainer [data-enc-extra] input')]; const vals = ['6', '1', '10']; ins.forEach((i, k) => { i.value = vals[k] || '1'; i.dispatchEvent(new Event('input', { bubbles: true })); }); });
  await settle(); v = await st('volumeCalc');
  check('adding another pipe size to the encasement re-answers at once (less than 3.04 yd³) and stays current', fresh(v) && !/3\.04 yd³/.test(v.text), { v, extraIds });
  await page.click('#volEncExtraContainer .pb-remove'); await settle(); v = await st('volumeCalc');
  check('removing that pipe size re-answers at once (3.04 yd³ again), current', /3\.04 yd³/.test(v.text) && fresh(v), v);

  // Trench Sloping: soil selector and the optional checkbox; the answer and its diagram follow together.
  await page.evaluate(() => pbOpenTrenchCalc()); await page.waitForTimeout(400);
  await page.selectOption('#trenchSoil', 'A'); await page.fill('#trenchDepth', '10'); await page.fill('#trenchBottomW', '2'); await settle();
  let t = await st('trenchCalc');
  check('control: Type A trench answer 17.00 ft current', /17\.00 ft/.test(t.text) && fresh(t), t);
  await page.selectOption('#trenchSoil', 'C'); await settle(); t = await st('trenchCalc');
  check('changing the soil type re-answers at once (Type C: wider than 17.00 ft), answer and diagram current', !/17\.00 ft/.test(t.text) && fresh(t), t);
  await page.selectOption('#trenchSoil', 'A'); await settle();
  await page.check('#trenchVertOpt'); await settle(); const tv = await st('trenchCalc');
  check('ticking the vertical-lower-portion option re-answers at once and stays current', tv.text !== t.text && fresh(tv), tv);

  // Every other calculator: one input change each re-answers at once; no Calculate button anywhere.
  const others = [
    ['flowCalc', () => pbOpenFlowCalc(), [['#flowPsi', '50'], ['#flowDia', '2.5']], ['select', '#flowCSel', '0.8']],
    ['ventCalc', () => pbOpenVentCalc(), [['#ventRectL', '10'], ['#ventRectW', '4'], ['#ventRectD', '6'], ['#ventACH', '20']], ['fill', '#ventRectD', '8']],
    ['pipeWeightCalc', () => pbGoto('pipeWeightCalc'), [['#pwID', '11'], ['#pwWall', '0.5'], ['#pwLength', '20']], ['select', '#pwMaterialSel', '59']], // fix96_pw: inside diameter is entered, OD is worked out
    ['liftCalc', () => pbGoto('liftCalc'), [['#liftDepth', '4'], ['#liftThickness', '8']], ['select', '#liftSoilSel', '0.35']],
    ['slopeConvCalc', () => pbGoto('slopeConvCalc'), [['#slopeConvVal', '2']], ['toggle', '#slopeConvToggle button[data-val="deg"]']],
    ['manningCalc', () => pbGoto('manningCalc'), [['#manDia', '8'], ['#manSlope', '0.4']], ['select', '#manNSel', '0.010']],
    ['manholeDepthCalc', () => pbGoto('manholeDepthCalc'), [['#mhRim', '105.25'], ['#mhInv', '96.75'], ['#mhCone', '4'], ['#mhBarrel', '4']], ['fill', '#mhInv', '97']]
  ];
  for (const [screen, open, fills, change] of others) {
    await page.evaluate(open); await page.waitForTimeout(200);
    for (const [sel, val] of fills) await page.fill(sel, val);
    await settle();
    const before = await st(screen);
    if (change[0] === 'select') await page.selectOption(change[1], change[2]);
    else if (change[0] === 'fill') await page.fill(change[1], change[2]);
    else await page.click(change[1]);
    await settle();
    const after = await st(screen);
    check(screen + ': answers as typed, no Calculate button (' + before.text.slice(0, 40) + ')', !before.calcBtn && fresh(before), before);
    check(screen + ': changing ' + change[1] + ' re-answers at once and stays current', after.text !== before.text && fresh(after), after);
  }
  if (page._errors.length) console.log('page errors:', page._errors);
  check('no page errors', page._errors.length === 0);
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 2; });
