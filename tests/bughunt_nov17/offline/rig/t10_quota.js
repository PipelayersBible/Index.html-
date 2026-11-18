// storage full: IndexedDB refuses the Records write (QuotaExceededError) and localStorage is full too
const {launch}=require('./srv');const co=require('./co_ok');const F=require('./flow');const L=require('./lib');
(async()=>{const {b,ctx,p,S,page}=await launch('http://127.0.0.1:8877/'+(process.env.PG||'cur.html'),{init:co});const H=F(p);
 await L.newRun(p,100);await L.lock(p);
 await p.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v,k){if(window.__full&&this.transaction.db.name==='pb-big'){const t=this.transaction;setTimeout(()=>{try{t.abort();}catch(e){}},0);throw new DOMException('quota','QuotaExceededError');}return put.apply(this,arguments);};
   const si=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__full&&String(v).length>200)throw new DOMException('quota','QuotaExceededError');return si.apply(this,arguments);};window.__full=true;});
 const r=await L.rows(p);
 await L.markLaid(p,r[8]);await p.waitForTimeout(1500);
 console.log('after mark: modal',await H.modal(),'marks in memory',await p.evaluate(()=>Object.keys((window.__pbRrDebug.run().laid||{}).marks||{}).length));
 await L.clearModals(p);
 await p.click('#pbBrkBtn').catch(e=>console.log('no break btn'));await p.waitForTimeout(1200);console.log('break: modal',await H.modal(),'onBreak',await p.evaluate(()=>!!window.__pbRrDebug.run().onBreak));
 await L.clearModals(p);
 await p.close({runBeforeUnload:false});const p2=await page();
 console.log('reopened: marks',await p2.evaluate(()=>Object.keys((window.__pbRrDebug.run().laid||{}).marks||{}).length),'onBreak',await p2.evaluate(()=>!!window.__pbRrDebug.run().onBreak));
 console.log(p.errs.slice(0,4));await b.close();})();
