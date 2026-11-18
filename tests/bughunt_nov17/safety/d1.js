const L=require('./lib');const mkrun=require('/home/claude/rig/mkrun');
(async()=>{const {b,p,H}=await L({init:require('/home/claude/rig/co_fm.js')});
 p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,300));});
 await mkrun(p,100);
 await p.evaluate(()=>{const s=(id,v)=>{const e=document.getElementById(id);if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}};s('saJobNumber','24-017');s('saJobsite','Test Sewer');});
 await mkrun.lock(p);
 for(let i=0;i<4;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();console.log('M',m.slice(0,100),bt);await H.modalClick(bt[bt.length-1]);}
 console.log('screen',await H.screen());
 console.log(await p.evaluate(()=>JSON.stringify(__dbg("runArchive").map(e=>({k:e.kind,job:e.jobNumber,st:e.runStartTime,lock:e.lockTime,crew:(e.crewLog||[]).length})))));
 await p.evaluate(()=>window.pbOpenDailyReport({tab:'report'}));await p.waitForTimeout(4000);
 console.log('modal',await H.modal());
 console.log('screen',await H.screen());
 console.log(await p.evaluate(()=>document.getElementById('screen-dailyReport').innerText.slice(0,3000)));
 await p.screenshot({path:'d1.png',fullPage:true});
 console.log('errs',p.errs);await b.close();})();
