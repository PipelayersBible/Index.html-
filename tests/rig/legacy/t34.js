const boot=require('./boot');(async()=>{
for (const f of ['/tmp/claude-0/report.pdf','/tmp/claude-0/mixed.pdf']) {
const base=require('./pm_plans');const {b,p}=await boot(process.argv[2],{init:{content:'('+base.toString()+')();window.__rpcOverride.pb_docs_mine=()=>({ok:true,docs:[]});'},wait:1000});
await p.route(/functions\/v1\/docs/,r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));await p.waitForTimeout(3000);
await p.evaluate(()=>window.pbPlansOpenAll());await p.waitForTimeout(1200);
await p.fill('#plansJobIn','1001');
const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('#plansAddBtn')]);await fc.setFiles(f);
let m=null;for(let i=0;i<90&&!m;i++){await p.waitForTimeout(1000);m=await p.evaluate(()=>{const e=document.getElementById('pbModalMessage');return e&&e.offsetParent?e.innerText:null;});}
console.log(f.split('/').pop(),'| modal:',m&&m.replace(/\s+/g,' '));
console.log(' calls:',await p.evaluate(()=>(window.__planCalls||[]).map(c=>c[0]+(c[0]==='begin'?':'+c[1].p_pages:'')).join(' ')), '| line:',await p.evaluate(()=>document.getElementById('plansLine').textContent));
await p.locator('button',{hasText:'Add to Documents'}).last().click().catch(e=>console.log('no btn'));await p.waitForTimeout(1200);
console.log(' after:',await p.evaluate(()=>{const e=document.getElementById('pbModalMessage');return e&&e.offsetParent?e.innerText:null;}),await p.evaluate(()=>window.pbCanOpen('askDocs'),));console.log(' screen:',await p.evaluate(()=>[(document.querySelector('.pb-screen.active')||{}).id, (document.getElementById('docsFileName')||{}).textContent]));
console.log(' errs',p.errs);await b.close();}
})();
