// Beta Accounts: tapping Make Paid must show its confirmation ON TOP of the sheet (and a "Not Changed" alert too)
const L=require('./lib');
const init=L.co+`;(function(){const d=(n)=>new Date(Date.now()+n*864e5).toISOString();
 Object.assign(window.__rpcOverride,{pb_support_is_admin:()=>true,pb_owner_overview:()=>({ok:true,totals:null,companies:[{id:'c1',name:'Acme Pipeline',plan:'trial',trial_ends_at:d(20),users:4,active_7d:3,active_days:9,events:{},ai:{},ai_usd:0,plan_sets:1,plan_sheets:4,feedback:0}]}),
  pb_owner_plan_requests:()=>({ok:true,requests:[]}),pb_owner_company_set:(a)=>{(window.__sets=window.__sets||[]).push(a);return window.__setReply||{ok:true};}});})();`;
const hit=(p,label)=>p.evaluate((label)=>{const btn=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&b.textContent.trim()===label&&!b.closest('#pbOwnerSheet'));if(!btn)return {found:false};
  const r=btn.getBoundingClientRect(),el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
  let m=btn;while(m.parentElement&&m.parentElement!==document.body&&getComputedStyle(m).position!=='fixed')m=m.parentElement;
  return {found:true,onTop:el===btn||btn.contains(el),topEl:el?(el.id||el.className||el.tagName):null,zModal:getComputedStyle(m).zIndex,modalCls:m.className||m.id,zSheet:getComputedStyle(document.getElementById('pbOwnerSheet')).zIndex};},label);
(async()=>{const {b,p}=await L.boot(L.URL,{init,wait:5000});let ok=true;
 await p.evaluate(()=>window.pbOpenSettings());await p.waitForTimeout(1000);
 await p.evaluate(()=>window.pbOwnerOpen());await p.waitForTimeout(1000);
 await p.click('#pbOwnerSheet [data-act="paid"]');await p.waitForTimeout(700);
 const h=await hit(p,'Make Paid');console.log('confirm:',JSON.stringify(h));
 await p.screenshot({path:'/tmp/claude-0/bughunt/office/shots/b4_paid_confirm.png'});
 if(!h.found||!h.onTop){ok=false;console.log('  FAIL: the Make Paid confirmation is hidden behind the Beta Accounts sheet (a real tap can\'t reach it)');}
 else{await p.mouse.click(195,10).catch(()=>{});await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&b.textContent.trim()==='Make Paid'&&!b.closest('#pbOwnerSheet'));b.click();});await p.waitForTimeout(600);console.log('sent:',JSON.stringify(await p.evaluate(()=>window.__sets)));}
 // a failed change: the alert must be visible too
 if(h.found&&!h.onTop)await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&b.textContent.trim()==='Cancel'&&!b.closest('#pbOwnerSheet'));b&&b.click();});
 await p.waitForTimeout(400);
 await p.evaluate(()=>{window.__setReply={ok:false,code:'pb:not_found'};});
 await p.click('#pbOwnerSheet [data-act="extend"]');await p.waitForTimeout(700);
 const h2=await hit(p,'OK');console.log('alert:',JSON.stringify(h2));
 if(!h2.found||!h2.onTop){ok=false;console.log('  FAIL: the "Not Changed" alert is hidden behind the sheet');}
 console.log(ok?'PASS':'FAIL','errs',p.errs);await b.close();process.exit(ok?0:1);})();
