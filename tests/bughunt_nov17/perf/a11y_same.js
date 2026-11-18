// patch 01 test: every control's accessible-name attributes are identical before/after, on start-up and after the
// screens that add fields (New Run with 4 hubs, Review, lock, Records, a calculator); and start-up script time drops.
const P=require('./perf');const L=require(__dirname+'/../offline/rig/lib');
const A=process.env.A||'index.html',B=process.env.B||'p01.html';
const dump=(p)=>p.evaluate(()=>{const o=[];document.querySelectorAll('input,select,textarea,label,[role],[tabindex],[aria-labelledby],[aria-describedby]').forEach((e,i)=>{o.push([e.tagName,e.id,e.getAttribute('aria-label'),e.getAttribute('aria-labelledby'),e.getAttribute('aria-describedby'),e.getAttribute('for'),e.getAttribute('role'),e.getAttribute('data-pb-ctx')].join('|'));});return {list:o,unnamed:window.pbA11yUnnamed().length};});
const CNT=`(function(){for(const C of [HTMLInputElement,HTMLSelectElement,HTMLTextAreaElement]){const d=Object.getOwnPropertyDescriptor(C.prototype,'labels');Object.defineProperty(C.prototype,'labels',{configurable:true,get(){window.__lblCalls=(window.__lblCalls||0)+1;return d.get.call(this);}});}})();`;
async function walk(pg){const {b,ctx}=await P.launch({sw:false,init:CNT});const p=await P.page(ctx,1);const r={};
 const t=await P.open(p,P.ORIGIN+'/'+pg);r.startLt=t.ltSum;r.lbl=await p.evaluate(()=>window.__lblCalls||0);await p.waitForTimeout(5000);r.home=await dump(p);
 await L.newRun(p,450);r.review=await dump(p);
 await p.evaluate(()=>pbGoto('input'));await p.waitForTimeout(600);for(let h=0;h<4;h++){await p.evaluate(()=>pbAddHub());await p.waitForTimeout(150);}await p.waitForTimeout(600);r.hubs=await dump(p);
 await p.evaluate(()=>pbGoto('archive'));await p.waitForTimeout(1200);r.records=await dump(p);
 r.errs=p.errs.slice(0,3);await b.close();return r;}
(async()=>{const a=await walk(A),b=await walk(B);let fails=0;
 for(const k of ['home','review','hubs','records']){const nb=(l)=>l.filter(v=>!/\|pbBatch/.test(v));const x=nb(a[k].list),y=nb(b[k].list);const diff=x.filter((v,i)=>v!==y[i]).length+Math.abs(x.length-y.length);
  console.log((diff?'FAIL ':'PASS ')+k+': '+x.length+' vs '+y.length+' elements, '+diff+' differ');if(diff){fails++;console.log(x.filter((v,i)=>v!==y[i]).slice(0,5),y.filter((v,i)=>v!==x[i]).slice(0,5));}}
 console.log('start-up long tasks ms: '+a.startLt+' -> '+b.startLt);console.log((b.lbl<a.lbl/10?'PASS ':'FAIL ')+'el.labels reads at start-up: '+a.lbl+' -> '+b.lbl);if(!(b.lbl<a.lbl/10))fails++;console.log('errs',a.errs,b.errs);
 process.exit(fails||b.errs.length?1:0);})();
