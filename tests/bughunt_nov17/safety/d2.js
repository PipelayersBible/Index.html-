const L=require('./lib');const mkrun=require(__dirname+'/../../rig/mkrun');const fs=require('fs');
(async()=>{const {b,p,H}=await L({init:require(__dirname+'/../../rig/co_fm.js'),extra:`;window.__sub=[];window.__rpcOverride.pb_daily_submit=(a)=>{window.__sub.push(a);return {ok:true,id:'srv-'+window.__sub.length,version:window.__sub.length,received_at:new Date().toISOString(),server_sha256:a.p_sha256};};`});
 p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,300));});
 const D=(s)=>p.evaluate(x=>{const r=window.__dbg(x);return r===undefined?null:JSON.parse(JSON.stringify(r));},s);
 await mkrun(p,100);
 await p.evaluate(()=>{const s=(id,v)=>{const e=document.getElementById(id);if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}};s('saJobNumber','24-017');s('saJobsite','Test Sewer');});
 await mkrun.lock(p);
 for(let i=0;i<4;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();await H.modalClick(bt[bt.length-1]);}
 // crew log: Ann laborer 2h closed, Bob operator open, CAT equipment 3h
 await p.evaluate(()=>{const e=window.__dbg('runArchive')[0];const n=Date.now();e.crewLog=[{name:'Ann',type:'Laborer',status:'out',log:[{action:'Checked In',time:n-4*3600000},{action:'Checked Out',time:n-2*3600000}]},{name:'Bob',type:'Operator',status:'in',log:[{action:'Checked In',time:n-3600000}]},{name:'CAT 320',type:'Equipment',category:'Excavator',status:'out',log:[{action:'Checked In',time:n-3*3600000},{action:'Checked Out',time:n-1}]}];return window.__dbg('saveRunArchive()');});
 // permit on same job
 console.log(await H.lock({cpJobNumber:'24-017'}));
 console.log('r1',JSON.stringify(await H.read(20.9,0,0,0)));
 console.log('r2',JSON.stringify(await H.read(19.4,0,0,0)).slice(0,200));
 console.log('r3',JSON.stringify(await H.read(20.9,0,0,0)));
 await p.evaluate(()=>pbCloseConfinedPermit());await p.waitForTimeout(800);
 for(let i=0;i<5;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();console.log('CLOSE M',m.slice(0,260),bt);await H.modalClick(bt[bt.length-1]);await p.waitForTimeout(800);}
 console.log('arch',JSON.stringify(await D('runArchive.map(e=>({k:e.kind,job:e.jobNumber,lock:e.lockTime,air:(e.atmoLog||[]).length,pd:e.permit&&e.permit.date}))')));
 const rt=await D('runArchive.find(e=>e.kind==="confined").reportText');fs.writeFileSync('permit_report.txt',rt);
 await p.evaluate(()=>window.pbOpenDailyReport({tab:'report'}));await p.waitForTimeout(4000);
 console.log('snap crew',JSON.stringify(await D('pbDlyView.snap&&pbDlyView.snap.crew')));
 console.log('snap permits',JSON.stringify(await D('pbDlyView.snap&&pbDlyView.snap.permits.items')));
 console.log('snap runs',JSON.stringify(await D('pbDlyView.snap&&pbDlyView.snap.runs')).slice(0,900));
 console.log('snap mats',JSON.stringify(await D('pbDlyView.snap&&pbDlyView.snap.materials.used')));
 await p.evaluate(()=>{document.getElementById('drNarrative').value='Laid pipe';document.getElementById('drName').value='Tommy Fontaine';});
 await p.evaluate(()=>window.pbDlySign());await p.waitForTimeout(2500);
 console.log('status',await p.evaluate(()=>document.getElementById('drSignStatus').textContent));
 for(let i=0;i<4;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();console.log('SIGN M',m.slice(0,200),bt);await H.modalClick(bt[bt.length-1]);await p.waitForTimeout(2500);}
 console.log('status',await p.evaluate(()=>document.getElementById('drSignStatus').textContent));
 const sub=await p.evaluate(()=>window.__sub);console.log('submits',sub.length);if(sub[0]){fs.writeFileSync('sub0.json',JSON.stringify(sub[0],null,1));console.log(Object.keys(sub[0].p_snapshot));}
 console.log(await p.evaluate(()=>document.getElementById('screen-dailyReport').innerText.slice(0,800)));
 await p.screenshot({path:'d2.png',fullPage:true});
 console.log('errs',p.errs);await b.close();})();
