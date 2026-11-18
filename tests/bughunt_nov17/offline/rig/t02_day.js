// a day offline: lock, laid marks, break, end + send report; then signal back
const {launch}=require('./srv');const co=require('./co_ok');const L=require('./lib');const F=require('./flow');
(async()=>{const {b,ctx,p,S,page}=await launch((process.env.PB_ROOT||'http://127.0.0.1:8877/')+(process.env.PG||'cur.html'),{init:co});const H=F(p);
 await ctx.setOffline(true);
 await L.newRun(p,100);await L.lock(p);
 const r=await L.rows(p);
 await L.markLaid(p,r[4]);await p.waitForTimeout(800);
 await p.click('#pbBrkBtn');await p.waitForTimeout(800);await p.click('#pbBrkEnd');await p.waitForTimeout(800);
 await L.markLaid(p,r[20]);await p.waitForTimeout(800);
 await p.evaluate(()=>{const b=[...document.querySelectorAll('#screen-results button')].find(b=>/^End Run/.test(b.textContent.trim())&&b.offsetParent);b.click();});await p.waitForTimeout(1000);
 for(let i=0;i<4;i++){const m=await H.modal();if(!m)break;console.log('END MODAL',m.slice(0,150),await H.modalBtns());const bs=await H.modalBtns();const c=['End Run','Now','Just Now','Yes','OK','Got It'].find(x=>bs.includes(x));if(!c)break;await H.modalClick(c);await p.waitForTimeout(1200);}
 const e0=await p.evaluate(()=>{const e=window.__pbRrDebug.run();return {completed:e.completed,send:e.reportSendWanted,sent:e.reportSentAt,breaks:e.breaks};});console.log('offline end',JSON.stringify(e0));
 console.log('home unsent:',await p.evaluate(()=>{const x=window.pbUnsentHomeItem();return x&&x.html;}));
 console.log('server calls while offline:',S.calls.length);
 const t0=Date.now();await ctx.setOffline(false);
 await p.waitForTimeout(20000);
 const runCalls=S.calls.filter(c=>/run_record_put|run_status_put|run_clock/.test(c.n)).map(c=>c.n+'@'+((c.t-t0)/1000).toFixed(1));console.log(runCalls.join(' '));
 const last=Object.values(S.records)[0];console.log('server versions',S.versions.length,'last ended',last&&last.record.completed,'send',last&&last.record.pbOffice&&last.record.pbOffice.send);
 const e1=await p.evaluate(()=>{const e=window.__pbRrDebug.run();return {send:e.reportSendWanted,sent:e.reportSentAt};});console.log('after',JSON.stringify(e1));
 console.log('home unsent:',await p.evaluate(()=>{const x=window.pbUnsentHomeItem();return x&&x.html;}));
 console.log(p.errs.slice(0,5));await b.close();})();
