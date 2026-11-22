// F5 probe 2: signed-in foreman, page from cache-speed link, every server answer takes D ms (weak signal).
// node slow_probe2.js <url> [D] [bytesPerSec]
const R = __dirname + '/../../../rig/';
const { chromium } = require('playwright'); const fs = require('fs');
const co = require(R + 'co_fm');
(async () => {
  const D = +(process.argv[3] || 7000);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: 'block' });
  const fsb = fs.readFileSync(R + 'fakesb.js', 'utf8').replace('const res=(data)=>Promise.resolve({data,error:null});', 'const res=(data)=>new Promise(r=>setTimeout(()=>r({data,error:null}),' + D + '));');
  await ctx.route(/supabase-js/, r => r.fulfill({ contentType: 'application/javascript', body: fsb }));
  await ctx.route(/supabase\.co/, async r => { await new Promise(z => setTimeout(z, D)); r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }).catch(() => {}); });
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(co);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  if (process.argv[4]) { const cdp = await ctx.newCDPSession(p); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 300, downloadThroughput: +process.argv[4], uploadThroughput: 50000 }); }
  const t0 = Date.now(); p.goto(process.argv[2], { waitUntil: 'commit', timeout: 120000 }).catch(e => console.log('goto', e.message));
  let clicked = false;
  for (let i = 0; i < 50; i++) {
    await new Promise(z => setTimeout(z, 500));
    let s; try { s = await p.evaluate(() => {
      const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
      const cover = document.getElementById('pbBootCover'), ld = document.getElementById('pbLoading');
      const scr = document.querySelector('.pb-screen.active'); const nr = [...document.querySelectorAll('button')].find(x => x.offsetParent && x.textContent.trim() === 'New Run');
      const r = nr && nr.getBoundingClientRect(); const top = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
      return { rs: document.readyState, main: !!window.__pbMainInit, cover: vis(cover), loading: vis(ld) ? ld.innerText.replace(/\s+/g, ' ') : '', scr: scr && scr.id, newRun: !!nr, hit: top ? top.tagName + '#' + top.id + '.' + String(top.className).slice(0, 25) + ' ' + (top.textContent || '').trim().slice(0, 12) : null, modal: !!document.querySelector('.pb-modal-overlay[style*="flex"], .pb-modal-overlay.show'), btns: [...document.querySelectorAll('button')].filter(x => x.offsetParent && x.getBoundingClientRect().top < 700 && x.getBoundingClientRect().bottom > 0).map(x => x.textContent.trim().slice(0, 14)).slice(0, 12) };
    }); } catch (e) { s = { err: e.message.slice(0, 60) }; }
    console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(s)); if ([2,6,12,20].includes(i)) await p.screenshot({ path: __dirname + '/../work/slow_' + i + '.png' }).catch(() => {});
    if (!clicked && s.newRun && !s.cover && s.hit && / New Run/.test(s.hit)) { clicked = true; const tc = Date.now(); await p.evaluate(() => { const nr = [...document.querySelectorAll('button')].find(x => x.offsetParent && x.textContent.trim() === 'New Run'); nr.click(); }).catch(() => {});
      console.log('  clicked New Run at ' + ((tc - t0) / 1000).toFixed(1) + 's'); }
    if (clicked && s.scr && s.scr !== 'screen-home') { console.log('  screen changed -> ' + s.scr); break; }
  }
  console.log('errs', p.errs.slice(0, 3)); await b.close();
})();
