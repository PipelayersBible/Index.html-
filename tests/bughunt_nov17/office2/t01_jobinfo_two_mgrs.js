// Two managers: A renames job 26014 on his laptop; B (dashboard loaded earlier) then changes only the start date.
// Expect B's save NOT to put A's job name back to the old one.
const L=require('./lib');
const extra=`;window.__jiArgs=[];window.__rpcOverride.pb_prod_job_info_set=(a)=>{window.__jiArgs.push(a);return {ok:true,job_key:'26014',job_number:'26014',project_name:a.p_project_name,address:a.p_address,start_date:a.p_start_date};};`;
(async()=>{const {b,p}=await L.open(extra,{w:1280});let fail=0;
 await p.evaluate(()=>pbGoto('prodDashboard'));await p.waitForTimeout(1500);
 await p.evaluate(()=>window.pbCxOpenJob('26014'));await p.waitForTimeout(1500);
 // manager A saves a new name on the server (the dashboard now answers with it)
 await p.evaluate(()=>{const o=window.__rpcOverride.pb_prod_company_dashboard;window.__rpcOverride.pb_prod_company_dashboard=(a)=>{const d=JSON.parse(JSON.stringify(o(a)));d.jobs.forEach(j=>{if(j.job_key==='26014'){j.project_name='Sundance Sewer Phase 2';j.address='Banning, CA';}});return d;};});
 await p.evaluate(()=>window.pbCxInfoForm(null,''));await p.waitForTimeout(400);
 const shown=await p.evaluate(()=>document.getElementById('cxiName').value);console.log('B form shows name:',shown);
 await p.fill('#cxiStart','2026-10-29');
 await p.evaluate(()=>{[...document.querySelectorAll('#pbModalOverlay button')].find(x=>x.textContent.trim()==='Save').click();});
 await p.waitForTimeout(2500);
 const a=await p.evaluate(()=>window.__jiArgs);console.log('sent:',JSON.stringify(a));
 const m=await L.modal(p);if(m)console.log('modal:',m.slice(0,300));
 const last=a[a.length-1];
 if(last&&(last.p_project_name!=='Sundance Sewer Phase 2'||last.p_address!=='Banning, CA')){console.log('FAIL: B\'s save put back the old name/address A had changed');fail=1;}
 if(last&&last.p_start_date!=='2026-10-29'){console.log('FAIL: start date not sent');fail=1;}
 if(!last&&!/changed/i.test(m)){console.log('FAIL: nothing sent and no word');fail=1;}
 if(p.errs.length){console.log('errs',p.errs);fail=1;}
 console.log(fail?'RESULT FAIL':'RESULT PASS');await b.close();process.exit(fail);})();
