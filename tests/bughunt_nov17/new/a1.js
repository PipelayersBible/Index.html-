const mk=require('./mk');
(async()=>{const {b,p,H,rowMenu,dists}=await mk();
 console.log('rows',dists.join(' '));
 console.log(JSON.stringify(await p.evaluate(()=>{const e=window.__pbCsEntry();return {rodUnit:e.rodUnit,pipeType:e.pipeType,keys:Object.keys(e).join(','),row3:e.intervalRows[3],fit:Object.values(e.pointInputs).map(x=>x.fit),C:pbFitCount(e)};}),null,0));
 console.log('errs',p.errs.slice(0,5));await b.close();})();
