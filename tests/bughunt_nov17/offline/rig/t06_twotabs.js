// two tabs on the same account, same open run: marks in both
const {launch}=require('./srv');const co=require('./co_ok');const L=require('./lib');const F=require('./flow');
(async()=>{const {b,ctx,p,S,page}=await launch('http://127.0.0.1:8877/'+(process.env.PG||'cur.html'),{init:co});
 await L.newRun(p,100);await L.lock(p);
 const p2=await page();
 await p2.evaluate(()=>pbResumeLastRunResults());await p2.waitForTimeout(2000);
 console.log('tab2 screen',await F(p2).screen(),(await L.rows(p2)).slice(0,6), await p2.evaluate(()=>[...document.querySelectorAll('#screen-results [aria-label]')].slice(0,5).map(e=>e.getAttribute('aria-label'))));
 const r=await L.rows(p);
 await L.markLaid(p,r[8]);await p.waitForTimeout(1500);   // tab 1: to 40
 await p2.bringToFront();
 await L.markLaid(p2,r[4]).catch(e=>console.log('tab2 mark err',e.message.slice(0,80)));await p2.waitForTimeout(1500);   // tab 2 (stale): to 20
 console.log('tab2 modal:',await F(p2).modal(), await F(p2).modalBtns());
 await L.clearModals(p2);
 await p.waitForTimeout(1000);
 const get=(pg)=>pg.evaluate(()=>{const e=window.__pbRrDebug.run();return Object.keys(e.laid.marks).sort().join(',');});
 console.log('tab1',await get(p));console.log('tab2',await get(p2));
 const p3=await page();console.log('fresh tab (stored):',await get(p3));
 console.log(p.errs.slice(0,3),p2.errs.slice(0,3));await b.close();})();
