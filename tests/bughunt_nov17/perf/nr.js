const P=require('./perf');
(async()=>{for(const pg of ['index.html','p04.html','index.html','p04.html']){const {b,ctx}=await P.launch({sw:false});const p=await P.page(ctx,4);const o=await P.open(p,P.ORIGIN+'/'+pg);await p.waitForTimeout(3000);
const r=await p.evaluate(async()=>{window.__pf.lt=[];const t0=performance.now();[...document.querySelectorAll('#screen-home button,#screen-home [role=button]')].find(x=>x.offsetParent&&/New Run/.test(x.textContent)).click();await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));const ms=performance.now()-t0;await new Promise(r=>setTimeout(r,1500));return {ms:Math.round(ms),lt:window.__pf.lt.reduce((a,x)=>a+x[1],0)};});
console.log(pg,'home',o.home,'startLt',o.ltSum,'newRun',JSON.stringify(r));await b.close();}})();
