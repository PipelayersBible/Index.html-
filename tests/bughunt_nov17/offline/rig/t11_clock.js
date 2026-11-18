// the phone's clock is weeks behind (reset after the battery died, no network time in the trench): the run is ended
// and sent offline, then signal returns and the clock corrects itself
const {launch}=require('./srv');const co=require('./co_ok');const F=require('./flow');const L=require('./lib');
(async()=>{const {b,ctx,p,S,page}=await launch((process.env.PB_ROOT||'http://127.0.0.1:8877/')+(process.env.PG||'cur.html'),{init:co});const H=F(p);
 await p.close();await ctx.setOffline(true);
 const real=Date.now();await ctx.clock.install({time:real-40*86400000});await ctx.clock.resume();
 const p1=await page();
 await L.newRun(p1,100);await L.lock(p1);const r=await L.rows(p1);await L.markLaid(p1,r[20]);await p1.waitForTimeout(800);
 await p1.evaluate(()=>{window.__pbNoEndLaidAsk=true;const b=[...document.querySelectorAll('#screen-results button')].find(b=>/^End Run/.test(b.textContent.trim())&&b.offsetParent);b.click();});await p1.waitForTimeout(1500);
 for(let i=0;i<4;i++){const bs=await F(p1).modalBtns();const c=['End Run','Now','Just Now','Yes','OK','Got It'].find(x=>bs.includes(x));if(!c)break;await F(p1).modalClick(c);await p1.waitForTimeout(1200);}
 console.log('ended offline:',await p1.evaluate(()=>{const e=window.__pbRrDebug.run();return {completed:e.completed,lock:String(e.lockTime).slice(0,15),send:!!e.reportSendWanted};}));
 await p1.close({runBeforeUnload:false});
 // network time comes back with the signal
 await ctx.clock.setSystemTime(Date.now()+40*86400000);await ctx.setOffline(false);
 const p2=await page();await p2.waitForTimeout(25000);
 const puts=S.calls.filter(c=>c.n==='pb_prod_run_record_put').length;
 console.log('record puts:',puts,'server records',Object.keys(S.records).length,'home:',await p2.evaluate(()=>{const x=window.pbUnsentHomeItem();return x&&x.html.replace(/<[^>]+>/g,' ').trim();}));
 console.log(puts>0?'PASS':'FAIL');await b.close();process.exit(puts>0?0:1);})();
