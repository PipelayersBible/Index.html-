// localStorage is wiped but IndexedDB is kept (a cleaner app / "clear cookies" on some browsers): are Records kept?
const {launch}=require('./srv');const co=require('./co_ok');const F=require('./flow');const L=require('./lib');
(async()=>{const {b,ctx,p,S,page}=await launch('http://127.0.0.1:8877/'+(process.env.PG||'cur.html'),{init:co});
 await L.newRun(p,100);await L.lock(p);const r=await L.rows(p);await L.markLaid(p,r[6]);await p.waitForTimeout(1000);
 const id=await p.evaluate(()=>window.__pbRrDebug.run().id);
 await p.evaluate(()=>localStorage.clear());await p.close({runBeforeUnload:false});
 const p2=await page();await p2.waitForTimeout(1500);
 const got=await p2.evaluate(()=>{const e=window.__pbRrDebug.run();return e?e.id:null;});
 console.log('run after localStorage wipe:',got===id?'kept':'MISSING ('+got+')');
 // and a new run locked now: does its save overwrite the kept copy?
 await L.clearModals(p2);await L.newRun(p2,50);await L.lock(p2);await p2.waitForTimeout(1000);
 const raw=await p2.evaluate(async()=>{const db=await new Promise(ok=>{const q=indexedDB.open('pb-big',1);q.onsuccess=()=>ok(q.result);});return new Promise(ok=>{const q=db.transaction('kv').objectStore('kv').get('00000000-0000-4000-8000-000000000001:runArchive');q.onsuccess=()=>ok(q.result);});});
 const ids=raw?JSON.parse(raw).filter(e=>e.kind==='run').map(e=>e.id):[];
 console.log('runs in IndexedDB after the next save:',ids.length,ids.includes(id)?'(first run still there)':'(FIRST RUN OVERWRITTEN)');
 const ok=got===id&&ids.includes(id);console.log(ok?'PASS':'FAIL');await b.close();process.exit(ok?0:1);})();
