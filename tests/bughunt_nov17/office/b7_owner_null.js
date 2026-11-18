// Beta Accounts: a trial company without an end date shows as ended (never "null days left")
const L=require('./lib');
const init=L.co+`;Object.assign(window.__rpcOverride,{pb_support_is_admin:()=>true,pb_owner_plan_requests:()=>({ok:true,requests:[]}),pb_owner_overview:()=>({ok:true,totals:null,companies:[{id:'c3',name:'No date Co',plan:'trial',trial_ends_at:null,users:1,active_7d:0,active_days:0,events:{},ai:{},ai_usd:0,plan_sets:0}]})});`;
(async()=>{const {b,p}=await L.boot(L.URL,{init,wait:5000});
 await p.evaluate(()=>window.pbOwnerOpen());await p.waitForTimeout(1000);
 const t=await L.txt(p,'#pbOwnList [data-id="c3"] .nm');console.log(t);
 const ok=/Beta ended/.test(t)&&!/null/.test(t);console.log(ok?'PASS':'FAIL');await b.close();process.exit(ok?0:1);})();
