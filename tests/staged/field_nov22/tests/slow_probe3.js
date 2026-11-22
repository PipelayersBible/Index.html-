// F5 probe 3: a returning foreman (records + plan kept on the phone). Second open: the login service takes D ms to answer
// (an expired sign-in being renewed on weak signal; every server call slow). Samples what a tap on New Run does.
// node slow_probe3.js <url> [D]
const R = __dirname + '/../../../rig/';
const { chromium } = require('playwright'); const fs = require('fs');
const co = require(R + 'co_fm');
(async () => {
  const D = +(process.argv[3] || 7000);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: 'block' });
  const fsb = fs.readFileSync(R + 'fakesb.js', 'utf8').replace('const res=(data)=>Promise.resolve({data,error:null});', 'const __slow=(()=>{try{return localStorage.getItem("pbSlowAuth")==="1";}catch(e){return false;}})();const res=(data)=>__slow?new Promise(r=>setTimeout(()=>r({data,error:null}),' + D + ')):Promise.resolve({data,error:null});');
  await ctx.route(/supabase-js/, r => r.fulfill({ contentType: 'application/javascript', body: fsb }));
  await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(co);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3500);
  await p.evaluate(() => localStorage.setItem('pbSlowAuth', '1'));
  const t0 = Date.now(); p.reload({ waitUntil: 'commit' }).catch(() => {});
  let clicked = 0;
  for (let i = 0; i < 40; i++) {
    await new Promise(z => setTimeout(z, 500));
    let s; try { s = await p.evaluate(() => {
      const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';
      const scr = document.querySelector('.pb-screen.active'); const md = [...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x => x.offsetParent && x.innerText.trim());
      const ld = document.getElementById('pbLoading');
      return { main: !!window.__pbMainInit, cover: vis(document.getElementById('pbBootCover')), loading: vis(ld) ? ld.innerText.replace(/\s+/g, ' ') : '', scr: scr && scr.id, acct: (document.getElementById('loggedInAs') || {}).textContent, locked: document.querySelectorAll('#screen-home .pb-home-tile-locked').length, modal: md ? md.innerText.replace(/\s+/g, ' ').slice(0, 120) : '' };
    }); } catch (e) { s = { err: e.message.slice(0, 60) }; }
    console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(s));
    if (s.main && !s.cover && !clicked && i >= 1) { clicked = 1; await p.evaluate(() => { const nr = [...document.querySelectorAll('button,a,[role=button],.pb-home-tile')].find(x => x.offsetParent && /^New Run/.test(x.textContent.trim())); if (nr) nr.click(); }).catch(() => {}); console.log('  tapped New Run'); }
    if (s.scr && s.scr !== 'screen-home') { console.log('  -> ' + s.scr); break; }
  }
  if (process.argv[4]) await p.screenshot({ path: process.argv[4] });
  console.log('errs', p.errs.slice(0, 3)); await b.close();
})();
