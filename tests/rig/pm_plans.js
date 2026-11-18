module.exports=()=>{window.__tableOne={subscriptions:{tier:'individual',status:'active'},company_members:{company_id:'c1',role:'pm',title:'PM',companies:{name:'Test Co',status:'active'}}};
const now=()=>new Date().toISOString();window.__planCalls=[];
window.__rpcOverride={pb_prod_access:()=>({member:true,company_id:'c1',manager:true,role:'pm',server_at:now()}),
 pb_report_access:()=>({member:true,company_id:'c1',manager:true,role:'pm',server_at:now()}),
 pb_prod_company_dashboard:()=>({server_at:now(),jobs:[{job_key:'1001',job_number:'1001',jobsite:'Main St',cats:[],plan:null}]}),
 pb_prod_job_detail:()=>({server_at:now(),job_number:'1001',jobsite:'Main St',cats:[],plan:null,recent:[]}),
 pb_plans_list:()=>({ok:true,sets:window.__planSets||[]}),
 pb_plans_my_sets:()=>({ok:true,sets:[{id:'S1',job:'1001',title:'Water Sewer',pages:10,state:'ready',read:10}]}),
 pb_plans_begin:(a)=>{window.__planCalls.push(['begin',a]);return {ok:true,set_id:'S1',state:'uploading',existing:false,have:[]};},
 pb_plans_sheet_ready:(a)=>{window.__planCalls.push(['ready',a.p_page,a.p_grid]);return {ok:true};},
 pb_plans_uploaded:(a)=>{window.__planCalls.push(['uploaded',a]);window.__planSets=[{id:'S1',title:'water sewer',pages:10,state:'reading',read:0,uploaded:10,failed:0,mine:true}];return {ok:true};},
 pb_plans_sheets:()=>({ok:true,set:{id:'S1',title:'Water Sewer',pages:1,state:'ready'},sheets:(window.__planCalls.filter(c=>c[0]==='ready').map(c=>({page:c[1],sheet:String(c[1]),title:'SHEET '+c[1],grid:c[2],state:'done',issues:c[1]===5?2:0})))}),
};};
