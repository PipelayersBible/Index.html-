const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');const mgr=require('/home/claude/rig/mgr');
(async()=>{
 const log=`;window.__rpcOverride.pb_admin_log_company=()=>({ok:true,since:'2026-11-17',total:240,days_stamped:5,days_due:3,entries:Array.from({length:100},(_,i)=>({at:new Date(Date.UTC(2026,10,17,15,i)).toISOString(),how:i%3?'Database console':'Server key (outside the app)',kind:'direct_write',what:(i%2?'UPDATE ':'DELETE ')+(i%5?'pb_prod.run_records':'pb_new.unknown_table'),row:'x',changed:i%4?['status','updated_at','record','a','b']:null}))});`;
 const {b,p}=await boot('http://127.0.0.1:8861/cur.html',{init:co+mgr+log});
 await p.setViewportSize({width:390,height:800});
 await p.waitForTimeout(2500);await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(1500);
 await p.click('#pbAdminLogBtn');await p.waitForTimeout(800);
 const m=await p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x=>x.offsetParent&&x.innerText.trim());const ok=[...d.querySelectorAll('button')].find(b=>b.textContent.trim()==='OK');const r=ok.getBoundingClientRect();const box=d.querySelector('.pb-modal')||d;const br=box.getBoundingClientRect();const sc=[...d.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+5&&/auto|scroll/.test(getComputedStyle(e).overflowY)).map(e=>e.className+':'+e.clientHeight+'/'+e.scrollHeight);return {ok:[r.top,r.bottom],box:[br.top,br.bottom,br.width],vh:innerHeight,sc,docW:document.documentElement.scrollWidth,head:d.innerText.slice(0,80),tail:d.innerText.slice(-330)};});
 console.log(JSON.stringify(m,null,1));await p.screenshot({path:'/tmp/claude-0/bughunt/new/t/adminlog100.png'});
 console.log('errs',p.errs.slice(0,3));await b.close();})();
