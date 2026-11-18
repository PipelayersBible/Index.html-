const L=require('./lib');
const mk=(plan,extra)=>L.co+`;window.__rpcOverride.pb_my_plan=()=>(${JSON.stringify(plan)});window.__rpcOverride.pb_plan_request=(a)=>{window.__req=a;return {ok:true};};
 window.__rpcOverride.pb_support_is_admin=()=>true;${extra||''}`;
const line=(p)=>p.evaluate(()=>{const l=document.getElementById('pbBetaLine');return !l?'(none)':l.hidden?'(hidden)':l.innerText.replace(/\s+/g,' ');});
(async()=>{
 const now=Date.now(),iso=(d)=>new Date(now+d*864e5).toISOString();
 const cases={
  'active 1 day':{ok:true,plan:'trial',expired:false,days_left:1,trial_ends_at:iso(0.5)},
  'active 0 days_left':{ok:true,plan:'trial',expired:false,days_left:0,trial_ends_at:iso(0.01)},
  'ended grace day1':{ok:true,plan:'trial',expired:true,closed:false,individual:false,requested:false,trial_ends_at:iso(-0.5),days_left:0},
  'ended grace last hours':{ok:true,plan:'trial',expired:true,closed:false,individual:false,requested:false,trial_ends_at:iso(-2.9),days_left:0},
  'closed':{ok:true,plan:'trial',expired:true,closed:true,individual:false,requested:false,trial_ends_at:iso(-5),days_left:0},
  'closed requested':{ok:true,plan:'trial',expired:true,closed:true,individual:false,requested:true,trial_ends_at:iso(-5),days_left:0},
  'closed individual':{ok:true,plan:'trial',expired:true,closed:true,individual:true,requested:false,trial_ends_at:iso(-5),days_left:0},
  'paid':{ok:true,plan:'paid',expired:false},
  'removed':{ok:true,plan:null,removed:{company:'Acme <b>Pipe</b>',at:iso(-1)},individual:false,requested:false},
  'removed requested':{ok:true,plan:null,removed:{company:'Acme',at:iso(-1)},individual:false,requested:true},
 };
 for(const [k,v] of Object.entries(cases)){const {b,p}=await L.boot(L.URL,{init:mk(v),wait:6000});
  console.log(k,'=>',await line(p),'| pill:',await p.evaluate(()=>{const x=document.getElementById('pbFbPill');return !!(x&&!x.hidden);}),'| ovf',JSON.stringify(await L.ovf(p)),'errs',p.errs.length?p.errs:'');
  await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0/bughunt/office/shots')+'/b1_')+k.replace(/\W+/g,'_')+'.png'});
  await b.close();}
 // stale cache: plan cached as active with 3 days left, now offline 10 days later
 {const cached={ok:true,plan:'trial',expired:false,days_left:3,trial_ends_at:iso(-7)};
  const {b,p}=await L.boot(L.URL,{init:L.co+`;try{localStorage.setItem('pbPlan:00000000-0000-4000-8000-000000000001',${JSON.stringify(JSON.stringify(cached))});}catch(e){};window.__rpcOverride.pb_my_plan=()=>null;`,wait:6000});
  console.log('stale cached (ended 7 days ago, server unreachable) =>',await line(p));await b.close();}
})();
