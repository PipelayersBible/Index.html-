const boot=require('./boot');(async()=>{
const {b,p}=await boot(process.argv[2],{init:require('./pm_plans'),wait:4000});
await p.evaluate(()=>window.pbPlansOpenAll());await p.waitForTimeout(1200);
await p.fill('#plansJobIn','1001');
const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('#plansAddBtn')]);
console.log('multiple:',fc.isMultiple());
const t0=Date.now();await fc.setFiles(['storm_onsite.pdf','/tmp/claude-0/report.pdf','water_sewer.pdf']);
let seen=new Set();for(let i=0;i<300;i++){await p.waitForTimeout(1000);const w=await p.evaluate(()=>[document.getElementById('plansWaitT').textContent,document.getElementById('plansWait').hidden]);if(w[0])seen.add(w[0].replace(/sheet \d+ of/,'sheet # of'));if(w[1]&&i>3)break;}
console.log('secs',Math.round((Date.now()-t0)/1000),[...seen].slice(0,8));
await p.waitForTimeout(800);
console.log(await p.evaluate(()=>[document.getElementById('plansLine').textContent,(window.__planCalls||[]).filter(c=>c[0]==='begin').map(c=>c[1].p_title+':'+c[1].p_pages)]));
console.log('modal:',await p.evaluate(()=>{const e=document.getElementById('pbModalMessage');return e&&e.offsetParent?e.innerText.replace(/\s+/g,' '):null;}));
console.log('errs',p.errs);await b.close();})();
