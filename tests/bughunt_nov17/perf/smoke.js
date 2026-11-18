const P=require('./perf');
(async()=>{await P.net(P.NET.fast);const {b,ctx}=await P.launch();const p=await P.page(ctx,0);
 console.log(await P.open(p,P.ORIGIN+'/base/'));await p.waitForTimeout(3500);console.log(await P.swReady(p));console.log(await P.heap(p));
 await P.log(true);const p2=await P.page(ctx,0);console.log('second',await P.open(p2,P.ORIGIN+'/base/'));console.log(await P.log(true));
 console.log(p.errs.slice(0,3));await b.close();})();
