const boot=require('./boot');(async()=>{
const {b,p}=await boot(process.argv[2],{init:require('./pm_plans'),wait:4000});
await p.evaluate(()=>window.pbPlansOpenAll());await p.waitForTimeout(1500);
const st=()=>p.evaluate(()=>({pick:!document.getElementById('plansJobPick').hidden,add:!document.getElementById('plansAddWrap').hidden,eb:document.getElementById('plansJobEyebrow').textContent,line:document.getElementById('plansLine').textContent}));
console.log('all:',JSON.stringify(await st()));
await p.click('#plansAddBtn');await p.waitForTimeout(300);console.log('empty:',JSON.stringify(await st()));
await p.fill('#plansJobIn','1001');
const [fc]=await Promise.all([p.waitForEvent('filechooser',{timeout:3000}).catch(()=>null),p.click('#plansAddBtn')]);
await p.waitForTimeout(800);console.log('chooser:',!!fc,JSON.stringify(await st()));
if(fc){await fc.setFiles('storm_onsite.pdf');for(let i=0;i<120;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>document.getElementById('plansWait').hidden)&&i>2)break;}
console.log(await p.evaluate(()=>[document.getElementById('plansLine').textContent,(window.__planCalls||[]).filter(c=>c[0]==='begin').map(c=>JSON.stringify(c[1]).slice(0,80))]));}
await p.screenshot({path:'plans_all.png'});console.log('errs',p.errs);await b.close();})();
