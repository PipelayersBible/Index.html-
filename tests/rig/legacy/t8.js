const boot=require('./boot'),mkrun=require('./mkrun'),R=require('./resume');(async()=>{const url=process.argv[2];const restart=process.argv[3]==='1';let {b,p}=await boot(url);
await mkrun(p);await mkrun.lock(p);await p.evaluate(()=>window.pbLaidMark(3));await p.waitForTimeout(600);await R.endShort(p,30);
await p.evaluate(()=>window.pbResumeIncompleteRun(0));await p.waitForTimeout(1200);await R.modal(p);
await p.evaluate(()=>{const e=document.getElementById('endStakeReading');e.value='5.75';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
await p.waitForTimeout(1500);
if(restart){await p.reload({waitUntil:'load'});await p.waitForTimeout(3000);
 const home=await p.evaluate(()=>document.body.innerText.match(/(Draft|draft)[^\n]{0,80}/g));console.log('home:',JSON.stringify(home));
 await p.evaluate(()=>window.pbRdResume());await p.waitForTimeout(1500);await R.modal(p);}
console.log('form:',JSON.stringify(await p.evaluate(()=>({end:document.getElementById('endStakeReading').value,res:window._pbResumingFromEntryId,hubs:[...document.querySelectorAll('#hubsContainer > [data-hub-id]')].map(c=>c.dataset.hubId+':'+document.getElementById(c.dataset.hubId+'Station').value)}))));
await p.screenshot({path:'b8'+(restart?'r':'')+'.png'});
await p.getByText('Review & Calculate',{exact:true}).click();await p.waitForTimeout(1500);await R.modal(p);
await p.getByText('Lock This Run',{exact:true}).click();await p.waitForTimeout(2000);await R.modal(p);
const runs=await R.dump(p);const n=runs.find(x=>x.resumedFromId);
console.log('runs',runs.length,'resumed:',n?JSON.stringify({from:n.resumedFromId,dist:n.distance,rows:n.intervalRows.length,hi:n.hi,endInv:n.summary&&n.summary.endInv}):'NONE');
console.log('drafts left:',await p.evaluate(()=>Object.keys(localStorage).filter(k=>/runDraft/i.test(k)).map(k=>localStorage.getItem(k).length)));
console.log(p.errs);await b.close();})();
