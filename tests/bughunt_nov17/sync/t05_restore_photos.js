// A restored run edited on the new phone must keep the company copy's photo list (the photos are already in run-photos).
const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');const F=require('/home/claude/rig/flow');
const URL_=process.env.URL||'http://127.0.0.1:8864/cur.html';
(async()=>{const {b,p}=await boot(URL_,{init:co+`;window.__seals=[];window.__rpcOverride.pb_prod_run_clock=()=>({ok:true});window.__rpcOverride.pb_run_seal_add=(a)=>{window.__seals.push(a);return {ok:true,version:window.__seals.length,sealed_at:new Date().toISOString()};};window.__rpcOverride.pb_run_mine_page=()=>window.__mine||[];window.__puts=[];window.__rpcOverride.pb_prod_run_record_put=(a)=>{window.__puts.push(a);return {ok:true};};`});const H=F(p);
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1200);
 const f=async(id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},[id,String(v)]);
 await f('saJobNumber','24-017');await f('saJobsite','Test Sewer');
 await p.evaluate(()=>{const lr=[...document.querySelectorAll('#screen-input button')].find(b=>b.textContent.trim()==="Engineer's Rod");lr&&lr.click();});
 await f('runBedding',0.5);await f('runTrenchWidth',3);await f('runWT',0.08);
 await p.evaluate(()=>{const e=document.getElementById('runIdSel');e.value=[...e.options].find(o=>o.text.trim()==='8"').value;e.dispatchEvent(new Event('change',{bubbles:true}));});
 await f('startStakeElev',100);await f('startCutFillVal',5);await f('startStakeReading',4.8);await f('endStakeElev',99);await f('endCutFillVal',5);await f('endStakeReading',5.8);await f('totalDist',100);await f('interval',10);
 await p.waitForTimeout(500);await p.getByText('Review & Calculate',{exact:true}).click();await p.waitForTimeout(1500);
 await p.getByText('Lock This Run',{exact:true}).click();await p.waitForTimeout(1200);
 for(let i=0;i<4;i++){const m=await p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x=>x.offsetParent&&x.innerText.trim());if(!d)return null;const t=d.innerText.replace(/\s+/g,' ').slice(0,120);const bs=[...d.querySelectorAll('button')].filter(b=>b.offsetParent);const inp=d.querySelector('input[type=text],input:not([type])');if(inp&&!inp.value){inp.value='24-017';inp.dispatchEvent(new Event('input',{bubbles:true}));}(bs.find(b=>/Use It|I Checked|OK|Lock/.test(b.textContent))||bs[bs.length-1]).click();return t;});if(!m)break;console.log('modal:',m);await p.waitForTimeout(1500);}
 await p.waitForTimeout(1500);
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(600);
 // the account's copy of another finished run (as the server keeps it), not on this phone
 await p.evaluate(()=>{const e=window.__pbRrDebug.run();const c=JSON.parse(JSON.stringify(window.__pbRrDebug.copy(e.id)));c.id=e.id+60000;c.lockTime=new Date(e.id+60000).toISOString();c.completed=true;c.completedDistance=100;c.pbOffice.photosLeftOut=2;c.pbOffice.photos=[{p:['sitePhotos',0],sha:'aaa',path:'u/runs/'+c.id+'/aaa.jpg',f:'dataUrl',o:{at:1}},{p:['sitePhotos',1],sha:'bbb',path:'u/runs/'+c.id+'/bbb.jpg',f:'dataUrl',o:{at:2}}];c.sitePhotos=[];window.__mine=[{row_id:'r1',entry_id:String(c.id),locked_at:c.lockTime,version:2,record:c}];window.__once=0;const o=window.__rpcOverride.pb_run_mine_page;window.__rpcOverride.pb_run_mine_page=(a)=>a&&a.p_before_id?[]:window.__mine;});
 await p.evaluate(()=>window.pbRunRestore());await p.waitForTimeout(1500);
 console.log('restore modal:',(await H.modal()||'').slice(0,60));await H.modalClick('Restore');await p.waitForTimeout(2000);
 const m=await H.modal();console.log('after:',(m||'').slice(0,60));if(m){const bt=await H.modalBtns();await H.modalClick(bt[bt.length-1]);}
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(500);
 const r=await p.evaluate(async()=>{const e=window.__pbRrDebug.run();if(String(e.id)!==window.__mine[0].entry_id)throw new Error('not the restored run');window.__puts.length=0;e.notes='fixed a typo';await window.__pbRrDebug.send();await new Promise(r=>setTimeout(r,800));const a=window.__puts.find(x=>x.p_entry_id===String(e.id));return a?{photos:((a.p_record.pbOffice||{}).photos||[]).length,left:a.p_record.pbOffice.photosLeftOut}:null;});
 console.log('company copy after the edit:',JSON.stringify(r),r&&r.photos===2&&r.left===2?'PASS':'FAIL: the photo list is gone from the company copy');
 console.log('errs',p.errs.slice(0,3));await b.close();})();
