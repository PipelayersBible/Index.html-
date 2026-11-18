// manager access taken away: company screens and kept copies must go
const L=require('./lib');
const init=L.co+L.mgr+`;window.__rpcOverride.pb_report_access=()=>window.__demoted?({member:true,manager:false,company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5'}):({member:false,manager:true,company_id:null,managed_company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5'});
window.__rpcOverride.pb_prod_company_live=()=>({server_at:new Date().toISOString(),today:'2026-11-17',people:[{id:'p1',name:'Jose R',foreman:'Brandon',runs:[{session_ref:'s1',job_number:'26014',updated_at:new Date().toISOString(),status:{totalFt:300,laidFt:120,rowsLaid:4,label:'MH-1 to MH-2'}}]}]});
window.__rpcOverride.pb_prod_company_live_permits=()=>({server_at:new Date().toISOString(),permits:[{who:'Brandon',permit_ref:'r1',closed:false,updated_at:new Date().toISOString(),status:{space:'MH-4',jobsite:'Main St',inside:2,airOk:true,lastAirAt:new Date().toISOString(),activeSince:new Date(Date.now()-3600e3).toISOString()}}]});`;
(async()=>{const {b,p}=await L.boot(L.URL,{init,wait:5000});
 await p.evaluate(()=>window.pbOpenProdDashboard());await p.waitForTimeout(2500);
 console.log('as manager:',await L.scr(p),'|',((await L.txt(p,'#pdLive'))||'').slice(0,330));
 console.log('ovf',JSON.stringify(await L.ovf(p)));
 await p.screenshot({path:'/tmp/claude-0/bughunt/office/shots/x1_dash.png',fullPage:true});
 const keys=()=>p.evaluate(async()=>{const ls=Object.keys(localStorage).filter(k=>/board|dash|company|prodCache|mat:/i.test(k));let idb=[];try{const dbs=await indexedDB.databases();idb=dbs.map(d=>d.name);}catch(e){}return {ls,idb};});
 console.log('kept copies:',JSON.stringify(await keys()));
 // demote: server now says not a manager (a foreman)
 await p.evaluate(()=>{window.__demoted=true;window.__rpcOverride.pb_prod_access=()=>({member:true,company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',manager:false,role:'foreman',server_at:new Date().toISOString()});
  const no=()=>({__error:'pb:not_company_account'});['pb_prod_company_dashboard','pb_prod_company_live','pb_prod_company_live_permits','pb_prod_company_links','pb_prod_company_runs','pb_crew_list','pb_mat_company','pb_daily_list','pb_prod_edits_waiting','pb_mat_spoils_company','pb_daily_events_list','pb_company_settings_get','pb_daily_missing_office','pb_reports_people'].forEach(k=>{window.__rpcOverride[k]=no;});});
 await p.evaluate(()=>window.pbGotoTab('home'));await p.waitForTimeout(500);if(process.env.OFFLINE)await p.evaluate(()=>{Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true});});
 await p.evaluate(()=>window.pbOpenProdDashboard());await p.waitForTimeout(3000);
 console.log('after demotion:',await L.scr(p),'| modal:',await L.modal(p),'| live html len:',await p.evaluate(()=>(document.getElementById('pdLive')||{innerHTML:''}).innerHTML.length),'| dash:',((await L.txt(p,'#screen-prodDashboard'))||'').slice(0,200));
 await p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal button')].find(x=>x.offsetParent);d&&d.click();});
 await p.evaluate(()=>window.pbOpenCrewMembers());await p.waitForTimeout(1500);console.log('crew:',await L.scr(p),'| modal:',await L.modal(p));
 console.log('kept copies after:',JSON.stringify(await keys()));
 console.log('errs',p.errs);await b.close();})();
