const P=require('./perf');
(async()=>{const {b,ctx}=await P.launch({sw:false});for(const cpu of [1,4,6]){const p=await P.page(ctx,cpu);await p.goto(P.ORIGIN+'/empty_only.html');
const loop=await p.evaluate(()=>{const t=performance.now();let x=0;for(let i=0;i<3e7;i++)x+=i%7;return Math.round(performance.now()-t);});
await p.goto(P.ORIGIN+'/jspdf_only.html');const j=await p.evaluate(()=>Math.round(window.__t1-window.__t0));
await p.reload();const j2=await p.evaluate(()=>Math.round(window.__t1-window.__t0));
console.log('cpu',cpu,'loop',loop,'jspdf',j,j2);await p.close();}await b.close();})();
