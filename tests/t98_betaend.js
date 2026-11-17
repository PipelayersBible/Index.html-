// r16.71: ended beta: grace line, Company Plan / My Own Plan requests; owner sees requests and turns an individual plan on
const boot=require('/home/claude/rig/boot');
const mk=(plan)=>require('/home/claude/rig/co')+`;window.__rpcOverride.pb_my_plan=()=>(${JSON.stringify(plan)});window.__rpcOverride.pb_plan_request=(a)=>{window.__req=a;return {ok:true};};
 window.__rpcOverride.pb_support_is_admin=()=>true;window.__rpcOverride.pb_owner_overview=()=>({ok:true,companies:[],totals:null});
 window.__rpcOverride.pb_owner_plan_requests=()=>({ok:true,requests:window.__on?[]:[{user_id:'u9',kind:'individual',who:'Jose R',email:'jose@x.com',company:'Acme Pipeline'}]});
 window.__rpcOverride.pb_owner_individual_on=(a)=>{window.__on=a;return {ok:true};};`;
(async()=>{
 const ends=new Date(Date.now()-864e5).toISOString();
 let {b,p}=await boot('http://127.0.0.1:8843/cur.html',{init:mk({ok:true,plan:'trial',expired:true,closed:false,individual:false,requested:false,trial_ends_at:ends,days_left:0})});
 await p.waitForTimeout(4500);
 console.log('grace:',await p.evaluate(()=>document.getElementById('pbBetaLine').innerText.replace(/\s+/g,' ')));
 await p.screenshot({path:'/tmp/claude-0/t98_grace.png'});
 await p.click('#pbBetaLine [data-plan="individual"]');await p.waitForTimeout(500);
 console.log('after tap:',JSON.stringify(await p.evaluate(()=>window.__req)),'|',await p.evaluate(()=>document.getElementById('pbBetaLine').innerText.replace(/\s+/g,' ')));
 await p.evaluate(()=>window.pbOwnerOpen());await p.waitForTimeout(800);
 console.log('owner:',await p.evaluate(()=>document.getElementById('pbOwnList').innerText.replace(/\n+/g,' | ')));
 await p.evaluate(()=>document.querySelector('[data-on]').click());await p.waitForTimeout(600);
 console.log('turned on:',JSON.stringify(await p.evaluate(()=>window.__on)),'errs',p.errs);await b.close();
 ({b,p}=await boot('http://127.0.0.1:8843/cur.html',{init:mk({ok:true,plan:'trial',expired:true,closed:true,individual:true,requested:false,trial_ends_at:ends,days_left:0})}));
 await p.waitForTimeout(4500);
 console.log('closed+own:',await p.evaluate(()=>document.getElementById('pbBetaLine').innerText.replace(/\s+/g,' ')),'errs',p.errs);await b.close();
})();
