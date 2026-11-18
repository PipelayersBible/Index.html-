const boot=require('./boot'),mkrun=require('./mkrun');(async()=>{const url=process.argv[2]||'http://localhost:8811/';const {b,p}=await boot(url);
await mkrun(p);await mkrun.lock(p);
await p.evaluate(()=>window.pbLaidMark(6));await p.waitForTimeout(800);
await p.evaluate(()=>window.pbToggleEndIncomplete());await p.waitForTimeout(500);
await p.evaluate(()=>{const s=document.getElementById('endIncompleteStation');console.log(s.value);s.value=[...s.options].find(o=>o.getAttribute('data-station-ft')==='30').value;s.dispatchEvent(new Event('change',{bubbles:true}));});
await p.evaluate(()=>window.pbEndRunIncomplete());await p.waitForTimeout(1200);
for(let i=0;i<6;i++){const btns=await p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal-overlay,.pb-modal,[role=dialog],[role=alertdialog]')].find(x=>x.offsetParent&&x.innerText.trim());return d?[d.innerText.replace(/\s+/g,' ').slice(0,200),[...d.querySelectorAll('button')].map(b=>b.textContent.trim())]:null;});
 if(!btns)break;console.log('MODAL',JSON.stringify(btns));const last=btns[1][btns[1].length-1];await p.locator('button',{hasText:last}).last().click();await p.waitForTimeout(1200);}
const r=await p.evaluate(()=>{const U='00000000-0000-4000-8000-000000000001:';const id=JSON.parse(localStorage.getItem(U+'currentRunArchiveId'));const e=JSON.parse(localStorage.getItem(U+'runArchive')).find(x=>x.id===id);const S=window.pbLaidSummaryOf(e.id);return {inc:e.incomplete,cd:e.completedDistance,laidFt:S.laidFt,n:S.n,laidTo:S.laidTo};});
console.log(JSON.stringify(r));console.log(p.errs);await b.close();})();
