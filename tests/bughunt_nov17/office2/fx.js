// realistic office fixtures: job 26014 detail etc.
module.exports=`;(function(){const D=${require('fs').readFileSync('/home/claude/rig/dash.json','utf8')};const J=D.jobs[1];
window.__rpcOverride.pb_prod_job_detail=(a)=>{const k=String(a.p_job_number).trim().toLowerCase();const j=D.jobs.find(x=>x.job_key===k)||J;return Object.assign({},j,{today:a.p_today,server_at:new Date().toISOString(),
 days:[{date:'2026-11-05',key:'pipe',qty:300},{date:'2026-11-05',key:'excavation',qty:300},{date:'2026-11-04',key:'pipe',qty:420.5},{date:'2026-11-04',key:'_manhours',qty:40},{date:'2026-11-03',key:'demo',qty:800}],
 reporters:[{name:'Rick Foreman',email:'rick@x.co',entries:5,last_at:'2026-11-07T02:54:55Z'}],
 recent:[{id:'e1',kind:'run',work_date:'2026-11-05',entered_by:'Rick Foreman',version:1,items:[{key:'pipe',qty:300,unit:'LF'},{key:'excavation',qty:300,unit:'LF'}],run_record_id:'rr1'},{id:'e2',kind:'manual',work_date:'2026-11-04',entered_by:'Tommy Fontaine',version:2,items:[{key:'structures',qty:2,unit:'EA'}],note:'MH-3 and MH-4 set'}],
 crew:[],locates:[{id:'11111111-2222-4333-8444-555555555555',job_key:k,job_number:j.job_number,ticket_no:'A253100123',called_at:'2026-10-20',expires_at:'2026-11-17',closed:false,version:1}],daily_eq:[]});};
window.__rpcOverride.pb_ticket_company_totals=()=>({tickets:3,concrete_yd3:12.5,sub_hours:[]});
})();`;
