const mk=require('./mk');
(async()=>{const {b,p,H}=await mk();
 await p.evaluate(async()=>{await window.pbLaidMark(8);});await p.waitForTimeout(900);
 await p.evaluate(()=>window.pbCsOpen(3));await p.waitForTimeout(400);await p.fill('#pbCsRod','7.90');await p.click('#pbCsSave');await p.waitForTimeout(900);await H.modalClick('OK').catch(()=>{});
 const dump=()=>p.evaluate(()=>window.__ra().filter(e=>e.kind==='run').map(e=>({id:e.id,cs:(e.checkShots||[]).length,laid:e.laid?Object.keys(e.laid.marks).length:0,fit:pbFitCount(e).total,ended:!!(e.completed||e.incomplete),res:e.resumedFromId,dist:e.distance,inv3:e.intervalRows[3]&&e.intervalRows[3].inv})));
 console.log('before',JSON.stringify(await dump()));
 await p.evaluate(()=>window.pbEditRunData());await p.waitForTimeout(1200);
 const modal=async()=>{for(let i=0;i<6;i++){const m=await H.modal();if(!m)break;const btns=await H.modalBtns();console.log('MODAL',JSON.stringify(m.slice(0,260)),JSON.stringify(btns));await H.modalClick(btns[btns.length-1]);await p.waitForTimeout(1000);}};
 await modal();
 console.log('screen',await H.screen().catch(()=>null));
 // change the start rod reading (grade changes)
 await H.f('startStakeReading','4.50');
 await H.click('Review & Calculate').catch(e=>console.log(String(e)));await p.waitForTimeout(1500);await modal();
 await H.click('Lock This Run').catch(e=>console.log(String(e)));await p.waitForTimeout(1200);await modal();await p.waitForTimeout(2000);
 console.log('after',JSON.stringify(await dump()));
 const d=await p.evaluate(()=>{const x=document.createElement('div');x.innerHTML=window.__pbMatFitHtml({job_number:'24-017'});return x.innerText;});console.log('job block:',d);
 console.log('row menu line:',await p.evaluate(()=>{const e=window.__pbCsEntry();const c=window.pbCsOf(e,'sta:30.00');return c?JSON.stringify(c)+' row inv now '+e.intervalRows[3].inv:null;}));
 console.log('errs',p.errs.slice(0,5));await b.close();})();
