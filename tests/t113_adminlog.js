const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');const mgr=require('/home/claude/rig/mgr');
async function run(init,label){const {b,p}=await boot('http://127.0.0.1:8843/cur.html',{init});
 await p.waitForTimeout(2500);await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(1500);
 const box=await p.evaluate(()=>document.getElementById('settingsAdminLog').innerText);
 console.log(label,'settings box:',JSON.stringify(box));
 if(box){await p.click('#pbAdminLogBtn');await p.waitForTimeout(800);const m=await p.evaluate(()=>{const t=[...document.querySelectorAll('.pb-modal, [role=dialog]')].map(e=>e.innerText).join('|');return t;});console.log(m.slice(0,1500));
  await p.setViewportSize({width:390,height:800});await p.screenshot({path:'/tmp/claude-0/adminlog.png'});}
 console.log('errs',p.errs.slice(0,3));await b.close();}
(async()=>{
 const log=`;window.__rpcOverride.pb_admin_log_company=()=>({ok:true,since:'2026-11-17',total:3,days_stamped:0,days_due:0,entries:[{at:'2026-11-17T15:27:28Z',how:'Database console',kind:'direct_write',what:'UPDATE pb_prod.run_records',row:'x',changed:['status','updated_at']},{at:'2026-11-17T14:00:00Z',how:'App owner tools',kind:'admin_action',what:'company_plan_set',row:null,changed:null},{at:'2026-11-17T13:00:00Z',how:'Server key (outside the app)',kind:'service_write',what:'INSERT pb_daily.reports',row:'y',changed:null}]});`;
 await run(co+mgr+log,'owner:');
 await run(co+log,'foreman:');
})();
