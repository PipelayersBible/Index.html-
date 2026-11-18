// how big is one run with AI stake photos in Records (IndexedDB), and what does a save cost
const {launch}=require('./srv');const co=require('./co_ok');const F=require('./flow');const L=require('./lib');
(async()=>{const {b,ctx,p,S}=await launch((process.env.PB_ROOT||'http://127.0.0.1:8877/')+(process.env.PG||'cur.html'),{init:co});const H=F(p);
 const {setStake,S:St}=await F.setup(p,H);
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 await L.lock(p);
 const sz=await p.evaluate(async()=>{const e=window.__pbRrDebug.run();const j=JSON.stringify(e);let imgs=0,imgChars=0;j.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+\/=]+/g,m=>{imgs++;imgChars+=m.length;return '';});
   let ls=0;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);ls+=k.length+(localStorage.getItem(k)||'').length;}
   const est=await navigator.storage.estimate();return {runChars:j.length,imgs,imgChars,lsChars:ls,usage:est.usage};});
 console.log(JSON.stringify(sz));
 const r=await L.rows(p);const t0=Date.now();await L.markLaid(p,r[4]);console.log('mark+save ms (incl. UI waits ~1000):',Date.now()-t0);
 console.log(p.errs.slice(0,3));await b.close();})();
