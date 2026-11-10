const boot=require('./boot');(async()=>{
const {b,p}=await boot(process.argv[2],{init:require('./pm_plans'),wait:4000});
await p.evaluate(()=>window.pbPlansOpenAll());await p.waitForTimeout(1200);
await p.fill('#plansJobIn','1001');
const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('#plansAddBtn')]);await fc.setFiles('water_sewer.pdf');
for(let i=0;i<60;i++){await p.waitForTimeout(500);const n=await p.evaluate(()=>(window.__planCalls||[]).filter(c=>c[0]==='ready').length);if(n>=3)break;}
console.log('before close:',await p.evaluate(()=>[(window.__planCalls||[]).map(c=>c[0]).join(' '),document.getElementById('plansWaitT').textContent]));
const ctx=p.context();await p.close();
const p2=await ctx.newPage();p2.errs=[];p2.on('pageerror',e=>p2.errs.push(e.message));
await p2.goto(process.argv[2]);
for(let i=0;i<90;i++){await p2.waitForTimeout(1000);const c=await p2.evaluate(()=>(window.__planCalls||[]).map(c=>c[0]).join(' '));if(/uploaded/.test(c))break;}
await p2.waitForTimeout(1500);
console.log('after reopen:',await p2.evaluate(()=>(window.__planCalls||[]).map(c=>c[0]+(c[0]==='begin'?':'+c[1].p_job+':'+c[1].p_pages:'')).join(' ')));
await p2.evaluate(()=>window.pbPlansOpenAll());await p2.waitForTimeout(800);
console.log('line:',await p2.evaluate(()=>document.getElementById('plansLine').textContent));
const left=await p2.evaluate(()=>new Promise(ok=>{const r=indexedDB.open('pb-plans-q',1);r.onsuccess=()=>{const g=r.result.transaction('q').objectStore('q').getAll();g.onsuccess=()=>ok(g.result.length);};r.onerror=()=>ok(-1);}));
console.log('queue left:',left,'errs',p2.errs);await b.close();})();
