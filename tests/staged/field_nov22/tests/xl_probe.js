// F6/F7 measurements: node xl_probe.js <url>
const open = require('./probe.js');
const ov = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); if (!e || !e.offsetParent) return 'n/a'; const r = e.getBoundingClientRect(); return { sw: e.scrollWidth, cw: e.clientWidth, l: Math.round(r.left), r: Math.round(r.right), vw: innerWidth, txt: e.textContent.trim().slice(0, 40) }; }, sel);
(async () => {
  const { b, p } = await open(process.argv[2], 360, 740);
  await p.evaluate(() => pbSetTextSize(140)); await p.waitForTimeout(800);
  await p.evaluate(() => { const b = document.getElementById('pbRsTopBtn'); if (b) b.click(); }); await p.waitForTimeout(400);
  console.log('runDetailsSum', JSON.stringify(await ov(p, '#runDetailsSum')));
  console.log('stats', JSON.stringify(await p.evaluate(() => { const el = document.getElementById('laidProgress'); const dts = [...el.querySelectorAll('dt')].map(d => { const r = d.getBoundingClientRect(); return [d.textContent, Math.round(r.left), Math.round(r.right), d.scrollWidth, d.clientWidth, Math.round(r.top)]; }); return { cls: el.className, dts, sw: el.scrollWidth, cw: el.clientWidth }; })));
  await p.evaluate(() => pbRecFromHome('daily')); await p.waitForTimeout(1500);
  for (let i = 0; i < 3; i++) { const m = await p.H.modal(); if (!m) break; const bt = await p.H.modalBtns(); await p.H.modalClick(bt.includes('Cancel') ? 'Cancel' : bt[bt.length - 1]).catch(() => {}); }
  console.log('partial', JSON.stringify(await p.evaluate(() => { const b = document.querySelector('button[onclick*="pbInsSetResult(\'partial\')"]'); if (!b) return 'none'; b.scrollIntoView(); const r = b.getBoundingClientRect(); const g = b.parentElement.getBoundingClientRect(); return { vis: !!b.offsetParent, sw: b.scrollWidth, cw: b.clientWidth, r: Math.round(r.right), gr: Math.round(g.right), vw: innerWidth }; })));
  await p.evaluate(() => pbSetTextSize(100)); await p.waitForTimeout(400);
  await p.evaluate(() => pbGoto('input')); await p.waitForTimeout(900);
  console.log('addXing', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.pb-add-xing-section')].filter(x => x.offsetParent).map(x => { const r = x.getBoundingClientRect(); return { sw: x.scrollWidth, cw: x.clientWidth, l: Math.round(r.left), r: Math.round(r.right), txt: x.innerText.trim(), kids: [...x.querySelectorAll('*')].map(k => Math.round(k.getBoundingClientRect().right)).reduce((a, c) => Math.max(a, c), 0) }; }))));
  await p.setViewportSize({ width: 320, height: 640 }); await p.evaluate(() => pbSetTextSize(140)); await p.waitForTimeout(600);
  console.log('tabs320', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('#pbTabBar .pb-tab .lb')].map(l => [l.textContent.trim(), getComputedStyle(l).fontSize, getComputedStyle(l, '::after').content, l.scrollWidth, l.clientWidth]))));
  await b.close();
})();
