const boot=require('./boot'),mkrun=require('./mkrun');(async()=>{const {b,p}=await boot('http://localhost:8813/');
await mkrun(p);await mkrun.lock(p);await p.evaluate(()=>window.pbLaidMark(2));await p.waitForTimeout(7000);
await p.evaluate(()=>{const t=document.querySelector('#resultsBody').closest('table');t.scrollIntoView({block:'start'});window.scrollBy(0,-150);});await p.waitForTimeout(300);
await p.screenshot({path:'dist_new.png'});
await p.locator('#resultsBody tr[data-laid-idx="4"] td.pb-distcell').click();await p.waitForTimeout(800);await p.screenshot({path:'dist_menu.png'});
console.log(await p.evaluate(()=>document.body.innerText.includes('Mark laid to here')));
console.log(p.errs);await b.close();})();
