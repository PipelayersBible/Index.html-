module.exports=()=>{window.__tableOne={subscriptions:{tier:'individual',status:'active'},company_members:{company_id:'c1',role:'pm',title:'PM',companies:{name:'Test Co',status:'active'}}};
const now=()=>new Date().toISOString();
window.__rpcOverride={pb_prod_access:()=>({member:true,company_id:'c1',manager:true,role:'pm',server_at:now()}),
 pb_report_access:()=>({member:true,company_id:'c1',manager:true,role:'pm',server_at:now()}),
 pb_prod_company_dashboard:()=>({server_at:now(),jobs:[{job_key:'k1',job_number:'1001',jobsite:'Main St',cats:[],plan:null}]}),
 pb_prod_company_jobs:()=>({server_at:now(),jobs:[{job_key:'k1',job_number:'1001',jobsite:'Main St'}]}),
 pb_prod_job_detail:()=>({server_at:now(),job_number:'1001',jobsite:'Main St',cats:[],plan:null,recent:[]})};};
