const P=require('./perf');
(async()=>{const {b,ctx}=await P.launch({sw:false});const p=await P.page(ctx,1);await P.open(p,P.ORIGIN+'/base/');await p.waitForTimeout(2000);
console.log(await p.evaluate(()=>{const c=[...document.querySelectorAll('input,select,textarea')];let t0=performance.now();let n=0;c.forEach(e=>{n+=e.labels?e.labels.length:0;});const t1=performance.now();
const m=new Map();document.querySelectorAll('label[for]').forEach(l=>{const a=m.get(l.htmlFor)||[];a.push(l);m.set(l.htmlFor,a);});const t2=performance.now();
return {controls:c.length,labels:n,labelsMs:Math.round(t1-t0),mapMs:Math.round(t2-t0-(t1-t0)),nodes:document.getElementsByTagName('*').length};}));await b.close();})();
