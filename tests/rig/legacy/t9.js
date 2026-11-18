const boot=require('./boot'),R=require('./resume');(async()=>{let {b,p}=await boot(process.argv[2]);
await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1200);
await p.evaluate(()=>{for(const [id,v] of [['totalDist','150'],['endStakeReading','5.5'],['runWT','0.08']]){const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}});
await p.waitForTimeout(1500);await p.reload({waitUntil:'load'});await p.waitForTimeout(3000);
await p.evaluate(()=>window.pbRdResume());await p.waitForTimeout(1500);await R.modal(p);
console.log(JSON.stringify(await p.evaluate(()=>['totalDist','endStakeReading','runWT'].map(i=>document.getElementById(i).value).concat([String(window._pbResumingFromEntryId)]))));console.log(p.errs);await b.close();})();
