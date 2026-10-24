// owner, Oct 21: Bedding & Shading calculator (bedding and / or shading, compaction, sections for other sizes, tons).
const L = require('/home/claude/batch14/F/tests/lf_lib.js'); const { M, check } = L;
const sleep = (p, ms) => p.waitForTimeout(ms);
const txt = (p, s) => p.evaluate((q) => { const e = document.querySelector(q); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; }, s);
const f2 = (n, d) => Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
(async () => {
  const browser = await M.chromium.launch();
  const errs = [];
  try {
    const { ctx, page } = await L.setupTouch(browser, { uid: 'acctP', role: 'pipelayer' }); await sleep(page, 1500); await M.dismiss(page);
    page.on('pageerror', e => errs.push(String(e)));
    await page.evaluate(() => pbGotoTab('calculators')); await sleep(page, 400);
    await page.evaluate(() => pbGoto('calcCatPipe')); await sleep(page, 400);
    check('Calculators > Pipe has a "Bedding & Shading" tile', /Bedding & Shading/.test(await txt(page, '#screen-calcCatPipe')));
    await page.evaluate(() => [...document.querySelectorAll('#screen-calcCatPipe .pb-home-tile')].find(t => /Bedding & Shading/.test(t.textContent)).click()); await sleep(page, 400);
    check('it opens with Bedding on, Shading off, 15% compaction', await page.evaluate(() => document.querySelector('.pb-screen.active').id === 'screen-bedShadeCalc' && document.getElementById('bsUseBed').getAttribute('aria-pressed') === 'true' && document.getElementById('bsUseShade').getAttribute('aria-pressed') === 'false') && (await page.inputValue('#bsExtra')) === '15');
    await page.fill('#bsL0', '300'); await page.fill('#bsW0', '3'); await page.fill('#bsT0', '0.5'); await sleep(page, 400);
    const bedO = 300 * 3 * 0.5 / 27 * 1.15;
    check('bedding: 300 × 3 × 0.5 = 450 ft³ = 16.67 yd³ + 15% = ' + f2(bedO, 1) + ' yd³ (' + await txt(page, '#bsBedBox') + ')', new RegExp(f2(bedO, 1) + ' yd³').test(await txt(page, '#bsBedBox')) && /16\.67 yd³ in place \+ 15% compaction/.test(await txt(page, '#bsBedBox')));
    check('bedding has its own weight picker', /Bedding weight in tons/.test(await txt(page, '#bsResult')));
    await page.click('#bsUseShade'); await sleep(page, 300);
    check('Shading on: pipe picker and shading box appear', !!(await page.$('#bsPipe0')) && !!(await page.$('#bsS0')));
    await page.selectOption('#bsPipe0', 'sdr:8.400'); await sleep(page, 200); await page.fill('#bsS0', '1'); await sleep(page, 400);
    const o = 8.4 / 12, sh = 300 * (3 * (o + 1) - Math.PI * o * o / 4) / 27 * 1.15;
    check('shading, 8" SDR 35, 1 ft over: ' + f2(sh, 1) + ' yd³ (' + await txt(page, '#bsShadeBox') + ')', new RegExp(f2(sh, 1) + ' yd³').test(await txt(page, '#bsShadeBox')));
    check('both: a combined line', new RegExp(f2(bedO + sh, 1) + ' yd³').test(await txt(page, '#bsBothBox')));
    await page.click('#bsAddSec'); await sleep(page, 300);
    check('Add Section copies the width, pipe and thicknesses, length empty', (await page.inputValue('#bsW1')) === '3' && (await page.inputValue('#bsPipe1')) === 'sdr:8.400' && (await page.inputValue('#bsL1')) === '');
    await page.fill('#bsL1', '980'); await page.fill('#bsW1', '2'); await page.selectOption('#bsPipe1', 'sdr:4.215'); await sleep(page, 300); await page.fill('#bsL1', '980'); await sleep(page, 400);
    const o2 = 4.215 / 12, bed2 = 980 * 2 * 0.5, sh2 = 980 * (2 * (o2 + 1) - Math.PI * o2 * o2 / 4);
    const bedT = (450 + bed2) / 27 * 1.15, shT = (300 * (3 * (o + 1) - Math.PI * o * o / 4) + sh2) / 27 * 1.15;
    check('two sections add up: bedding ' + f2(bedT, 1) + ', shading ' + f2(shT, 1) + ' (' + await txt(page, '#bsBedBox') + ' | ' + await txt(page, '#bsShadeBox') + ')', new RegExp(f2(bedT, 1) + ' yd³').test(await txt(page, '#bsBedBox')) && new RegExp(f2(shT, 1) + ' yd³').test(await txt(page, '#bsShadeBox')));
    check('each section shows its math', /Section 2 bedding: 980 × 2 × 0.5 ft/.test(await txt(page, '#bsResult')) && /Section 2 shading: 980 × \(2 × \(0.351/.test(await txt(page, '#bsResult')));
    await page.fill('#bsExtra', '10'); await sleep(page, 400);
    check('compaction 10%: totals and the weight use it', new RegExp(f2(bedT / 1.15 * 1.1, 1) + ' yd³').test(await txt(page, '#bsBedBox')) && /\+ 10% compaction/.test(await txt(page, '#bsBedBox')));
    await page.evaluate(() => { const b = [...document.querySelectorAll('#pbWt-bedshadeB button')].find(x => /Fine sand/.test(x.textContent)); if (b) b.click(); }); await sleep(page, 300);
    check('bedding tons with 10%, labelled Bedding (' + (await txt(page, '#pbWt-bedshadeB')).slice(0, 60) + ')', /With 10% compaction allowance/.test(await txt(page, '#pbWt-bedshadeB')) && /^Bedding weight in tons/.test(await txt(page, '#pbWt-bedshadeB')));
    await page.screenshot({ path: '/home/claude/feat_bedshade/bedshade.png', fullPage: true });
    await page.click('#bsUseBed'); await sleep(page, 300);
    check('Bedding off: no bedding box, no thickness field', !(await page.$('#bsBedBox')) && !(await page.$('#bsT0')));
    await page.fill('#bsW1', '0.2'); await sleep(page, 400);
    check('a trench narrower than the pipe says so', /narrower than the pipe/.test(await txt(page, '#bsResult')));
    await page.click('#bsDel1'); await sleep(page, 300);
    check('Remove takes the section out', !(await page.$('#bsSec1')));
    check('no page errors (' + errs.slice(0, 3).join(' | ') + ')', errs.length === 0);
    await ctx.close();
  } catch (e) { console.log('SCRIPT ERROR', e); }
  await browser.close();
})();
