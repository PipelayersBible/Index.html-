// beta company owner (superintendent) init; Terms already accepted; functions.invoke routed to window.__fn[name](body)
module.exports=(o={})=>{const CO='c0ffee00-0000-4000-8000-000000000001';const ends=o.ends||'new Date(Date.now()+30*864e5-60000).toISOString()';return `(function(){
try{localStorage.setItem('pbTermsOk:00000000-0000-4000-8000-000000000001','1.0|1.0');}catch(e){}
let _sb;Object.defineProperty(window,'supabase',{configurable:true,get(){return _sb;},set(v){const cc=v.createClient;v.createClient=function(){const c=cc.apply(this,arguments);c.functions={invoke:(n,o)=>{(window.__fnLog=window.__fnLog||[]).push([n,o&&o.body]);const f=(window.__fn||{})[n];return Promise.resolve(f?{data:f(o&&o.body),error:null}:{data:null,error:{message:'nf',context:{status:404}}});}};return c;};_sb=v;}});
window.__tableOne={subscriptions:null,company_members:null,companies:{name:'Sandoval Pipeline',status:'active'}};const now=()=>new Date().toISOString();
window.__rpcOverride={
 pb_report_access:()=>({manager:true,managed_company_id:'${CO}',owner:true}),
 pb_prod_access:()=>({member:false,company_id:null,manager:true,managed_company_id:'${CO}',role:null,owner:true,server_at:now()}),
 pb_my_plan:()=>{const e=${ends};return {ok:true,plan:'trial',trial_ends_at:e,expired:new Date(e)<new Date(),closed:false,individual:false,requested:false,days_left:30,limits:{days:30,stake:30,teacher:10,seats:7}};},
 pb_terms_status:()=>({terms:'1.0',privacy:'1.0',at:now()}),
 pb_my_name_get:()=>({ok:true,name:'Ray Sandoval'}),
 pb_prod_company_dashboard:()=>({ok:true,jobs:[],crews:[],server_at:now()}),
};})();`;};
