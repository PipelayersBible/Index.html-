const L=require('./lib');
const init=L.co+`;(function(){const d=(n)=>new Date(Date.now()+n*864e5).toISOString();
 window.__ov={ok:true,totals:{companies:3,runs:22,laid_ft:6653.4,laid_ft_30:6223,pipe_lf:3100},companies:[
  {id:'c1',name:'Acme Pipeline & Underground Construction Incorporated of Southern California',plan:'trial',trial_ends_at:d(20),users:4,active_7d:3,active_days:9,events:{'scr:input':40,'scr:results':22,'scr:prodDashboard':12,'scr:crewMembers':3,'scr:aiAsk':9,'scr:tickets':7,'scr:plans':2,'feedback:idea':1},ai:{stake:41,teacher:9,gonogo_q:9,analysis:2,cutsheet:1,ticket:3},ai_usd:2.13,plan_sets:1,plan_sheets:42,feedback:2,runs:14,laid_ft:2310,laid_ft_30:1880,photos:63,reports_30:11,last_active:'2026-11-15'},
  {id:'c2',name:'Ended Co',plan:'trial',trial_ends_at:d(-2),users:1,active_7d:0,active_days:0,events:{},ai:{},ai_usd:0,plan_sets:0,plan_sheets:0,feedback:0},
  {id:'c3',name:'No date Co',plan:'trial',trial_ends_at:null,users:1,active_7d:0,active_days:0,events:null,ai:null,ai_usd:null,plan_sets:0},
  {id:'c4',name:'DIG Civil',plan:'paid',users:4,active_7d:4,active_days:20,events:{},ai:{},ai_usd:0,plan_sets:3,plan_sheets:54,feedback:0}]};
 Object.assign(window.__rpcOverride,{pb_support_is_admin:()=>true,pb_owner_overview:()=>window.__ov,
  pb_owner_plan_requests:()=>({ok:true,requests:[{user_id:'u9',kind:'individual',who:'Jose Ramirez-Gonzalez de la Cruz',email:'jose.ramirez.gonzalez@averylongdomainname-example.com',company:'Acme Pipeline'},{user_id:'u8',kind:'company',who:'boss@x.com',email:'boss@x.com',company:'Ended Co'}]}),
  pb_owner_company_set:(a)=>{(window.__sets=window.__sets||[]).push(a);return window.__setReply||{ok:true};},
  pb_owner_individual_on:(a)=>{window.__on=a;return {ok:true};}});
 window.__fnOverride={'owner-admin':(b)=>{window.__oa=b;return window.__oaReply||{ok:true,invited:true};}};})();`;
(async()=>{const {b,p}=await L.boot(L.URL,{init,wait:5000});
 await p.evaluate(()=>window.pbOpenSettings());await p.waitForTimeout(1500);
 console.log('settings beta btn hidden:',await p.evaluate(()=>{const x=document.getElementById('settingsBetaBtn');return x?x.hidden:'none';}));
 await p.evaluate(()=>window.pbOwnerOpen());await p.waitForTimeout(1000);
 console.log((await L.txt(p,'#pbOwnList')));
 console.log('ovf',JSON.stringify(await L.ovf(p)));
 await p.screenshot({path:'/tmp/claude-0/bughunt/office/shots/b3_owner.png'});
 // start a beta: errors
 await p.click('#pbOwnStart');console.log('empty:',await L.txt(p,'#pbOwnSt'));
 await p.fill('#pbOwnName','New Co');await p.fill('#pbOwnEmail','not-an-email');
 await p.evaluate(()=>{window.__oaReply={ok:false,code:'pb:bad_email',message:'That doesn’t look like an email address.'};});
 await p.click('#pbOwnStart');await p.waitForTimeout(500);console.log('bad email:',await L.txt(p,'#pbOwnSt'),'| fields kept:',await p.evaluate(()=>document.getElementById('pbOwnName').value));
 // extend on ended
 await p.evaluate(()=>document.querySelector('[data-id="c2"] [data-act="extend"]').click());await p.waitForTimeout(500);
 console.log('extend ended:',JSON.stringify(await p.evaluate(()=>window.__sets)),'modal:',await L.modal(p));
 // make paid: modal, cancel
 await p.evaluate(()=>document.querySelector('[data-id="c1"] [data-act="paid"]').click());await p.waitForTimeout(500);
 console.log('paid modal:',await L.modal(p));
 await p.screenshot({path:'/tmp/claude-0/bughunt/office/shots/b3_owner_modal.png'});
 const top=await p.evaluate(()=>{const m=[...document.querySelectorAll('.pb-modal-overlay')].find(x=>x.offsetParent);if(!m)return 'no overlay';const r=m.getBoundingClientRect();const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);const btn=[...m.querySelectorAll('button')].find(b=>b.textContent.trim()==='Make Paid');const br=btn.getBoundingClientRect();const hit=document.elementFromPoint(br.left+br.width/2,br.top+br.height/2);return 'button hit: '+(hit===btn||btn.contains(hit))+' z(modal)='+getComputedStyle(m).zIndex+' z(sheet)='+getComputedStyle(document.getElementById('pbOwnerSheet')).zIndex;});
 console.log('modal above sheet?',top);
 await L.modalClick(p,'Make Paid');await p.waitForTimeout(600);console.log('sets:',JSON.stringify(await p.evaluate(()=>window.__sets)));
 // turn on
 await p.evaluate(()=>document.querySelector('[data-on]').click());await p.waitForTimeout(500);console.log('on:',JSON.stringify(await p.evaluate(()=>window.__on)));
 // failure
 await p.evaluate(()=>{window.__setReply={ok:false,code:'pb:not_found'};document.querySelector('[data-id="c1"] [data-act="extend"]').click();});await p.waitForTimeout(600);console.log('fail modal:',await L.modal(p));
 console.log('errs',p.errs);await b.close();})();
