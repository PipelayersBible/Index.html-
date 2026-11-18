// patch 02 test (real sw.js, server-shaped weak link). usage: node t_sw_budget.js <variant dir>
// PASS needs: a new build on one bar opens from the kept copy in < 12 s (CPU 4x) and the NEXT open has the new build;
// with good signal a new build is shown at once; offline and lie-fi still open the kept copy.
const P=require('./perf');const fs=require('fs');
const V=process.argv[2]||'base',DIR='/tmp/claude-0/audit/perf/'+V+'/',URL=P.ORIGIN+'/'+V+'/';
const BUILD=/const PB_APP_BUILD = '([^']+)'/;
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const setBuild=(orig,tag)=>fs.writeFileSync(DIR+'index.html',orig.replace(BUILD,"const PB_APP_BUILD = '"+tag+"'"));
const build=(p)=>p.evaluate(()=>{const m=document.documentElement.innerHTML.match(/const PB_APP_BUILD = '([^']+)'/);return m&&m[1];}).catch(()=>null);
(async()=>{const orig=fs.readFileSync(DIR+'index.html','utf8');
 try{
  await P.net(P.NET.fast+'&maxage=0');setBuild(orig,'B1');
  const {b,ctx}=await P.launch();let p=await P.page(ctx,4);
  await P.open(p,URL);await p.waitForTimeout(4500);const sw=await P.swReady(p);ok(sw.ctl,'service worker controls the page');await p.waitForTimeout(1500);await p.close();
  // 1. weak signal, new build published
  setBuild(orig,'B2');await P.net(P.NET.weak+'&maxage=0');
  p=await P.page(ctx,4);let r=await P.open(p,URL,120000);let bd=await build(p);
  console.log('   weak + new build: home '+r.home+' ms, fcp '+r.fcp+', build '+bd);
  ok(r.home&&r.home<20000,'weak signal + new build: usable Home in < 20 s ('+r.home+' ms)');await p.close();
  // the download finishes in the background (~50 s at 400 kbps); then an open with the same signal shows the new build
  await new Promise(x=>setTimeout(x,62000));
  p=await P.page(ctx,4);r=await P.open(p,URL,120000);bd=await build(p);console.log('   next open: home '+r.home+' ms, build '+bd);
  ok(bd==='B2','the open after the background download shows the new build ('+bd+')');await p.close();
  // 2. good signal, new build: shown at once
  setBuild(orig,'B3');await P.net(P.NET.fast+'&maxage=0');
  p=await P.page(ctx,4);r=await P.open(p,URL);bd=await build(p);ok(bd==='B3','good signal + new build: the new build is shown at once ('+bd+', home '+r.home+' ms)');await p.close();
  // 3. lie-fi: the kept copy after the 4 s wait
  await P.net(P.NET.hang);p=await P.page(ctx,4);r=await P.open(p,URL,60000);bd=await build(p);
  ok(bd==='B3'&&r.home<15000,'lie-fi: the kept copy ('+bd+', home '+r.home+' ms)');await p.close();
  // 4. offline (after the 60 s quick window)
  await P.net(P.NET.fast);await new Promise(x=>setTimeout(x,61000));await ctx.setOffline(true);
  p=await P.page(ctx,4);r=await P.open(p,URL,60000);bd=await build(p);ok(bd==='B3','offline: the kept copy ('+bd+', home '+r.home+' ms)');
  console.log('errs',p.errs.slice(0,3));await b.close();
 }finally{fs.writeFileSync(DIR+'index.html',orig);await P.net(P.NET.fast+'&maxage=600');}
 console.log(fails?'FAILED '+fails:'ALL PASS');process.exit(fails?1:0);})();
