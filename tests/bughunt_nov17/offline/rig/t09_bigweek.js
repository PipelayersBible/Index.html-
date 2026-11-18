// a busy month of runs with AI stake photos: what does one laid mark cost, and what does storage hold
const {launch}=require('./srv');const co=require('./co_ok');const F=require('./flow');const L=require('./lib');
const N=+process.argv[2]||40;
(async()=>{const {b,ctx,p,S,page}=await launch((process.env.PB_ROOT||'http://127.0.0.1:8877/')+(process.env.PG||'cur.html'),{init:co});const H=F(p);
 await F.setup(p,H);await H.click('Review & Calculate');await p.waitForTimeout(1500);await L.lock(p);await p.waitForTimeout(1500);
 const info=await p.evaluate(async(N)=>{const uid='00000000-0000-4000-8000-000000000001',key=uid+':runArchive';
   const db=await new Promise((ok,no)=>{const r=indexedDB.open('pb-big',1);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
   const get=()=>new Promise((ok,no)=>{const t=db.transaction('kv','readonly');const q=t.objectStore('kv').get(key);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);});
   const raw=await get();const arr=JSON.parse(raw);const run=arr.find(e=>e.kind==='run');
   for(let i=1;i<=N;i++){const c=JSON.parse(JSON.stringify(run));c.id=run.id-i*3600000*5;c.lockTime=new Date(c.id).toISOString();c.completed=true;c.runEndTime=c.id+3600000;arr.push(c);}
   const s=JSON.stringify(arr);await new Promise((ok,no)=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(s,key);t.oncomplete=ok;t.onerror=()=>no(t.error);});db.close();
   return {chars:s.length};},N);
 console.log('archive chars',info.chars,'(~'+Math.round(info.chars/1e6)+' M)');
 await p.close();const p2=await page();
 await p2.evaluate(()=>pbResumeLastRunResults());await p2.waitForTimeout(2500);
 const r=await L.rows(p2);
 await p2.evaluate(()=>{window.__lt=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(e.duration))).observe({entryTypes:['longtask']});});
 await L.markLaid(p2,r[4]);await p2.waitForTimeout(8000);
 const lt=await p2.evaluate(()=>({n:window.__lt.length,max:Math.round(Math.max(0,...window.__lt)),sum:Math.round(window.__lt.reduce((a,b)=>a+b,0))}));
 console.log('main thread blocked after one laid mark (8 s window):',JSON.stringify(lt),'marks in memory',await p2.evaluate(()=>Object.keys(window.__pbRrDebug.run().laid.marks||{}).length));
 const sendMs=await p2.evaluate(async()=>{window.__lt=[];const t0=performance.now();await window.__pbRrDebug.send();return Math.round(performance.now()-t0);});await p2.waitForTimeout(1500);
 console.log('one pbRrSend pass ms:',sendMs,'longtasks',JSON.stringify(await p2.evaluate(()=>({n:window.__lt.length,max:Math.round(Math.max(0,...window.__lt)),sum:Math.round(window.__lt.reduce((a,b)=>a+b,0))}))));
 const est=await p2.evaluate(async()=>{const e=await navigator.storage.estimate();return {usageMB:Math.round(e.usage/1e6),quotaMB:Math.round(e.quota/1e6)};});console.log(JSON.stringify(est));
 // long tasks during the save
 console.log(p2.errs.slice(0,3));await b.close();})();
