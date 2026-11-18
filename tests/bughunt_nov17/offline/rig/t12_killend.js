// the phone dies at once after Break, after End Run and Send Report, and after Lock
const {launch}=require('./srv');const co=require('./co_ok');const F=require('./flow');const L=require('./lib');
const W=+process.argv[2]||0;
(async()=>{const {b,ctx,p,S,page}=await launch((process.env.PB_ROOT||'http://127.0.0.1:8877/')+(process.env.PG||'cur.html'),{init:co});
 await ctx.setOffline(true);
 await L.newRun(p,100);
 // kill right after Lock
 await F(p).click('Lock This Run');await p.waitForTimeout(300);await L.clearModals(p,['Lock Without It','I Checked Them','Use It']);await p.waitForTimeout(W);
 await p.close({runBeforeUnload:false});let q=await page();
 console.log('after Lock kill: run kept?',await q.evaluate(()=>{const e=window.__pbRrDebug.run();return e?{id:e.id,locked:!!e.lockTime}:null;}));
 await q.evaluate(()=>pbResumeLastRunResults());await q.waitForTimeout(2000);
 const r=await L.rows(q);await L.markLaid(q,r[6]);await q.waitForTimeout(600);
 await q.click('#pbBrkBtn');await q.waitForTimeout(W);
 await q.close({runBeforeUnload:false});q=await page();
 console.log('after Break kill: onBreak',await q.evaluate(()=>!!window.__pbRrDebug.run().onBreak));
 await q.evaluate(()=>pbResumeLastRunResults());await q.waitForTimeout(2000);
 console.log('break cover shown on reopen:',await q.evaluate(()=>{const o=document.getElementById('pbBrk');return !!o&&!o.hidden;}));
 await q.click('#pbBrkEnd').catch(()=>console.log('no end-break button'));await q.waitForTimeout(800);
 await q.evaluate(()=>{window.__pbNoEndLaidAsk=true;const b=[...document.querySelectorAll('#screen-results button')].find(b=>/^End Run/.test(b.textContent.trim())&&b.offsetParent);b.click();});await q.waitForTimeout(400);
 for(let i=0;i<3;i++){const bs=await F(q).modalBtns();const c=['End Run','Now','Just Now','Yes'].find(x=>bs.includes(x));if(!c)break;await F(q).modalClick(c);await q.waitForTimeout(300);}
 await q.waitForTimeout(W);
 await q.close({runBeforeUnload:false});q=await page();
 const st=await q.evaluate(()=>{const e=window.__pbRrDebug.run();return {completed:e.completed,send:!!e.reportSendWanted,breaks:(e.breaks||[]).length,onBreak:!!e.onBreak};});
 console.log('after End kill:',JSON.stringify(st),'home:',await q.evaluate(()=>{const x=window.pbUnsentHomeItem();return x&&x.html.replace(/<[^>]+>/g,' ').trim();}));
 await ctx.setOffline(false);await q.waitForTimeout(15000);
 const rec=Object.values(S.records)[0];console.log('server: completed',rec&&rec.record.completed,'send',rec&&rec.record.pbOffice.send,'breaks',rec&&(rec.record.breaks||[]).length,'versions',S.versions.length);
 console.log('home after signal:',await q.evaluate(()=>{const x=window.pbUnsentHomeItem();return x&&x.html.replace(/<[^>]+>/g,' ').trim();}));
 console.log(q.errs.filter(e=>!/subscription/.test(e)).slice(0,4));await b.close();})();
