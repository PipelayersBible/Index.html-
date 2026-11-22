// lists tap targets under 44 px on a few screens: node small_probe.js <url>
const open = require('./probe.js');
(async () => {
  const { b, p } = await open(process.argv[2], 360, 740, { run: false });
  const list = () => p.evaluate(() => [...document.querySelectorAll('.pb-screen.active a, .pb-screen.active button, .pb-screen.active [role=button], .pb-screen.active summary')].filter(x => x.offsetParent && x.getClientRects().length).map(x => { const r = x.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), (x.textContent || x.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30), x.className.toString().slice(0, 30)]; }).filter(a => a[0] < 44 || a[1] < 44));
  for (const [nm, go] of [['home', () => pbGotoTab('home')], ['settings', () => pbOpenSettings()], ['formulasHub', () => pbGoto('formulasHub')], ['input', () => pbGoto('input')]]) {
    await p.evaluate(go); await p.waitForTimeout(900);
    console.log('== ' + nm, JSON.stringify(await list()));
  }
  await b.close();
})();
