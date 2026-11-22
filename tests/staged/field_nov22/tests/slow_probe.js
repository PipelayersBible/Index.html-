// F5 probe: first open (no service worker, empty storage) on a slow link; samples what is on screen every 500 ms.
// node slow_probe.js <url> [bytesPerSec]
const R = __dirname + '/../../../rig/';
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: 'block' });
  await ctx.route(/supabase-js/, async r => { await new Promise(z => setTimeout(z, +(process.env.SBDELAY || 0))); r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(R + 'fakesb.js', 'utf8') }); });
  await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 300, downloadThroughput: +(process.argv[3] || 600000), uploadThroughput: 50000 });
  const t0 = Date.now(); p.goto(process.argv[2], { waitUntil: 'commit', timeout: 120000 }).catch(e => console.log('goto', e.message));
  for (let i = 0; i < 60; i++) {
    await new Promise(z => setTimeout(z, 500));
    let s; try { s = await p.evaluate(() => {
      const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
      const cover = document.getElementById('pbBootCover'), ld = document.getElementById('pbLoading');
      const top = document.elementFromPoint(180, 400); const btns = [...document.querySelectorAll('button')].filter(x => x.offsetParent && x.getBoundingClientRect().top < 740).length;
      return { rs: document.readyState, main: !!window.__pbMainInit, cover: vis(cover), loading: vis(ld) ? ld.innerText : '', btns, top: top ? top.tagName + '#' + top.id + '.' + String(top.className).slice(0, 30) : null, text: (document.body ? document.body.innerText : '').replace(/\s+/g, ' ').slice(0, 80) };
    }); } catch (e) { s = { err: e.message.slice(0, 60) }; }
    console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(s));
    if (s.main && !s.cover && !s.loading && i > 4) break;
  }
  await b.close();
})();
