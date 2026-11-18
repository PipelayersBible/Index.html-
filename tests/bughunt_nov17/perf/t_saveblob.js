// patch 03 test: a laid mark's save no longer makes a second copy of all of Records (a Blob as big as the archive),
// and the size messages still work (a forced failed save says "about N MB").
// usage: node t_saveblob.js <page>  -> exit 0 when no archive-sized Blob is made
const P=require('./perf');const L=require('/tmp/claude-0/audit/offline/rig/lib');const F=require('/home/claude/rig/flow');
const PG=process.argv[2]||'p04.html';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const HOOK=`(function(){const B=window.Blob;window.__bigBlobs=0;window.Blob=function(parts,o){try{const n=(parts||[]).reduce((a,p)=>a+(typeof p==='string'?p.length:0),0);if(n>20000)window.__bigBlobs++;}catch(e){}return new B(parts,o);};window.Blob.prototype=B.prototype;})();`;
(async()=>{const {b,ctx}=await P.launch({sw:false,init:HOOK});const p=await P.page(ctx,1);await P.open(p,P.ORIGIN+'/'+PG);await p.waitForTimeout(2500);
 await L.newRun(p,450);await L.lock(p);await p.waitForTimeout(1500);
 await p.evaluate(()=>{window.__bigBlobs=0;});
 const r=await p.evaluate(()=>window.pbLaidMark(6));
 const n=await p.evaluate(()=>window.__bigBlobs);
 ok(r===true,'the laid mark saved');ok(n===0,'no archive-sized Blob made by the save ('+n+')');
 // a failed write still words its size: make IndexedDB and localStorage refuse the write
 await p.evaluate(()=>{IDBObjectStore.prototype.put=function(){throw new Error('quota');};Storage.prototype.setItem=function(){throw new Error('quota');};});
 await p.evaluate(()=>window.pbLaidMark(9));await p.waitForTimeout(800);
 const m=await F(p).modal();ok(/about \d+\.\d MB/.test(m||''),'a failed save still says its size: '+(m||'').slice(0,90));
 console.log('errs',p.errs.slice(0,3));await b.close();process.exit(fails?1:0);})();
