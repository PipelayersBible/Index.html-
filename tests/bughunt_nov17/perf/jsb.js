const P=require('./perf');
(async()=>{const {b,ctx}=await P.launch({sw:false});for(const cpu of [1,4,6]){const r=[];for(let i=0;i<3;i++){const p=await P.page(ctx,cpu);await p.goto(P.ORIGIN+'/jspdf_only.html');r.push(await p.evaluate(()=>Math.round(window.__t1-window.__t0)));await p.close();}console.log('cpu',cpu,'jsPDF+AutoTable eval ms',r.join(','));}await b.close();})();
