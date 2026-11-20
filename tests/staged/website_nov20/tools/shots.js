// usage: node shots.js <port> <outdir> [page ...]   (one browser; serves nothing itself)
const { chromium } = require('playwright');
(async () => {
  const [port, out, ...only] = process.argv.slice(2);
  const pages = only.length ? only : ['/', '/tools/', '/guides/', '/tools/trench-sloping/', '/tools/pipe-grade-calculator/', '/confined-space-permit-app/'];
  const b = await chromium.launch();
  const res = {};
  for (const [name, vp] of [['phone', { width: 390, height: 844 }], ['desk', { width: 1280, height: 800 }]]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1 });
    await ctx.route(/gc\.zgo\.at|goatcounter|supabase/, r => r.abort());
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    for (const u of pages) {
      await p.goto('http://127.0.0.1:' + port + u, { waitUntil: 'load' });
      await p.waitForTimeout(250);
      const slug = (u.replace(/^\/|\/$/g, '').replace(/\//g, '_') || 'home');
      await p.screenshot({ path: `${out}/${slug}_${name}_fold.png` });
      if (name === 'phone' || u === '/') await p.screenshot({ path: `${out}/${slug}_${name}_full.png`, fullPage: true });
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h1: document.querySelectorAll('h1').length, h: document.documentElement.scrollHeight,
        small: [...document.querySelectorAll('a,button,summary')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 40 && !e.closest('p,li,.crumbs,figcaption,small,.ans,td'); }).map(e => (e.textContent || '').trim().slice(0, 30) + ':' + Math.round(e.getBoundingClientRect().height)) }));
      res[slug + '_' + name] = Object.assign(m, { errs });
    }
    await ctx.close();
  }
  await b.close();
  console.log(JSON.stringify(res, null, 1));
})();
