const mk=require('./mk');
(async()=>{const {b,p,H,rowMenu,dists}=await mk();
 await p.setViewportSize({width:390,height:800});
 await p.evaluate(async()=>{await window.pbLaidMark(2);});await p.waitForTimeout(900);
 await p.click('#pbBrkBtn');await p.waitForTimeout(1500);
 await p.evaluate(()=>{const e=window.__pbCsEntry();e.onBreak.start-=20*60000;});
 await p.evaluate(()=>window.pbGoto('home'));await p.waitForTimeout(1200);
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 console.log('modal on New Run:',JSON.stringify(await H.modal()),JSON.stringify(await H.modalBtns()));
 const btns=await H.modalBtns();
 // pick the option that ends the current run if offered
 const pick=btns.find(x=>/End|Finish|Complete/i.test(x));
 if(pick){await H.modalClick(pick);await p.waitForTimeout(1500);console.log('next modal:',JSON.stringify(await H.modal()),JSON.stringify(await H.modalBtns()));}
 console.log('screen',await H.screen().catch(()=>null));
 console.log('entries',JSON.stringify(await p.evaluate(()=>window.__ra().filter(e=>e.kind==='run').map(e=>({id:e.id,completed:e.completed,incomplete:e.incomplete,end:e.runEndTime,onBreak:e.onBreak,breaks:e.breaks,cur:window.__cur()})))));
 await p.screenshot({path:'/tmp/claude-0/bughunt/new/t/a5.png'});
 console.log('errs',p.errs.slice(0,5));await b.close();})();
