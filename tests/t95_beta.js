// r16.66: beta line + Feedback pill + sheet (problem/idea sent with its kind), usage counts sent, owner Beta Accounts page
const boot=require('/home/claude/rig/boot');
const init=require('/home/claude/rig/co')+`;(function(){window.__rpcOverride=Object.assign(window.__rpcOverride||{},{
 pb_my_plan:()=>({ok:true,plan:'trial',days_left:23,expired:false}),
 pb_usage_add:(a)=>{window.__useSent=(window.__useSent||[]).concat([a.p_events]);return {ok:true};},
 pb_feedback_send:(a)=>{window.__fb=(window.__fb||[]).concat([a]);return {ok:true,id:'x'};},
 pb_support_is_admin:()=>true,
 pb_owner_overview:()=>({ok:true,totals:{companies:2,runs:22,laid_ft:6653,laid_ft_30:6223,pipe_lf:3100},companies:[{id:'c1',name:'Acme Pipeline',plan:'trial',trial_ends_at:new Date(Date.now()+20*864e5).toISOString(),users:4,active_7d:3,active_days:9,events:{'scr:input':40,'scr:results':22,'feedback:idea':1},ai:{stake:41,teacher:9,gonogo_q:9},ai_usd:2.13,plan_sets:1,plan_sheets:42,feedback:2,runs:14,laid_ft:2310,laid_ft_30:1880,photos:63,reports_30:11,last_active:'2026-11-15'},{id:'c2',name:'DIG Civil Construction',plan:'paid',users:4,active_7d:4,active_days:20,events:{},ai:{},ai_usd:0,plan_sets:3,plan_sheets:54,feedback:0}]}),
 pb_owner_company_set:(a)=>{window.__set=a;return {ok:true};},
});})();`;
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/'+(process.argv[2]||'cur.html'),{init});
 await p.waitForTimeout(4500);
 const line=await p.evaluate(()=>{const l=document.getElementById('pbBetaLine');return l&&!l.hidden?l.innerText.replace(/\s+/g,' '):'(hidden)';});
 const pill=await p.evaluate(()=>{const x=document.getElementById('pbFbPill');return x&&!x.hidden&&getComputedStyle(x).display!=='none'?x.textContent:'(none)';});
 console.log('beta line:',line,'| pill:',pill);
 await p.screenshot({path:'/tmp/claude-0/t95_home.png'});
 await p.click('#pbFbPill');await p.waitForTimeout(300);
 await p.click('.pb-fb-seg button[data-k="idea"]');
 await p.fill('#pbFbText','Add a button to copy last run setup');await p.fill('#pbFbPhone','(951) 555-0142');
 await p.screenshot({path:'/tmp/claude-0/t95_sheet.png'});
 await p.click('#pbFbSend');await p.waitForTimeout(1200);
 console.log('sheet status:',await p.evaluate(()=>{const s=document.getElementById('pbFbSt');return s?s.textContent:'(closed)'}),'| sent:',JSON.stringify(await p.evaluate(()=>(window.__fb||[]).map(x=>({k:x.p_kind,b:x.p_body,s:x.p_screen,ph:x.p_phone})))));
 await p.evaluate(()=>window.pbUseFlush());await p.waitForTimeout(500);
 console.log('usage sent:',JSON.stringify(await p.evaluate(()=>window.__useSent||[])));
 // owner page
 await p.evaluate(()=>window.pbOwnerOpen());await p.waitForTimeout(800);
 console.log('owner:',await p.evaluate(()=>document.getElementById('pbOwnList').innerText.replace(/\n+/g,' | ')));
 await p.screenshot({path:'/tmp/claude-0/t95_owner.png'});
 await p.evaluate(()=>document.querySelector('[data-act="extend"]').click());await p.waitForTimeout(500);
 console.log('extend:',JSON.stringify(await p.evaluate(()=>window.__set)));
 console.log('errs',p.errs);await b.close();})();
